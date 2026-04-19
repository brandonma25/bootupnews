import { createHash } from "crypto";

import { classifyHomepageCategory, getHomepageCategoryLabel } from "@/lib/homepage-taxonomy";
import type { FeedArticle } from "@/lib/rss";
import type {
  BriefingItem,
  EventIntelligence,
  EventSignalStrength,
  EventTimeHorizon,
} from "@/lib/types";
import { firstSentence, stripHtml } from "@/lib/utils";

type EventIntelligenceOptions = {
  topicName: string;
  matchedKeywords?: string[];
  createdAt?: string;
};

const HIGH_SIGNAL_HINTS = [
  "earnings",
  "fed",
  "federal reserve",
  "inflation",
  "rates",
  "tariff",
  "trade",
  "acquisition",
  "merger",
  "funding",
  "ipo",
  "sanctions",
  "regulation",
  "policy",
  "executive order",
  "white house",
  "senate",
  "congress",
  "minister",
  "cabinet",
  "chip",
  "semiconductor",
  "cloud",
  "ai",
  "cybersecurity",
  "breach",
  "layoff",
  "data center",
];

const LOW_SIGNAL_HINTS = [
  "deal",
  "deals",
  "discount",
  "sale",
  "gift guide",
  "black friday",
  "cyber monday",
  "best of",
  "top 10",
  "review",
  "hands on",
  "hands-on",
  "streaming guide",
  "celebrity",
  "movie",
  "tv show",
  "sports",
  "game recap",
];

const NON_SIGNAL_HINTS = [
  "advice",
  "ask",
  "qa",
  "q&a",
  "questions and answers",
  "how to",
  "should i",
  "should you",
  "dear",
  "personal finance",
  "retirement advice",
  "moneyist",
  "lifestyle",
  "horoscope",
  "relationship",
  "travel tips",
  "wellness",
  "recipe",
];

const TOPIC_RULES: Array<{ topic: string; keywords: string[] }> = [
  { topic: "tech", keywords: ["ai", "software", "cloud", "chip", "chips", "semiconductor", "platform", "developer", "data center", "cyber", "device"] },
  { topic: "finance", keywords: ["markets", "market", "stocks", "bonds", "treasury", "fed", "inflation", "rates", "earnings", "bank", "banking", "ipo", "acquisition", "merger", "revenue", "economy", "economic", "trade", "tariff"] },
  { topic: "business", keywords: ["company", "companies", "revenue", "profit", "guidance", "capital", "acquisition", "merger", "layoff", "business"] },
  { topic: "politics", keywords: ["government", "white house", "election", "senate", "congress", "policy", "regulation", "regulatory", "executive order", "campaign"] },
  { topic: "geopolitics", keywords: ["sanctions", "diplomacy", "minister", "cabinet", "parliament", "geopolitical", "war", "border", "alliance", "ministry", "iran", "tehran", "hormuz", "strait", "military", "missile"] },
];

export function buildEventIntelligence(
  articles: FeedArticle[],
  options: EventIntelligenceOptions,
): EventIntelligence {
  const sorted = [...articles].sort(
    (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
  );
  const representative = sorted[0];
  const sourceDiversity = new Set(sorted.map((article) => article.sourceName)).size;
  const articleCount = sorted.length;
  const keyEntities = extractKeyEntities(sorted, options.matchedKeywords);
  const topics = deriveTopics(sorted, options.topicName, options.matchedKeywords);
  const eventType = inferEventType(sorted, options.topicName, options.matchedKeywords);
  const isNonSignalContent = isNonSignalArticleSet(sorted, options.topicName, options.matchedKeywords);
  const affectedMarkets = inferAffectedMarkets(sorted, eventType, topics, keyEntities);
  const timeHorizon = inferTimeHorizon(eventType, sorted);
  const primaryChange = buildPrimaryChange(representative?.title ?? options.topicName);
  const primaryImpact = inferPrimaryImpact({
    eventType,
    primaryChange,
    entities: keyEntities,
    affectedMarkets,
    topics,
  });
  const summary = buildSummary(sorted, primaryChange, sourceDiversity, topics);
  const recencyScore = computeRecencyScore(sorted);
  const velocityScore = computeVelocityScore(sorted);
  const rankingScore = Math.round(
    normalizeArticleCount(articleCount) * 0.4 +
      normalizeSourceDiversity(sourceDiversity) * 0.3 +
      recencyScore * 0.2 +
      velocityScore * 0.1,
  );
  const rankingReason = buildRankingReason({
    articleCount,
    sourceDiversity,
    recencyScore,
    velocityScore,
    keyEntities,
    topics,
    primaryChange,
  });
  const confidenceScore = computeConfidenceScore({
    articleCount,
    sourceDiversity,
    keyEntities,
    topics,
    summary,
    matchedKeywords: options.matchedKeywords ?? [],
  });
  const signalStrength = getSignalStrength({
    eventType,
    affectedMarkets,
    sourceDiversity,
    articleCount,
    rankingScore,
    topics,
    sourceNames: sorted.map((article) => article.sourceName),
    recencyScore,
    velocityScore,
    isNonSignalContent,
    confidenceScore,
  });
  const isHighSignal = evaluateHighSignal({
    title: representative?.title ?? primaryChange,
    summary,
    topics,
    rankingScore,
    articleCount,
    sourceDiversity,
    isNonSignalContent,
  });

  return {
    id: createHash("sha1")
      .update(`${options.topicName}:${representative?.url ?? representative?.title ?? primaryChange}`)
      .digest("hex")
      .slice(0, 16),
    title: representative?.title ?? primaryChange,
    summary,
    primaryChange,
    entities: keyEntities,
    sourceNames: sorted.map((article) => article.sourceName),
    eventType,
    primaryImpact,
    affectedMarkets,
    timeHorizon,
    signalStrength,
    keyEntities,
    topics,
    signals: {
      articleCount,
      sourceDiversity,
      recencyScore,
      velocityScore,
    },
    rankingScore,
    rankingReason,
    confidenceScore,
    isHighSignal,
    createdAt: options.createdAt ?? representative?.publishedAt ?? new Date().toISOString(),
  };
}

export function getSignalStrength(input: {
  eventType: string;
  affectedMarkets: string[];
  sourceDiversity: number;
  articleCount: number;
  rankingScore: number;
  topics: string[];
  sourceNames?: string[];
  recencyScore?: number;
  velocityScore?: number;
  isNonSignalContent?: boolean;
  confidenceScore?: number;
}): EventSignalStrength {
  if (input.isNonSignalContent || input.eventType === "non_signal") {
    return "weak";
  }

  let score = getEventTypeSignalWeight(input.eventType);
  const sourceTierWeight = getSourceTierSignalWeight(input.sourceNames ?? []);
  const singleSource = input.articleCount <= 1 && input.sourceDiversity <= 1;

  if (sourceTierWeight >= 2 || input.sourceDiversity >= 2) {
    score += 1;
  }

  if (singleSource) {
    score -= 1;
  }

  if (input.eventType === "product" && input.affectedMarkets.length >= 2 && sourceTierWeight >= 1) {
    score += 1;
  }

  if (input.eventType === "corporate" && input.rankingScore >= 65) {
    score += 1;
  }

  if (input.eventType === "company_update" && input.sourceDiversity <= 1) {
    score -= 1;
  }

  if (singleSource) {
    const highImpactSingleSource =
      isHighImpactEventType(input.eventType) &&
      sourceTierWeight >= 2 &&
      ((input.confidenceScore ?? 0) >= 45 || ["defense", "policy_regulation", "macro_market_move"].includes(input.eventType));

    return highImpactSingleSource ? "moderate" : "weak";
  }

  if (score >= 2) {
    return "strong";
  }

  if (score >= 1) {
    return "moderate";
  }

  return "weak";
}

export function getTrustTier(confidenceScore: number) {
  if (confidenceScore >= 72) {
    return "high" as const;
  }

  if (confidenceScore >= 45) {
    return "medium" as const;
  }

  return "low" as const;
}

function extractKeyEntities(articles: FeedArticle[], matchedKeywords?: string[]) {
  const candidates = new Map<string, number>();
  const corpus = articles
    .slice(0, 5)
    .map((article) => `${article.title}. ${article.summaryText}`)
    .join(" ");

  const phraseMatches = corpus.match(
    /\b(?:[A-Z]{2,}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}|White House|Federal Reserve)\b/g,
  ) ?? [];

  for (const match of phraseMatches) {
    const cleaned = cleanEntity(match);
    if (!cleaned || isStopEntity(cleaned)) {
      continue;
    }
    candidates.set(cleaned, (candidates.get(cleaned) ?? 0) + 2);
  }

  for (const keyword of matchedKeywords ?? []) {
    const entity = cleanEntity(keyword);
    if (!entity || entity.length < 3 || isCommonSignal(entity)) {
      continue;
    }
    candidates.set(entity, (candidates.get(entity) ?? 0) + 1);
  }

  return [...candidates.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([entity]) => entity)
    .slice(0, 4);
}

function deriveTopics(articles: FeedArticle[], topicName: string, matchedKeywords?: string[]) {
  const classification = classifyHomepageCategory({
    topicName,
    title: articles[0]?.title,
    summary: articles.slice(0, 3).map((article) => article.summaryText).join(" "),
    matchedKeywords,
    sourceNames: articles.map((article) => article.sourceName),
  });
  const corpus = normalizeText(
    `${topicName} ${articles.map((article) => `${article.title} ${article.summaryText}`).join(" ")} ${(matchedKeywords ?? []).join(" ")}`,
  );
  const topics = new Set<string>();

  if (classification.primaryCategory) {
    topics.add(classification.primaryCategory);
  }
  for (const secondary of classification.secondaryCategories) {
    topics.add(secondary);
  }

  for (const rule of TOPIC_RULES) {
    if (rule.keywords.some((keyword) => corpus.includes(keyword))) {
      topics.add(rule.topic);
    }
  }

  if (!topics.size) {
    topics.add(topicName.toLowerCase());
  }

  return [...topics].slice(0, 4);
}

function inferEventType(
  articles: FeedArticle[],
  topicName: string,
  matchedKeywords?: string[],
) {
  const corpus = normalizeText(
    `${topicName} ${articles.map((article) => `${article.title} ${article.summaryText}`).join(" ")} ${(matchedKeywords ?? []).join(" ")}`,
  );

  if (isNonSignalCorpus(corpus)) {
    return "non_signal";
  }

  if (
    (corpus.includes("chrome") || corpus.includes("ai mode")) &&
    (corpus.includes("lets you") || corpus.includes("open links") || corpus.includes("side-by-side"))
  ) {
    return "product";
  }

  if (isDefenseGeopoliticalCluster(corpus, topicName, matchedKeywords)) {
    return "defense";
  }

  const rules: Array<[string, string[]]> = [
    ["defense", ["department of defense", "classified", "government", "military", "pentagon", "defense department"]],
    ["political", ["election", "minister", "foreign office", "foreign minister", "cabinet", "parliament", "vetting", "ambassador", "appointment", "surveillance powers", "oversight", "executive authority"]],
    ["large_ipo", ["ipo", "initial public offering", "listing", "public offering", "files for ipo"]],
    ["early_stage_funding", ["raises", "raised", "series a", "series b", "seed round", "backed", "funding round"]],
    ["data_report", ["traffic rose", "data shows", "report shows", "survey", "index", "usage rose", "grew", "rose 393", "retail traffic"]],
    ["executive_move", ["ceo", "chief executive", "chairman", "chair", "appoints", "appointed", "steps down", "resigns", "names"]],
    ["corporate", ["earnings", "guidance", "revenue", "profit", "quarter", "results"]],
    ["product", ["product launch", "launch", "launched", "feature", "features", "update", "updated", "release", "released", "rollout", "debut", "debuts", "adds"]],
    ["legal_investigation", ["lawsuit", "probe", "investigation", "charges", "doj", "sec", "antitrust case"]],
    ["policy_regulation", ["regulation", "regulatory", "antitrust", "rule", "rules", "senate", "congress", "policy", "ban", "approval", "approved", "export restrictions", "tariff"]],
    ["macro_market_move", ["inflation", "fed", "federal reserve", "rates", "treasury", "jobs", "gdp", "economy", "economic", "trade"]],
    ["mna_funding", ["acquisition", "acquire", "merger", "buyout", "takeover", "stake", "deal"]],
    ["geopolitical", ["sanctions", "war", "diplomacy", "china", "russia", "ukraine", "taiwan", "middle east", "border"]],
  ];

  const matchedRule = rules.find(([, keywords]) => keywords.some((keyword) => matchesKeyword(corpus, keyword)));
  return matchedRule?.[0] ?? "company_update";
}

function isDefenseGeopoliticalCluster(
  corpus: string,
  topicName: string,
  matchedKeywords?: string[],
) {
  const normalizedTopic = normalizeText(topicName);
  const normalizedKeywords = normalizeText((matchedKeywords ?? []).join(" "));
  const combined = `${corpus} ${normalizedTopic} ${normalizedKeywords}`;

  const conflictKeywords = [
    "iran",
    "israel",
    "gaza",
    "war",
    "defense",
    "military",
    "talks",
    "missile",
    "strike",
    "ceasefire",
  ];
  const geopoliticalActors = [
    "us",
    "u s",
    "u.s",
    "congress",
    "congressional",
    "government",
    "state",
    "white house",
    "pentagon",
    "ministry",
    "minister",
  ];
  const companyIndicators = [
    "live nation",
    "ticketmaster",
    "adobe",
    "google",
    "meta",
    "microsoft",
    "apple",
    "company",
    "antitrust",
    "lawsuit",
    "probe",
  ];

  const hasConflictKeyword = conflictKeywords.some((term) => combined.includes(term));
  const hasGeopoliticalActor = geopoliticalActors.some((term) => combined.includes(term));
  const hasCompanyIndicator = companyIndicators.some((term) => combined.includes(term));

  if (hasCompanyIndicator && !hasGeopoliticalActor) {
    return false;
  }

  return hasConflictKeyword && hasGeopoliticalActor;
}

function inferPrimaryImpact(input: {
  eventType: string;
  primaryChange: string;
  entities: string[];
  affectedMarkets: string[];
  topics: string[];
}) {
  const entityLabel = input.entities[0] ?? input.primaryChange;
  const marketLabel = input.affectedMarkets[0] ?? "investor expectations";

  switch (input.eventType) {
    case "non_signal":
      return "This is not a market-moving development but may still matter for individual decision-making.";
    case "early_stage_funding":
      return `${entityLabel} gives an early read on where startup capital and ecosystem competition may broaden in ${marketLabel}.`;
    case "large_ipo":
      return `${entityLabel} provides a window into risk appetite, valuation discipline, and public-market demand in ${marketLabel}.`;
    case "data_report":
      return `${entityLabel} offers a fresh data point that can change demand expectations and near-term narrative strength in ${marketLabel}.`;
    case "executive_move":
      return `${entityLabel} may shift strategic execution, leadership credibility, or institutional direction in ${marketLabel}.`;
    case "corporate":
      return `${entityLabel} is resetting near-term expectations for pricing, margins, or guidance in ${marketLabel}.`;
    case "political":
      return `${entityLabel} may affect governance credibility, diplomatic standing, or policy risk around the story.`;
    case "defense":
      return `${entityLabel} may change defense posture, state capacity, or international risk assumptions tied to ${marketLabel}.`;
    case "policy_regulation":
      return `${entityLabel} could alter operating rules, compliance costs, or market access across ${marketLabel}.`;
    case "macro_market_move":
      return `${entityLabel} changes the rate, demand, or liquidity backdrop feeding into ${marketLabel}.`;
    case "mna_funding":
      return `${entityLabel} can shift competitive positioning, capital allocation, and consolidation expectations in ${marketLabel}.`;
    case "geopolitical":
      return `${entityLabel} may disrupt supply chains, policy alignment, or risk premiums tied to ${marketLabel}.`;
    case "product":
      return `${entityLabel} could change adoption curves, platform choice, or buyer expectations in ${marketLabel}.`;
    case "legal_investigation":
      return `${entityLabel} may raise liability, operating constraints, or reputational risk across ${marketLabel}.`;
    default:
      if (input.topics.includes("tech")) {
        return `${entityLabel} could change execution risk and platform positioning across ${marketLabel}.`;
      }

      return `${entityLabel} has the clearest near-term effect on ${marketLabel}.`;
  }
}

function inferAffectedMarkets(
  articles: FeedArticle[],
  eventType: string,
  topics: string[],
  entities: string[],
) {
  const corpus = normalizeText(
    `${topics.join(" ")} ${entities.join(" ")} ${articles.map((article) => `${article.title} ${article.summaryText}`).join(" ")}`,
  );
  const affected = new Set<string>();

  if (eventType === "non_signal") {
    affected.add("individual decision-making");
    return [...affected];
  }

  if (eventType === "macro_market_move") {
    affected.add("rates");
    affected.add("equities");
  }

  if (eventType === "early_stage_funding") {
    affected.add("startup competition");
    affected.add("capital formation");
  }

  if (eventType === "large_ipo") {
    affected.add("ipo demand");
    affected.add("valuation");
  }

  if (eventType === "data_report") {
    affected.add("demand");
    affected.add("expectations");
  }

  if (eventType === "executive_move") {
    affected.add("strategy");
    affected.add("leadership credibility");
  }

  if (eventType === "corporate" || corpus.includes("guidance") || corpus.includes("revenue")) {
    affected.add("financials");
    affected.add("margins");
    affected.add("valuation");
  }

  if (eventType === "policy_regulation") {
    affected.add("policy-sensitive sectors");
  }

  if (eventType === "mna_funding") {
    affected.add("competition");
    affected.add("market structure");
  }

  if (eventType === "product") {
    affected.add("adoption");
    affected.add("user behavior");
    affected.add("competitive feature dynamics");
  }

  if (eventType === "political") {
    affected.add("governance credibility");
    affected.add("policy risk");
    affected.add("international relations");
  }

  if (eventType === "defense" || eventType === "geopolitical") {
    affected.add("policy risk");
    affected.add("defense posture");
    affected.add("international relations");
  }

  if (eventType === "legal_investigation") {
    affected.add("liability");
    affected.add("operations");
    affected.add("reputation");
  }

  if (corpus.includes("chip") || corpus.includes("semiconductor")) {
    affected.add("semiconductors");
  }

  if (corpus.includes("oil") || corpus.includes("energy")) {
    affected.add("energy");
  }

  if (corpus.includes("bank") || corpus.includes("credit")) {
    affected.add("credit");
  }

  if (topics.includes("finance") && !["political", "defense", "geopolitical", "early_stage_funding", "product"].includes(eventType)) {
    affected.add("equities");
  }

  if (topics.includes("tech") && !["political", "defense", "geopolitical", "macro_market_move"].includes(eventType)) {
    affected.add("technology");
  }

  if (!affected.size) {
    affected.add(topics[0] ?? "risk appetite");
  }

  return [...affected].slice(0, 4);
}

function inferTimeHorizon(eventType: string, articles: FeedArticle[]): EventTimeHorizon {
  const corpus = normalizeText(
    articles.map((article) => `${article.title} ${article.summaryText}`).join(" "),
  );

  if (
    eventType === "policy_regulation" ||
    eventType === "defense" ||
    eventType === "geopolitical" ||
    corpus.includes("multi-year") ||
    corpus.includes("long term")
  ) {
    return "long";
  }

  if (
    eventType === "political" ||
    eventType === "corporate" ||
    eventType === "large_ipo" ||
    eventType === "executive_move" ||
    eventType === "macro_market_move" ||
    eventType === "mna_funding" ||
    eventType === "early_stage_funding" ||
    eventType === "data_report" ||
    eventType === "legal_investigation" ||
    corpus.includes("guidance")
  ) {
    return "medium";
  }

  return "short";
}

function buildPrimaryChange(title: string) {
  const cleaned = title
    .replace(/\s+-\s+(reuters|ap|bloomberg|ft|financial times)$/i, "")
    .replace(/\s+\|\s+.+$/i, "")
    .replace(/^live updates?:\s*/i, "")
    .replace(/^analysis:\s*/i, "")
    .replace(/^watch:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const replacements: Array<[RegExp, string]> = [
    [/\bsignals\b/i, "signaled"],
    [/\bweighs\b/i, "weighed"],
    [/\bplans\b/i, "planned"],
    [/\bexpands\b/i, "expanded"],
    [/\blaunches\b/i, "launched"],
    [/\bunveils\b/i, "unveiled"],
    [/\bapproves\b/i, "approved"],
    [/\bdelays\b/i, "delayed"],
    [/\bcuts\b/i, "cut"],
    [/\braises\b/i, "raised"],
    [/\bopens\b/i, "opened"],
    [/\bstarts\b/i, "started"],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(cleaned)) {
      return cleaned.replace(pattern, replacement);
    }
  }

  return cleaned;
}

function buildSummary(
  articles: FeedArticle[],
  primaryChange: string,
  sourceDiversity: number,
  topics: string[],
) {
  const representative = articles[0];
  const leadSentence = firstSentence(representative?.summaryText ?? "", primaryChange);
  const topicLabel = topics[0] ? formatTopicLabel(topics[0]) : "the current briefing";
  const confirmation =
    sourceDiversity > 1
      ? `Coverage has spread across ${sourceDiversity} sources in ${topicLabel}.`
      : `This is still early coverage inside ${topicLabel}.`;

  return `${ensurePeriod(primaryChange)} ${normalizeSupportSentence(leadSentence, confirmation)}`;
}

function computeRecencyScore(articles: FeedArticle[]) {
  const newestTimestamp = Math.max(...articles.map((article) => new Date(article.publishedAt).getTime()));
  const ageHours = Math.max(0, (Date.now() - newestTimestamp) / (1000 * 60 * 60));
  return Math.round(Math.max(0, 100 - Math.min(ageHours, 48) / 48 * 100));
}

function computeVelocityScore(articles: FeedArticle[]) {
  if (articles.length <= 1) {
    return 20;
  }

  const newestTimestamp = Math.max(...articles.map((article) => new Date(article.publishedAt).getTime()));
  const twelveHoursAgo = newestTimestamp - 12 * 60 * 60 * 1000;
  const lastTwelveHours = articles.filter(
    (article) => new Date(article.publishedAt).getTime() >= twelveHoursAgo,
  ).length;

  return Math.min(100, Math.round((lastTwelveHours / Math.max(articles.length, 1)) * 100));
}

function normalizeArticleCount(articleCount: number) {
  return Math.min(articleCount, 8) / 8 * 100;
}

function normalizeSourceDiversity(sourceDiversity: number) {
  return Math.min(sourceDiversity, 6) / 6 * 100;
}

function buildRankingReason(input: {
  articleCount: number;
  sourceDiversity: number;
  recencyScore: number;
  velocityScore: number;
  keyEntities: string[];
  topics: string[];
  primaryChange: string;
}) {
  const anchor = input.keyEntities[0] ?? input.primaryChange;

  if (input.articleCount >= 6 && input.sourceDiversity >= 4) {
    return `Broad coverage around ${anchor} across ${input.articleCount} articles from ${input.sourceDiversity} sources.`;
  }

  if (input.velocityScore >= 70) {
    return `Rapid pickup on ${anchor} as related coverage accelerated across ${input.sourceDiversity} outlets.`;
  }

  if (input.recencyScore >= 75 && input.sourceDiversity >= 3) {
    return `Fresh multi-source reporting on ${anchor} kept this event near the top of the briefing.`;
  }

  if (input.topics.includes("finance") || input.topics.includes("business")) {
    return `${anchor} ranked because markets and company coverage converged across ${input.sourceDiversity} sources.`;
  }

  if (input.topics.includes("politics") || input.topics.includes("geopolitics")) {
    return `${anchor} ranked because policy and geopolitical signals spread across multiple outlets.`;
  }

  return `${anchor} ranked on current coverage breadth, freshness, and clear topic fit.`;
}

function getEventTypeSignalWeight(eventType: string) {
  switch (eventType) {
    case "defense":
    case "geopolitical":
    case "political":
    case "policy_regulation":
    case "macro_market_move":
      return 2;
    case "large_ipo":
    case "corporate":
    case "mna_funding":
    case "early_stage_funding":
    case "data_report":
    case "executive_move":
    case "legal_investigation":
      return 1;
    case "non_signal":
      return -2;
    case "product":
      return 0;
    default:
      return 0;
  }
}

function isHighImpactEventType(eventType: string) {
  return [
    "defense",
    "geopolitical",
    "political",
    "policy_regulation",
    "macro_market_move",
    "large_ipo",
    "legal_investigation",
  ].includes(eventType);
}

function getSourceTierSignalWeight(sourceNames: string[]) {
  const tier = getBestSourceTier(sourceNames);
  if (tier === "tier1") return 2;
  if (tier === "tier2") return 1;
  return 0;
}

function getBestSourceTier(sourceNames: string[]) {
  let best = 0;

  for (const name of sourceNames) {
    const normalized = name.toLowerCase();
    if (/(reuters|financial times|bloomberg|associated press|ap news|wall street journal)/.test(normalized)) {
      best = Math.max(best, 3);
      continue;
    }

    if (/(techcrunch|the verge|axios|semafor|ars technica)/.test(normalized)) {
      best = Math.max(best, 2);
      continue;
    }

    best = Math.max(best, 1);
  }

  return best >= 3 ? "tier1" : best === 2 ? "tier2" : "unknown";
}

function computeConfidenceScore(input: {
  articleCount: number;
  sourceDiversity: number;
  keyEntities: string[];
  topics: string[];
  summary: string;
  matchedKeywords: string[];
}) {
  const articleSignal = normalizeArticleCount(input.articleCount);
  const sourceSignal = normalizeSourceDiversity(input.sourceDiversity);
  const entitySignal = input.keyEntities.length ? Math.min(100, input.keyEntities.length * 28) : 0;
  const summarySignal = input.summary.length >= 60 ? 100 : input.summary.length >= 35 ? 70 : 35;
  const topicSignal = input.topics.length ? Math.min(100, input.topics.length * 30) : 20;
  const keywordSignal = input.matchedKeywords.length ? Math.min(100, input.matchedKeywords.length * 20) : 10;

  return Math.round(
    articleSignal * 0.25 +
      sourceSignal * 0.25 +
      entitySignal * 0.2 +
      summarySignal * 0.15 +
      topicSignal * 0.1 +
      keywordSignal * 0.05,
  );
}

function evaluateHighSignal(input: {
  title: string;
  summary: string;
  topics: string[];
  rankingScore: number;
  articleCount: number;
  sourceDiversity: number;
  isNonSignalContent?: boolean;
}) {
  if (input.isNonSignalContent) {
    return false;
  }

  const corpus = normalizeText(`${input.title} ${input.summary} ${input.topics.join(" ")}`);

  if (LOW_SIGNAL_HINTS.some((hint) => corpus.includes(hint))) {
    return false;
  }

  if (HIGH_SIGNAL_HINTS.some((hint) => corpus.includes(hint))) {
    return true;
  }

  return input.rankingScore >= 45 && (input.articleCount >= 2 || input.sourceDiversity >= 2);
}

function cleanEntity(value: string) {
  return value
    .replace(/[^\w\s&.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStopEntity(value: string) {
  const normalized = value.toLowerCase();
  return [
    "the",
    "a",
    "an",
    "markets",
    "market",
    "company",
    "companies",
    "today",
    "analysis",
    "live",
    "update",
    "updates",
    "she",
    "he",
    "they",
    "them",
    "it",
    "we",
    "you",
    "i",
    "this",
    "that",
    "ceo",
    "cfo",
    "cto",
    "us",
    "u.s",
    "tech",
    "finance",
  ].includes(normalized);
}

function isCommonSignal(value: string) {
  const normalized = value.toLowerCase();
  return TOPIC_RULES.some((rule) => rule.keywords.includes(normalized));
}

function normalizeText(value: string) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesKeyword(corpus: string, keyword: string) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i");
  return pattern.test(corpus);
}

function isNonSignalArticleSet(
  articles: FeedArticle[],
  topicName: string,
  matchedKeywords?: string[],
) {
  const corpus = normalizeText(
    `${topicName} ${(matchedKeywords ?? []).join(" ")} ${articles.map((article) => `${article.title} ${article.summaryText} ${article.contentText}`).join(" ")}`,
  );

  return isNonSignalCorpus(corpus);
}

function isNonSignalCorpus(corpus: string) {
  if (NON_SIGNAL_HINTS.some((hint) => corpus.includes(hint))) {
    return true;
  }

  return (
    /\b(q\s*&\s*a|q and a|questions and answers)\b/.test(corpus) ||
    /\b(ask|asked)\s+(amy|martha|the expert|the adviser|the advisor)\b/.test(corpus) ||
    /\bshould\s+(i|you|we)\b/.test(corpus)
  );
}

function ensurePeriod(value: string) {
  const trimmed = value.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function normalizeSupportSentence(leadSentence: string, fallback: string) {
  const cleaned = firstSentence(leadSentence, fallback).trim();
  const sentence = cleaned && cleaned.toLowerCase() !== fallback.toLowerCase() ? cleaned : fallback;
  return ensurePeriod(sentence);
}

function formatTopicLabel(topic: string) {
  if (topic === "tech" || topic === "finance" || topic === "politics") {
    return getHomepageCategoryLabel(topic);
  }

  return topic.charAt(0).toUpperCase() + topic.slice(1);
}


export const TOP_EVENT_SOURCE_THRESHOLD = 2;

export type EventTimelineIndicator = "New" | "Updated" | "Escalating";
export type EventConfidenceLabel = "High confidence" | "Medium confidence" | "Developing";

export type EventDisplaySignals = {
  sourceCount: number;
  isEarlySignal: boolean;
  timelineIndicator: EventTimelineIndicator;
  confidenceLabel: EventConfidenceLabel;
  confidenceTone: "high" | "medium" | "developing";
  keyEntities: string[];
  impactLabel: string;
  recencyLabel: string;
  sourceLabel: string;
  rankingReason: string;
};

const DISPLAY_ENTITY_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "just",
  "new",
  "latest",
  "update",
  "report",
  "reports",
  "says",
  "show",
  "shows",
  "after",
  "ahead",
  "amid",
]);

export function buildEventIntelligenceSignals(
  item: Pick<
    BriefingItem,
    | "title"
    | "topicName"
    | "publishedAt"
    | "matchedKeywords"
    | "importanceLabel"
    | "importanceScore"
    | "sourceCount"
    | "sources"
    | "displayState"
  >,
): EventDisplaySignals {
  const sourceCount = item.sourceCount ?? item.sources.length;
  const isEarlySignal = sourceCount < TOP_EVENT_SOURCE_THRESHOLD;

  const timelineIndicator = getDisplayTimelineIndicator(item);
  const confidenceTone =
    sourceCount >= 4 || (item.importanceScore ?? 0) >= 85
      ? "high"
      : sourceCount >= TOP_EVENT_SOURCE_THRESHOLD
        ? "medium"
        : "developing";
  const confidenceLabel =
    confidenceTone === "high"
      ? "High confidence"
      : confidenceTone === "medium"
        ? "Medium confidence"
        : "Developing";

  const impactLabel = getDisplayImpactLabel(item.importanceLabel, item.importanceScore ?? 0);
  const recencyLabel = getDisplayRecencyLabel(item.publishedAt, item.displayState);
  const sourceLabel = `${sourceCount} ${sourceCount === 1 ? "source" : "sources"}`;

  return {
    sourceCount,
    isEarlySignal,
    timelineIndicator,
    confidenceLabel,
    confidenceTone,
    keyEntities: extractDisplayKeyEntities(item).slice(0, 4),
    impactLabel,
    recencyLabel,
    sourceLabel,
    rankingReason: `${impactLabel} • ${sourceLabel} • ${recencyLabel}`,
  };
}

export function isTopEventEligible(item: Pick<BriefingItem, "sourceCount" | "sources">) {
  const sourceCount = item.sourceCount ?? item.sources.length;
  return sourceCount >= TOP_EVENT_SOURCE_THRESHOLD;
}

function getDisplayTimelineIndicator(
  item: Pick<BriefingItem, "displayState" | "publishedAt">,
): EventTimelineIndicator {
  if (item.displayState === "escalated") return "Escalating";
  if (item.displayState === "changed") return "Updated";
  if (item.displayState === "new") return "New";

  const publishedAt = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;
  const ageHours = publishedAt
    ? (Date.now() - publishedAt) / (1000 * 60 * 60)
    : Number.POSITIVE_INFINITY;

  return ageHours <= 12 ? "New" : "Updated";
}

function getDisplayImpactLabel(
  importanceLabel: BriefingItem["importanceLabel"],
  importanceScore: number,
) {
  if (importanceLabel === "Critical" || importanceScore >= 80) return "High impact";
  if (importanceLabel === "High" || importanceScore >= 65) return "Meaningful impact";
  return "Watch impact";
}

function getDisplayRecencyLabel(
  publishedAt: string | undefined,
  displayState: BriefingItem["displayState"],
) {
  if (!publishedAt) {
    if (displayState === "new") return "new this cycle";
    if (displayState === "changed") return "updated this cycle";
    if (displayState === "escalated") return "escalating this cycle";
    return "current briefing cycle";
  }

  const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60));

  if (ageHours < 1) {
    return "last hour";
  }

  if (ageHours < 24) {
    const roundedHours = Math.max(1, Math.round(ageHours));
    return roundedHours === 1 ? "last hour" : `last ${roundedHours} hours`;
  }

  const ageDays = Math.max(1, Math.round(ageHours / 24));
  return ageDays === 1 ? "last day" : `last ${ageDays} days`;
}

function extractDisplayKeyEntities(
  item: Pick<BriefingItem, "title" | "topicName" | "matchedKeywords">,
) {
  const entities = [
    ...(item.matchedKeywords ?? []).map(formatDisplayKeywordEntity),
    ...extractDisplayTitleEntities(item.title),
    item.topicName,
  ]
    .map((value) => cleanDisplayEntity(value))
    .filter(Boolean);

  return entities.filter((value, index) => {
    const normalized = value.toLowerCase();
    return entities.findIndex((candidate) => candidate.toLowerCase() === normalized) === index;
  });
}

function extractDisplayTitleEntities(title: string) {
  const normalizedTitle = title.replace(/[|:]/g, " ").replace(/\s+/g, " ").trim();
  const words = normalizedTitle.split(" ").filter(Boolean);
  const titleCaseRatio =
    words.length > 0
      ? words.filter((word) => /^[A-Z][a-z]/.test(word)).length / words.length
      : 0;

  if (titleCaseRatio > 0.75) {
    return [];
  }

  const matches =
    normalizedTitle.match(
      /\b(?:[A-Z][a-z0-9]+|[A-Z]{2,}|AI|TV)(?:\s+(?:[A-Z][a-z0-9]+|[A-Z]{2,}|AI|TV)){0,3}\b/g,
    ) ?? [];

  return matches.map((value) => value.trim()).filter((value) => isCredibleDisplayEntity(value));
}

function formatDisplayKeywordEntity(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[A-Z0-9]{2,}$/.test(trimmed)) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanDisplayEntity(value: string) {
  return value.replace(/[.,;:!?]+$/g, "").replace(/\s+/g, " ").trim();
}

function isCredibleDisplayEntity(value: string) {
  const parts = value.split(/\s+/).filter(Boolean);
  if (!parts.length || parts.length > 4) return false;
  if (parts.every((part) => DISPLAY_ENTITY_STOPWORDS.has(part.toLowerCase()))) return false;
  if (value.length < 3 || value.length > 28) return false;

  return parts.every((part) => {
    const normalized = part.toLowerCase();
    return !DISPLAY_ENTITY_STOPWORDS.has(normalized) || /^[A-Z]{2,}$/.test(part);
  });
}
