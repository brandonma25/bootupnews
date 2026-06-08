/**
 * CRON-2 — same-cycle restage-with-bodies (the eager unblock).
 *
 * Runs a FEW MINUTES after CRON-1 (extract-article-bodies), same briefing_date.
 * Re-runs the REAL pipeline via generateDailyBriefing with `useExtractedBodies`
 * — so ingestion re-fetches the still-fresh feed and toRawItem merges the
 * longer-of-native-vs-extracted body CRON-1 cached, re-gating today's blocked
 * breaking news against coreSupported with real bodies. The newly-eligible items
 * are then APPENDED to today's signal_posts (URL-keyed, post-max ranks, no churn)
 * and staging re-runs so the Notion editorial queue sees them THIS cycle.
 *
 * Decoupling: own endpoint, own ≤60s budget. fetch-editorial-inputs is NOT
 * touched (it never sets useExtractedBodies, so it never loads the body map).
 * Best-effort throughout: any failure (or pre-migration empty body map) leaves
 * today's slate exactly as the 12:00 main run left it ("no improvement", never
 * a broken briefing).
 */
import { generateDailyBriefing } from "@/lib/data";
import { demoTopics } from "@/lib/demo-data";
import { runEditorialStaging } from "@/lib/editorial-staging/runner";
import { errorContext, logServerEvent } from "@/lib/observability";
import { resolveSurfacePoolSize } from "@/lib/pipeline/surface-pool";
import { persistAppendedSignalPostsForBriefing } from "@/lib/signals-editorial";
import { getPublicSourcePlanForSurface, getRequiredSourcesForPublicSurface } from "@/lib/source-manifest";

const ROUTE = "/api/cron/restage-with-bodies";

export type RestageWithBodiesSummary = {
  briefingDate: string | null;
  eligibleSlateSize: number;
  /** Same-cycle stage-eligible count: items appended to signal_posts THIS run. */
  sameCycleStageEligible: number;
  stagedToNotion: number;
  totalMs: number;
  ok: boolean;
  message: string;
};

export async function runRestageWithBodies(
  options: { now?: Date } = {},
): Promise<RestageWithBodiesSummary> {
  const startedAtMs = Date.now();
  const elapsed = () => Date.now() - startedAtMs;

  try {
    // 1. Re-gate the REAL pipeline with CRON-1's cached bodies merged in.
    const sourcePlan = getPublicSourcePlanForSurface("public.home");
    const sources = getRequiredSourcesForPublicSurface("public.home");
    const { briefing } = await generateDailyBriefing(demoTopics, sources, {
      suppliedByManifest: sourcePlan.suppliedByManifest,
      // No second observability write — CRON-2 re-gates, it does not re-snapshot
      // the candidate telemetry the 12:00 run already produced.
      persistPipelineCandidates: false,
      filterEvergreens: true,
      surfacePoolSize: resolveSurfacePoolSize(),
      useExtractedBodies: true,
    });
    const briefingDate = briefing.briefingDate.slice(0, 10);
    const eligibleSlateSize = briefing.items.length;

    // 2. Append only newly-eligible (new-URL) items at post-max ranks; no churn.
    const persistResult = await persistAppendedSignalPostsForBriefing({
      briefingDate,
      items: briefing.items,
    });
    const sameCycleStageEligible = persistResult.insertedCount ?? 0;

    // 3. Re-stage so the Notion editorial queue picks up the appended items today.
    // Only worth running when something new actually landed.
    let stagedToNotion = 0;
    if (sameCycleStageEligible > 0) {
      try {
        const staging = await runEditorialStaging({ now: options.now });
        stagedToNotion = (staging.summary as { candidateCount?: number }).candidateCount ?? 0;
      } catch (error) {
        logServerEvent("warn", "Restage-with-bodies: staging re-run failed (non-blocking)", {
          route: ROUTE,
          briefingDate,
          ...errorContext(error),
        });
      }
    }

    const summary: RestageWithBodiesSummary = {
      briefingDate,
      eligibleSlateSize,
      sameCycleStageEligible,
      stagedToNotion,
      totalMs: elapsed(),
      ok: persistResult.ok,
      message: persistResult.message,
    };
    logServerEvent("info", "restage_with_bodies_metrics", { route: ROUTE, ...summary });
    return summary;
  } catch (error) {
    logServerEvent("error", "Restage-with-bodies run failed", {
      route: ROUTE,
      ...errorContext(error),
    });
    return {
      briefingDate: null,
      eligibleSlateSize: 0,
      sameCycleStageEligible: 0,
      stagedToNotion: 0,
      totalMs: elapsed(),
      ok: false,
      message: "Restage-with-bodies failed before completion.",
    };
  }
}
