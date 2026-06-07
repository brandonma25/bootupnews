import { NextResponse, after } from "next/server";
import * as Sentry from "@sentry/nextjs";

import {
  runEditorialIngestionPipeline,
  type EditorialPipelineResults,
  type EditorialPipelineStageRunner,
} from "@/lib/pipeline/editorial-ingestion-pipeline";
import { runNeedsReviewSweep } from "@/lib/editorial-sweep/needs-review-sweep";
import { errorContext, logServerEvent } from "@/lib/observability";
import { writePipelineLogEntry } from "@/lib/observability/pipeline-log";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const CRON_NAME = "fetch-editorial-inputs";

/**
 * Briefing-date the run-lock keys on. Mirrors the Taipei-calendar logic in
 * src/lib/editorial-staging/runner.ts so a run-lock claim and the editorial
 * staging step that follows always agree on which day is "today".
 */
function todayTaipei(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

type LockAcquireReason =
  | "fresh"               // PK insert succeeded — no prior row for today
  | "reclaimed_fail"      // prior row was status='fail', reclaimed
  | "reclaimed_timeout"   // prior row was status='timeout', reclaimed
  | "reclaimed_stale";    // prior row was status='running' but older than RUN_LOCK_STALE_MS

type LockDenyReason =
  | "in_progress"        // a fresh 'running' row exists — another instance is mid-flight
  | "already_completed"  // prior 'ok' row exists — today's ingestion is done
  | "service_unavailable" // Supabase service-role client is null AND we cannot fail-open safely
  | "lock_check_failed";  // Lock table unreachable in a way we can't classify — fail closed

type RunLockResult =
  | { acquired: true; briefingDate: string; reason: LockAcquireReason }
  | { acquired: false; briefingDate: string; reason: LockDenyReason };

/**
 * A 'running' row older than this many ms is treated as stale — the function
 * instance that claimed it died before reaching `finalizeRunLock`. The
 * internal pipeline timeout (INTERNAL_PIPELINE_TIMEOUT_MS = 55_000) plus a
 * 15s buffer for Sentry flush + writeback covers every legitimate in-flight
 * run; anything older is recoverable carrion.
 */
const RUN_LOCK_STALE_MS = 70_000;

type ExistingLockRow = {
  status: "running" | "ok" | "fail" | "timeout";
  started_at: string;
};

/**
 * Claim the run-lock for today's briefing_date.
 *
 * Semantics (issue #264 — fail-closed-and-stuck fix):
 *   - No prior row → INSERT and return { acquired: true, reason: "fresh" }.
 *   - Prior row with status IN ('fail','timeout') → DELETE the carrion and
 *     re-INSERT, returning { acquired: true, reason: "reclaimed_fail" |
 *     "reclaimed_timeout" }. The dead run no longer strands the day.
 *   - Prior row with status='running' AND older than RUN_LOCK_STALE_MS →
 *     treat as a stranded claim from a dead function instance; reclaim it.
 *   - Prior row with status='running' AND fresh → another instance is mid-flight;
 *     return { acquired: false, reason: "in_progress" } so the caller no-ops.
 *   - Prior row with status='ok' → today's ingestion is already done;
 *     return { acquired: false, reason: "already_completed" }.
 *
 * Service-role-client unavailability is FAIL-CLOSED, not fall-through. A
 * missed run is recoverable on the next scheduler trigger; a silent
 * concurrent double-run produces duplicate Notion writes and corrupts
 * downstream tier/rank accounting. (Documented choice — flip back to
 * fail-open only with an explicit policy change.)
 */
async function tryAcquireRunLock(briefingDate: string): Promise<RunLockResult> {
  const client = createSupabaseServiceRoleClient();
  if (!client) {
    logServerEvent("error", "Run-lock UNAVAILABLE: Supabase service role client returned null — failing closed", {
      route: "/api/cron/fetch-editorial-inputs",
      briefingDate,
    });
    Sentry.captureMessage(
      "Cron ingestion failed closed: createSupabaseServiceRoleClient returned null. " +
      "A missed run is preferable to an unlocked concurrent run.",
      {
        level: "error",
        tags: {
          route: "/api/cron/fetch-editorial-inputs",
          failure_type: "run_lock_service_unavailable",
        },
      },
    );
    await Sentry.flush(2_000).catch(() => { /* best-effort */ });
    return { acquired: false, briefingDate, reason: "service_unavailable" };
  }

  return await attemptClaim(client, briefingDate, /* allowReclaim */ true);
}

async function attemptClaim(
  client: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
  briefingDate: string,
  allowReclaim: boolean,
): Promise<RunLockResult> {
  const insertResult = await client
    .from("cron_runs")
    .insert({ briefing_date: briefingDate, cron_name: CRON_NAME })
    .select("briefing_date");

  if (!insertResult.error) {
    return { acquired: true, briefingDate, reason: "fresh" };
  }

  const code = (insertResult.error as { code?: string }).code;
  if (code !== "23505") {
    // Non-conflict insert error — fail closed for the same reason as a null
    // client: a missed run is safer than an unlocked one.
    logServerEvent("error", "Run-lock acquire failed with non-conflict error — failing closed", {
      route: "/api/cron/fetch-editorial-inputs",
      briefingDate,
      error: insertResult.error.message,
      code,
    });
    return { acquired: false, briefingDate, reason: "lock_check_failed" };
  }

  // PK conflict. Inspect the existing row's status to decide.
  const existingResult = await client
    .from("cron_runs")
    .select("status, started_at")
    .eq("briefing_date", briefingDate)
    .maybeSingle();

  if (existingResult.error || !existingResult.data) {
    // The row vanished between our insert attempt and the select (race with
    // another instance reclaiming). Try once more without reclaim to avoid
    // an infinite loop; whichever instance lost the race no-ops.
    logServerEvent("warn", "Run-lock conflict but existing row not readable — failing closed", {
      route: "/api/cron/fetch-editorial-inputs",
      briefingDate,
      error: existingResult.error?.message,
    });
    return { acquired: false, briefingDate, reason: "lock_check_failed" };
  }

  const existing = existingResult.data as ExistingLockRow;
  const ageMs = Date.now() - Date.parse(existing.started_at);

  if (existing.status === "ok") {
    return { acquired: false, briefingDate, reason: "already_completed" };
  }

  const isStaleRunning = existing.status === "running" && ageMs > RUN_LOCK_STALE_MS;

  if (!allowReclaim || (existing.status === "running" && !isStaleRunning)) {
    return { acquired: false, briefingDate, reason: "in_progress" };
  }

  // Reclaim path: 'fail' / 'timeout' / stale 'running'.
  const reclaimReason: LockAcquireReason =
    existing.status === "fail" ? "reclaimed_fail"
    : existing.status === "timeout" ? "reclaimed_timeout"
    : "reclaimed_stale";

  const deleteResult = await client
    .from("cron_runs")
    .delete()
    .eq("briefing_date", briefingDate)
    .eq("status", existing.status);

  if (deleteResult.error) {
    logServerEvent("error", "Run-lock reclaim DELETE failed — failing closed", {
      route: "/api/cron/fetch-editorial-inputs",
      briefingDate,
      previousStatus: existing.status,
      error: deleteResult.error.message,
    });
    return { acquired: false, briefingDate, reason: "lock_check_failed" };
  }

  // Re-attempt the INSERT (no further reclaim — if another instance also
  // reclaimed in the window, they win, we no-op).
  const reclaimed = await attemptClaim(client, briefingDate, /* allowReclaim */ false);
  if (reclaimed.acquired) {
    logServerEvent("warn", "Run-lock reclaimed stale row", {
      route: "/api/cron/fetch-editorial-inputs",
      briefingDate,
      previousStatus: existing.status,
      previousAgeMs: ageMs,
      reason: reclaimReason,
    });
    return { acquired: true, briefingDate, reason: reclaimReason };
  }
  return reclaimed;
}

/**
 * Mark the run-lock terminal. Best-effort — never throws or blocks the cron.
 * No-op when the lock was never acquired (lock_check_failed fallthrough).
 */
async function finalizeRunLock(
  briefingDate: string,
  status: "ok" | "warn" | "fail" | "timeout",
): Promise<void> {
  // 'warn' was added to the cron_runs.status CHECK constraint by
  // migration 20260604070000_cron_runs_add_warn_status.sql. That
  // migration MUST land before this code deploys, otherwise this write
  // throws a constraint violation and the lock never finalizes.
  try {
    const client = createSupabaseServiceRoleClient();
    if (!client) return;
    await client
      .from("cron_runs")
      .update({ finished_at: new Date().toISOString(), status })
      .eq("briefing_date", briefingDate);
  } catch {
    /* best-effort */
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EditorialInputTaskName = "rss" | "newsletter" | "editorial_staging";


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

async function runIngestionPipeline(stageRef: {
  current: EditorialInputTaskName;
}): Promise<EditorialPipelineResults> {
  // The stage SEQUENCE + dry threading live in the shared
  // runEditorialIngestionPipeline (Track 2 unification) so this prod cron and
  // the dry-run harness execute byte-for-byte the same legs in the same order
  // (newsletter before RSS for rank-slot reservation). The route injects its own
  // stage wrapper: per-stage timeout attribution via stageRef, plus the
  // degrade-don't-throw catch that keeps one leg's failure from aborting the
  // rest (newsletter dying must not stop RSS/staging).
  const runStage: EditorialPipelineStageRunner = async <T>(
    name: EditorialInputTaskName,
    run: () => Promise<T>,
  ): Promise<T> => {
    stageRef.current = name;
    try {
      return await run();
    } catch (error) {
      logServerEvent("error", "Combined editorial input cron task failed before completion", {
        route: "/api/cron/fetch-editorial-inputs",
        task: name,
        ...errorContext(error),
      });
      return {
        success: false,
        timestamp: new Date().toISOString(),
        summary: { message: `${name} task failed before completion.` },
      } as unknown as T;
    }
  };

  // dryRun: false — this IS the real 12:00 UTC cron. Persists everything.
  return runEditorialIngestionPipeline({ dryRun: false, runStage });
}

async function executePipelineWork(briefingDate: string) {
  const stageRef: { current: EditorialInputTaskName } = { current: "newsletter" };

  logServerEvent("info", "Combined editorial input cron pipeline started", {
    route: "/api/cron/fetch-editorial-inputs",
    briefingDate,
    internalTimeoutMs: INTERNAL_PIPELINE_TIMEOUT_MS,
  });

  // P8-precondition — needs_review TTL sweep. Runs FIRST, before any fetch leg,
  // and is fully decoupled from the fetch run's outcome:
  //   - A fetch failure later can never skip the sweep, because the sweep
  //     already ran.
  //   - A sweep fault never flips the fetch run's success or pipelineLogStatus.
  //     runNeedsReviewSweep() is best-effort and never throws; we additionally
  //     guard here so even an unexpected throw is swallowed.
  //   - It is OUTSIDE runWithInternalTimeout so a slow fetch can't starve it;
  //     the sweep is a single bounded UPDATE.
  try {
    await runNeedsReviewSweep();
  } catch (error) {
    logServerEvent("error", "needs_review sweep threw out of module (swallowed; fetch continues)", {
      route: "/api/cron/fetch-editorial-inputs",
      ...errorContext(error),
    });
  }

  let pipelineResult: EditorialPipelineResults | null = null;

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
      // The 55s internal wall fires ~5s before the 60s Vercel function kill,
      // and Sentry's nextjs SDK buffers events in memory. Force a flush so
      // captured timeout/error events ship before the function instance
      // is frozen. Failure to flush is swallowed — never blocks shutdown.
      await Sentry.flush(2_000).catch(() => { /* best-effort */ });
      logServerEvent("error", "Ingestion pipeline hit internal timeout", {
        route: "/api/cron/fetch-editorial-inputs",
        stage: error.stage,
        internalTimeoutMs: error.timeoutMs,
      });
      await finalizeRunLock(briefingDate, "timeout");
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
    await Sentry.flush(2_000).catch(() => { /* best-effort */ });
    logServerEvent("error", "Ingestion pipeline failed unexpectedly", {
      route: "/api/cron/fetch-editorial-inputs",
      ...errorContext(error),
    });
    await finalizeRunLock(briefingDate, "fail");
    return;
  }

  const { newsletter, rss, editorialStaging } = pipelineResult;
  // #272 — Run-success is owned by the CRITICAL leg (RSS). Newsletter is
  // a supplementary input source; an empty Gmail label or an OAuth
  // expiry there must DEGRADE the run, not fail it. The legacy boolean
  // (`rss.success && newsletter.success`) marked every RSS-healthy run
  // as `fail` from 2026-05-18 onward when newsletter ingestion broke,
  // hiding actual ingestion-pipeline health behind a false-fail signal.
  const success = rss.success;

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

  // #272 — Three-state Pipeline Log status:
  //   - fail: the critical leg (RSS) broke.
  //   - warn: RSS healthy BUT newsletter degraded OR editorial-staging
  //           surfaced row-level errors. Visible to operators without
  //           paging.
  //   - ok:   RSS healthy AND newsletter healthy AND no staging errors.
  const pipelineLogStatus = !rss.success
    ? "fail"
    : (!newsletter.success || stagingErrors.length > 0)
      ? "warn"
      : "ok";

  const pipelineLogMessage =
    pipelineLogStatus === "fail"
      ? `Ingestion failed: RSS=fail, newsletter=${newsletter.success ? "ok" : "fail"}.`
      : `Ingestion completed: RSS=ok, newsletter=${newsletter.success ? "ok" : "degraded"}, editorial staging inserted=${inserted} updated=${updated} skipped=${skipped}${stagingErrors.length > 0 ? `; staging errors=${stagingErrors.length}` : ""}.`;

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

  // Use the lock's briefingDate (from todayTaipei at request time) rather than
  // briefingDateForLog so the finalize keys to the same row that tryAcquireRunLock
  // claimed. They will agree under normal operation; this guards against drift
  // if editorial staging ever resolves a different Taipei calendar day.
  //
  // Track 2 P1 rev: write 'warn' (not 'ok') on the degraded path so cron_runs
  // surfaces the same three-state ladder as the Pipeline Log. Reserves 'ok' for
  // fully clean runs; reserves 'fail' for genuine breakage. cron-job.org's
  // failure trigger keys on HTTP status, NOT on the cron_runs row — so a 'warn'
  // run is visible to operators without paging. Requires migration
  // 20260604070000_cron_runs_add_warn_status.sql to be applied first.
  await finalizeRunLock(briefingDate, pipelineLogStatus);
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
  const briefingDate = todayTaipei(new Date(acceptedAt));

  // Run-lock claim happens synchronously, BEFORE after() schedules the pipeline.
  // The second cronjob.org HTTP fire (or a Vercel Hobby double-delivery during
  // the rollback escape hatch) must see the existing claim immediately and
  // no-op — otherwise both runs would race past the gate and produce
  // duplicate ingestion work. Finalize happens inside executePipelineWork.
  const lock = await tryAcquireRunLock(briefingDate);

  if (!lock.acquired) {
    // Two kinds of deny:
    //   - "already_completed" / "in_progress" are normal idempotency outcomes
    //     (HTTP 200 with status=skipped) — the operator does NOT need to be
    //     paged; the next scheduler trigger or completed run handles it.
    //   - "service_unavailable" / "lock_check_failed" are infrastructure
    //     errors we already paged on internally (Sentry). Return HTTP 503 so
    //     the cron-job.org notifyOnFailure email fires.
    const isInfraError =
      lock.reason === "service_unavailable" || lock.reason === "lock_check_failed";
    const httpStatus = isInfraError ? 503 : 200;
    const message = isInfraError
      ? `Ingestion failed closed: run-lock unavailable (reason=${lock.reason}). A missed run is preferable to an unlocked concurrent run; the next scheduler trigger will retry.`
      : `Ingestion skipped: a run for briefing_date=${briefingDate} is ${lock.reason === "already_completed" ? "already completed" : "currently in progress"}.`;
    logServerEvent(isInfraError ? "error" : "info", "Combined editorial input cron not scheduled", {
      route: "/api/cron/fetch-editorial-inputs",
      briefingDate,
      acceptedAt,
      reason: lock.reason,
      httpStatus,
    });
    return NextResponse.json(
      {
        success: !isInfraError,
        timestamp: acceptedAt,
        briefing_date: briefingDate,
        status: isInfraError ? "fail_closed" : "skipped",
        reason: lock.reason,
        summary: { message },
      },
      { status: httpStatus },
    );
  }

  logServerEvent("info", "Combined editorial input cron accepted (running async via after())", {
    route: "/api/cron/fetch-editorial-inputs",
    briefingDate,
    acceptedAt,
    lockReason: lock.reason,
  });

  // Run the ingestion pipeline after the response is sent. Vercel keeps the
  // function alive up to its maxDuration (60s in vercel.json) for `after()`
  // work, which gives the pipeline its full budget without making
  // cron-job.org wait — the 30s external HTTP timeout no longer applies.
  after(() => executePipelineWork(briefingDate));

  return NextResponse.json(
    {
      success: true,
      timestamp: acceptedAt,
      briefing_date: briefingDate,
      summary: {
        message: "Ingestion accepted; running asynchronously. Observe completion via Sentry, Notion Pipeline Log, and the 12:15 UTC /api/cron/health check.",
      },
    },
    { status: 202 },
  );
}
