import { readFile } from "node:fs/promises";

import { generateDailyBriefing } from "@/lib/data";
import { demoTopics } from "@/lib/demo-data";
import {
  assertControlledPipelineCanExecute,
  buildControlledPipelineReport,
  type ControlledPipelineConfig,
  type ControlledPipelineReport,
  type ControlledPipelineDraftTier,
  type ControlledPipelineSignalReport,
} from "@/lib/pipeline/controlled-execution";
import { isCoreSignalEligible } from "@/lib/signal-selection-eligibility";
import { persistSignalPostsForBriefing } from "@/lib/signals-editorial";
import { getPublicSourcePlanForSurface, getRequiredSourcesForPublicSurface } from "@/lib/source-manifest";
import type { BriefingItem, SignalSelectionEligibilityTier } from "@/lib/types";

type ReplayArtifact = ControlledPipelineReport;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateReplaySignalRows(rows: unknown, label: string, expectedTier: SignalSelectionEligibilityTier) {
  if (!Array.isArray(rows)) {
    throw new Error(`PIPELINE_REPLAY_ARTIFACT_PATH is malformed: ${label} must be an array.`);
  }

  return rows.map((row, index) => {
    if (!isRecord(row)) {
      throw new Error(`PIPELINE_REPLAY_ARTIFACT_PATH is malformed: ${label}[${index}] must be an object.`);
    }

    if (row.eligibilityTier !== expectedTier) {
      throw new Error(
        `PIPELINE_REPLAY_ARTIFACT_PATH is malformed: ${label}[${index}] must use ${expectedTier}.`,
      );
    }

    if (typeof row.title !== "string" || row.title.trim().length === 0) {
      throw new Error(`PIPELINE_REPLAY_ARTIFACT_PATH is malformed: ${label}[${index}] must include a title.`);
    }

    if (typeof row.whyItMatters !== "string" || row.whyItMatters.trim().length === 0) {
      throw new Error(`PIPELINE_REPLAY_ARTIFACT_PATH is malformed: ${label}[${index}] must include whyItMatters.`);
    }

    if (row.validationStatus !== "passed" && row.validationStatus !== "requires_human_rewrite") {
      throw new Error(`PIPELINE_REPLAY_ARTIFACT_PATH is malformed: ${label}[${index}] must include validationStatus.`);
    }

    if (!Array.isArray(row.validationFailures)) {
      throw new Error(`PIPELINE_REPLAY_ARTIFACT_PATH is malformed: ${label}[${index}] must include validationFailures.`);
    }

    if (!Array.isArray(row.validationDetails)) {
      throw new Error(`PIPELINE_REPLAY_ARTIFACT_PATH is malformed: ${label}[${index}] must include validationDetails.`);
    }

    return row as unknown as ControlledPipelineSignalReport;
  });
}

async function loadReplayArtifact(config: ControlledPipelineConfig): Promise<ReplayArtifact> {
  if (!config.replayArtifactPath) {
    throw new Error("PIPELINE_REPLAY_ARTIFACT_PATH is required for replay mode.");
  }

  let raw: string;

  try {
    raw = await readFile(config.replayArtifactPath, "utf8");
  } catch {
    throw new Error("PIPELINE_REPLAY_ARTIFACT_PATH could not be read.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("PIPELINE_REPLAY_ARTIFACT_PATH is malformed JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("PIPELINE_REPLAY_ARTIFACT_PATH is malformed: expected an object.");
  }

  if (parsed.mode !== "dry_run") {
    throw new Error("PIPELINE_REPLAY_ARTIFACT_PATH must point to a controlled dry_run artifact.");
  }

  if (typeof parsed.runId !== "string" || parsed.runId.trim().length === 0) {
    throw new Error("PIPELINE_REPLAY_ARTIFACT_PATH is malformed: missing runId.");
  }

  if (config.replayExpectedRunId && parsed.runId !== config.replayExpectedRunId) {
    throw new Error("PIPELINE_REPLAY_EXPECTED_RUN_ID does not match the replay artifact runId.");
  }

  if (parsed.persistence !== null) {
    throw new Error("PIPELINE_REPLAY_ARTIFACT_PATH must have persistence=null.");
  }

  validateReplaySignalRows(parsed.proposedTopFive, "proposedTopFive", "core_signal_eligible");
  validateReplaySignalRows(parsed.proposedContextRows, "proposedContextRows", "context_signal_eligible");

  return parsed as unknown as ReplayArtifact;
}

function selectReplaySignalRows(input: {
  artifact: ReplayArtifact;
  config: ControlledPipelineConfig;
}) {
  const { artifact, config } = input;
  const allowedTiers = new Set<ControlledPipelineDraftTier>(config.draftTierAllowlist ?? ["core_signal_eligible"]);
  const replayRows = [
    ...artifact.proposedTopFive,
    ...artifact.proposedContextRows,
  ];
  const disallowedRow = replayRows.find((row) => !allowedTiers.has(row.eligibilityTier as ControlledPipelineDraftTier));

  if (disallowedRow) {
    throw new Error(
      `PIPELINE_REPLAY_ARTIFACT_PATH contains ${disallowedRow.eligibilityTier}, which is outside PIPELINE_DRAFT_TIER_ALLOWLIST.`,
    );
  }

  const selected = config.draftMaxRows === null
    ? replayRows
    : replayRows.slice(0, config.draftMaxRows);

  if (selected.length === 0) {
    throw new Error("PIPELINE_REPLAY_ARTIFACT_PATH did not contain selectable Core or Context rows.");
  }

  return selected;
}

function normalizeReplayNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function replaySignalToBriefingItem(row: ControlledPipelineSignalReport, index: number): BriefingItem {
  const sourceTitle = row.sourceName ?? "Replay source";
  const sourceUrl = row.sourceUrl ?? "";

  return {
    id: `replay-${row.id || index + 1}`,
    topicId: "phase-b-replay",
    topicName: row.topic ?? row.category ?? "Phase B Replay",
    title: row.title,
    whatHappened: row.title,
    keyPoints: [
      sourceTitle,
      row.eventType ?? "event type unavailable",
      row.contentAccessibility ?? "accessibility unavailable",
    ],
    whyItMatters: row.whyItMatters,
    aiWhyItMatters: row.whyItMatters,
    whyItMattersValidation: {
      passed: row.validationStatus === "passed",
      failures: row.validationFailures,
      failureDetails: row.validationDetails,
      recommendedAction: row.validationStatus === "passed" ? "approve" : "requires_human_rewrite",
    },
    sources: [{ title: sourceTitle, url: sourceUrl }],
    sourceCount: row.sourceCount ?? 1,
    estimatedMinutes: 4,
    read: false,
    priority: row.eligibilityTier === "core_signal_eligible" ? "top" : "normal",
    importanceScore: normalizeReplayNumber(row.finalScore),
    rankingSignals: row.selectionEligibilityReasons.length > 0 ? row.selectionEligibilityReasons : undefined,
    selectionEligibility: {
      tier: row.eligibilityTier,
      reasons: row.selectionEligibilityReasons,
      warnings: row.selectionQualityWarnings,
      filterDecision: row.filterDecision === "pass" || row.filterDecision === "suppress" || row.filterDecision === "reject"
        ? row.filterDecision
        : undefined,
      filterSeverity: row.filterSeverity === "pass" || row.filterSeverity === "suppress" || row.filterSeverity === "reject"
        ? row.filterSeverity
        : undefined,
      filterReasons: row.filterReasons,
      sourceTier: row.sourceTier ?? undefined,
      sourceRole: row.sourceRole ?? undefined,
      contentAccessibility: row.contentAccessibility ?? undefined,
      accessibleTextLength: row.accessibleTextLength ?? undefined,
      sourceAccessibilityWarnings: row.sourceAccessibilityWarnings,
      coreBlockingReasons: row.coreBlockingReasons,
      calibratedReasonLabels: row.calibratedReasonLabels,
      exclusionCause: row.exclusionCause,
      eventType: row.eventType ?? undefined,
      structuralImportanceScore: row.structuralImportanceScore ?? undefined,
      sourceQualityScore: row.sourceQualityScore ?? undefined,
      finalScore: row.finalScore ?? undefined,
      scoreComponents: {
        credibility: row.legacyScoreComponents?.credibility,
        novelty: row.legacyScoreComponents?.novelty,
        urgency: row.legacyScoreComponents?.urgency,
        reinforcement: row.legacyScoreComponents?.reinforcement,
        trust_timeliness: row.groupedScoreComponents?.trust_timeliness,
        event_importance: row.groupedScoreComponents?.event_importance,
        support_and_novelty: row.groupedScoreComponents?.support_and_novelty,
        importance_adjustment: row.groupedScoreComponents?.importance_adjustment,
      },
      rankingProvider: row.rankingProvider,
      diversityProvider: row.diversityProvider,
    },
  };
}

async function runControlledPipelineReplay(config: ControlledPipelineConfig): Promise<ControlledPipelineReport> {
  const artifact = await loadReplayArtifact(config);
  const replayRows = selectReplaySignalRows({ artifact, config });
  const replayItems = replayRows.map(replaySignalToBriefingItem);
  const briefingDate = config.briefingDateOverride ?? artifact.generatedBriefingDate;
  const persistence = config.mode === "draft_only"
    ? await persistSignalPostsForBriefing({
        briefingDate,
        items: replayItems,
        mode: "draft_only",
      })
    : null;

  return buildControlledPipelineReport({
    mode: config.mode,
    testRunId: config.testRunId,
    briefing: {
      id: `replay-${artifact.runId}`,
      briefingDate: `${briefingDate}T12:00:00.000Z`,
      title: "Controlled Replay Briefing",
      intro: "Controlled replay from a prior dry-run artifact.",
      readingWindow: "Controlled replay",
      items: replayItems,
    },
    publicRankedItems: replayItems,
    pipelineRun: {
      run_id: artifact.runId,
      num_clusters: replayItems.length,
      active_sources: artifact.activeSources,
      source_contributions: [],
      article_filter_evaluations: [],
    } as never,
    sourcePlan: artifact.sourcePlan as never,
    persistence,
  });
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

  if (config.replayArtifactPath) {
    return runControlledPipelineReplay(config);
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
