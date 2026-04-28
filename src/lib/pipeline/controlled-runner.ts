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
import type { BriefingItem } from "@/lib/types";

function selectDraftOnlyItems(input: {
  briefingItems: BriefingItem[];
  publicRankedItems: BriefingItem[];
  config: ControlledPipelineConfig;
}) {
  const { briefingItems, config, publicRankedItems } = input;

  if (!config.draftTierAllowlist && config.draftMaxRows === null) {
    return briefingItems.filter(isCoreSignalEligible);
  }

  const allowedTiers = new Set(config.draftTierAllowlist ?? ["core_signal_eligible"]);
  const candidates = publicRankedItems.length > 0 ? publicRankedItems : briefingItems;
  const selected = candidates.filter((item) => {
    const tier = item.selectionEligibility?.tier;

    return tier === "core_signal_eligible" || tier === "context_signal_eligible"
      ? allowedTiers.has(tier)
      : false;
  });

  return config.draftMaxRows === null ? selected : selected.slice(0, config.draftMaxRows);
}

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
  const structurallyEligibleItems = selectDraftOnlyItems({
    briefingItems: briefing.items,
    publicRankedItems,
    config,
  });
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
