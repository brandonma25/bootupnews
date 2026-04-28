import type { ClusterFirstPipelineResult } from "@/lib/pipeline";
import type { PublicSourcePlan } from "@/lib/source-manifest";
import type { SignalSnapshotPersistenceResult } from "@/lib/signals-editorial";
import type { BriefingItem, DailyBriefing, SignalSelectionEligibilityTier } from "@/lib/types";
import { validateWhyItMatters } from "@/lib/why-it-matters-quality-gate";
import { summarizeSourceDistribution } from "@/lib/signal-selection-eligibility";

export type PipelineRunMode = "normal" | "dry_run" | "draft_only";
export type PipelineTargetEnvironment = "local" | "preview" | "staging" | "production";

export type ControlledPipelineConfig = {
  mode: PipelineRunMode;
  briefingDateOverride: string | null;
  testRunId: string | null;
  targetEnvironment: PipelineTargetEnvironment;
  allowProductionPipelineTest: boolean;
  cronDisabledConfirmed: boolean;
  artifactDir: string;
};

export type ControlledPipelineSignalReport = {
  id: string;
  rank: number;
  title: string;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceCount: number | null;
  sourceTier: string | null;
  articleId: string | null;
  clusterId: string | null;
  articleCount: number | null;
  sourceDiversity: number | null;
  recency: number | null;
  velocity: number | null;
  category: string | null;
  topic: string | null;
  eventType: string | null;
  filterDecision: string | null;
  filterSeverity: string | null;
  filterReasons: string[];
  eligibilityTier: SignalSelectionEligibilityTier;
  structuralImportanceScore: number | null;
  sourceQualityScore: number | null;
  groupedScoreComponents: Record<string, number | undefined> | null;
  legacyScoreComponents: Record<string, number | undefined> | null;
  finalScore: number | null;
  rankingProvider: string | null;
  diversityProvider: string | null;
  whyItMatters: string;
  validationStatus: "passed" | "requires_human_rewrite";
  validationFailures: string[];
  validationDetails: string[];
  selectionQualityWarnings: string[];
  selectionEligibilityReasons: string[];
};

export type ControlledPipelineArticleCandidateReport = {
  runId: string;
  briefingDate: string;
  articleId: string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  sourceTier: string;
  eventType: string;
  filterDecision: string;
  filterSeverity: string;
  filterReasons: string[];
};

export type ControlledPipelineSelectionSummary = {
  activeSourceCount: number;
  activeSourceList: ClusterFirstPipelineResult["run"]["active_sources"];
  sourceDistributionOfIngestedCandidates: Record<string, number>;
  sourceDistributionOfProposedTopFive: Record<string, number>;
  categoryDistributionOfCandidates: Record<string, number>;
  sourcePlanWarnings: string[];
  manifestCoverageWarnings: string[];
  categoriesRepresented: string[];
  eligibleCoreCount: number;
  contextEligibleCount: number;
  depthOnlyCount: number;
  excludedWeakCandidateCount: number;
  candidate_pool_insufficient: boolean;
  sourceScarcityLikely: boolean;
  selectionQualityWarnings: string[];
};

export type ControlledPipelineReport = {
  mode: PipelineRunMode;
  testRunId: string | null;
  runId: string;
  generatedBriefingDate: string;
  candidateCount: number;
  clusterCount: number;
  signalCount: number;
  sourcePlan: PublicSourcePlan | {
    plan: "fallback";
    surface: null;
    suppliedByManifest: false;
    sourceCount: number;
    sourceIds: string[];
    sources: [];
    warnings: string[];
  };
  activeSourceCount: number;
  activeSources: ClusterFirstPipelineResult["run"]["active_sources"];
  sourceDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  articleCandidates: ControlledPipelineArticleCandidateReport[];
  selectionSummary: ControlledPipelineSelectionSummary;
  candidate_pool_insufficient: boolean;
  proposedTopFive: ControlledPipelineSignalReport[];
  proposedContextRows: ControlledPipelineSignalReport[];
  proposedDepthRows: ControlledPipelineSignalReport[];
  excludedCandidates: ControlledPipelineSignalReport[];
  persistence: SignalSnapshotPersistenceResult | null;
};

const VALID_RUN_MODES = new Set<PipelineRunMode>(["normal", "dry_run", "draft_only"]);
const VALID_TARGET_ENVIRONMENTS = new Set<PipelineTargetEnvironment>([
  "local",
  "preview",
  "staging",
  "production",
]);

function normalizeEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

function parseBooleanEnv(value: string | undefined) {
  return /^(1|true|yes|on)$/i.test(normalizeEnv(value));
}

function parseRunMode(value: string | undefined): PipelineRunMode {
  const normalized = normalizeEnv(value) || "normal";

  if (VALID_RUN_MODES.has(normalized as PipelineRunMode)) {
    return normalized as PipelineRunMode;
  }

  throw new Error(
    `Invalid PIPELINE_RUN_MODE "${normalized}". Expected one of: normal, dry_run, draft_only.`,
  );
}

function parseTargetEnvironment(env: NodeJS.ProcessEnv): PipelineTargetEnvironment {
  const explicitTarget = normalizeEnv(env.PIPELINE_TARGET_ENV);
  const vercelTarget = normalizeEnv(env.VERCEL_ENV);
  const nodeTarget = normalizeEnv(env.NODE_ENV);
  const normalized = (explicitTarget || vercelTarget || (nodeTarget === "production" ? "production" : "local"))
    .toLowerCase();

  if (VALID_TARGET_ENVIRONMENTS.has(normalized as PipelineTargetEnvironment)) {
    return normalized as PipelineTargetEnvironment;
  }

  throw new Error(
    `Invalid pipeline target environment "${normalized}". Expected one of: local, preview, staging, production.`,
  );
}

function parseBriefingDateOverride(value: string | undefined) {
  const normalized = normalizeEnv(value);

  if (!normalized) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("BRIEFING_DATE_OVERRIDE must use YYYY-MM-DD format.");
  }

  return normalized;
}

export function resolveControlledPipelineConfig(env: NodeJS.ProcessEnv = process.env): ControlledPipelineConfig {
  return {
    mode: parseRunMode(env.PIPELINE_RUN_MODE),
    briefingDateOverride: parseBriefingDateOverride(env.BRIEFING_DATE_OVERRIDE),
    testRunId: normalizeEnv(env.PIPELINE_TEST_RUN_ID) || null,
    targetEnvironment: parseTargetEnvironment(env),
    allowProductionPipelineTest: parseBooleanEnv(env.ALLOW_PRODUCTION_PIPELINE_TEST),
    cronDisabledConfirmed: parseBooleanEnv(env.PIPELINE_CRON_DISABLED_CONFIRMED),
    artifactDir: normalizeEnv(env.PIPELINE_RUN_ARTIFACT_DIR) || ".pipeline-runs",
  };
}

export function assertControlledPipelineCanExecute(config: ControlledPipelineConfig) {
  if (config.mode === "normal" && config.briefingDateOverride) {
    throw new Error("BRIEFING_DATE_OVERRIDE is not allowed for normal pipeline runs.");
  }

  if (config.mode === "normal" && config.testRunId) {
    throw new Error("PIPELINE_TEST_RUN_ID is not allowed for normal pipeline runs.");
  }

  if (config.mode !== "draft_only") {
    return;
  }

  if (!config.briefingDateOverride) {
    throw new Error("draft_only mode requires BRIEFING_DATE_OVERRIDE=YYYY-MM-DD.");
  }

  if (!config.testRunId) {
    throw new Error("draft_only mode requires PIPELINE_TEST_RUN_ID.");
  }

  if (config.targetEnvironment !== "production") {
    return;
  }

  if (!config.allowProductionPipelineTest) {
    throw new Error("production draft_only mode requires ALLOW_PRODUCTION_PIPELINE_TEST=true.");
  }

  if (!config.cronDisabledConfirmed) {
    throw new Error("production draft_only mode requires PIPELINE_CRON_DISABLED_CONFIRMED=true.");
  }
}

function selectSignalText(item: BriefingItem) {
  return (item.aiWhyItMatters ?? item.whyItMatters ?? "").trim();
}

function getClusterId(item: BriefingItem) {
  return item.id.startsWith("generated-") ? item.id.slice("generated-".length) : null;
}

function mapSignalReport(item: BriefingItem, rank: number): ControlledPipelineSignalReport {
  const source = item.sources[0] ?? item.relatedArticles?.[0] ?? null;
  const whyItMatters = selectSignalText(item);
  const validation = validateWhyItMatters(whyItMatters);
  const sourceName = source
    ? "sourceName" in source && typeof source.sourceName === "string"
      ? source.sourceName
      : source.title
    : null;
  const eligibility = item.selectionEligibility;
  const sourceDiversity =
    item.sourceCount ??
    item.eventIntelligence?.signals.sourceDiversity ??
    new Set(item.sources.map((entry) => entry.title)).size;

  return {
    id: item.id,
    rank,
    title: item.title,
    sourceName: sourceName ?? null,
    sourceUrl: source?.url ?? null,
    sourceCount: item.sourceCount ?? item.sources.length,
    sourceTier: eligibility?.sourceTier ?? null,
    articleId: item.relatedArticles?.[0]?.url ?? source?.url ?? null,
    clusterId: getClusterId(item),
    articleCount: item.eventIntelligence?.signals.articleCount ?? item.relatedArticles?.length ?? null,
    sourceDiversity,
    recency: item.eventIntelligence?.signals.recencyScore ?? null,
    velocity: item.eventIntelligence?.signals.velocityScore ?? null,
    category: item.homepageClassification?.primaryCategory ?? null,
    topic: item.topicName,
    eventType: eligibility?.eventType ?? item.eventIntelligence?.eventType ?? null,
    filterDecision: eligibility?.filterDecision ?? null,
    filterSeverity: eligibility?.filterSeverity ?? null,
    filterReasons: eligibility?.filterReasons ?? [],
    eligibilityTier: eligibility?.tier ?? "core_signal_eligible",
    structuralImportanceScore: eligibility?.structuralImportanceScore ?? null,
    sourceQualityScore: eligibility?.sourceQualityScore ?? null,
    groupedScoreComponents: eligibility?.scoreComponents
      ? {
          trust_timeliness: eligibility.scoreComponents.trust_timeliness,
          event_importance: eligibility.scoreComponents.event_importance,
          support_and_novelty: eligibility.scoreComponents.support_and_novelty,
          importance_adjustment: eligibility.scoreComponents.importance_adjustment,
        }
      : null,
    legacyScoreComponents: eligibility?.scoreComponents
      ? {
          credibility: eligibility.scoreComponents.credibility,
          novelty: eligibility.scoreComponents.novelty,
          urgency: eligibility.scoreComponents.urgency,
          reinforcement: eligibility.scoreComponents.reinforcement,
        }
      : null,
    finalScore: eligibility?.finalScore ?? item.importanceScore ?? item.matchScore ?? null,
    rankingProvider: eligibility?.rankingProvider ?? null,
    diversityProvider: eligibility?.diversityProvider ?? null,
    whyItMatters,
    validationStatus: validation.passed ? "passed" : "requires_human_rewrite",
    validationFailures: validation.failures,
    validationDetails: validation.failureDetails,
    selectionQualityWarnings: eligibility?.warnings ?? [],
    selectionEligibilityReasons: eligibility?.reasons ?? [],
  };
}

function mapArticleCandidateReport(
  runId: string,
  briefingDate: string,
  entry: ClusterFirstPipelineResult["run"]["article_filter_evaluations"][number],
): ControlledPipelineArticleCandidateReport {
  return {
    runId,
    briefingDate,
    articleId: entry.article_id,
    title: entry.title,
    sourceName: entry.source_name,
    sourceUrl: entry.source_url,
    sourceTier: entry.source_tier,
    eventType: entry.event_type,
    filterDecision: entry.filter_decision,
    filterSeverity: entry.filter_severity,
    filterReasons: entry.filter_reasons,
  };
}

function summarizeCategoryDistribution(items: ControlledPipelineSignalReport[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = item.category ?? item.topic ?? "uncategorized";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function buildFallbackSourcePlan(activeSources: ClusterFirstPipelineResult["run"]["active_sources"]) {
  return {
    plan: "fallback" as const,
    surface: null,
    suppliedByManifest: false as const,
    sourceCount: activeSources.length,
    sourceIds: activeSources.map((source) => source.source_id),
    sources: [] as [],
    warnings: ["source_plan_metadata_unavailable"],
  };
}

export function buildControlledPipelineReport(input: {
  mode: PipelineRunMode;
  testRunId?: string | null;
  briefing: DailyBriefing;
  publicRankedItems: BriefingItem[];
  pipelineRun: ClusterFirstPipelineResult["run"];
  sourcePlan?: PublicSourcePlan;
  persistence?: SignalSnapshotPersistenceResult | null;
}): ControlledPipelineReport {
  const candidates = input.publicRankedItems.length > 0
    ? input.publicRankedItems
    : input.briefing.items;
  const generatedBriefingDate = input.briefing.briefingDate.slice(0, 10);
  const candidateReports = candidates.map((item, index) => mapSignalReport(item, index + 1));
  const proposedTopFive = candidateReports
    .filter((item) => item.eligibilityTier === "core_signal_eligible")
    .slice(0, 5)
    .map((item, index) => ({ ...item, rank: index + 1 }));
  const proposedContextRows = candidateReports
    .filter((item) => item.eligibilityTier === "context_signal_eligible")
    .slice(0, 2)
    .map((item, index) => ({ ...item, rank: index + 6 }));
  const proposedDepthRows = candidateReports
    .filter((item) => item.eligibilityTier === "depth_only")
    .slice(0, 13)
    .map((item, index) => ({ ...item, rank: index + 8 }));
  const excludedCandidates = candidateReports
    .filter((item) => item.eligibilityTier === "exclude_from_public_candidates");
  const articleFilterEvaluations = input.pipelineRun.article_filter_evaluations ?? [];
  const activeSources = input.pipelineRun.active_sources ?? [];
  const sourceContributions = input.pipelineRun.source_contributions ?? [];
  const articleCandidates = articleFilterEvaluations.map((entry) =>
    mapArticleCandidateReport(input.pipelineRun.run_id, generatedBriefingDate, entry),
  );
  const activeSourceCount = activeSources.length;
  const sourcePlan = input.sourcePlan ?? buildFallbackSourcePlan(activeSources);
  const activeContributingSourceCount = sourceContributions.filter((entry) => entry.item_count > 0).length;
  const sourceDistribution = summarizeSourceDistribution(
    articleFilterEvaluations.map((entry) => ({ source_name: entry.source_name })),
  );
  const categoryDistribution = summarizeCategoryDistribution(candidateReports);
  const categoriesRepresented = [
    ...new Set(candidateReports.map((item) => item.category ?? item.topic).filter((value): value is string => Boolean(value))),
  ];
  const manifestCoverageWarnings = [
    sourcePlan.plan === "public_manifest" && activeSourceCount < sourcePlan.sourceCount
      ? `active_source_count_${activeSourceCount}_below_manifest_source_count_${sourcePlan.sourceCount}`
      : null,
    sourcePlan.plan === "public_manifest" && activeContributingSourceCount < Math.min(4, sourcePlan.sourceCount)
      ? `contributing_source_count_${activeContributingSourceCount}_below_expected_minimum`
      : null,
  ].filter((value): value is string => Boolean(value));
  const sourceScarcityLikely =
    activeSourceCount < 5 ||
    activeContributingSourceCount < 4 ||
    categoriesRepresented.length < 3;
  const candidatePoolInsufficient = proposedTopFive.length < 5;
  const selectionQualityWarnings = [
    candidatePoolInsufficient ? `eligible_core_count_${proposedTopFive.length}_below_required_5` : null,
    sourceScarcityLikely && activeSourceCount > 0 ? "source_pool_likely_constrained_selection" : null,
  ].filter((value): value is string => Boolean(value));
  const selectionSummary: ControlledPipelineSelectionSummary = {
    activeSourceCount,
    activeSourceList: activeSources,
    sourceDistributionOfIngestedCandidates: sourceDistribution,
    sourceDistributionOfProposedTopFive: summarizeSourceDistribution(proposedTopFive),
    categoryDistributionOfCandidates: categoryDistribution,
    sourcePlanWarnings: sourcePlan.warnings,
    manifestCoverageWarnings,
    categoriesRepresented,
    eligibleCoreCount: proposedTopFive.length,
    contextEligibleCount: proposedContextRows.length,
    depthOnlyCount: proposedDepthRows.length,
    excludedWeakCandidateCount: excludedCandidates.length + articleCandidates.filter((entry) => entry.filterDecision !== "pass").length,
    candidate_pool_insufficient: candidatePoolInsufficient,
    sourceScarcityLikely,
    selectionQualityWarnings,
  };

  return {
    mode: input.mode,
    testRunId: input.testRunId ?? null,
    runId: input.pipelineRun.run_id,
    generatedBriefingDate,
    candidateCount: candidates.length,
    clusterCount: input.pipelineRun.num_clusters,
    signalCount: input.briefing.items.length,
    sourcePlan,
    activeSourceCount,
    activeSources,
    sourceDistribution,
    categoryDistribution,
    articleCandidates,
    selectionSummary,
    candidate_pool_insufficient: candidatePoolInsufficient,
    proposedTopFive,
    proposedContextRows,
    proposedDepthRows,
    excludedCandidates,
    persistence: input.persistence ?? null,
  };
}
