import { NextResponse, after } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { isCronAuthorized, todayTaipei } from "@/lib/cron/cron-endpoint-runtime";
import { errorContext, logServerEvent } from "@/lib/observability";
import { runArticleBodyExtraction } from "@/lib/article-extraction/runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/cron/extract-article-bodies";

/**
 * Decoupled full-text extraction endpoint (the source_accessibility unblock).
 *
 * Runs the EXTRACTION stage ONLY on its OWN Vercel budget and OWN schedule
 * (cron-jobs.config.ts → "bootup-extract-bodies-1220-utc", 12:20 UTC, AFTER the
 * 12:00 main ingestion so it always reads the freshest candidate set). It does
 * NOT execute inside, block, or share a budget with /api/cron/fetch-editorial-
 * inputs. A failure here writes nothing; the main cron reads an empty
 * extracted_body_text column and behaves exactly as today.
 *
 * LOCK-FREE BY DESIGN: it holds no cron_runs lock (PK is briefing_date alone).
 * The work is idempotent — re-running re-selects only candidates whose
 * extraction_status is still NULL, and each persist is keyed by candidate id.
 */
const MONITOR_SLUG =
  process.env.ARTICLE_EXTRACTION_CRON_MONITOR_SLUG?.trim() || "article-body-extraction";
const MONITOR_SCHEDULE = "20 12 * * *";

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
    // Sentry not configured / check-in send failed — never block the cron.
    return undefined;
  }
}

async function executeExtractionWork(briefingDate: string) {
  const checkInId = captureCheckIn("in_progress");
  const startedAtMs = Date.now();
  logServerEvent("info", "Article body extraction cron started", { route: ROUTE, briefingDate });

  try {
    const summary = await runArticleBodyExtraction({});
    logServerEvent("info", "Article body extraction cron completed", {
      route: ROUTE,
      briefingDate,
      ...summary,
    });
    captureCheckIn("ok", checkInId, Number(((Date.now() - startedAtMs) / 1000).toFixed(3)));
  } catch (error) {
    // runArticleBodyExtraction is best-effort and shouldn't throw; this is a
    // belt-and-suspenders guard so a surprise never escapes after().
    logServerEvent("error", "Article body extraction cron failed", {
      route: ROUTE,
      briefingDate,
      ...errorContext(error),
    });
    captureCheckIn("error", checkInId, Number(((Date.now() - startedAtMs) / 1000).toFixed(3)));
  }
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    logServerEvent("warn", "Unauthorized article extraction cron request rejected", {
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

  logServerEvent("info", "Article extraction cron accepted (running async via after())", {
    route: ROUTE,
    briefingDate,
    acceptedAt,
  });

  // Run after the response so the function keeps its full maxDuration budget
  // without making cron-job.org wait (mirrors the newsletter endpoint).
  after(() => executeExtractionWork(briefingDate));

  return NextResponse.json(
    { success: true, timestamp: acceptedAt, briefing_date: briefingDate, status: "accepted" },
    { status: 202 },
  );
}
