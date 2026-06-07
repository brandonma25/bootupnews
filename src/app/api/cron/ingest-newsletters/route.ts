import { NextResponse, after } from "next/server";

import {
  isCronAuthorized,
  runEditorialStagesWithTiming,
  todayTaipei,
} from "@/lib/cron/cron-endpoint-runtime";
import { logServerEvent } from "@/lib/observability";
import { writePipelineLogEntry } from "@/lib/observability/pipeline-log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/cron/ingest-newsletters";

/**
 * Newsletter ingestion endpoint (Track 2 — leg decoupling, the timeout cure).
 *
 * Runs the NEWSLETTER stage ONLY → fetches Gmail, extracts (with the #305 chrome
 * filter), writes newsletter_emails + newsletter_story_extractions, and promotes
 * candidates. It gets its OWN Vercel 60s budget, so the ~33s Gmail fetch can no
 * longer starve RSS + staging in /api/cron/fetch-editorial-inputs.
 *
 * LOCK-FREE BY DESIGN: cron_runs' PK is briefing_date alone, so it can't hold a
 * per-endpoint lock row without a migration (out of scope). This endpoint relies
 * on the gmail_message_id UNIQUE index (newsletter_emails_gmail_message_id_key)
 * for conflict-safe dedup — insertNewsletterEmail treats a 23505 unique
 * violation as "already inserted by a racing run" (skipped_existing). So a
 * concurrent double-fire is safe: no throw, no duplicate row.
 *
 * SCHEDULE ORDERING (load-bearing): this MUST fire ~10 min BEFORE the briefing
 * endpoint (e.g. 11:50 UTC) so the extractions exist in the DB when the briefing
 * endpoint's staging reads them (fetchNewsletterCandidates).
 */
async function executeNewsletterWork(briefingDate: string) {
  logServerEvent("info", "Newsletter ingestion cron started", { route: ROUTE, briefingDate });

  const run = await runEditorialStagesWithTiming({ routeName: ROUTE, stages: ["newsletter"] });

  if (run.timedOut) {
    // runEditorialStagesWithTiming already captured + flushed the Sentry timeout
    // event and logged the partial stage_ms. Record it in the Pipeline Log too.
    await writePipelineLogEntry({
      runType: "newsletter_ingestion",
      status: "fail",
      rowCount: 0,
      message: `Newsletter ingestion hit the internal timeout during "${run.inFlightStage}".`,
      briefingDate,
      sourceHealth: { timedOut: true, stageMs: run.stageMs },
    });
    return;
  }

  const newsletter = run.results.newsletter;
  if (!newsletter) {
    logServerEvent("error", "Newsletter ingestion returned no result", {
      route: ROUTE,
      briefingDate,
      stageMs: run.stageMs,
    });
    await writePipelineLogEntry({
      runType: "newsletter_ingestion",
      status: "fail",
      rowCount: 0,
      message: "Newsletter ingestion returned no result.",
      briefingDate,
      sourceHealth: { stageMs: run.stageMs },
    });
    return;
  }

  const fetched = (newsletter.summary as { fetchedMessageCount?: number }).fetchedMessageCount ?? 0;
  // Newsletter is a supplementary source: a degraded run (empty Gmail label, an
  // OAuth expiry) is 'warn', not 'fail' — the briefing endpoint's RSS+staging run
  // independently and must not be paged by a newsletter hiccup.
  const status = newsletter.success ? "ok" : "warn";

  logServerEvent(newsletter.success ? "info" : "warn", "Newsletter ingestion cron completed", {
    route: ROUTE,
    briefingDate,
    success: newsletter.success,
    fetchedMessageCount: fetched,
    stageMs: run.stageMs,
  });

  await writePipelineLogEntry({
    runType: "newsletter_ingestion",
    status,
    rowCount: fetched,
    message: `Newsletter ingestion ${newsletter.success ? "ok" : "degraded"}: fetched ${fetched} message(s). ${newsletter.summary.message}`,
    briefingDate,
    sourceHealth: {
      newsletterSuccess: newsletter.success,
      fetchedMessageCount: fetched,
      stageMs: run.stageMs,
    },
  });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    logServerEvent("warn", "Unauthorized newsletter ingestion cron request rejected", {
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

  logServerEvent("info", "Newsletter ingestion cron accepted (running async via after())", {
    route: ROUTE,
    briefingDate,
    acceptedAt,
  });

  // Lock-free (see file header). Run after the response so the function keeps its
  // full maxDuration budget without making cron-job.org wait.
  after(() => executeNewsletterWork(briefingDate));

  return NextResponse.json(
    { success: true, timestamp: acceptedAt, briefing_date: briefingDate, status: "accepted" },
    { status: 202 },
  );
}
