import { NextResponse, after } from "next/server";

import {
  INTERNAL_STAGE_TIMEOUT_MS,
  isCronAuthorized,
  runWithStageTimeout,
  StageTimeoutError,
  todayTaipei,
} from "@/lib/cron/cron-endpoint-runtime";
import { runNeedsReviewSweep } from "@/lib/editorial-sweep/needs-review-sweep";
import { errorContext, logServerEvent } from "@/lib/observability";
import { writePipelineLogEntry } from "@/lib/observability/pipeline-log";
import { StageTimer } from "@/lib/pipeline/stage-timing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/cron/sweep";

/**
 * needs_review TTL sweep endpoint (Track 2 — leg decoupling).
 *
 * Runs the P8 sweep ONLY (it previously ran first on the ingestion path inside
 * /api/cron/fetch-editorial-inputs). Its own Vercel budget.
 *
 * LOCK-FREE BY DESIGN: runNeedsReviewSweep is a bounded, IDEMPOTENT UPDATE
 * (auto-dispose aged pending_review rows; flag drafted-but-unpublished). It has
 * NO non-idempotent side effects — no counters, no append, no external POST — so
 * a concurrent double-fire converges to the same end state. It is best-effort and
 * returns an `error` string rather than throwing; the timeout/throw guards here
 * are belt-and-suspenders.
 */
async function executeSweepWork(briefingDate: string) {
  logServerEvent("info", "needs_review sweep cron started", { route: ROUTE, briefingDate });

  const timer = new StageTimer();
  const stageRef: { current: string } = { current: "sweep" };

  let summary: Awaited<ReturnType<typeof runNeedsReviewSweep>>;
  try {
    summary = await runWithStageTimeout(
      stageRef,
      timer.time("sweep", () => runNeedsReviewSweep()),
      INTERNAL_STAGE_TIMEOUT_MS,
    );
  } catch (error) {
    const stageMs = timer.snapshot();
    const message =
      error instanceof StageTimeoutError
        ? "Sweep hit the internal timeout."
        : "Sweep threw unexpectedly.";
    logServerEvent("error", `needs_review sweep ${error instanceof StageTimeoutError ? "timed out" : "threw"}`, {
      route: ROUTE,
      briefingDate,
      stageMs,
      ...errorContext(error),
    });
    await writePipelineLogEntry({
      runType: "needs_review_sweep",
      status: "fail",
      rowCount: 0,
      message,
      briefingDate,
      sourceHealth: { stageMs },
    });
    return;
  }

  const stageMs = timer.snapshot();
  const status = summary.error ? "warn" : "ok";

  logServerEvent(summary.error ? "warn" : "info", "needs_review sweep cron completed", {
    route: ROUTE,
    briefingDate,
    disposedCount: summary.disposedCount,
    flaggedCount: summary.flaggedCount,
    mutated: summary.mutated,
    error: summary.error,
    stageMs,
  });

  await writePipelineLogEntry({
    runType: "needs_review_sweep",
    status,
    rowCount: summary.disposedCount,
    message: summary.error
      ? `Sweep degraded: ${summary.error}`
      : `Sweep ok: disposed ${summary.disposedCount}, flagged ${summary.flaggedCount}, mutated=${summary.mutated}.`,
    briefingDate,
    sourceHealth: {
      disposedCount: summary.disposedCount,
      flaggedCount: summary.flaggedCount,
      mutated: summary.mutated,
      error: summary.error,
      stageMs,
    },
  });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    logServerEvent("warn", "Unauthorized needs_review sweep cron request rejected", {
      route: ROUTE,
      hasCronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    });
    return NextResponse.json(
      { success: false, timestamp: new Date().toISOString(), summary: { message: "Unauthorized" } },
      { status: 401 },
    );
  }

  const acceptedAt = new Date().toISOString();
  const briefingDate = todayTaipei(new Date(acceptedAt));

  logServerEvent("info", "needs_review sweep cron accepted (running async via after())", {
    route: ROUTE,
    briefingDate,
    acceptedAt,
  });

  after(() => executeSweepWork(briefingDate));

  return NextResponse.json(
    { success: true, timestamp: acceptedAt, briefing_date: briefingDate, status: "accepted" },
    { status: 202 },
  );
}
