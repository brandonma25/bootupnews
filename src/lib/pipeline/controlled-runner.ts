import { generateDailyBriefing } from "@/lib/data";
import { demoTopics } from "@/lib/demo-data";
import {
  assertControlledPipelineCanExecute,
  buildControlledPipelineReport,
  type ControlledPipelineConfig,
  type ControlledPipelineReport,
} from "@/lib/pipeline/controlled-execution";
import { isCoreSignalEligible } from "@/lib/signal-selection-eligibility";
import { persistSignalPostsForBriefing } from "@/lib/signals-editorial";
import { getPublicSourcePlanForSurface, getRequiredSourcesForPublicSurface } from "@/lib/source-manifest";

export async function runControlledPipeline(
  config: ControlledPipelineConfig,
): Promise<ControlledPipelineReport> {
  assertControlledPipelineCanExecute(config);

  if (config.mode === "normal") {
    throw new Error(
      "Controlled pipeline execution is limited to dry_run and draft_only. Normal scheduled execution remains owned by /api/cron/fetch-news after re-enable approval.",
    );
  }

  const sourcePlan = getPublicSourcePlanForSurface("public.home");
  const sources = getRequiredSourcesForPublicSurface("public.home");
  const { briefing, publicRankedItems, pipelineRun } = await generateDailyBriefing(
    demoTopics,
    sources,
    {
      suppliedByManifest: sourcePlan.suppliedByManifest,
      persistPipelineCandidates: false,
    },
  );
  const briefingDate = config.briefingDateOverride ?? briefing.briefingDate.slice(0, 10);
  const structurallyEligibleItems = briefing.items.filter(isCoreSignalEligible);
  const persistence = config.mode === "draft_only"
    ? await persistSignalPostsForBriefing({
        briefingDate,
        items: structurallyEligibleItems,
        mode: "draft_only",
      })
    : null;

  return buildControlledPipelineReport({
    mode: config.mode,
    testRunId: config.testRunId,
    briefing: {
      ...briefing,
      briefingDate: `${briefingDate}T12:00:00.000Z`,
      items: structurallyEligibleItems,
    },
    publicRankedItems,
    pipelineRun,
    sourcePlan,
    persistence,
  });
}
