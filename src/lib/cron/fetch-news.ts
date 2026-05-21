import { generateDailyBriefing } from "@/lib/data";
import { demoTopics } from "@/lib/demo-data";
import { errorContext, logServerEvent } from "@/lib/observability";
import {
  captureRssCronCheckIn,
  captureRssFailure,
  withRssSpan,
} from "@/lib/observability/rss";
import { persistSignalPostsForBriefing } from "@/lib/signals-editorial";
import { getPublicSourcePlanForSurface, getRequiredSourcesForPublicSurface } from "@/lib/source-manifest";

/**
 * Task 2.C — soften the >=5 floor (PRD-11). Previously the cron threw
 * "Cron run produced N ranked briefing items; at least five are required"
 * (BOOT-UP-WEB-4) when feed failures shrank the pool below 5. The cron now
 * runs in degraded mode any time it stages fewer than the editorial target
 * but more than zero items; the hard error fires only on zero items.
 *
 * The target (7 = top 5 Core + next 2 Context) is encoded in
 * `EDITORIAL_TARGET_ITEM_COUNT` so the email + Pipeline Log surfaces report
 * the same number end-to-end.
 */
export const EDITORIAL_TARGET_ITEM_COUNT = 7;

export type DailyNewsCronRunSummary = {
  briefingDate: string | null;
  insertedSignalPostCount: number;
  pipelineRunId: string | null;
  rawItemCount: number;
  clusterCount: number;
  rankedClusterCount: number;
  usedSeedFallback: boolean;
  feedFailureCount: number;
  /**
   * True when the run completed below the editorial target (target = 7) but
   * with at least one staged item. The cron still succeeds; downstream
   * surfaces (email subject, Pipeline Log) flag the degraded state.
   */
  degraded: boolean;
  message: string;
};

export type DailyNewsCronRunResult = {
  success: boolean;
  timestamp: string;
  summary: DailyNewsCronRunSummary;
};

function buildFailureResult(timestamp: string, message: string): DailyNewsCronRunResult {
  return {
    success: false,
    timestamp,
    summary: {
      briefingDate: null,
      insertedSignalPostCount: 0,
      pipelineRunId: null,
      rawItemCount: 0,
      clusterCount: 0,
      rankedClusterCount: 0,
      usedSeedFallback: false,
      feedFailureCount: 0,
      degraded: false,
      message,
    },
  };
}

export async function runDailyNewsCron(): Promise<DailyNewsCronRunResult> {
  const timestamp = new Date().toISOString();
  const startedAtMs = Date.now();
  const checkInId = captureRssCronCheckIn("in_progress");

  logServerEvent("info", "Daily news cron started", {
    route: "/api/cron/fetch-news",
    timestamp,
  });

  try {
    const sourcePlan = getPublicSourcePlanForSurface("public.home");
    const sources = getRequiredSourcesForPublicSurface("public.home");
    const { briefing, publicRankedItems, pipelineRun } = await withRssSpan(
      "rss.refresh",
      "refresh",
      {
        route: "/api/cron/fetch-news",
      },
      () => generateDailyBriefing(demoTopics, sources, { suppliedByManifest: sourcePlan.suppliedByManifest }),
    );
    const briefingDate = briefing.briefingDate.slice(0, 10);
    const stagedItemCount = briefing.items.length;
    const degraded =
      stagedItemCount > 0 && stagedItemCount < EDITORIAL_TARGET_ITEM_COUNT;
    const baseSummary = {
      briefingDate,
      insertedSignalPostCount: 0,
      pipelineRunId: pipelineRun.run_id,
      rawItemCount: pipelineRun.num_raw_items,
      clusterCount: pipelineRun.num_clusters,
      rankedClusterCount: publicRankedItems.length,
      usedSeedFallback: pipelineRun.used_seed_fallback,
      feedFailureCount: pipelineRun.feed_failures.length,
      degraded,
    };

    if (pipelineRun.used_seed_fallback) {
      const result = {
        success: false,
        timestamp,
        summary: {
          ...baseSummary,
          message: "Cron run skipped editorial persistence because live feeds fell back to deterministic seed data.",
        },
      };

      logServerEvent("warn", "Daily news cron skipped seed fallback output", {
        route: "/api/cron/fetch-news",
        ...result.summary,
      });
      captureRssFailure(new Error(result.summary.message), {
        failureType: "rss_refresh_job_failed",
        phase: "refresh",
        level: "error",
        retryCount: pipelineRun.feed_failures.length,
        message: result.summary.message,
        extra: {
          route: "/api/cron/fetch-news",
          pipelineRunId: pipelineRun.run_id,
          usedSeedFallback: true,
          feedFailureCount: pipelineRun.feed_failures.length,
        },
      });
      captureRssCronCheckIn("error", checkInId, durationSeconds(startedAtMs));

      return result;
    }

    // Task 2.C — soften the >=5 floor. The hard error fires only on zero
    // staged items (the run is genuinely useless). 1–6 items run in
    // "degraded" mode: persist what we have, set the degraded flag, and let
    // the editorial-staging email surface the shortfall to the operator.
    if (briefing.items.length === 0) {
      const result = {
        success: false,
        timestamp,
        summary: {
          ...baseSummary,
          message:
            "Cron run produced zero ranked briefing items; editorial review cannot proceed.",
        },
      };

      logServerEvent("error", "Daily news cron produced zero items", {
        route: "/api/cron/fetch-news",
        ...result.summary,
        briefingItemCount: 0,
      });
      captureRssFailure(new Error(result.summary.message), {
        failureType: "rss_refresh_job_failed",
        phase: "refresh",
        level: "error",
        message: result.summary.message,
        extra: {
          route: "/api/cron/fetch-news",
          pipelineRunId: pipelineRun.run_id,
          briefingItemCount: 0,
          feedFailureCount: pipelineRun.feed_failures.length,
        },
      });
      captureRssCronCheckIn("error", checkInId, durationSeconds(startedAtMs));

      return result;
    }

    if (degraded) {
      // Not a Sentry-worthy event — the editor needs to know we shipped fewer
      // than target, but the run completed and downstream email will say so.
      logServerEvent("warn", "Daily news cron completed in degraded mode", {
        route: "/api/cron/fetch-news",
        briefingItemCount: stagedItemCount,
        targetItemCount: EDITORIAL_TARGET_ITEM_COUNT,
        ...baseSummary,
      });
    }

    const snapshot = await persistSignalPostsForBriefing({
      briefingDate,
      items: briefing.items,
    });
    const result = {
      success: snapshot.ok,
      timestamp,
      summary: {
        ...baseSummary,
        insertedSignalPostCount: snapshot.insertedCount,
        message: snapshot.message,
      },
    };

    logServerEvent(snapshot.ok ? "info" : "error", snapshot.ok ? "Daily news cron succeeded" : "Daily news cron failed", {
      route: "/api/cron/fetch-news",
      ...result.summary,
    });

    if (!snapshot.ok) {
      captureRssFailure(new Error("RSS signal post persistence failed during daily refresh."), {
        failureType: "rss_cache_write_failed",
        phase: "store",
        level: "error",
        message: "RSS signal post persistence failed during daily refresh.",
        extra: {
          route: "/api/cron/fetch-news",
          pipelineRunId: pipelineRun.run_id,
          briefingDate,
          operation: "persist_signal_posts",
        },
      });
    }

    captureRssCronCheckIn(snapshot.ok ? "ok" : "error", checkInId, durationSeconds(startedAtMs));

    return result;
  } catch (error) {
    const result = buildFailureResult(timestamp, "Daily news cron failed before completion.");

    logServerEvent("error", "Daily news cron failed", {
      route: "/api/cron/fetch-news",
      timestamp,
      ...errorContext(error),
    });
    captureRssFailure(error, {
      failureType: "rss_refresh_job_failed",
      phase: "refresh",
      level: "error",
      message: result.summary.message,
      extra: {
        route: "/api/cron/fetch-news",
      },
    });
    captureRssCronCheckIn("error", checkInId, durationSeconds(startedAtMs));

    return result;
  }
}

function durationSeconds(startedAtMs: number) {
  return Number(((Date.now() - startedAtMs) / 1000).toFixed(3));
}
