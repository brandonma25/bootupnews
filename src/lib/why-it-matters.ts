import type { EventIntelligence } from "@/lib/types";
import type { ContentAccessibility } from "@/lib/source-accessibility-types";

export type TrustLayerPresentation = {
  tier: "high" | "medium" | "low";
  heading: string;
  body: string;
  supportingSignals: string[];
};

type GenerateWhyThisMattersOptions = {
  previousOutputs?: string[];
  eventTypeOverride?: string | null;
  contentAccessibility?: ContentAccessibility | null;
  accessibleTextLength?: number | null;
  sourceAccessibilityWarnings?: string[];
};

type NormalizedReasoningCategory =
  | "policy_regulation"
  | "corporate"
  | "mna_funding"
  | "early_stage_funding"
  | "large_ipo"
  | "data_report"
  | "executive_move"
  | "product"
  | "political"
  | "defense_geopolitical"
  | "legal_investigation"
  | "macro_market_move"
  | "non_signal"
  | "company_update";

type NormalizedIntelligence = EventIntelligence & {
  entities: string[];
  affectedMarkets: string[];
  timeHorizon: EventIntelligence["timeHorizon"];
  signalStrength: EventIntelligence["signalStrength"];
  reasoningCategory: NormalizedReasoningCategory;
  contentAccessibility?: ContentAccessibility | null;
  accessibleTextLength?: number | null;
  sourceAccessibilityWarnings?: string[];
};

type PatternTemplate = {
  key: string;
  build: (input: {
    anchor: string;
    mechanism: string;
    impact: string;
    horizonLabel: string;
    marketLabel: string;
  }) => string;
};

const INVALID_ANCHORS = new Set([
  "she",
  "he",
  "they",
  "them",
  "it",
  "this",
  "that",
  "these",
  "those",
  "ai",
  "ipo",
  "with",
  "wait",
  "according",
  "conservatives",
  "markets",
  "technology",
  "finance",
  "business",
  "politics",
  "tech",
  "update",
  "report",
  "reports",
  "analysis",
  "commentary",
  "watch",
  "live",
  "breaking",
  "mode",
  "feature",
  "update",
  "launch",
  "product",
  "ceo",
  "cfo",
  "cto",
  "us",
  "u.s.",
  "u.s",
]);

const INVALID_ANCHOR_PARTS = new Set([
  "urges",
  "extending",
  "failed",
  "wins",
  "win",
  "launches",
  "launch",
  "adds",
  "add",
  "signals",
  "signal",
  "says",
  "say",
]);

const CONNECTOR_WORDS = new Set([
  "in",
  "with",
  "to",
  "for",
  "of",
  "on",
  "at",
  "by",
  "from",
]);

const REASONING_TEMPLATES: Record<NormalizedReasoningCategory, PatternTemplate[]> = {
  policy_regulation: [
    {
      key: "implication_first",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "policy_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} changes the policy backdrop because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} is already affecting policy assumptions because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  corporate: [
    {
      key: "implication_first",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} resets the corporate baseline because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "financial_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for financial expectations because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} is company-specific, but ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  mna_funding: [
    {
      key: "allocation_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} changes the deal landscape because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "competitive_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} is changing market structure because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} is partly a capital story, and ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  early_stage_funding: [
    {
      key: "ecosystem_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} gives an early ecosystem signal because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "capital_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} widens the startup capital picture because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "competition_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} points to competitive expansion because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  large_ipo: [
    {
      key: "ipo_window",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} opens an IPO window read because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "risk_appetite",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} tests public-market appetite because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "valuation_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} sharpens valuation discipline because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  data_report: [
    {
      key: "data_signal",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} adds a fresh data signal because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "demand_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} changes the demand read because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "expectation_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} reframes near-term expectations because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  executive_move: [
    {
      key: "leadership_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} changes the leadership picture because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "execution_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} alters execution expectations because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "governance_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} shifts governance credibility because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  product: [
    {
      key: "adoption_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} changes product adoption expectations because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "competitive_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} changes the feature benchmark buyers compare against because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} is a product story, and ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  political: [
    {
      key: "governance_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} affects governance expectations because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "credibility_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for governance credibility because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} belongs in a governance frame because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  defense_geopolitical: [
    {
      key: "defense_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for defense and international relations because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "policy_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} changes geopolitical assumptions because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} should be read through a geopolitical lens because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  legal_investigation: [
    {
      key: "liability_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} raises legal risk because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "operations_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for operational risk because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} is still unfolding legally, but ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  macro_market_move: [
    {
      key: "implication_first",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} changes the macro baseline because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "market_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for the macro backdrop because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} moves beyond a one-off headline because ${mechanism}, so it could ${impact} over the ${horizonLabel}.`,
    },
  ],
  non_signal: [
    {
      key: "non_signal_statement",
      build: ({ anchor, mechanism, impact }) =>
        `${anchor} is not a market-moving development, but ${mechanism} and ${impact}.`,
    },
    {
      key: "non_signal_consumer",
      build: ({ anchor, mechanism, impact }) =>
        `${anchor} is more useful for individual decision-making because ${mechanism}, while ${impact}.`,
    },
    {
      key: "non_signal_specific",
      build: ({ anchor, mechanism, impact }) =>
        `${anchor} belongs in a consumer or personal-decision context because ${mechanism}, not a broad market frame where ${impact}.`,
    },
  ],
  company_update: [
    {
      key: "implication_first",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
    {
      key: "company_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for company execution because ${mechanism}, which could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} still looks company-specific, but it could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
  ],
};

export async function generateWhyThisMatters(
  intelligence: EventIntelligence,
  options: GenerateWhyThisMattersOptions = {},
) {
  const normalized = normalizeIntelligence(intelligence, options);
  const previousOutputs = options.previousOutputs ?? [];
  const body = buildGroundedWhyThisMatters(normalized, previousOutputs);
  return formatWhyThisMatters(body, normalized.signalStrength);
}

export function buildTrustLayerPresentation(
  intelligence: EventIntelligence | undefined,
  fallback: {
    title: string;
    topicName: string;
    whyItMatters?: string;
    sourceCount?: number;
    rankingSignals?: string[];
    eventTypeOverride?: string | null;
    contentAccessibility?: ContentAccessibility | null;
    accessibleTextLength?: number | null;
    sourceAccessibilityWarnings?: string[];
  },
): TrustLayerPresentation {
  const preferredBody =
    typeof fallback.whyItMatters === "string" &&
    isUsableWhyItMattersText(fallback.whyItMatters, {
      title: fallback.title,
    })
    ? fallback.whyItMatters.trim()
    : "";

  if (!intelligence) {
    return {
      tier: "medium",
      heading: "Why this is here",
      body: preferredBody || `Tracked in ${fallback.topicName} because it cleared the current briefing filters.`,
      supportingSignals: fallback.rankingSignals?.slice(0, 2) ?? [],
    };
  }

  const tier = intelligence.confidenceScore >= 72 ? "high" : intelligence.confidenceScore >= 45 ? "medium" : "low";
  const normalized = normalizeIntelligence(intelligence, fallback);
  const body =
    preferredBody ||
    formatWhyThisMatters(buildGroundedWhyThisMatters(normalized, []), normalized.signalStrength);

  return {
    tier,
    heading: "Why it matters",
    body,
    supportingSignals: buildSignalChips(normalized).slice(0, tier === "low" ? 2 : 3),
  };
}

function buildSignalChips(intelligence: NormalizedIntelligence) {
  const anchor = getAnchorLabel(intelligence);

  return [
    anchor ?? "Event-specific",
    intelligence.reasoningCategory.replace(/_/g, " "),
    intelligence.signals.sourceDiversity > 1
      ? `${intelligence.signals.sourceDiversity} sources`
      : "Early coverage",
    intelligence.signals.articleCount > 1
      ? `${intelligence.signals.articleCount} articles`
      : null,
  ].filter((value): value is string => Boolean(value));
}

export function generateWhyThisMattersHeuristically(intelligence: EventIntelligence) {
  return buildGroundedWhyThisMatters(normalizeIntelligence(intelligence), []);
}

export function isUsableWhyItMattersText(
  value: unknown,
  context: {
    title?: string;
    whatHappened?: string;
  } = {},
) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = stripSignalSuffix(value).trim();
  if (normalized.length < 24 || normalized.split(/\s+/).length < 5) {
    return false;
  }

  if (/^(it matters because|this matters because|why it matters)/i.test(normalized)) {
    return false;
  }

  if (context.title && similarityScore(normalized, context.title) > 0.92) {
    return false;
  }

  if (context.whatHappened && similarityScore(normalized, context.whatHappened) > 0.92) {
    return false;
  }

  return true;
}

function buildGroundedWhyThisMatters(
  intelligence: NormalizedIntelligence,
  previousOutputs: string[],
) {
  const sourceLimited = buildSourceLimitedReviewCopy(intelligence);
  if (sourceLimited) {
    return sourceLimited;
  }

  if (isLowDataScenario(intelligence)) {
    return buildLowConfidenceFallback(intelligence, previousOutputs);
  }

  const anchorLabel = getSubjectLabel(intelligence);
  const eventSpecific = buildEventTypeSpecificWhyThisMatters(intelligence, anchorLabel);
  if (eventSpecific) {
    return appendSupportingContext(eventSpecific, intelligence);
  }

  const marketLabel = intelligence.affectedMarkets.slice(0, 2).join(" and ");
  const horizonLabel = getTimeHorizonLabel(intelligence.timeHorizon);
  const mechanism = buildMechanism(intelligence, marketLabel);
  const impact = buildImpact(intelligence, marketLabel);
  const templates = REASONING_TEMPLATES[intelligence.reasoningCategory];
  const usageByKey = countPatternUsage(previousOutputs);

  const rankedTemplates = templates
    .map((template) => ({
      template,
      usage: usageByKey.get(template.key) ?? 0,
      text: template.build({
        anchor: anchorLabel,
        mechanism,
        impact,
        horizonLabel,
        marketLabel,
      }),
    }))
    .sort((left, right) => left.usage - right.usage);

  const chosen = chooseBestCandidate(rankedTemplates, previousOutputs);
  const body = chosen?.text ?? buildLowConfidenceFallback(intelligence, previousOutputs);
  return appendSupportingContext(body, intelligence);
}

function buildSourceLimitedReviewCopy(intelligence: NormalizedIntelligence) {
  const accessibility = intelligence.contentAccessibility;
  if (!accessibility) {
    return "";
  }

  const accessibleLength = intelligence.accessibleTextLength ?? 0;
  const anchor = getSubjectLabel(intelligence);

  if (accessibility === "full_text_available") {
    return "";
  }

  if (accessibility === "partial_text_available" && accessibleLength >= 500) {
    return "";
  }

  if (
    (accessibility === "abstract_only" || accessibility === "paywall_limited") &&
    accessibleLength >= 800
  ) {
    return "";
  }

  const limitation =
    accessibility === "partial_text_available"
      ? "partial source text is too short"
      : accessibility === "abstract_only"
        ? "only an abstract is available"
        : accessibility === "paywall_limited"
          ? "the accessible text is paywall-limited"
          : accessibility === "metadata_only"
            ? "only metadata is available"
            : accessibility === "fetch_failed" || accessibility === "rss_retry_exhausted"
              ? "source fetching failed"
              : accessibility === "parser_failed"
                ? "article parsing failed"
                : "source accessibility is unknown";

  return `Source review needed for ${anchor}: ${limitation}, so the pipeline cannot support a public structural explanation yet.`;
}

function buildEventTypeSpecificWhyThisMatters(
  intelligence: NormalizedIntelligence,
  anchor: string,
) {
  if (intelligence.reasoningCategory === "non_signal") {
    return buildNonSignalReviewCopy(anchor);
  }

  const concreteChange = buildConcreteChangeSentence(intelligence, anchor);
  const consequence = buildStructuralConsequence(intelligence);

  if (!consequence) {
    return "";
  }

  return `${concreteChange}, which matters because ${consequence}.`;
}

function buildConcreteChangeSentence(intelligence: NormalizedIntelligence, anchor: string) {
  const contentSpecificChange = buildContentSpecificChange(intelligence);
  if (contentSpecificChange) {
    return contentSpecificChange;
  }

  const candidate = chooseConcreteChangeSource(intelligence);
  const change = stripTerminalPunctuation(candidate);
  const cleanedChange = cleanSentenceStart(change);

  if (
    cleanedChange &&
    cleanedChange.length <= 90 &&
    isUsableConcreteChange(cleanedChange, anchor)
  ) {
    return ensureSentenceStart(cleanedChange);
  }

  return `${anchor} changed the current briefing read`;
}

function buildContentSpecificChange(intelligence: NormalizedIntelligence) {
  const corpus = `${intelligence.title} ${intelligence.summary} ${intelligence.primaryChange}`.toLowerCase();

  if (intelligence.eventType === "public_interest_legal_accountability" && /prediction[-\s]?market/.test(corpus)) {
    return "Prediction-market violations are stacking up";
  }

  if (intelligence.eventType === "government_capacity" && /\btsa\b/.test(corpus) && /shutdown/.test(corpus)) {
    return "TSA attrition is rising during the shutdown";
  }

  if (intelligence.eventType === "platform_regulation" && /google/.test(corpus) && /android/.test(corpus)) {
    return "EU regulators are challenging Google's Android AI distribution rules";
  }

  return "";
}

function chooseConcreteChangeSource(intelligence: NormalizedIntelligence) {
  const primaryChange = intelligence.primaryChange?.trim();
  if (primaryChange && hasMeaningfulTokenOverlap(primaryChange, intelligence.title)) {
    return primaryChange;
  }

  return intelligence.title || primaryChange || "This development";
}

function hasMeaningfulTokenOverlap(left: string, right: string) {
  const leftTokens = new Set(normalizeForSimilarityTokens(left).split(" ").filter((token) => token.length > 2));
  const rightTokens = normalizeForSimilarityTokens(right).split(" ").filter((token) => token.length > 2);
  return rightTokens.some((token) => leftTokens.has(token));
}

function isUsableConcreteChange(value: string, anchor: string) {
  if (/^this\s+(development|story|update|move|signal)\b/i.test(value)) {
    return false;
  }

  const firstWord = value.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (INVALID_ANCHORS.has(firstWord) || /^(should|how|why|can)$/i.test(firstWord)) {
    return false;
  }

  if (isGenericHeadlineFragment(getAnchorLabelCandidateFromTitle(value))) {
    return false;
  }

  if (anchor.startsWith("This ") || anchor.startsWith("The House vote")) {
    return false;
  }

  const anchorWords = anchor.toLowerCase().split(/\s+/).filter(Boolean);
  const valueWords = value.toLowerCase().split(/\s+/).filter(Boolean);
  if (
    anchorWords.length > 0 &&
    anchorWords.every((word, index) => valueWords[index] === word) &&
    INVALID_ANCHOR_PARTS.has(valueWords[anchorWords.length] ?? "") &&
    INVALID_ANCHOR_PARTS.has(valueWords[anchorWords.length + 1] ?? "")
  ) {
    return false;
  }

  return true;
}

function buildStructuralConsequence(intelligence: NormalizedIntelligence) {
  const eventType = intelligence.eventType;
  const market = buildSpecificMarketLabel(intelligence);

  switch (eventType) {
    case "public_interest_legal_accountability":
      return "it tests whether enforcement, settlements, or public oversight change accountability beyond the case itself";
    case "government_capacity":
      return "it shows whether public institutions can maintain basic services under staffing or funding pressure";
    case "platform_regulation":
      return "it can shift who controls distribution, defaults, or market access on a major digital platform";
    case "macro_data_release":
      return buildMacroStructuralConsequence(intelligence, market);
    case "central_bank_policy":
      return "it can reset rate expectations and the cost of capital before the next policy move";
    case "ai_infrastructure_policy":
      return "it ties AI growth to grid capacity, permitting, and public-infrastructure constraints";
    case "cybersecurity_enforcement":
      return "it tests whether enforcement can raise the cost of state-linked or criminal cyber activity";
    case "institutional_governance":
      return "it can change how a public institution allocates authority, funding, or strategic priorities";
    default:
      break;
  }

  switch (intelligence.reasoningCategory) {
    case "policy_regulation":
      return `it can alter rule enforcement or market access for ${market || "affected institutions"}`;
    case "corporate":
      return `it can change execution expectations for ${market || "the company's operating plan"}`;
    case "mna_funding":
      return `it can alter ownership, capital allocation, or competitive control in ${market || "the affected market"}`;
    case "early_stage_funding":
      return `it shows where capital is forming around ${market || "an emerging technology market"}`;
    case "large_ipo":
      return "it tests whether public investors will fund new issuance under current market conditions";
    case "data_report":
      return `it gives a measurable demand signal for ${market || "the affected market"}`;
    case "executive_move":
      return "it can change governance accountability and execution risk at the institution";
    case "product":
      return buildProductStructuralConsequence(intelligence);
    case "political":
      return "it can change governance credibility, policy follow-through, or executive accountability";
    case "defense_geopolitical":
      return "it can change procurement, alliance, or national-security assumptions for the actors involved";
    case "legal_investigation":
      return "it can change liability, enforcement precedent, or operating constraints for the actors involved";
    case "macro_market_move":
      return `it can change how decision-makers read ${market || "rates, inflation, or growth"}`;
    case "company_update":
      return `it must show a durable change in ${market || "operations or market position"} before it belongs in a public signal slot`;
    default:
      return "";
  }
}

function buildProductStructuralConsequence(intelligence: NormalizedIntelligence) {
  const delta = sanitizeDeltaPhrase(intelligence, buildHeadlineDeltaPhrase(intelligence));
  if (/links?|link interaction/i.test(delta)) {
    return "it may shift how users leave AI-assisted answers and reach the open web";
  }

  if (/browsing|navigation|search behavior/i.test(delta)) {
    return "it may shift browser navigation and search behavior at platform scale";
  }

  return "it may shift distribution power or buyer behavior beyond a feature update";
}

function buildMacroStructuralConsequence(intelligence: NormalizedIntelligence, market: string) {
  const corpus = buildEventCorpus(intelligence);

  if (/\br\*|neutral[-\s]?rate|labor share/.test(corpus)) {
    return "it changes how Federal Reserve policymakers estimate the neutral rate and judge whether current policy is restrictive";
  }

  if (/slow.*labor market|no growth labor market|labor-market|employment|unemployment|wage/.test(corpus)) {
    return "it reframes how labor-market slack constrains the Federal Reserve rate path";
  }

  if (/inflation|cpi|prices?/.test(corpus)) {
    return "it can shift inflation expectations and the timing of future rate moves";
  }

  if (/productivity|output|labor productivity/.test(corpus)) {
    return "it changes how policymakers read productivity, growth capacity, and inflation pressure";
  }

  if (/insurance|homeowner|risk sharing/.test(corpus)) {
    return "it shows how household risk transfer can affect financial resilience when shocks hit";
  }

  if (/most[-\s]?read|countdown|top topics|roundup/.test(corpus)) {
    return "it shows which inflation, labor, and growth questions dominated institutional attention";
  }

  return `it can change how policymakers and investors read ${market || "labor, inflation, or productivity conditions"}`;
}

function buildNonSignalReviewCopy(anchor: string) {
  return `Editorial review needed for ${anchor}: the item does not yet show a structural change beyond the immediate update.`;
}

function buildSpecificMarketLabel(intelligence: NormalizedIntelligence) {
  const contextual = buildContextualMarketLabel(intelligence);
  if (contextual) {
    return contextual;
  }

  const candidates = intelligence.affectedMarkets
    .map((entry) => entry.trim())
    .filter(isUsableMarketLabel)
    .slice(0, 2);

  if (!candidates.length) {
    return "";
  }

  return candidates.join(" and ");
}

function buildContextualMarketLabel(intelligence: NormalizedIntelligence) {
  const corpus = buildEventCorpus(intelligence);

  if (intelligence.eventType === "mna_funding" && /wind|offshore|energy|clean-energy/.test(corpus)) {
    return "offshore wind investment and clean-energy permitting";
  }

  if (intelligence.eventType === "macro_data_release" || intelligence.eventType === "central_bank_policy") {
    if (/\br\*|neutral[-\s]?rate|labor share/.test(corpus)) {
      return "neutral-rate estimates and labor income";
    }

    if (/slow.*labor market|no growth labor market|labor-market|employment|unemployment|wage/.test(corpus)) {
      return "labor-market slack and Fed policy";
    }

    if (/inflation|cpi|prices?/.test(corpus)) {
      return "inflation expectations and rate policy";
    }

    if (/insurance|homeowner|risk sharing/.test(corpus)) {
      return "household risk transfer and insurance-market resilience";
    }

    if (/most[-\s]?read|countdown|top topics|roundup/.test(corpus)) {
      return "institutional attention around inflation, labor, and growth";
    }
  }

  return "";
}

function isUsableMarketLabel(value: string) {
  return Boolean(value) && !/^(market|markets|business|finance|technology|tech|policy|risk|individual decision-making|individual readers|personal finance|consumer guidance)$/i.test(value);
}

function buildEventCorpus(intelligence: NormalizedIntelligence) {
  return [
    intelligence.title,
    intelligence.summary,
    intelligence.primaryChange,
    intelligence.primaryImpact,
    intelligence.affectedMarkets.join(" "),
    intelligence.topics.join(" "),
    intelligence.entities.join(" "),
    intelligence.keyEntities.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function stripTerminalPunctuation(value: string) {
  return value.replace(/[\s.?!…]+$/g, "").trim();
}

function cleanSentenceStart(value: string) {
  return value.replace(/^(this|the)\s+(story|update|development)\s+(shows|says|reports)\s+/i, "").trim();
}

function ensureSentenceStart(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function extractPrimaryAnchor(intelligence: NormalizedIntelligence) {
  const candidates = rankAnchorCandidates(intelligence);

  for (const candidate of candidates) {
    const normalized = sanitizeAnchorCandidate(candidate);
    if (isMeaningfulAnchor(normalized)) {
      return { label: normalized };
    }
  }

  return null;
}

function getAnchorLabel(intelligence: NormalizedIntelligence) {
  const anchor = extractPrimaryAnchor(intelligence);
  if (anchor?.label) {
    return anchor.label;
  }

  const leadEntityMatch = intelligence.title.match(
    /^([A-Z][A-Za-z0-9.&'-]+(?:\s+[A-Z][A-Za-z0-9.&'-]+){0,2})(?=\s+(?:urges|extends|files|raises|adds|launches|wins|appoints|resigns|signals|reports|says)\b)/i,
  );
  if (leadEntityMatch?.[1] && isMeaningfulAnchor(leadEntityMatch[1])) {
    return leadEntityMatch[1];
  }

  const nounPhrase = buildStrongNounPhrase(intelligence);
  if (nounPhrase) {
    return nounPhrase;
  }

  const companyMatch = intelligence.title.match(
    /^([A-Z][A-Za-z0-9.&'-]+(?:\s+[A-Z][A-Za-z0-9.&'-]+){0,2})(?=\s+(?:adds|launches|unveils|expands|raises|signals|tests|faces|wins|loses|gets|rolls|releases|updates)\b)/,
  );
  if (companyMatch?.[1] && isMeaningfulAnchor(companyMatch[1])) {
    return companyMatch[1];
  }

  return buildEventLabel(intelligence);
}

function getSubjectLabel(intelligence: NormalizedIntelligence) {
  const anchor = getAnchorLabel(intelligence);
  const delta = buildHeadlineDeltaPhrase(intelligence);

  if (!delta) {
    return anchor;
  }

  if (intelligence.reasoningCategory === "product") {
    return `${anchor} in ${delta.replace(/^how\s+/i, "").replace(/^the\s+/i, "")}`;
  }

  if (intelligence.reasoningCategory === "data_report") {
    return `${anchor} from ${delta.replace(/^how\s+/i, "")}`;
  }

  return anchor;
}

function rankAnchorCandidates(intelligence: NormalizedIntelligence) {
  const leadEntity = extractLeadTitleEntity(intelligence.title);
  const titleEntities = extractHeadlineCandidates(intelligence.title).filter((candidate) =>
    isMeaningfulAnchor(candidate),
  );
  const extractedEntities = [...(intelligence.entities ?? []), ...(intelligence.keyEntities ?? [])].filter(
    (candidate, index, array) =>
      array.findIndex((entry) => entry.toLowerCase() === candidate.toLowerCase()) === index &&
      isMeaningfulAnchor(sanitizeAnchorCandidate(candidate)),
  );

  return [leadEntity, ...titleEntities, ...extractedEntities].filter(
    (candidate, index, array): candidate is string =>
      Boolean(candidate) &&
      array.findIndex((entry) => entry?.toLowerCase() === candidate?.toLowerCase()) === index,
  );
}

function extractLeadTitleEntity(title: string) {
  const match = title.match(
    /^([A-Z][A-Za-z0-9.&'-]+(?:\s+[A-Z][A-Za-z0-9.&'-]+){0,2})(?=\s+(?:urges|extends|files|raises|adds|launches|wins|appoints|resigns|signals|reports|says)\b)/i,
  );
  return match?.[1] ?? "";
}

function buildStrongNounPhrase(intelligence: NormalizedIntelligence) {
  if (isGenericHeadlineFragment(getAnchorLabelCandidateFromTitle(intelligence.title))) {
    if (/house|congress|congressional/.test(intelligence.title.toLowerCase())) {
      return "The House vote";
    }

    if (intelligence.reasoningCategory === "policy_regulation") {
      return "This policy move";
    }

    return "This development";
  }

  switch (intelligence.reasoningCategory) {
    case "large_ipo":
      return "the IPO";
    case "policy_regulation":
      return "the policy move";
    case "product":
      return "the product change";
    case "data_report":
      return "the data signal";
    case "executive_move":
      return "the leadership change";
    default:
      return "";
  }
}

function getAnchorLabelCandidateFromTitle(title: string) {
  return extractHeadlineCandidates(title)[0] ?? "";
}

function isGenericHeadlineFragment(value: string) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  const words = normalized.split(/\s+/);
  if (words.length !== 2) {
    return false;
  }

  const genericWords = new Set([
    "house",
    "effort",
    "breaking",
    "news",
    "market",
    "watch",
    "update",
    "report",
  ]);

  return words.every((word) => genericWords.has(word));
}

function sanitizeAnchorCandidate(value: string) {
  const trimmed = value.trim().replace(/[’']s$/i, "");
  if (!trimmed) {
    return "";
  }

  const words = trimmed.split(/\s+/);
  const connectorIndex = words.findIndex((word, index) => index > 0 && CONNECTOR_WORDS.has(word.toLowerCase()));
  const blockerIndex = words.findIndex((word, index) => index > 0 && INVALID_ANCHOR_PARTS.has(word.toLowerCase()));
  const meaningfulWords = words.filter(
    (word) => !INVALID_ANCHOR_PARTS.has(word.toLowerCase()) && !CONNECTOR_WORDS.has(word.toLowerCase()),
  );

  if (blockerIndex > 0) {
    return words.slice(0, blockerIndex).join(" ");
  }

  if (connectorIndex > 0) {
    return words
      .slice(0, connectorIndex)
      .filter((word) => !INVALID_ANCHOR_PARTS.has(word.toLowerCase()))
      .join(" ");
  }

  return meaningfulWords.join(" ").trim();
}

function extractHeadlineCandidates(title: string) {
  return (
    title.match(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}|[A-Z]{2,}|U\.S\.|UK|EU|Federal Reserve|White House)\b/g) ?? []
  )
    .map((match) => match.trim())
    .filter(Boolean);
}

function isMeaningfulAnchor(value: string) {
  const normalized = value.toLowerCase();
  if (!normalized || INVALID_ANCHORS.has(normalized)) {
    return false;
  }

  if (isGenericHeadlineFragment(value)) {
    return false;
  }

  if (value.split(/\s+/).some((word) => INVALID_ANCHORS.has(word.toLowerCase()))) {
    return false;
  }

  if (value.split(/\s+/).some((word) => INVALID_ANCHOR_PARTS.has(word.toLowerCase()))) {
    return false;
  }

  if (/^\d+$/.test(normalized)) {
    return false;
  }

  if (/^(ceo|cfo|cto|us|u\.s\.|tech|finance)$/i.test(value)) {
    return false;
  }

  if (value.split(/\s+/).length === 2 && /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(value)) {
    const words = value.split(/\s+/).map((word) => word.toLowerCase());
    if (words.some((word) => INVALID_ANCHORS.has(word) || CONNECTOR_WORDS.has(word))) {
      return false;
    }

    return true;
  }

  return (
    /^[A-Z]/.test(value) ||
    /(u\.s\.|uk|eu|federal reserve|white house|opec|nato|sec|doj)/i.test(value)
  );
}

function buildEventLabel(intelligence: NormalizedIntelligence) {
  switch (intelligence.reasoningCategory) {
    case "policy_regulation":
      return "This policy move";
    case "corporate":
      return "This corporate update";
    case "mna_funding":
      return "This deal or funding round";
    case "early_stage_funding":
      return "This funding round";
    case "large_ipo":
      return "This IPO filing";
    case "data_report":
      return "This data release";
    case "executive_move":
      return "This leadership move";
    case "product":
      return "This product move";
    case "political":
      return "This political development";
    case "defense_geopolitical":
      return "This geopolitical development";
    case "legal_investigation":
      return "This legal development";
    case "macro_market_move":
      return "This macro signal";
    case "non_signal":
      return "This personal-decision story";
    default:
      return "This development";
  }
}

function buildHeadlineDeltaPhrase(intelligence: NormalizedIntelligence) {
  const corpus = `${intelligence.title} ${intelligence.summary} ${intelligence.primaryChange}`.toLowerCase();

  if (/open links|link interaction|links in chat|click through/.test(corpus)) {
    return "how users interact with links";
  }

  if (/browse|browsing|navigation|navigate|search behavior/.test(corpus)) {
    return "how browsing behavior changes";
  }

  if (/classified|department of defense|military|government contract/.test(corpus)) {
    return "how government adoption and procurement priorities shift";
  }

  if (/foreign office|vetting|appointment|minister|diplomatic/.test(corpus)) {
    return "how governance credibility and diplomatic scrutiny evolve";
  }

  if (
    intelligence.reasoningCategory === "macro_market_move" &&
    /mortgage|rates|refinancing|housing/.test(corpus)
  ) {
    return "how borrowing conditions feed into housing demand";
  }

  if (/funding|raises|series [a-z]|backed|investment/.test(corpus)) {
    return "how capital availability changes competitive pressure";
  }

  if (/traffic|demand|retail|revenue/.test(corpus)) {
    return "how demand signals feed into revenue expectations";
  }

  return "";
}

function sanitizeDeltaPhrase(
  intelligence: NormalizedIntelligence,
  delta: string,
) {
  if (!delta) {
    return "";
  }

  if (
    intelligence.reasoningCategory !== "macro_market_move" &&
    /housing|mortgage|refinancing|borrowing conditions/.test(delta.toLowerCase())
  ) {
    return "";
  }

  return delta;
}

function buildMechanism(intelligence: NormalizedIntelligence, marketLabel: string) {
  const delta = sanitizeDeltaPhrase(intelligence, buildHeadlineDeltaPhrase(intelligence));
  const deltaSuffix = delta ? `, especially in ${delta}` : "";

  switch (intelligence.reasoningCategory) {
    case "policy_regulation":
      return `this changes regulation, compliance, or market-access assumptions around ${marketLabel}${deltaSuffix}`;
    case "corporate":
      return `this changes revenue, margin, or guidance expectations tied to ${marketLabel}${deltaSuffix}`;
    case "mna_funding":
      return `this changes capital availability, competitive positioning, or market structure in ${marketLabel}${deltaSuffix}`;
    case "early_stage_funding":
      return `this changes startup capital availability, ecosystem breadth, and early competitive pressure in ${marketLabel}${deltaSuffix}`;
    case "large_ipo":
      return `this reveals how public investors are valuing new issuance and balancing risk appetite in ${marketLabel}${deltaSuffix}`;
    case "data_report":
      return `this adds a concrete data point that can reset demand assumptions in ${marketLabel}${deltaSuffix}`;
    case "executive_move":
      return `this changes leadership continuity, strategic direction, and execution confidence in ${marketLabel}${deltaSuffix}`;
    case "product":
      return `this changes adoption expectations, product comparison, and feature benchmarks in ${marketLabel}${deltaSuffix}`;
    case "political":
      return `this raises questions about governance credibility, diplomatic judgment, and policy follow-through${delta ? `, especially in ${delta}` : ""}`;
    case "defense_geopolitical":
      return `this changes assumptions about defense posture, state capacity, or international alignment in ${marketLabel}${deltaSuffix}`;
    case "legal_investigation":
      return `this changes liability, operating flexibility, or reputational assumptions around ${marketLabel}${deltaSuffix}`;
    case "macro_market_move":
      return `this changes how investors price rates, demand, or risk in ${marketLabel}${deltaSuffix}`;
    case "non_signal":
      return `the story is mainly useful for individual readers, not for broad market positioning${delta ? `, especially in ${delta}` : ""}`;
    default:
      return `this changes execution expectations around ${marketLabel}${deltaSuffix}`;
  }
}

function buildImpact(intelligence: NormalizedIntelligence, marketLabel: string) {
  const delta = sanitizeDeltaPhrase(intelligence, buildHeadlineDeltaPhrase(intelligence));
  const deltaSuffix = delta ? `, with the clearest effect in ${delta}` : "";

  switch (intelligence.reasoningCategory) {
    case "policy_regulation":
      return `shift sector constraints, cost structures, or strategic flexibility in ${marketLabel}${deltaSuffix}`;
    case "corporate":
      return `move financial expectations, guidance credibility, or valuation in ${marketLabel}${deltaSuffix}`;
    case "mna_funding":
      return `reshape competition, capital allocation, or market structure in ${marketLabel}${deltaSuffix}`;
    case "early_stage_funding":
      return `expand startup competition, partner activity, or ecosystem experimentation in ${marketLabel}${deltaSuffix}`;
    case "large_ipo":
      return `shift valuation expectations, IPO sentiment, or capital-markets confidence in ${marketLabel}${deltaSuffix}`;
    case "data_report":
      return `move demand expectations, revenue assumptions, or narrative momentum in ${marketLabel}${deltaSuffix}`;
    case "executive_move":
      return `shift strategy confidence, governance scrutiny, or execution expectations in ${marketLabel}${deltaSuffix}`;
    case "product":
      return `change adoption patterns, user behavior, or competitive feature dynamics in ${marketLabel}${deltaSuffix}`;
    case "political":
      return `shift governance credibility, political accountability, or policy risk around the story${delta ? `, especially in ${delta}` : ""}`;
    case "defense_geopolitical":
      return `raise defense risk, policy pressure, or international-relations risk in ${marketLabel}${deltaSuffix}`;
    case "legal_investigation":
      return `raise downside risk for operations, cash flow, or reputation in ${marketLabel}${deltaSuffix}`;
    case "macro_market_move":
      return `move market expectations, sector sentiment, or pricing in ${marketLabel}${deltaSuffix}`;
    case "non_signal":
      return `the main relevance stays with individual decision-making rather than market-wide pricing`;
    default:
      return `change expectations around ${marketLabel}${deltaSuffix}`;
  }
}

function buildLowConfidenceFallback(
  intelligence: NormalizedIntelligence,
  previousOutputs: string[] = [],
) {
  const anchorLabel = getSubjectLabel(intelligence);

  if (intelligence.reasoningCategory === "non_signal") {
    const templates = [
      {
        key: "non_signal_specific",
        text: buildNonSignalReviewCopy(anchorLabel),
      },
      {
        key: "non_signal_consumer",
        text: `Editorial review needed for ${anchorLabel}: this looks like personal or consumer guidance, not a structural signal.`,
      },
      {
        key: "non_signal_statement",
        text: `Editorial review needed for ${anchorLabel}: the story is not suitable for public signal copy without a stronger structural link.`,
      },
    ];
    const usageByKey = countPatternUsage(previousOutputs);
    const rankedTemplates = templates
      .map((template, index) => ({
        ...template,
        usage: usageByKey.get(template.key) ?? 0,
        index,
      }))
      .sort((left, right) => {
        if (left.usage !== right.usage) {
          return left.usage - right.usage;
        }

        return left.index - right.index;
      });

    const chosen = chooseBestCandidate(rankedTemplates, previousOutputs);
    return appendSupportingContext(chosen?.text ?? templates[0].text, intelligence);
  }

  const consequence = buildStructuralConsequence(intelligence);
  const marketLabel = buildSpecificMarketLabel(intelligence) || intelligence.topics[0] || "the affected market";
  const templates = [
    {
      key: "specific_shift",
      text: `${anchorLabel} needs confirmation, but the early report matters if ${consequence}.`,
    },
    {
      key: "specific_implication",
      text: `${anchorLabel} is still thinly sourced, so editors should confirm whether it changes ${marketLabel}.`,
    },
    {
      key: "specific_causal",
      text: `${anchorLabel} should remain review-only until reporting shows a concrete structural consequence for ${marketLabel}.`,
    },
  ];
  const usageByKey = countPatternUsage(previousOutputs);
  const rankedTemplates = templates
    .map((template, index) => ({
      ...template,
      usage: usageByKey.get(template.key) ?? 0,
      index,
    }))
    .sort((left, right) => {
      if (left.usage !== right.usage) {
        return left.usage - right.usage;
      }

      return left.index - right.index;
    });
  const chosen = chooseBestCandidate(rankedTemplates, previousOutputs);
  return appendSupportingContext(
    chosen?.text ?? templates[getFallbackVariantIndex(intelligence)]?.text ?? templates[0].text,
    intelligence,
  );
}

function appendSupportingContext(base: string, intelligence: NormalizedIntelligence) {
  const evidence = buildEvidenceSentence(intelligence);
  if (!evidence) {
    return base;
  }

  if (base.includes(evidence)) {
    return base;
  }

  const withEvidence = `${base} ${evidence}`;
  if (withEvidence.length <= 190 && isStandaloneEvidenceSentenceSafe(evidence)) {
    return withEvidence;
  }

  const compactEvidence = buildCompactEvidenceSentence(intelligence);
  const withCompactEvidence = compactEvidence ? `${base} ${compactEvidence}` : base;
  return withCompactEvidence.length <= 190 && isStandaloneEvidenceSentenceSafe(compactEvidence)
    ? withCompactEvidence
    : base;
}

function isStandaloneEvidenceSentenceSafe(value: string) {
  if (!value) {
    return false;
  }

  const wordCount = value
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word)).length;
  if (wordCount >= 8) {
    return true;
  }

  return /\b\d+\s+articles\/(?:[2-9]|\d{2,})\s+sources\b/i.test(value) && /\bentities:\s*\S+/i.test(value);
}

function buildEvidenceSentence(intelligence: NormalizedIntelligence) {
  const eventType = getEvidenceEventLabel(intelligence.reasoningCategory);
  const sourceEvidence = buildSourceEvidence(intelligence.signals.articleCount, intelligence.signals.sourceDiversity);
  const entityEvidence = buildEntityEvidence(intelligence);
  const rankingEvidence = buildRankingEvidence(intelligence.rankingReason);
  const deltaEvidence = buildDeltaEvidence(intelligence);

  if (!sourceEvidence && !entityEvidence && !rankingEvidence && !deltaEvidence) {
    return "";
  }

  const details = [sourceEvidence, entityEvidence, deltaEvidence, rankingEvidence].filter(Boolean).join("; ");
  if (!details) {
    return "";
  }

  return `Evidence: ${eventType}; ${details}.`;
}

function buildCompactEvidenceSentence(intelligence: NormalizedIntelligence) {
  const sourceEvidence = buildSourceEvidence(intelligence.signals.articleCount, intelligence.signals.sourceDiversity);
  const entityEvidence = buildEntityEvidence(intelligence);
  const details = [sourceEvidence, entityEvidence].filter(Boolean).join("; ");

  if (!details) {
    return "";
  }

  return `Evidence: ${details}.`;
}

function getEvidenceEventLabel(reasoningCategory: NormalizedReasoningCategory) {
  switch (reasoningCategory) {
    case "policy_regulation":
      return "policy signal";
    case "corporate":
      return "corporate signal";
    case "mna_funding":
      return "deal signal";
    case "early_stage_funding":
      return "funding signal";
    case "large_ipo":
      return "IPO signal";
    case "data_report":
      return "data signal";
    case "executive_move":
      return "leadership signal";
    case "product":
      return "product signal";
    case "political":
      return "governance signal";
    case "defense_geopolitical":
      return "geopolitical signal";
    case "legal_investigation":
      return "legal-risk signal";
    case "macro_market_move":
      return "macro signal";
    case "non_signal":
      return "consumer-decision story";
    default:
      return "company signal";
  }
}

function buildSourceEvidence(articleCount: number, sourceDiversity: number) {
  if (articleCount > 1 && sourceDiversity > 1) {
    return `${articleCount} articles/${sourceDiversity} sources`;
  }

  if (articleCount > 1) {
    return `${articleCount} articles`;
  }

  if (sourceDiversity > 1) {
    return `${sourceDiversity} sources`;
  }

  if (articleCount === 1 || sourceDiversity === 1) {
    return "single-source coverage";
  }

  return "";
}

function buildEntityEvidence(intelligence: NormalizedIntelligence) {
  const entities = intelligence.keyEntities.length ? intelligence.keyEntities : intelligence.entities.filter(Boolean);
  const uniqueEntities = entities
    .map((entity) => sanitizeAnchorCandidate(entity))
    .filter(
      (entity, index, array): entity is string =>
        Boolean(entity) &&
        isMeaningfulAnchor(entity) &&
        array.findIndex((candidate) => candidate.toLowerCase() === entity.toLowerCase()) === index,
    );
  const labels = uniqueEntities.slice(0, 2);

  if (!labels.length) {
    const anchor = getAnchorLabel(intelligence);
    if (!anchor || anchor.startsWith("This ")) {
      return "";
    }

    return `entity: ${anchor}`;
  }

  if (labels.length === 1) {
    return `entity: ${labels[0]}`;
  }

  return `entities: ${labels[0]}/${labels[1]}`;
}

function buildRankingEvidence(rankingReason: string) {
  const cleaned = rankingReason.replace(/\.$/, "").trim();
  if (!cleaned) {
    return "";
  }

  const compact = cleaned.length > 58 ? `${cleaned.slice(0, 55).trimEnd()}...` : cleaned;
  return `ranked for ${compact.charAt(0).toLowerCase()}${compact.slice(1)}`;
}

function buildDeltaEvidence(intelligence: NormalizedIntelligence) {
  const delta = sanitizeDeltaPhrase(intelligence, buildHeadlineDeltaPhrase(intelligence));
  if (!delta) {
    return "";
  }

  return `shift: ${delta.replace(/^how\s+/i, "")}`;
}

function stripSignalSuffix(value: string) {
  return value.replace(/\s*\(Signal:\s*[^)]+\)\s*$/i, "");
}

function isLowDataScenario(intelligence: NormalizedIntelligence) {
  if (intelligence.reasoningCategory === "non_signal") {
    return false;
  }

  const thinEvidence =
    intelligence.signals.sourceDiversity <= 1 && intelligence.signals.articleCount <= 1;
  const missingAnchor = !getAnchorLabel(intelligence);
  const weakEventType = intelligence.reasoningCategory === "company_update";
  const veryLowConfidence = intelligence.confidenceScore < 28;
  const weakThinStory =
    thinEvidence &&
    intelligence.signalStrength === "weak" &&
    intelligence.confidenceScore < 38;

  return (
    veryLowConfidence ||
    (thinEvidence && missingAnchor) ||
    (thinEvidence && weakEventType && weakThinStory)
  );
}

function formatWhyThisMatters(text: string, signalStrength: EventIntelligence["signalStrength"]) {
  const normalized = ensureSentence(postProcessGrammar(text));
  return `${normalized} (Signal: ${capitalize(signalStrength)})`;
}

function postProcessGrammar(value: string) {
  return dedupeRepeatedClauses(
    value
    .replace(/\bbecause changes\b/gi, "because this changes")
    .replace(/\bwhere this changes\b/gi, "where this changes")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim(),
  );
}

function dedupeRepeatedClauses(value: string) {
  const clauses = value
    .split(/,\s+/)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const deduped: string[] = [];

  for (const clause of clauses) {
    const normalized = clause.toLowerCase();
    if (!deduped.some((existing) => existing.toLowerCase() === normalized)) {
      deduped.push(clause);
    }
  }

  const joined = deduped
    .join(", ")
    .replace(/\b(and)\s+\1\b/gi, "$1")
    .replace(/\b(this changes [^,.;]+)\s+\1\b/gi, "$1");

  return removeRepeatedPhrasePatterns(joined);
}

function removeRepeatedPhrasePatterns(value: string) {
  let result = value;
  const phrasePatterns = [
    /(in\s+[a-z][a-z\s-]+?)(?=,?\s+so it could [^,.!?]+?\s+\1)/gi,
    /(across\s+[a-z][a-z\s-]+?)(?=,?\s+so it could [^,.!?]+?\s+\1)/gi,
    /(around\s+[a-z][a-z\s-]+?)(?=,?\s+so it could [^,.!?]+?\s+\1)/gi,
  ];

  for (const pattern of phrasePatterns) {
    const match = pattern.exec(result);
    if (!match?.[1]) {
      pattern.lastIndex = 0;
      continue;
    }

    const repeatedPhrase = match[1];
    result = result.replace(
      new RegExp(`(so it could [^,.!?]+?)\\s+${escapeRegExp(repeatedPhrase)}`, "i"),
      "$1",
    );
    pattern.lastIndex = 0;
  }

  return result.replace(/\s+/g, " ").replace(/\s+([,.;!?])/g, "$1").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countPatternUsage(previousOutputs: string[]) {
  const usage = new Map<string, number>();

  for (const output of previousOutputs) {
    const key = getPatternKey(output);
    usage.set(key, (usage.get(key) ?? 0) + 1);
  }

  return usage;
}

function chooseBestCandidate<T extends { text: string; usage: number }>(
  candidates: T[],
  previousOutputs: string[],
) {
  return (
    candidates.find((candidate) => candidate.usage < 1 && !isTooSimilar(candidate.text, previousOutputs)) ??
    candidates.find((candidate) => !isTooSimilar(candidate.text, previousOutputs)) ??
    candidates[0]
  );
}

function getPatternKey(output: string) {
  const normalized = output.toLowerCase();

  if (normalized.includes("source review needed")) return "source_review_needed";
  if (normalized.includes("does not yet show a structural change")) return "non_signal_specific";
  if (normalized.includes("personal or consumer guidance")) return "non_signal_consumer";
  if (normalized.includes("not suitable for public signal copy")) return "non_signal_statement";
  if (normalized.includes("not a market-moving development")) return "non_signal_statement";
  if (normalized.includes("consumer or personal guidance")) return "non_signal_consumer";
  if (normalized.includes("individual decision-making frame")) return "non_signal_specific";
  if (normalized.includes("needs confirmation")) return "specific_shift";
  if (normalized.includes("thinly sourced")) return "specific_implication";
  if (normalized.includes("review-only")) return "specific_causal";
  if (normalized.includes("early ecosystem signal")) return "ecosystem_frame";
  if (normalized.includes("startup capital picture")) return "capital_frame";
  if (normalized.includes("competitive expansion")) return "competition_frame";
  if (normalized.includes("ipo window read")) return "ipo_window";
  if (normalized.includes("public-market appetite")) return "risk_appetite";
  if (normalized.includes("valuation discipline")) return "valuation_frame";
  if (normalized.includes("fresh data signal")) return "data_signal";
  if (normalized.includes("demand read")) return "demand_frame";
  if (normalized.includes("near-term expectations")) return "expectation_frame";
  if (normalized.includes("leadership picture")) return "leadership_frame";
  if (normalized.includes("points to an early shift")) return "specific_shift";
  if (normalized.includes("already touches")) return "specific_implication";
  if (normalized.includes("suggests pressure on")) return "specific_causal";
  if (normalized.includes("matters for policy risk")) return "policy_frame";
  if (normalized.includes("even before the full policy response is clear")) return "contrast_frame";
  if (normalized.includes("matters for financial expectations")) return "financial_frame";
  if (normalized.includes("matters for company execution")) return "company_frame";
  if (normalized.includes("changes the competitive picture")) return "allocation_frame";
  if (normalized.includes("changes the feature benchmark")) return "competitive_frame";
  if (normalized.includes("matters for governance credibility")) return "credibility_frame";
  if (normalized.includes("matters for defense and international relations")) return "defense_frame";
  if (normalized.includes("matters for operational risk")) return "operations_frame";
  if (normalized.includes("matters for the macro backdrop")) return "market_frame";
  return "implication_first";
}

function isTooSimilar(candidate: string, previousOutputs: string[]) {
  return previousOutputs.some((previous) => similarityScore(candidate, previous) >= 0.72);
}

function similarityScore(left: string, right: string) {
  const leftWords = new Set(normalizeForSimilarityTokens(left).split(" ").filter(Boolean));
  const rightWords = new Set(normalizeForSimilarityTokens(right).split(" ").filter(Boolean));
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return union === 0 ? 0 : overlap / union;
}

const SIMILARITY_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "this",
  "that",
  "it",
  "because",
  "so",
  "could",
  "over",
  "next",
  "few",
  "quarters",
  "sessions",
  "changes",
  "change",
  "matters",
  "story",
  "google",
  "chrome",
  "rank",
  "ranks",
  "signal",
  "article",
  "articles",
  "source",
  "sources",
  "ranking",
  "favored",
  "coverage",
  "focused",
  "picked",
  "development",
  "key",
  "entity",
  "entities",
  "view",
  "clearest",
  "shift",
]);

function normalizeForSimilarity(value: string) {
  return value
    .toLowerCase()
    .replace(/\(signal:\s+\w+\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForSimilarityTokens(value: string) {
  return normalizeForSimilarity(value)
    .split(" ")
    .filter((word) => word && !SIMILARITY_STOPWORDS.has(word))
    .join(" ");
}

function ensureSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "This development could shift near-term expectations.";
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function getTimeHorizonLabel(horizon: EventIntelligence["timeHorizon"]) {
  switch (horizon) {
    case "short":
      return "next few sessions";
    case "medium":
      return "next few quarters";
    default:
      return "longer term";
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeIntelligence(
  intelligence: EventIntelligence,
  sourceContext: Pick<
    GenerateWhyThisMattersOptions,
    "eventTypeOverride" | "contentAccessibility" | "accessibleTextLength" | "sourceAccessibilityWarnings"
  > = {},
): NormalizedIntelligence {
  const entities = intelligence.entities?.length
    ? intelligence.entities
    : intelligence.keyEntities?.length
      ? intelligence.keyEntities
      : [intelligence.title];
  const primaryTopic = intelligence.topics?.[0] ?? "markets";
  const affectedMarkets = intelligence.affectedMarkets?.length
    ? intelligence.affectedMarkets
    : [primaryTopic];

  const eventType = sourceContext.eventTypeOverride || intelligence.eventType || deriveLegacyEventType(intelligence);

  return {
    ...intelligence,
    entities,
    eventType,
    primaryImpact:
      intelligence.primaryImpact ||
      `it can change expectations around ${affectedMarkets[0] ?? primaryTopic}`,
    affectedMarkets,
    timeHorizon: intelligence.timeHorizon || "medium",
    signalStrength: intelligence.signalStrength || "moderate",
    reasoningCategory: mapReasoningCategory(eventType),
    contentAccessibility: sourceContext.contentAccessibility,
    accessibleTextLength: sourceContext.accessibleTextLength,
    sourceAccessibilityWarnings: sourceContext.sourceAccessibilityWarnings ?? [],
  };
}

function mapReasoningCategory(eventType: string): NormalizedReasoningCategory {
  switch (eventType) {
    case "policy_regulation":
    case "government_capacity":
    case "platform_regulation":
    case "ai_infrastructure_policy":
    case "institutional_governance":
    case "regulation":
      return "policy_regulation";
    case "corporate":
    case "earnings_financials":
    case "earnings":
      return "corporate";
    case "mna_funding":
    case "m&a":
      return "mna_funding";
    case "early_stage_funding":
      return "early_stage_funding";
    case "large_ipo":
      return "large_ipo";
    case "data_report":
      return "data_report";
    case "executive_move":
      return "executive_move";
    case "product":
    case "product_launch_major":
      return "product";
    case "political":
    case "governance_politics":
      return "political";
    case "defense":
    case "geopolitical":
    case "geopolitics":
      return "defense_geopolitical";
    case "legal_investigation":
    case "public_interest_legal_accountability":
    case "cybersecurity_enforcement":
      return "legal_investigation";
    case "macro_market_move":
    case "macro_data_release":
    case "central_bank_policy":
    case "macro":
      return "macro_market_move";
    case "non_signal":
      return "non_signal";
    default:
      return "company_update";
  }
}

function deriveLegacyEventType(intelligence: EventIntelligence) {
  const corpus = `${intelligence.title} ${intelligence.summary} ${intelligence.topics?.join(" ") ?? ""}`.toLowerCase();

  if (/advice|q&a|qa|how to|should i|should you|moneyist|personal finance|lifestyle/.test(corpus)) return "non_signal";
  if (/ipo|initial public offering|listing|public offering/.test(corpus)) return "large_ipo";
  if (/series [a-z]|seed round|funding|raises|raised/.test(corpus)) return "early_stage_funding";
  if (/traffic rose|data shows|report shows|survey|index|usage rose/.test(corpus)) return "data_report";
  if (/ceo|chief executive|appoints|appointed|steps down|resigns/.test(corpus)) return "executive_move";
  if (
    (corpus.includes("chrome") || corpus.includes("ai mode")) &&
    (corpus.includes("lets you") || corpus.includes("open links") || corpus.includes("side-by-side"))
  ) return "product";
  if (/department of defense|classified|government|military|pentagon/.test(corpus)) return "defense";
  if (/election|minister|foreign office|parliament|cabinet|vetting|ambassador|appointment/.test(corpus)) return "political";
  if (/earnings|guidance|revenue|profit|quarter/.test(corpus)) return "corporate";
  if (/lawsuit|probe|investigation|charges|sec|doj/.test(corpus)) return "legal_investigation";
  if (/regulation|regulatory|policy|senate|congress|ban|antitrust/.test(corpus)) return "policy_regulation";
  if (/fed|inflation|rates|treasury|economy|macro/.test(corpus)) return "macro_market_move";
  if (/acquisition|merger|buyout|deal|takeover|funding|raises/.test(corpus)) return "mna_funding";
  if (/product launch|launch|launched|release|released|unveiled|rollout|debut|feature|update/.test(corpus)) return "product";
  if (/sanctions|war|export restrictions|geopolit|diplomacy|border/.test(corpus)) return "geopolitical";
  return "company_update";
}

export const __testing__ = {
  extractPrimaryAnchor,
  mapReasoningCategory,
  buildLowConfidenceFallback,
  buildHeadlineDeltaPhrase,
  postProcessGrammar,
  dedupeRepeatedClauses,
  getPatternKey,
  isMeaningfulAnchor,
  isLowDataScenario,
  similarityScore,
};

function getFallbackVariantIndex(intelligence: NormalizedIntelligence) {
  const seed = `${intelligence.id}:${intelligence.reasoningCategory}:${intelligence.title}`.length;
  return seed % 3;
}
