import { errorContext, logServerEvent } from "@/lib/observability";

/**
 * Pipeline Log writer (PRD-65 Phase 4).
 *
 * Writes a single row to the Notion Pipeline Log database per cron invocation.
 * Schema is documented in `docs/notion-pipeline-log-schema.md`. The database
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

export type PipelineLogRunType = "ingestion" | "health_check";
export type PipelineLogStatus = "ok" | "warn" | "fail";

export type PipelineLogEntry = {
  runType: PipelineLogRunType;
  status: PipelineLogStatus;
  rowCount: number;
  message: string;
  briefingDate: string;
  /**
   * JSON-encoded source-health snapshot. See docs/notion-pipeline-log-schema.md
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

export async function writePipelineLogEntry(
  entry: PipelineLogEntry,
): Promise<PipelineLogWriteResult> {
  const dbId = process.env.NOTION_PIPELINE_LOG_DB_ID?.trim();
  if (!dbId) {
    logServerEvent("warn", "Pipeline log skipped: NOTION_PIPELINE_LOG_DB_ID not configured", {
      runType: entry.runType,
      status: entry.status,
      briefingDate: entry.briefingDate,
    });
    return { written: false, reason: "NOTION_PIPELINE_LOG_DB_ID not configured" };
  }

  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) {
    logServerEvent("warn", "Pipeline log skipped: NOTION_TOKEN not configured", {
      runType: entry.runType,
      status: entry.status,
      briefingDate: entry.briefingDate,
    });
    return { written: false, reason: "NOTION_TOKEN not configured" };
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
      logServerEvent("warn", "Pipeline log write failed", {
        runType: entry.runType,
        status: entry.status,
        briefingDate: entry.briefingDate,
        httpStatus: response.status,
        body: truncate(text, 400),
      });
      return { written: false, reason: `HTTP ${response.status}` };
    }

    const data = (await response.json().catch(() => ({}))) as { id?: string };
    return data.id
      ? { written: true, pageId: data.id }
      : { written: false, reason: "Notion response missing id" };
  } catch (error) {
    logServerEvent("warn", "Pipeline log write threw", {
      runType: entry.runType,
      status: entry.status,
      briefingDate: entry.briefingDate,
      ...errorContext(error),
    });
    return {
      written: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
