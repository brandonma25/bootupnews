import type { EventIntelligence } from "@/lib/types";

export type TrustLayerPresentation = {
  tier: "high" | "medium" | "low";
  heading: string;
  body: string;
  supportingSignals: string[];
};

type GenerateWhyThisMattersOptions = {
  previousOutputs?: string[];
};

type NormalizedReasoningCategory =
  | "policy_regulation"
  | "corporate"
  | "mna_funding"
  | "product"
  | "political"
  | "defense_geopolitical"
  | "legal_investigation"
  | "macro_market_move"
  | "company_update";

type NormalizedIntelligence = EventIntelligence & {
  entities: string[];
  affectedMarkets: string[];
  timeHorizon: EventIntelligence["timeHorizon"];
  signalStrength: EventIntelligence["signalStrength"];
  reasoningCategory: NormalizedReasoningCategory;
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
        `${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
    {
      key: "policy_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for policy risk because ${mechanism}, and that could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `Even before the full policy response is clear, ${anchor} matters because ${mechanism}, which could ${impact} over the ${horizonLabel}.`,
    },
  ],
  corporate: [
    {
      key: "implication_first",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
    {
      key: "financial_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for financial expectations because ${mechanism}, which could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `The headline is company-specific, but ${anchor} could still ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
  ],
  mna_funding: [
    {
      key: "allocation_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} changes the competitive picture because ${mechanism}, and that could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "competitive_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `This is partly a capital story, but ${anchor} could still ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
  ],
  product: [
    {
      key: "adoption_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
    {
      key: "competitive_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} changes the feature benchmark buyers compare against because ${mechanism}, which could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `It is a product story rather than a policy one, but ${anchor} could still ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
  ],
  political: [
    {
      key: "governance_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
    {
      key: "credibility_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for governance credibility because ${mechanism}, which could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `This is not an equity story by default; ${anchor} matters because ${mechanism}, and that could ${impact} over the ${horizonLabel}.`,
    },
  ],
  defense_geopolitical: [
    {
      key: "defense_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for defense and international relations because ${mechanism}, which could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "policy_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `This should be read through a geopolitical lens, not a valuation lens, because ${anchor} matters where ${mechanism}, and that could ${impact} over the ${horizonLabel}.`,
    },
  ],
  legal_investigation: [
    {
      key: "liability_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
    {
      key: "operations_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for operational risk because ${mechanism}, which could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `Even if the legal outcome is still unfolding, ${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
  ],
  macro_market_move: [
    {
      key: "implication_first",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
    {
      key: "market_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `${anchor} matters for the macro backdrop because ${mechanism}, which could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "contrast_frame",
      build: ({ anchor, mechanism, impact, horizonLabel }) =>
        `This changes the macro baseline rather than just the headline, because ${anchor} matters where ${mechanism}, and that could ${impact} over the ${horizonLabel}.`,
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
        `This still looks company-specific, but ${anchor} could ${impact} over the ${horizonLabel} because ${mechanism}.`,
    },
  ],
};

export async function generateWhyThisMatters(
  intelligence: EventIntelligence,
  options: GenerateWhyThisMattersOptions = {},
) {
  const normalized = normalizeIntelligence(intelligence);
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
  },
): TrustLayerPresentation {
  if (!intelligence) {
    return {
      tier: "medium",
      heading: "Why this is here",
      body: fallback.whyItMatters || `Tracked in ${fallback.topicName} because it cleared the current briefing filters.`,
      supportingSignals: fallback.rankingSignals?.slice(0, 2) ?? [],
    };
  }

  const tier = intelligence.confidenceScore >= 72 ? "high" : intelligence.confidenceScore >= 45 ? "medium" : "low";
  const normalized = normalizeIntelligence(intelligence);
  const body = formatWhyThisMatters(
    buildGroundedWhyThisMatters(normalized, []),
    normalized.signalStrength,
  );

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

function buildGroundedWhyThisMatters(
  intelligence: NormalizedIntelligence,
  previousOutputs: string[],
) {
  if (isLowDataScenario(intelligence)) {
    return buildLowConfidenceFallback(intelligence, previousOutputs);
  }

  const anchorLabel = getAnchorLabel(intelligence);
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

  return chosen?.text ?? buildLowConfidenceFallback(intelligence, previousOutputs);
}

function extractPrimaryAnchor(intelligence: NormalizedIntelligence) {
  const candidates = [
    ...extractHeadlineCandidates(intelligence.title),
    ...(intelligence.entities ?? []),
    ...(intelligence.keyEntities ?? []),
  ];

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

  const titleCandidates = extractHeadlineCandidates(intelligence.title).filter((candidate) =>
    isMeaningfulAnchor(candidate),
  );
  if (titleCandidates.length) {
    return titleCandidates[0];
  }

  const companyMatch = intelligence.title.match(
    /^([A-Z][A-Za-z0-9.&'-]+(?:\s+[A-Z][A-Za-z0-9.&'-]+){0,2})(?=\s+(?:adds|launches|unveils|expands|raises|signals|tests|faces|wins|loses|gets|rolls|releases|updates)\b)/,
  );
  if (companyMatch?.[1] && isMeaningfulAnchor(companyMatch[1])) {
    return companyMatch[1];
  }

  return buildEventLabel(intelligence);
}

function sanitizeAnchorCandidate(value: string) {
  const trimmed = value.trim().replace(/[’']s$/i, "");
  const words = trimmed.split(/\s+/);
  const connectorIndex = words.findIndex((word, index) => index > 0 && CONNECTOR_WORDS.has(word.toLowerCase()));

  if (connectorIndex > 0) {
    return words.slice(0, connectorIndex).join(" ");
  }

  return trimmed;
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

  if (/^\d+$/.test(normalized)) {
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
    default:
      return "This development";
  }
}

function buildMechanism(intelligence: NormalizedIntelligence, marketLabel: string) {
  switch (intelligence.reasoningCategory) {
    case "policy_regulation":
      return `this changes regulation, compliance, or market-access assumptions around ${marketLabel}`;
    case "corporate":
      return `this changes revenue, margin, or guidance expectations tied to ${marketLabel}`;
    case "mna_funding":
      return `this changes capital availability, competitive positioning, or market structure in ${marketLabel}`;
    case "product":
      return `this changes adoption expectations, product comparison, and feature benchmarks in ${marketLabel}`;
    case "political":
      return `this raises questions about governance credibility, diplomatic judgment, and policy follow-through`;
    case "defense_geopolitical":
      return `this changes assumptions about defense posture, state capacity, or international alignment in ${marketLabel}`;
    case "legal_investigation":
      return `this changes liability, operating flexibility, or reputational assumptions around ${marketLabel}`;
    case "macro_market_move":
      return `this changes how investors price rates, demand, or risk in ${marketLabel}`;
    default:
      return `this changes execution expectations around ${marketLabel}`;
  }
}

function buildImpact(intelligence: NormalizedIntelligence, marketLabel: string) {
  switch (intelligence.reasoningCategory) {
    case "policy_regulation":
      return `shift sector constraints, cost structures, or strategic flexibility in ${marketLabel}`;
    case "corporate":
      return `move financial expectations, guidance credibility, or valuation in ${marketLabel}`;
    case "mna_funding":
      return `reshape competition, capital allocation, or market structure in ${marketLabel}`;
    case "product":
      return `change adoption patterns, user behavior, or competitive feature dynamics in ${marketLabel}`;
    case "political":
      return `shift governance credibility, political accountability, or policy risk around the story`;
    case "defense_geopolitical":
      return `raise defense risk, policy pressure, or international-relations risk in ${marketLabel}`;
    case "legal_investigation":
      return `raise downside risk for operations, cash flow, or reputation in ${marketLabel}`;
    case "macro_market_move":
      return `move market expectations, sector sentiment, or pricing in ${marketLabel}`;
    default:
      return `change expectations around ${marketLabel}`;
  }
}

function buildLowConfidenceFallback(
  intelligence: NormalizedIntelligence,
  previousOutputs: string[] = [],
) {
  const marketLabel = intelligence.affectedMarkets.slice(0, 2).join(" and ");
  const anchorLabel = getAnchorLabel(intelligence);
  const horizonLabel = getTimeHorizonLabel(intelligence.timeHorizon);
  const mechanism = buildMechanism(intelligence, marketLabel);
  const impact = buildImpact(intelligence, marketLabel);
  const templates = [
    {
      key: "specific_shift",
      text: `${anchorLabel} points to an early shift in ${marketLabel}, which could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "specific_implication",
      text: `${anchorLabel} already touches ${marketLabel}, and even limited reporting could ${impact} over the ${horizonLabel}.`,
    },
    {
      key: "specific_causal",
      text: `${anchorLabel} suggests pressure on ${marketLabel} because ${mechanism}, which could ${impact} over the ${horizonLabel}.`,
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

  return chosen?.text ?? templates[getFallbackVariantIndex(intelligence)]?.text ?? templates[0].text;
}

function isLowDataScenario(intelligence: NormalizedIntelligence) {
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
  return value
    .replace(/\bbecause changes\b/gi, "because this changes")
    .replace(/\bwhere this changes\b/gi, "where this changes")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();
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
  const leftWords = new Set(normalizeForSimilarity(left).split(" ").filter(Boolean));
  const rightWords = new Set(normalizeForSimilarity(right).split(" ").filter(Boolean));
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return union === 0 ? 0 : overlap / union;
}

function normalizeForSimilarity(value: string) {
  return value
    .toLowerCase()
    .replace(/\(signal:\s+\w+\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function normalizeIntelligence(intelligence: EventIntelligence): NormalizedIntelligence {
  const entities = intelligence.entities?.length
    ? intelligence.entities
    : intelligence.keyEntities?.length
      ? intelligence.keyEntities
      : [intelligence.title];
  const primaryTopic = intelligence.topics?.[0] ?? "markets";
  const affectedMarkets = intelligence.affectedMarkets?.length
    ? intelligence.affectedMarkets
    : [primaryTopic];

  return {
    ...intelligence,
    entities,
    eventType: intelligence.eventType || deriveLegacyEventType(intelligence),
    primaryImpact:
      intelligence.primaryImpact ||
      `it can change expectations around ${affectedMarkets[0] ?? primaryTopic}`,
    affectedMarkets,
    timeHorizon: intelligence.timeHorizon || "medium",
    signalStrength: intelligence.signalStrength || "moderate",
    reasoningCategory: mapReasoningCategory(intelligence.eventType || deriveLegacyEventType(intelligence)),
  };
}

function mapReasoningCategory(eventType: string): NormalizedReasoningCategory {
  switch (eventType) {
    case "policy_regulation":
    case "regulation":
      return "policy_regulation";
    case "corporate":
    case "earnings_financials":
    case "earnings":
      return "corporate";
    case "mna_funding":
    case "m&a":
      return "mna_funding";
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
      return "legal_investigation";
    case "macro_market_move":
    case "macro":
      return "macro_market_move";
    default:
      return "company_update";
  }
}

function deriveLegacyEventType(intelligence: EventIntelligence) {
  const corpus = `${intelligence.title} ${intelligence.summary} ${intelligence.topics?.join(" ") ?? ""}`.toLowerCase();

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
  postProcessGrammar,
  getPatternKey,
  isMeaningfulAnchor,
  isLowDataScenario,
};

function getFallbackVariantIndex(intelligence: NormalizedIntelligence) {
  const seed = `${intelligence.id}:${intelligence.reasoningCategory}:${intelligence.title}`.length;
  return seed % 3;
}
