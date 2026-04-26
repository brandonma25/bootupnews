import { classifySourcePreference } from "@/lib/source-policy";

export type SourceTier = "tier1" | "tier2" | "tier3" | "unknown";
export type HeadlineQuality = "strong" | "medium" | "weak";
export type FilterDecision = "pass" | "suppress" | "reject";
export type EventType =
  | "policy_regulation"
  | "earnings_financials"
  | "mna_funding"
  | "product_launch_major"
  | "geopolitics"
  | "executive_change_strategic"
  | "legal_investigation"
  | "partnership_major"
  | "supply_chain_disruption"
  | "macro_market_move"
  | "generic_commentary"
  | "opinion_only"
  | "promotional"
  | "culture_filler"
  | "human_interest_low_relevance"
  | "minor_feature_update"
  | "repetitive_followup_no_new_info";

export type ArticleFilterCandidate = {
  id: string;
  title: string;
  summaryText?: string | null;
  url: string;
  publishedAt?: string | null;
  sourceName: string;
  sourceFeedUrl?: string | null;
  sourceHomepageUrl?: string | null;
  topicName?: string | null;
};

/**
 * @deprecated Use ArticleFilterCandidate. This is an Article-level quality
 * filter candidate, not canonical Signal identity.
 */
export type SignalFilterCandidate = ArticleFilterCandidate;

export type ArticleFilterEvaluation = {
  id: string;
  sourceTier: SourceTier;
  headlineQuality: HeadlineQuality;
  eventType: EventType;
  filterDecision: FilterDecision;
  filterReasons: string[];
};

/**
 * @deprecated Use ArticleFilterEvaluation. This is the evaluation output for
 * Article-level quality filtering, not canonical Signal identity.
 */
export type SignalFilterEvaluation = ArticleFilterEvaluation;

type HeadlineScorecard = {
  score: number;
  reasons: string[];
};

const ARTICLE_FILTER_CONFIG = {
  minPassCount: 4,
  fallbackLookbackHours: 48,
};

const STRONG_HEADLINE_PATTERNS: Array<{ pattern: RegExp; score: number; reason: string }> = [
  { pattern: /\b(approves?|bans?|orders?|mandates?|sanctions?|tariffs?|restrictions?|export controls?|regulat(?:es|ion)|policy|rules?)\b/i, score: 3, reason: "strong_policy_action" },
  { pattern: /\b(earnings|revenue|profit|guidance|quarter|q[1-4]|results?)\b/i, score: 3, reason: "strong_financial_result" },
  { pattern: /\b(acquires?|acquisition|merger|buyout|raises? \$|\bfunding\b|series [abcde]|ipo)\b/i, score: 3, reason: "strong_mna_funding" },
  { pattern: /\b(sues?|lawsuit|probe|investigation|antitrust|charges?|settlement)\b/i, score: 3, reason: "strong_legal_action" },
  { pattern: /\b(partners? with|partnership|joint venture|supply deal|distribution deal)\b/i, score: 2, reason: "strong_partnership" },
  { pattern: /\b(outage|shutdown|strike|disruption|shortage|halts?|delays?|recall)\b/i, score: 3, reason: "strong_disruption" },
  { pattern: /\b(launches?|unveils?|releases?)\b/i, score: 2, reason: "strong_product_action" },
  { pattern: /\b(ceo|cfo|chair|president)\b.*\b(steps down|resigns|appointed|joins|replaced|named)\b/i, score: 2, reason: "strong_exec_change" },
  { pattern: /\b(fed|inflation|rates?|treasury|gdp|jobs report|central bank|currency|market rout|stocks tumble)\b/i, score: 2, reason: "strong_macro_signal" },
];

const WEAK_HEADLINE_PATTERNS: Array<{ pattern: RegExp; score: number; reason: string }> = [
  { pattern: /\b(opinion|editorial|analysis|commentary|perspective|podcast)\b/i, score: -4, reason: "weak_commentary_frame" },
  { pattern: /\b(live updates?|what we know|what to know|watch live|ticker|roundup|recap)\b/i, score: -4, reason: "weak_followup_frame" },
  { pattern: /\b(top \d+|best of|list of|gift guide|review|hands-on|explainer|how to)\b/i, score: -4, reason: "weak_listicle_frame" },
  { pattern: /\b(says|said)\b/i, score: -2, reason: "weak_says_frame" },
  { pattern: /\b(announces?|introduces?|showcases?)\b/i, score: -2, reason: "weak_promotional_frame" },
  { pattern: /\b(celebrity|movie|tv|festival|lifestyle|fashion|sports)\b/i, score: -5, reason: "weak_culture_frame" },
];

const ALLOWED_EVENT_TYPES = new Set<EventType>([
  "policy_regulation",
  "earnings_financials",
  "mna_funding",
  "product_launch_major",
  "geopolitics",
  "executive_change_strategic",
  "legal_investigation",
  "partnership_major",
  "supply_chain_disruption",
  "macro_market_move",
]);

const HARD_BLOCK_EVENT_TYPES = new Set<EventType>([
  "opinion_only",
  "promotional",
  "culture_filler",
  "human_interest_low_relevance",
]);

const SOFT_BLOCK_EVENT_TYPES = new Set<EventType>([
  "generic_commentary",
  "minor_feature_update",
  "repetitive_followup_no_new_info",
]);

const HIGH_PRIORITY_EVENT_TYPES = new Set<EventType>([
  "policy_regulation",
  "earnings_financials",
  "mna_funding",
  "geopolitics",
  "legal_investigation",
  "supply_chain_disruption",
  "macro_market_move",
]);

// Legacy function name retained for compatibility. The candidates are Articles
// being quality-filtered before clustering, not canonical Signal objects.
export function applySignalFiltering(
  candidates: ArticleFilterCandidate[],
): ArticleFilterEvaluation[] {
  const baseEvaluations = candidates.map((candidate) => evaluateArticleFilterCandidate(candidate));
  const promotedIds = new Set(selectFallbackPromotions(candidates, baseEvaluations));

  return baseEvaluations.map((evaluation) => {
    if (!promotedIds.has(evaluation.id)) {
      return evaluation;
    }

    return {
      ...evaluation,
      filterDecision: "pass",
      filterReasons: uniqueReasons([
        ...evaluation.filterReasons.filter((reason) => reason !== "suppressed_low_signal"),
        "passed_fallback_low_pass_volume",
        "passed_allowed_event_type",
      ]),
    };
  });
}

export function evaluateArticleFilterCandidate(
  candidate: ArticleFilterCandidate,
): ArticleFilterEvaluation {
  const sourceTier = classifySourceTier(candidate);
  const headlineQuality = classifyHeadlineQuality(candidate);
  const eventType = classifyEventType(candidate);

  if (HARD_BLOCK_EVENT_TYPES.has(eventType)) {
    return {
      id: candidate.id,
      sourceTier,
      headlineQuality,
      eventType,
      filterDecision: "reject",
      filterReasons: uniqueReasons([
        "rejected_blocked_event_type",
        "rejected_low_signal",
        sourceTier === "tier3" ? "rejected_low_source_tier" : null,
        headlineQuality === "weak" ? "rejected_weak_headline" : null,
      ]),
    };
  }

  if (SOFT_BLOCK_EVENT_TYPES.has(eventType)) {
    return {
      id: candidate.id,
      sourceTier,
      headlineQuality,
      eventType,
      filterDecision:
        sourceTier === "tier3" || headlineQuality === "weak" ? "reject" : "suppress",
      filterReasons: uniqueReasons([
        eventType === "repetitive_followup_no_new_info"
          ? "suppressed_redundant_followup"
          : "suppressed_low_signal",
        sourceTier === "tier3" ? "rejected_low_source_tier" : null,
        headlineQuality === "weak" ? "rejected_weak_headline" : null,
      ]),
    };
  }

  if (sourceTier === "tier3" && headlineQuality === "weak") {
    return {
      id: candidate.id,
      sourceTier,
      headlineQuality,
      eventType,
      filterDecision: "reject",
      filterReasons: ["rejected_low_source_tier", "rejected_weak_headline"],
    };
  }

  if (sourceTier === "unknown" && headlineQuality === "weak") {
    return {
      id: candidate.id,
      sourceTier,
      headlineQuality,
      eventType,
      filterDecision: "reject",
      filterReasons: ["rejected_weak_headline"],
    };
  }

  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    return {
      id: candidate.id,
      sourceTier,
      headlineQuality,
      eventType,
      filterDecision: headlineQuality === "strong" ? "suppress" : "reject",
      filterReasons: uniqueReasons([
        headlineQuality === "strong" ? "suppressed_low_signal" : "rejected_blocked_event_type",
      ]),
    };
  }

  if (sourceTier === "tier1" && headlineQuality === "strong") {
    return {
      id: candidate.id,
      sourceTier,
      headlineQuality,
      eventType,
      filterDecision: "pass",
      filterReasons: ["passed_tier1_strong_event", "passed_allowed_event_type"],
    };
  }

  if (sourceTier === "tier1") {
    return {
      id: candidate.id,
      sourceTier,
      headlineQuality,
      eventType,
      filterDecision: "pass",
      filterReasons: ["passed_allowed_event_type"],
    };
  }

  if (sourceTier === "tier2" && headlineQuality === "strong") {
    return {
      id: candidate.id,
      sourceTier,
      headlineQuality,
      eventType,
      filterDecision: "pass",
      filterReasons: ["passed_allowed_event_type"],
    };
  }

  if (
    sourceTier === "tier2" &&
    headlineQuality === "medium" &&
    HIGH_PRIORITY_EVENT_TYPES.has(eventType)
  ) {
    return {
      id: candidate.id,
      sourceTier,
      headlineQuality,
      eventType,
      filterDecision: "pass",
      filterReasons: ["passed_allowed_event_type"],
    };
  }

  if (
    sourceTier === "unknown" &&
    headlineQuality === "strong" &&
    HIGH_PRIORITY_EVENT_TYPES.has(eventType)
  ) {
    return {
      id: candidate.id,
      sourceTier,
      headlineQuality,
      eventType,
      filterDecision: "pass",
      filterReasons: ["passed_allowed_event_type"],
    };
  }

  return {
    id: candidate.id,
    sourceTier,
    headlineQuality,
    eventType,
    filterDecision: "suppress",
    filterReasons: uniqueReasons([
      sourceTier === "tier3" ? "suppressed_low_source_tier" : "suppressed_low_signal",
    ]),
  };
}

export function classifySourceTier(candidate: Pick<
  ArticleFilterCandidate,
  "sourceName" | "url" | "sourceFeedUrl" | "sourceHomepageUrl"
>): SourceTier {
  return classifySourcePreference(candidate);
}

export function classifyHeadlineQuality(
  candidate: Pick<ArticleFilterCandidate, "title" | "summaryText">,
): HeadlineQuality {
  const title = candidate.title.trim();
  const summary = candidate.summaryText?.trim() ?? "";
  const strong = scoreHeadline(`${title} ${summary}`, STRONG_HEADLINE_PATTERNS);
  const weak = scoreHeadline(`${title} ${summary}`, WEAK_HEADLINE_PATTERNS);
  const score = strong.score + weak.score;

  if (strong.score >= 3 && weak.score >= -2) {
    return "strong";
  }

  if (score >= 3) {
    return "strong";
  }

  if (score <= -2) {
    return "weak";
  }

  return "medium";
}

export function classifyEventType(
  candidate: Pick<ArticleFilterCandidate, "title" | "summaryText" | "topicName">,
): EventType {
  const text = normalizeText(
    `${candidate.topicName ?? ""} ${candidate.title} ${candidate.summaryText ?? ""}`,
  );

  if (/\b(opinion|editorial|op-ed)\b/.test(text)) return "opinion_only";
  if (/\b(promoted|sponsored|advertisement|sale|discount|deal of the day)\b/.test(text)) return "promotional";
  if (/\b(celebrity|movie|tv|festival|fashion|sports|entertainment)\b/.test(text)) return "culture_filler";
  if (/\b(human interest|viral|heartwarming|lifestyle)\b/.test(text)) return "human_interest_low_relevance";
  if (/\b(live updates?|what we know|what to know|recap|roundup|timeline)\b/.test(text)) return "repetitive_followup_no_new_info";
  if (/\b(minor update|small update|feature update|beta feature|ui tweak|bug fix)\b/.test(text)) return "minor_feature_update";
  if (/\b(approves?|bans?|tariffs?|sanctions?|restrictions?|export controls?|regulation|regulatory|policy|rules?|executive order|antitrust rules)\b/.test(text)) return "policy_regulation";
  if (/\b(earnings|revenue|profit|guidance|quarterly|results?|forecast)\b/.test(text)) return "earnings_financials";
  if (/\b(acquires?|acquisition|merger|buyout|funding|raises? \$|series [abcde]|venture round|ipo)\b/.test(text)) return "mna_funding";
  if (/\b(launches?|unveils?|releases?)\b/.test(text) && /\b(platform|model|chip|device|cloud|service|product)\b/.test(text)) return "product_launch_major";
  if (/\b(china|taiwan|russia|ukraine|israel|iran|sanctions|border|missile|military|diplomatic|summit)\b/.test(text)) return "geopolitics";
  if (/\b(ceo|cfo|chair|president)\b.*\b(resigns|steps down|appointed|named|joins|replaced)\b/.test(text)) return "executive_change_strategic";
  if (/\b(sues?|lawsuit|probe|investigation|antitrust|charges?|settlement|doj|sec)\b/.test(text)) return "legal_investigation";
  if (/\b(partners? with|partnership|joint venture|supply deal|distribution deal|collaboration)\b/.test(text)) return "partnership_major";
  if (/\b(outage|shutdown|shortage|strike|halts?|delays?|recall|factory fire|port closure)\b/.test(text)) return "supply_chain_disruption";
  if (/\b(fed|inflation|rates?|treasury|gdp|jobs report|central bank|markets? tumble|stocks? slide|currency swings?)\b/.test(text)) return "macro_market_move";
  if (/\b(analysis|commentary|view|outlook|preview)\b/.test(text)) return "generic_commentary";

  return "generic_commentary";
}

function selectFallbackPromotions(
  candidates: ArticleFilterCandidate[],
  evaluations: ArticleFilterEvaluation[],
) {
  const eligibleEvaluationById = new Map(evaluations.map((evaluation) => [evaluation.id, evaluation]));
  const activeCandidates = candidates.filter((candidate) => isWithinFallbackWindow(candidate.publishedAt));
  const activeEvaluations = activeCandidates
    .map((candidate) => eligibleEvaluationById.get(candidate.id))
    .filter((evaluation): evaluation is ArticleFilterEvaluation => Boolean(evaluation));
  const activePassCount = activeEvaluations.filter((evaluation) => evaluation.filterDecision === "pass").length;

  if (activePassCount >= ARTICLE_FILTER_CONFIG.minPassCount) {
    return [];
  }

  const promotedCount = ARTICLE_FILTER_CONFIG.minPassCount - activePassCount;
  return activeCandidates
    .map((candidate) => {
      const evaluation = eligibleEvaluationById.get(candidate.id);
      if (!evaluation || evaluation.filterDecision !== "suppress") {
        return null;
      }

      if (!ALLOWED_EVENT_TYPES.has(evaluation.eventType) || evaluation.headlineQuality === "weak") {
        return null;
      }

      return {
        id: candidate.id,
        score: scoreFallbackCandidate(candidate, evaluation),
      };
    })
    .filter((candidate): candidate is { id: string; score: number } => Boolean(candidate))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, promotedCount)
    .map((candidate) => candidate.id);
}

function scoreFallbackCandidate(
  candidate: ArticleFilterCandidate,
  evaluation: ArticleFilterEvaluation,
) {
  const sourceScore =
    evaluation.sourceTier === "tier1"
      ? 35
      : evaluation.sourceTier === "tier2"
        ? 25
        : evaluation.sourceTier === "unknown"
          ? 18
          : 12;
  const headlineScore =
    evaluation.headlineQuality === "strong"
      ? 30
      : evaluation.headlineQuality === "medium"
        ? 16
        : 0;
  const eventScore = HIGH_PRIORITY_EVENT_TYPES.has(evaluation.eventType) ? 30 : 18;
  const freshnessScore = Math.max(
    0,
    20 - Math.floor(ageHours(candidate.publishedAt) / 2),
  );

  return sourceScore + headlineScore + eventScore + freshnessScore;
}

function scoreHeadline(
  text: string,
  patterns: Array<{ pattern: RegExp; score: number; reason: string }>,
): HeadlineScorecard {
  return patterns.reduce<HeadlineScorecard>(
    (result, entry) => {
      if (!entry.pattern.test(text)) {
        return result;
      }

      return {
        score: result.score + entry.score,
        reasons: [...result.reasons, entry.reason],
      };
    },
    { score: 0, reasons: [] },
  );
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s$-]/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueReasons(reasons: Array<string | null>) {
  return [...new Set(reasons.filter((reason): reason is string => Boolean(reason)))];
}

function ageHours(value: string | null | undefined) {
  const timestamp = value ? new Date(value).getTime() : Date.now();
  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
}

function isWithinFallbackWindow(value: string | null | undefined) {
  return ageHours(value) <= ARTICLE_FILTER_CONFIG.fallbackLookbackHours;
}

/**
 * @deprecated Use evaluateArticleFilterCandidate. This evaluates Article-level
 * quality candidates before clustering, not canonical Signals.
 */
export const evaluateSignalCandidate = evaluateArticleFilterCandidate;
