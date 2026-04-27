import type { ArticleFilterEvaluation, ArticleFilterCandidate, EventType } from "@/lib/signal-filtering";
import { applySignalFiltering } from "@/lib/signal-filtering";
import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { StoryCluster } from "@/lib/models/signal-cluster";
import type { RankedStoryClusterResult } from "@/lib/scoring/scoring-engine";
import type {
  BriefingItem,
  SignalSelectionEligibility,
  SignalSelectionEligibilityTier,
} from "@/lib/types";

const CORE_EVENT_TYPES = new Set<EventType>([
  "policy_regulation",
  "earnings_financials",
  "mna_funding",
  "geopolitics",
  "executive_change_strategic",
  "legal_investigation",
  "supply_chain_disruption",
  "macro_market_move",
]);

const STRUCTURAL_CONTEXT_EVENT_TYPES = new Set<EventType>([
  ...CORE_EVENT_TYPES,
  "product_launch_major",
  "partnership_major",
]);

const LOW_SIGNAL_EVENT_TYPES = new Set<EventType>([
  "generic_commentary",
  "opinion_only",
  "promotional",
  "culture_filler",
  "human_interest_low_relevance",
  "minor_feature_update",
  "repetitive_followup_no_new_info",
]);

const WEAK_PUBLIC_CONTENT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(podcast|trailer|teaser|tv|movie|celebrity|entertainment)\b/i, reason: "weak_entertainment_or_podcast_content" },
  { pattern: /\b(gadget|device deal|discount|gift guide|hands-on|review|gaming mouse|touchscreen mouse)\b/i, reason: "weak_gadget_or_review_content" },
  { pattern: /\b(workout|fitness|lifestyle|fashion)\b/i, reason: "weak_lifestyle_content" },
  { pattern: /\b(partnering with|partners with|partnership)\b/i, reason: "weak_consumer_partnership_without_system_impact" },
  { pattern: /\b(upcoming|leak|dummy|drops full|new colors|spring colors)\b/i, reason: "weak_product_update_or_promo_content" },
];

function normalizeTrustTier(value: string | null | undefined) {
  if (value === "tier_1") return "tier1";
  if (value === "tier_2") return "tier2";
  if (value === "tier_3") return "tier3";
  return value ?? "unknown";
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function getContentCorpus(input: {
  item?: Pick<BriefingItem, "title" | "whatHappened" | "whyItMatters" | "matchedKeywords">;
  cluster?: StoryCluster;
}) {
  return [
    input.item?.title,
    input.item?.whatHappened,
    input.item?.whyItMatters,
    ...(input.item?.matchedKeywords ?? []),
    input.cluster?.representative_article.title,
    input.cluster?.representative_article.content,
    ...(input.cluster?.topic_keywords ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function hasSpecificity(item: BriefingItem, cluster: StoryCluster) {
  const corpus = getContentCorpus({ item, cluster });
  const hasNumber = /(?:\$|€|£)?\d+(?:\.\d+)?\s?(?:%|bn|b|mn|m|million|billion|trillion|gw|gigawatts)?\b/i.test(corpus);
  const hasEntity =
    cluster.representative_article.normalized_entities.length > 0 ||
    cluster.articles.some((article) => article.normalized_entities.length > 0 || article.entities.length > 0) ||
    (item.eventIntelligence?.entities.length ?? 0) > 0 ||
    (item.eventIntelligence?.keyEntities.length ?? 0) > 0;
  const hasProperNoun = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(item.title);

  return hasNumber || hasEntity || hasProperNoun;
}

function getWeakContentReasons(item: BriefingItem, cluster: StoryCluster) {
  const corpus = getContentCorpus({ item, cluster });

  return WEAK_PUBLIC_CONTENT_PATTERNS
    .filter((entry) => entry.pattern.test(corpus))
    .map((entry) => entry.reason);
}

export function buildArticleFilterCandidate(article: NormalizedArticle): ArticleFilterCandidate {
  return {
    id: article.id,
    title: article.title,
    summaryText: article.content,
    url: article.url,
    publishedAt: article.published_at,
    sourceName: article.source,
    sourceHomepageUrl: article.source_metadata?.homepageUrl,
    topicName: article.source_metadata?.topic,
  };
}

export function applyArticleSelectionFiltering(articles: NormalizedArticle[]) {
  const evaluations = applySignalFiltering(articles.map(buildArticleFilterCandidate));
  const evaluationById = new Map(evaluations.map((evaluation) => [evaluation.id, evaluation]));
  const filteredArticles = articles.filter((article) => evaluationById.get(article.id)?.filterDecision === "pass");
  const passCount = evaluations.filter((evaluation) => evaluation.filterDecision === "pass").length;
  const suppressCount = evaluations.filter((evaluation) => evaluation.filterDecision === "suppress").length;
  const rejectCount = evaluations.filter((evaluation) => evaluation.filterDecision === "reject").length;

  return {
    evaluations,
    evaluationById,
    filteredArticles,
    summary: {
      pass_count: passCount,
      suppress_count: suppressCount,
      reject_count: rejectCount,
      excluded_candidate_count: suppressCount + rejectCount,
    },
  };
}

export function mapArticleFilterDiagnostic(article: NormalizedArticle, evaluation: ArticleFilterEvaluation) {
  return {
    article_id: article.id,
    title: article.title,
    source_name: article.source,
    source_url: article.url,
    source_tier: evaluation.sourceTier,
    headline_quality: evaluation.headlineQuality,
    event_type: evaluation.eventType,
    filter_decision: evaluation.filterDecision,
    filter_severity: evaluation.filterDecision,
    filter_reasons: evaluation.filterReasons,
  };
}

export function summarizeSourceDistribution(
  entries: Array<{ source?: string | null; sourceName?: string | null; source_name?: string | null }>,
) {
  return entries.reduce<Record<string, number>>((summary, entry) => {
    const source = entry.source ?? entry.sourceName ?? entry.source_name ?? "Unknown source";
    summary[source] = (summary[source] ?? 0) + 1;
    return summary;
  }, {});
}

export function evaluateSignalSelectionEligibility(input: {
  item: BriefingItem;
  cluster: StoryCluster;
  ranked: RankedStoryClusterResult["ranked"];
  articleFilterEvaluation?: ArticleFilterEvaluation;
}): SignalSelectionEligibility {
  const { item, cluster, ranked, articleFilterEvaluation } = input;
  const rankingDebug = ranked.ranking_debug;
  const groupedScores = rankingDebug.grouped_scores;
  const features = rankingDebug.features;
  const eventType = articleFilterEvaluation?.eventType ?? item.eventIntelligence?.eventType ?? "generic_commentary";
  const filterDecision = articleFilterEvaluation?.filterDecision ?? "suppress";
  const filterReasons = articleFilterEvaluation?.filterReasons ?? ["missing_prd13_filter_evaluation"];
  const sourceTier =
    articleFilterEvaluation?.sourceTier ??
    normalizeTrustTier(cluster.representative_article.source_metadata?.trustTier);
  const sourceDiversity = new Set(cluster.articles.map((article) => article.source)).size;
  const weakContentReasons = getWeakContentReasons(item, cluster);
  const specific = hasSpecificity(item, cluster);
  const fallbackPromoted = filterReasons.includes("passed_fallback_low_pass_volume");
  const sourceQualityScore = Number(((features.source_credibility * 0.55) + (features.trust_tier * 0.45)).toFixed(2));
  const structuralImportanceScore = groupedScores.event_importance;
  const sourceQualityAdequate =
    sourceTier === "tier1" ||
    sourceTier === "tier2" ||
    sourceDiversity >= 2 ||
    sourceQualityScore >= 72;
  const structuralEventType = CORE_EVENT_TYPES.has(eventType as EventType);
  const contextEventType = STRUCTURAL_CONTEXT_EVENT_TYPES.has(eventType as EventType);
  const strongStructuralOverride =
    structuralImportanceScore >= 70 &&
    features.structural_impact >= 68 &&
    features.downstream_consequence >= 58 &&
    features.actionability_or_decision_value >= 54;
  const weakContentHasOverride =
    strongStructuralOverride &&
    (sourceTier === "tier1" || sourceDiversity >= 2) &&
    !LOW_SIGNAL_EVENT_TYPES.has(eventType as EventType);
  const weakContent = weakContentReasons.length > 0 && !weakContentHasOverride;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (filterDecision !== "pass") reasons.push(`prd13_filter_${filterDecision}`);
  if (fallbackPromoted) warnings.push("filter_passed_only_by_low_volume_fallback");
  if (!sourceQualityAdequate) reasons.push("source_quality_below_public_threshold");
  if (!specific) reasons.push("missing_specific_actor_or_number");
  if (LOW_SIGNAL_EVENT_TYPES.has(eventType as EventType)) reasons.push(`low_signal_event_type_${eventType}`);
  if (weakContent) reasons.push(...weakContentReasons);
  if (!structuralEventType && !strongStructuralOverride) {
    reasons.push("insufficient_structural_event_evidence");
  }
  if (structuralImportanceScore < 52) reasons.push("structural_importance_below_core_threshold");

  let tier: SignalSelectionEligibilityTier = "exclude_from_public_candidates";

  const coreEligible =
    filterDecision === "pass" &&
    !fallbackPromoted &&
    sourceQualityAdequate &&
    specific &&
    !weakContent &&
    (structuralEventType || strongStructuralOverride) &&
    structuralImportanceScore >= 52 &&
    ranked.score >= 58;

  const contextEligible =
    !coreEligible &&
    filterDecision === "pass" &&
    sourceQualityAdequate &&
    specific &&
    !weakContent &&
    (contextEventType || strongStructuralOverride) &&
    structuralImportanceScore >= 46 &&
    ranked.score >= 52;

  const depthEligible =
    !coreEligible &&
    !contextEligible &&
    filterDecision !== "reject" &&
    sourceQualityAdequate &&
    specific &&
    !weakContent &&
    !LOW_SIGNAL_EVENT_TYPES.has(eventType as EventType) &&
    (structuralImportanceScore >= 44 || ranked.score >= 50 || sourceDiversity >= 2);

  if (coreEligible) {
    tier = "core_signal_eligible";
  } else if (contextEligible) {
    tier = "context_signal_eligible";
  } else if (depthEligible) {
    tier = "depth_only";
  }

  if (tier === "exclude_from_public_candidates" && reasons.length === 0) {
    reasons.push("does_not_meet_public_signal_eligibility");
  }

  return {
    tier,
    reasons: uniqueStrings(reasons),
    warnings: uniqueStrings(warnings),
    filterDecision,
    filterSeverity: filterDecision,
    filterReasons,
    sourceTier,
    headlineQuality: articleFilterEvaluation?.headlineQuality,
    eventType,
    structuralImportanceScore,
    sourceQualityScore,
    finalScore: ranked.score,
    scoreComponents: {
      credibility: ranked.score_breakdown.credibility,
      novelty: ranked.score_breakdown.novelty,
      urgency: ranked.score_breakdown.urgency,
      reinforcement: ranked.score_breakdown.reinforcement,
      trust_timeliness: groupedScores.trust_timeliness,
      event_importance: groupedScores.event_importance,
      support_and_novelty: groupedScores.support_and_novelty,
    },
    rankingProvider: rankingDebug.provider,
    diversityProvider: rankingDebug.provider,
  };
}

export function isCoreSignalEligible(item: BriefingItem) {
  return !item.selectionEligibility || item.selectionEligibility.tier === "core_signal_eligible";
}
