import { NextResponse, after } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { isCronAuthorized, todayTaipei } from "@/lib/cron/cron-endpoint-runtime";
import { errorContext, logServerEvent } from "@/lib/observability";
import { runRestageWithBodies } from "@/lib/article-extraction/restage-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/cron/restage-with-bodies";

/**
 * CRON-2 of the decoupled extraction unblock (the same-cycle re-gate).
 *
 * Scheduled a few minutes AFTER CRON-1 extract-article-bodies (12:25 UTC, vs
 * CRON-1 at 12:20, vs the main run at 12:00) — same briefing_date, feed still
 * fresh. Re-runs the real pipeline with CRON-1's cached bodies merged, appends
 * the newly-unblocked items to today's signal_posts, and re-stages to Notion.
 * Its OWN ≤60s budget; it does NOT execute inside, block, or share a budget with
 * /api/cron/fetch-editorial-inputs (which never sets useExtractedBodies). A
 * failure here leaves today's slate exactly as the main run produced it.
 *
 * Lock-free + idempotent: the append-persist is URL-keyed (already-present
 * source_urls are skipped), so a re-fire adds nothing new.
 */
const MONITOR_SLUG =
  process.env.RESTAGE_WITH_BODIES_CRON_MONITOR_SLUG?.trim() || "restage-with-bodies";
const MONITOR_SCHEDULE = "25 12 * * *";

function captureCheckIn(
  status: "in_progress" | "ok" | "error",
  checkInId?: string,
  duration?: number,
): string | undefined {
  try {
    return Sentry.captureCheckIn(
      status === "in_progress"
        ? { monitorSlug: MONITOR_SLUG, status }
        : { monitorSlug: MONITOR_SLUG, status, ...(checkInId ? { checkInId } : {}), ...(typeof duration === "number" ? { duration } : {}) },
      {
        schedule: { type: "crontab", value: MONITOR_SCHEDULE },
        checkinMargin: 10,
        maxRuntime: 5,
        timezone: "UTC",
      },
    );
  } catch {
    return undefined;
  }
}

async function executeRestageWork(briefingDate: string) {
  const checkInId = captureCheckIn("in_progress");
  const startedAtMs = Date.now();
  logServerEvent("info", "Restage-with-bodies cron started", { route: ROUTE, briefingDate });

  try {
    const summary = await runRestageWithBodies({});
    logServerEvent("info", "Restage-with-bodies cron completed", { route: ROUTE, ...summary, briefingDate });
    captureCheckIn(summary.ok ? "ok" : "error", checkInId, Number(((Date.now() - startedAtMs) / 1000).toFixed(3)));
  } catch (error) {
    logServerEvent("error", "Restage-with-bodies cron failed", {
      route: ROUTE,
      briefingDate,
      ...errorContext(error),
    });
    captureCheckIn("error", checkInId, Number(((Date.now() - startedAtMs) / 1000).toFixed(3)));
  }
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    logServerEvent("warn", "Unauthorized restage-with-bodies cron request rejected", {
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

  logServerEvent("info", "Restage-with-bodies cron accepted (running async via after())", {
    route: ROUTE,
    briefingDate,
    acceptedAt,
  });

  after(() => executeRestageWork(briefingDate));

  return NextResponse.json(
    { success: true, timestamp: acceptedAt, briefing_date: briefingDate, status: "accepted" },
    { status: 202 },
  );
}
