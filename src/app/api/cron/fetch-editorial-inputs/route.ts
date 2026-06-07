import { NextResponse, after } from "next/server";
import * as Sentry from "@sentry/nextjs";

import {
  isCronAuthorized,
  runEditorialStagesWithTiming,
  todayTaipei,
} from "@/lib/cron/cron-endpoint-runtime";
import { logServerEvent } from "@/lib/observability";
import { writePipelineLogEntry } from "@/lib/observability/pipeline-log";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

// Track 2 leg decoupling: this endpoint now runs RSS → staging ONLY. The
// newsletter leg moved to /api/cron/ingest-newsletters and the P8 sweep to
// /api/cron/sweep, so each leg gets its own Vercel 60s budget and the newsletter
// fetch (~33s) can no longer starve RSS+staging. Staging still sources newsletter
// candidates from the DB (fetchNewsletterCandidates), written by the newsletter
// endpoint that the cron schedule fires ~10 min earlier.
//
// RUN-LOCK DESIGN (no-migration constraint): cron_runs' PK is briefing_date
// alone, so only ONE endpoint can hold the day's lock row. THIS endpoint keeps
// it — it owns the non-idempotent writes (signal_posts snapshot + Notion
// staging) that most need double-fire protection. The newsletter + sweep
// endpoints run lock-free (newsletter relies on the gmail_message_id UNIQUE
// index for conflict-safe dedup; sweep is a bounded idempotent UPDATE).
const CRON_NAME = "fetch-editorial-inputs";

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

async function executePipelineWork(briefingDate: string) {
  logServerEvent("info", "Editorial briefing cron pipeline started (RSS → staging)", {
    route: "/api/cron/fetch-editorial-inputs",
    briefingDate,
  });

  // Run RSS → staging ONLY, with the shared internal-timeout + per-stage
  // StageTimer. Newsletter is decoupled to /api/cron/ingest-newsletters; staging
  // reads its candidates from the DB. The sweep is decoupled to /api/cron/sweep.
  const run = await runEditorialStagesWithTiming({
    routeName: "/api/cron/fetch-editorial-inputs",
    stages: ["rss", "editorial_staging"],
  });

  if (run.timedOut) {
    // runEditorialStagesWithTiming already captured + flushed the Sentry timeout
    // event naming the in-flight stage (run.inFlightStage) and logged the partial
    // stage_ms. Finalize the lock so the day isn't stranded.
    await finalizeRunLock(briefingDate, "timeout");
    return;
  }

  const { rss, editorialStaging } = run.results;
  // This endpoint runs only RSS + staging; newsletter is null by design (it ran
  // in /api/cron/ingest-newsletters and staging reads its candidates from the DB).
  if (!rss || !editorialStaging) {
    logServerEvent("error", "Briefing pipeline returned an incomplete stage set", {
      route: "/api/cron/fetch-editorial-inputs",
      briefingDate,
      hasRss: Boolean(rss),
      hasEditorialStaging: Boolean(editorialStaging),
      stageMs: run.stageMs,
    });
    await finalizeRunLock(briefingDate, "fail");
    return;
  }

  // #272 — Run-success is owned by the CRITICAL leg (RSS).
  const success = rss.success;

  logServerEvent(success ? "info" : "error", "Editorial briefing cron completed", {
    route: "/api/cron/fetch-editorial-inputs",
    rssSuccess: rss.success,
    editorialStagingSuccess: editorialStaging.success,
    stageMs: run.stageMs,
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

  // #272 — Three-state Pipeline Log status for the briefing endpoint:
  //   - fail: the critical leg (RSS) broke.
  //   - warn: RSS healthy BUT editorial-staging surfaced row-level errors.
  //   - ok:   RSS healthy AND no staging errors.
  // (Newsletter health is now logged by /api/cron/ingest-newsletters, not here.)
  const pipelineLogStatus = !rss.success
    ? "fail"
    : stagingErrors.length > 0
      ? "warn"
      : "ok";

  const pipelineLogMessage =
    pipelineLogStatus === "fail"
      ? "Briefing failed: RSS=fail."
      : `Briefing completed: RSS=ok, editorial staging inserted=${inserted} updated=${updated} skipped=${skipped}${stagingErrors.length > 0 ? `; staging errors=${stagingErrors.length}` : ""}.`;

  if (briefingDateForLog) {
    await writePipelineLogEntry({
      runType: "ingestion",
      status: pipelineLogStatus,
      rowCount: inserted + updated,
      message: pipelineLogMessage,
      briefingDate: briefingDateForLog,
      sourceHealth: {
        rssSuccess: rss.success,
        editorialStagingSuccess: editorialStaging.success,
        notionRowsInserted: inserted,
        notionRowsUpdated: updated,
        notionRowsSkippedHumanEdited: skipped,
        stagingErrorCount: stagingErrors.length,
        stageMs: run.stageMs,
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
  if (!isCronAuthorized(request)) {
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
