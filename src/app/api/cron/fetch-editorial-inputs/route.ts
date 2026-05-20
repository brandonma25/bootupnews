import { NextResponse, after } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { runDailyNewsCron, type DailyNewsCronRunResult } from "@/lib/cron/fetch-news";
import { runNewsletterIngestion, type NewsletterIngestionRunResult } from "@/lib/newsletter-ingestion/runner";
import { runEditorialStaging, type EditorialStagingRunResult } from "@/lib/editorial-staging/runner";
import { errorContext, logServerEvent } from "@/lib/observability";
import { writePipelineLogEntry } from "@/lib/observability/pipeline-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EditorialInputTaskName = "rss" | "newsletter" | "editorial_staging";

type EditorialInputTaskResult = {
  success: boolean;
  timestamp: string | null;
  summary:
    | DailyNewsCronRunResult["summary"]
    | NewsletterIngestionRunResult["summary"]
    | EditorialStagingRunResult["summary"]
    | null;
};

// Hard internal wall for the after() pipeline. Sits below the function-level
// maxDuration (60s in vercel.json) so we always trip this guard first and
// produce an explicit Sentry IngestionTimeoutInternal event with the offending
// stage — never a silent function-level kill.
const INTERNAL_PIPELINE_TIMEOUT_MS = 55_000;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";
  if (headerSecret === cronSecret) return true;

  // Rollback escape hatch: honor the legacy Vercel Cron `Authorization: Bearer`
  // header only when ALLOW_VERCEL_CRON_FALLBACK is explicitly enabled. Default
  // auth is x-cron-secret header only.
  if (process.env.ALLOW_VERCEL_CRON_FALLBACK === "true") {
    const authHeader = request.headers.get("authorization")?.trim() ?? "";
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }

  return false;
}

async function runTask<T extends DailyNewsCronRunResult | NewsletterIngestionRunResult | EditorialStagingRunResult>(
  name: EditorialInputTaskName,
  task: () => Promise<T>,
): Promise<EditorialInputTaskResult> {
  try {
    const result = await task();

    return {
      success: result.success,
      timestamp: result.timestamp,
      summary: result.summary,
    };
  } catch (error) {
    logServerEvent("error", "Combined editorial input cron task failed before completion", {
      route: "/api/cron/fetch-editorial-inputs",
      task: name,
      ...errorContext(error),
    });

    return {
      success: false,
      timestamp: new Date().toISOString(),
      summary: {
        message: `${name} task failed before completion.`,
      } as EditorialInputTaskResult["summary"],
    };
  }
}

class IngestionTimeoutInternalError extends Error {
  readonly stage: EditorialInputTaskName;
  readonly timeoutMs: number;

  constructor(stage: EditorialInputTaskName, timeoutMs: number) {
    super(`Ingestion pipeline exceeded internal ${timeoutMs}ms budget during stage "${stage}".`);
    this.name = "IngestionTimeoutInternal";
    this.stage = stage;
    this.timeoutMs = timeoutMs;
  }
}

function runWithInternalTimeout<T>(
  stageRef: { current: EditorialInputTaskName },
  work: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new IngestionTimeoutInternalError(stageRef.current, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([work, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function runIngestionPipeline(stageRef: { current: EditorialInputTaskName }) {
  // Newsletter must run before RSS so that reserveNewsletterCandidateRanksForRssSnapshot
  // can push newsletter rows to high rank slots and leave low ranks free for the RSS snapshot.
  // If RSS runs first it fills all 20 rank slots, leaving no room for newsletter promotion.
  stageRef.current = "newsletter";
  const newsletter = await runTask("newsletter", () =>
    runNewsletterIngestion({
      writeCandidates: true,
    }),
  );

  stageRef.current = "rss";
  const rss = await runTask("rss", () => runDailyNewsCron());

  stageRef.current = "editorial_staging";
  const editorialStaging = await runTask("editorial_staging", () => runEditorialStaging());

  return { newsletter, rss, editorialStaging };
}

async function executePipelineWork() {
  const stageRef: { current: EditorialInputTaskName } = { current: "newsletter" };

  logServerEvent("info", "Combined editorial input cron pipeline started", {
    route: "/api/cron/fetch-editorial-inputs",
    internalTimeoutMs: INTERNAL_PIPELINE_TIMEOUT_MS,
  });

  let pipelineResult:
    | { newsletter: EditorialInputTaskResult; rss: EditorialInputTaskResult; editorialStaging: EditorialInputTaskResult }
    | null = null;

  try {
    pipelineResult = await runWithInternalTimeout(
      stageRef,
      runIngestionPipeline(stageRef),
      INTERNAL_PIPELINE_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof IngestionTimeoutInternalError) {
      Sentry.captureException(error, {
        level: "error",
        tags: {
          route: "/api/cron/fetch-editorial-inputs",
          stage: error.stage,
          failure_type: "ingestion_timeout_internal",
        },
        extra: {
          internalTimeoutMs: error.timeoutMs,
        },
      });
      logServerEvent("error", "Ingestion pipeline hit internal timeout", {
        route: "/api/cron/fetch-editorial-inputs",
        stage: error.stage,
        internalTimeoutMs: error.timeoutMs,
      });
      return;
    }

    // runTask catches per-task errors, so anything reaching here is unexpected
    // (e.g. a bug in runTask itself or in the timeout wiring).
    Sentry.captureException(error, {
      level: "error",
      tags: {
        route: "/api/cron/fetch-editorial-inputs",
        failure_type: "ingestion_pipeline_unexpected_error",
      },
    });
    logServerEvent("error", "Ingestion pipeline failed unexpectedly", {
      route: "/api/cron/fetch-editorial-inputs",
      ...errorContext(error),
    });
    return;
  }

  const { newsletter, rss, editorialStaging } = pipelineResult;
  const success = rss.success && newsletter.success;

  logServerEvent(success ? "info" : "error", "Combined editorial input cron completed", {
    route: "/api/cron/fetch-editorial-inputs",
    rssSuccess: rss.success,
    newsletterSuccess: newsletter.success,
    editorialStagingSuccess: editorialStaging.success,
  });

  // Pipeline Log write — best-effort, never fails the cron.
  const stagingSummary = editorialStaging.summary as
    | { briefingDate?: string; notionRowsInserted?: number; notionRowsUpdated?: number; notionRowsSkippedHumanEdited?: number; notionErrors?: string[] }
    | null;
  const briefingDateForLog =
    typeof stagingSummary?.briefingDate === "string" ? stagingSummary.briefingDate : null;
  const inserted = stagingSummary?.notionRowsInserted ?? 0;
  const updated = stagingSummary?.notionRowsUpdated ?? 0;
  const skipped = stagingSummary?.notionRowsSkippedHumanEdited ?? 0;
  const stagingErrors = stagingSummary?.notionErrors ?? [];

  const pipelineLogStatus = success
    ? stagingErrors.length > 0
      ? "warn"
      : "ok"
    : "fail";

  const pipelineLogMessage = success
    ? `Ingestion completed: RSS=${rss.success ? "ok" : "fail"}, newsletter=${newsletter.success ? "ok" : "fail"}, editorial staging inserted=${inserted} updated=${updated} skipped=${skipped}${stagingErrors.length > 0 ? `; staging errors=${stagingErrors.length}` : ""}.`
    : `Ingestion failed: RSS=${rss.success ? "ok" : "fail"}, newsletter=${newsletter.success ? "ok" : "fail"}.`;

  if (briefingDateForLog) {
    await writePipelineLogEntry({
      runType: "ingestion",
      status: pipelineLogStatus,
      rowCount: inserted + updated,
      message: pipelineLogMessage,
      briefingDate: briefingDateForLog,
      sourceHealth: {
        rssSuccess: rss.success,
        newsletterSuccess: newsletter.success,
        editorialStagingSuccess: editorialStaging.success,
        notionRowsInserted: inserted,
        notionRowsUpdated: updated,
        notionRowsSkippedHumanEdited: skipped,
        stagingErrorCount: stagingErrors.length,
      },
    });
  } else {
    logServerEvent("warn", "Pipeline log skipped: no briefingDate from editorial staging", {
      route: "/api/cron/fetch-editorial-inputs",
    });
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    logServerEvent("warn", "Unauthorized combined editorial input cron request rejected", {
      route: "/api/cron/fetch-editorial-inputs",
      hasCronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    });

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        summary: {
          message: "Unauthorized",
        },
      },
      { status: 401 },
    );
  }

  const acceptedAt = new Date().toISOString();

  logServerEvent("info", "Combined editorial input cron accepted (running async via after())", {
    route: "/api/cron/fetch-editorial-inputs",
    acceptedAt,
  });

  // Run the ingestion pipeline after the response is sent. Vercel keeps the
  // function alive up to its maxDuration (60s in vercel.json) for `after()`
  // work, which gives the pipeline its full budget without making
  // cron-job.org wait — the 30s external HTTP timeout no longer applies.
  after(executePipelineWork);

  return NextResponse.json(
    {
      success: true,
      timestamp: acceptedAt,
      summary: {
        message: "Ingestion accepted; running asynchronously. Observe completion via Sentry, Notion Pipeline Log, and the 12:15 UTC /api/cron/health check.",
      },
    },
    { status: 202 },
  );
}
