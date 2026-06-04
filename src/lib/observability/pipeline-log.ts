import * as Sentry from "@sentry/nextjs";

import { errorContext, logServerEvent } from "@/lib/observability";

/**
 * Pipeline Log writer (PRD-65 Phase 4).
 *
 * Writes a single row to the Notion Pipeline Log database per cron invocation.
 * Schema is documented in `docs/engineering/reports/notion-pipeline-log-schema.md`. The database
 * must be created manually in Notion by BM and its ID set as the
 * `NOTION_PIPELINE_LOG_DB_ID` Vercel env var.
 *
 * Failure contract: this writer never throws. A missing env var, missing
 * Notion token, or a Notion API failure produces a `{ written: false, reason }`
 * result and a warn-level log entry. The endpoint that called us continues
 * regardless — pipeline-log persistence is best-effort.
 */

const NOTION_API_VERSION = "2022-06-28";
const NOTION_PAGES_URL = "https://api.notion.com/v1/pages";

export type PipelineLogRunType = "ingestion" | "health_check" | "needs_review_sweep";
export type PipelineLogStatus = "ok" | "warn" | "fail";

export type PipelineLogEntry = {
  runType: PipelineLogRunType;
  status: PipelineLogStatus;
  rowCount: number;
  message: string;
  briefingDate: string;
  /**
   * JSON-encoded source-health snapshot. See docs/engineering/reports/notion-pipeline-log-schema.md
   * for the expected shape. Writer accepts either a pre-encoded string or an
   * object — objects are JSON.stringified at write time.
   */
  sourceHealth?: string | Record<string, unknown>;
};

export type PipelineLogWriteResult =
  | { written: true; pageId: string }
  | { written: false; reason: string };

const MESSAGE_CAP = 500;
const SOURCE_HEALTH_CAP = 1800;

function truncate(input: string, max: number): string {
  return input.length <= max ? input : input.slice(0, max - 1) + "…";
}

function richText(content: string) {
  return [{ text: { content } }];
}

/**
 * Capture a Sentry message for a writer no-op. Track 2 P2: the legacy
 * `warn`-only path went dark on prod when log env vars drifted off the
 * Production scope on Vercel — there was no pageable signal that
 * observability had stopped working. A Sentry message at `warning`
 * level surfaces silent observability loss without paging.
 *
 * Deduped by fingerprint per reason so a missing env var produces one
 * Sentry issue, not one per cron run. The `extra` payload carries the
 * specific reason + run metadata for the issue body.
 */
function captureWriterNoop(reason: string, extra: Record<string, unknown>) {
  Sentry.captureMessage("Pipeline log writer no-op", {
    level: "warning",
    fingerprint: ["pipeline-log-writer-noop", reason],
    tags: {
      observability_surface: "pipeline_log",
      writer_noop_reason: reason,
    },
    extra,
  });
}

export async function writePipelineLogEntry(
  entry: PipelineLogEntry,
): Promise<PipelineLogWriteResult> {
  const dbId = process.env.NOTION_PIPELINE_LOG_DB_ID?.trim();
  if (!dbId) {
    const reason = "NOTION_PIPELINE_LOG_DB_ID not configured";
    logServerEvent("warn", "Pipeline log skipped: NOTION_PIPELINE_LOG_DB_ID not configured", {
      runType: entry.runType,
      status: entry.status,
      briefingDate: entry.briefingDate,
    });
    captureWriterNoop(reason, {
      runType: entry.runType,
      status: entry.status,
      briefingDate: entry.briefingDate,
    });
    return { written: false, reason };
  }

  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) {
    const reason = "NOTION_TOKEN not configured";
    logServerEvent("warn", "Pipeline log skipped: NOTION_TOKEN not configured", {
      runType: entry.runType,
      status: entry.status,
      briefingDate: entry.briefingDate,
    });
    captureWriterNoop(reason, {
      runType: entry.runType,
      status: entry.status,
      briefingDate: entry.briefingDate,
    });
    return { written: false, reason };
  }

  const sourceHealth =
    typeof entry.sourceHealth === "string"
      ? entry.sourceHealth
      : entry.sourceHealth
        ? JSON.stringify(entry.sourceHealth)
        : "";

  const properties: Record<string, unknown> = {
    "Run Type": { select: { name: entry.runType } },
    Status: { select: { name: entry.status } },
    "Row Count": { number: entry.rowCount },
    Message: { rich_text: richText(truncate(entry.message, MESSAGE_CAP)) },
    "Briefing Date": { date: { start: entry.briefingDate } },
    "Source Health": { rich_text: richText(truncate(sourceHealth, SOURCE_HEALTH_CAP)) },
  };

  try {
    const response = await fetch(NOTION_PAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "(no body)");
      const reason = `HTTP ${response.status}`;
      logServerEvent("warn", "Pipeline log write failed", {
        runType: entry.runType,
        status: entry.status,
        briefingDate: entry.briefingDate,
        httpStatus: response.status,
        body: truncate(text, 400),
      });
      captureWriterNoop(reason, {
        runType: entry.runType,
        status: entry.status,
        briefingDate: entry.briefingDate,
        httpStatus: response.status,
        body: truncate(text, 400),
      });
      return { written: false, reason };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    if (data.id) {
      return { written: true, pageId: data.id };
    }
    const reason = "Notion response missing id";
    captureWriterNoop(reason, {
      runType: entry.runType,
      status: entry.status,
      briefingDate: entry.briefingDate,
    });
    return { written: false, reason };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logServerEvent("warn", "Pipeline log write threw", {
      runType: entry.runType,
      status: entry.status,
      briefingDate: entry.briefingDate,
      ...errorContext(error),
    });
    Sentry.captureException(error, {
      tags: {
        observability_surface: "pipeline_log",
        writer_noop_reason: "threw",
      },
      extra: {
        runType: entry.runType,
        status: entry.status,
        briefingDate: entry.briefingDate,
      },
    });
    return { written: false, reason };
  }
}
