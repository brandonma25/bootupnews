import type { ArticleFilterEvaluation, ArticleFilterCandidate, EventType } from "@/lib/signal-filtering";
import { applySignalFiltering } from "@/lib/signal-filtering";
import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { StoryCluster } from "@/lib/models/signal-cluster";
import type { RankedStoryClusterResult } from "@/lib/scoring/scoring-engine";
import { evaluateSourceAccessibilitySupport } from "@/lib/source-accessibility";
import type {
  BriefingItem,
  SignalSelectionEligibility,
  SignalSelectionEligibilityTier,
} from "@/lib/types";

const CORE_EVENT_TYPES = new Set<EventType>([
  "policy_regulation",
  "government_capacity",
  "public_interest_legal_accountability",
  "platform_regulation",
  "macro_data_release",
  "central_bank_policy",
  "ai_infrastructure_policy",
  "cybersecurity_enforcement",
  "institutional_governance",
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

const WEAK_PUBLIC_CONTENT_PATTERNS: Array<{ pattern: RegExp; reason: string; requiresConsumerContext?: boolean }> = [
  { pattern: /\b(podcast|trailer|teaser|tv|movie|celebrity|entertainment)\b/i, reason: "weak_entertainment_or_podcast_content" },
  { pattern: /\b(gadget|device deal|discount|gift guide|gaming mouse|touchscreen mouse)\b/i, reason: "weak_gadget_or_review_content" },
  { pattern: /\b(hands-on|review)\b/i, reason: "weak_gadget_or_review_content", requiresConsumerContext: true },
  { pattern: /\b(workout|fitness|lifestyle|fashion)\b/i, reason: "weak_lifestyle_content" },
  { pattern: /\b(partnering with|partners with|partnership)\b/i, reason: "weak_consumer_partnership_without_system_impact" },
  { pattern: /\b(upcoming|leak|dummy|drops full|new colors|spring colors)\b/i, reason: "weak_product_update_or_promo_content" },
];

const PUBLIC_INTEREST_EVENT_TYPES = new Set<EventType>([
  "government_capacity",
  "public_interest_legal_accountability",
  "platform_regulation",
  "macro_data_release",
  "central_bank_policy",
  "ai_infrastructure_policy",
  "cybersecurity_enforcement",
  "institutional_governance",
  "legal_investigation",
  "policy_regulation",
]);

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

function getCalibrationLabels(corpus: string, eventType: string) {
  const labels: string[] = [];

  if (eventType === "government_capacity" || /\b(shutdown|federal workers?|tsa officers?|agency capacity|workforce attrition|quit amid shutdown)\b/i.test(corpus)) {
    labels.push("institutional_capacity_signal");
  }
  if (eventType === "public_interest_legal_accountability" || /\b(purdue settlement|opioid settlement|settlement money|victims?|low-income residents?|ignoring new law|legal accountability)\b/i.test(corpus)) {
    labels.push("public_interest_legal_accountability");
  }
  if (eventType === "platform_regulation" || (/\b(android|app store|platform|ai distribution|market access)\b/i.test(corpus) && /\b(antitrust|regulation|rules?|open up|intervention|probe)\b/i.test(corpus))) {
    labels.push("platform_regulation_signal");
  }
  if (eventType === "macro_data_release" || /\b(payroll employment|consumer price index|cpi|unemployment rate|jobs report|employment situation|major economic indicators)\b/i.test(corpus)) {
    labels.push("macro_data_release");
  }
  if (eventType === "central_bank_policy" || /\b(fomc|federal reserve|fed chair|central bank|monetary policy|discount rate)\b/i.test(corpus)) {
    labels.push("central_bank_policy_signal");
  }
  if (eventType === "ai_infrastructure_policy" || /\b(ai data centers?|data centers?|grid|permitting|power demand|energy capacity|ai infrastructure)\b/i.test(corpus)) {
    labels.push("ai_infrastructure_policy");
  }
  if (eventType === "cybersecurity_enforcement" || /\b(cyberattacks?|hacker|extradited|indicted|state-linked|state linked|cyber enforcement)\b/i.test(corpus)) {
    labels.push("cybersecurity_enforcement_signal");
  }
  if (eventType === "institutional_governance" || /\b(national science board|national science foundation|science governance|institutional governance)\b/i.test(corpus)) {
    labels.push("institutional_governance_signal");
  }
  if (/\b(king charles|queen camilla|state visit|ceremonial|address to congress|ballroom|white house renovation|presidential library|commemorative|state dinner)\b/i.test(corpus)) {
    labels.push("ceremonial_or_low_policy_change");
  }
  if (/\b(says|said|opinion|commentary|outlook)\b/i.test(corpus) && /\b(market|stocks?|rates?|inflation|fed)\b/i.test(corpus)) {
    labels.push("market_commentary_source_thin");
  }
  if (/\b(local|connecticut|tiny texas town|towing companies)\b/i.test(corpus) && labels.includes("public_interest_legal_accountability")) {
    labels.push("local_public_interest_depth");
  }

  return uniqueStrings(labels);
}

function isConsumerProductContext(corpus: string) {
  return /\b(gadget|device|phone|laptop|headphones?|keyboard|mouse|gaming|console|tv|app|product|consumer|fitness|workout|peloton|spotify)\b/i.test(corpus);
}

function getWeakContentReasons(item: BriefingItem, cluster: StoryCluster, eventType: string, calibratedReasonLabels: string[]) {
  const corpus = getContentCorpus({ item, cluster });
  const publicInterestProtected =
    PUBLIC_INTEREST_EVENT_TYPES.has(eventType as EventType) ||
    calibratedReasonLabels.some((label) =>
      [
        "public_interest_legal_accountability",
        "institutional_capacity_signal",
        "platform_regulation_signal",
        "macro_data_release",
        "central_bank_policy_signal",
        "ai_infrastructure_policy",
        "cybersecurity_enforcement_signal",
        "institutional_governance_signal",
      ].includes(label),
    );

  return WEAK_PUBLIC_CONTENT_PATTERNS
    .filter((entry) => {
      if (!entry.pattern.test(corpus)) return false;
      if (entry.requiresConsumerContext && !isConsumerProductContext(corpus)) return false;
      if (publicInterestProtected && !isConsumerProductContext(corpus)) return false;
      return true;
    })
    .map((entry) => entry.reason);
}

function isRoutineOrStaleRelease(corpus: string, labels: string[]) {
  return (
    labels.includes("macro_data_release") &&
    /\b(major economic indicators latest numbers|latest numbers|minutes of|approval of application|application by)\b/i.test(corpus)
  );
}

function isCeremonialOrLowPolicyChange(labels: string[]) {
  return labels.includes("ceremonial_or_low_policy_change");
}

function getExclusionCause(input: {
  tier: SignalSelectionEligibilityTier;
  weakContent: boolean;
  sourceAccessibility: ReturnType<typeof evaluateSourceAccessibilitySupport>;
  routineOrStaleRelease: boolean;
  ceremonialOrLowPolicyChange: boolean;
  filterDecision: string;
  structuralImportanceScore: number;
}) {
  if (input.tier !== "exclude_from_public_candidates") return null;
  if (input.weakContent) return "product/noise";
  if (input.sourceAccessibility.coreBlockingReasons.length > 0) return "source_accessibility";
  if (input.routineOrStaleRelease) return "stale/routine_release";
  if (input.ceremonialOrLowPolicyChange) return "ceremonial_or_low_policy_change";
  if (input.filterDecision !== "pass") return "product/noise";
  if (input.structuralImportanceScore < 52) return "below_structural_threshold";
  return "lack_of_corroboration";
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
    source_role: article.source_accessibility?.source_role,
    content_accessibility: article.source_accessibility?.content_accessibility,
    accessible_text_length: article.source_accessibility?.accessible_text_length,
    summary_length: article.source_accessibility?.summary_length,
    content_length: article.source_accessibility?.content_length,
    extraction_method: article.source_accessibility?.extraction_method,
    fetch_status: article.source_accessibility?.fetch_status,
    parse_status: article.source_accessibility?.parse_status,
    failure_reason: article.source_accessibility?.failure_reason,
    supplied_by_manifest: article.source_accessibility?.supplied_by_manifest,
    public_eligible: article.source_accessibility?.public_eligible,
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
  const corpus = getContentCorpus({ item, cluster });
  const calibratedReasonLabels = getCalibrationLabels(corpus, eventType);
  const weakContentReasons = getWeakContentReasons(item, cluster, eventType, calibratedReasonLabels);
  const specific = hasSpecificity(item, cluster);
  const fallbackPromoted = filterReasons.includes("passed_fallback_low_pass_volume");
  const sourceQualityScore = Number(((features.source_credibility * 0.55) + (features.trust_tier * 0.45)).toFixed(2));
  const structuralImportanceScore = groupedScores.event_importance;
  const sourceAccessibility = evaluateSourceAccessibilitySupport(cluster.articles);
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
  const routineOrStaleRelease = isRoutineOrStaleRelease(corpus, calibratedReasonLabels);
  const ceremonialOrLowPolicyChange = isCeremonialOrLowPolicyChange(calibratedReasonLabels);
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (filterDecision !== "pass") reasons.push(`prd13_filter_${filterDecision}`);
  if (fallbackPromoted) warnings.push("filter_passed_only_by_low_volume_fallback");
  if (!sourceQualityAdequate) reasons.push("source_quality_below_public_threshold");
  if (!sourceAccessibility.coreSupported) reasons.push(...sourceAccessibility.coreBlockingReasons);
  warnings.push(...sourceAccessibility.warnings);
  if (!specific) reasons.push("missing_specific_actor_or_number");
  if (LOW_SIGNAL_EVENT_TYPES.has(eventType as EventType)) reasons.push(`low_signal_event_type_${eventType}`);
  if (weakContent) reasons.push(...weakContentReasons);
  if (routineOrStaleRelease) reasons.push("stale_routine_release");
  if (ceremonialOrLowPolicyChange) reasons.push("ceremonial_or_low_policy_change");
  if (!structuralEventType && !strongStructuralOverride) {
    reasons.push("insufficient_structural_event_evidence");
  }
  if (structuralImportanceScore < 52) reasons.push("structural_importance_below_core_threshold");

  let tier: SignalSelectionEligibilityTier = "exclude_from_public_candidates";

  const coreEligible =
    filterDecision === "pass" &&
    !fallbackPromoted &&
    sourceQualityAdequate &&
    sourceAccessibility.coreSupported &&
    specific &&
    !weakContent &&
    !routineOrStaleRelease &&
    !ceremonialOrLowPolicyChange &&
    (structuralEventType || strongStructuralOverride) &&
    structuralImportanceScore >= 52 &&
    ranked.score >= 58;

  const contextEligible =
    !coreEligible &&
    filterDecision === "pass" &&
    sourceQualityAdequate &&
    sourceAccessibility.contextSupported &&
    specific &&
    !weakContent &&
    !routineOrStaleRelease &&
    !ceremonialOrLowPolicyChange &&
    (contextEventType || strongStructuralOverride) &&
    structuralImportanceScore >= 46 &&
    ranked.score >= 52;

  const depthEligible =
    !coreEligible &&
    !contextEligible &&
    filterDecision !== "reject" &&
    sourceQualityAdequate &&
    sourceAccessibility.depthSupported &&
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
    calibratedReasonLabels,
    exclusionCause: getExclusionCause({
      tier,
      weakContent,
      sourceAccessibility,
      routineOrStaleRelease,
      ceremonialOrLowPolicyChange,
      filterDecision,
      structuralImportanceScore,
    }),
    filterDecision,
    filterSeverity: filterDecision,
    filterReasons,
    sourceTier,
    sourceRole: sourceAccessibility.representative.source_role,
    contentAccessibility: sourceAccessibility.representative.content_accessibility,
    accessibleTextLength: sourceAccessibility.accessibleTextLength,
    extractionMethod: sourceAccessibility.representative.extraction_method,
    fetchStatus: sourceAccessibility.representative.fetch_status,
    parseStatus: sourceAccessibility.representative.parse_status,
    sourceAccessibilityWarnings: sourceAccessibility.warnings,
    coreBlockingReasons: sourceAccessibility.coreBlockingReasons,
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
