import type { Source } from "@/lib/types";

export type HomepageCategoryKey = "tech" | "finance" | "politics";

type CategoryConfig = {
  key: HomepageCategoryKey;
  label: string;
  description: string;
  aliases: string[];
  keywords: string[];
};

type ScoreDetail = {
  score: number;
  signals: string[];
};

export type HomepageCategoryClassification = {
  primaryCategory: HomepageCategoryKey | null;
  secondaryCategories: HomepageCategoryKey[];
  confidence: number;
  scores: Record<HomepageCategoryKey, number>;
  matchedSignals: Record<HomepageCategoryKey, string[]>;
};

export const HOMEPAGE_CATEGORY_TARGET = 3;

export const HOMEPAGE_CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: "tech",
    label: "Tech",
    description: "AI, platforms, chips, infrastructure, and software shifts worth tracking.",
    aliases: ["tech", "technology", "artificial intelligence"],
    keywords: [
      "ai",
      "software",
      "chips",
      "chip",
      "semiconductors",
      "cloud",
      "platform",
      "app",
      "infrastructure",
      "cyber",
      "cybersecurity",
      "model",
      "startup",
      "developer",
      "data center",
      "device",
      "operating system",
    ],
  },
  {
    key: "finance",
    label: "Finance",
    description: "Markets, companies, macro moves, and business developments with decision impact.",
    aliases: ["finance", "business", "markets", "economics", "macro"],
    keywords: [
      "market",
      "markets",
      "stocks",
      "bonds",
      "treasury",
      "fed",
      "federal reserve",
      "inflation",
      "rates",
      "macro",
      "earnings",
      "acquisition",
      "m&a",
      "ipo",
      "company",
      "business",
      "banking",
      "hedge fund",
      "capital",
      "revenue",
      "economic",
      "economy",
      "tariff",
      "trade",
      "commodities",
    ],
  },
  {
    key: "politics",
    label: "Politics",
    description: "Government, regulation, elections, and policy changes shaping the operating environment.",
    aliases: ["politics", "policy", "government", "public policy", "geopolitics"],
    keywords: [
      "government",
      "regulation",
      "regulatory",
      "election",
      "senate",
      "congress",
      "parliament",
      "ministry",
      "white house",
      "executive order",
      "legislature",
      "campaign",
      "policy",
      "public policy",
      "minister",
      "cabinet",
      "administration",
      "geopolitical",
      "geopolitics",
      "diplomacy",
      "sanctions",
    ],
  },
];

type ClassificationInput = {
  topicName?: string;
  title?: string;
  summary?: string;
  whyItMatters?: string;
  matchedKeywords?: string[];
  rankingSignals?: string[];
  sourceNames?: string[];
};

const CATEGORY_BY_KEY = Object.fromEntries(
  HOMEPAGE_CATEGORY_CONFIG.map((category) => [category.key, category]),
) as Record<HomepageCategoryKey, CategoryConfig>;

export function getHomepageCategoryLabel(categoryKey: HomepageCategoryKey) {
  return CATEGORY_BY_KEY[categoryKey].label;
}

export function getHomepageCategoryDescription(categoryKey: HomepageCategoryKey) {
  return CATEGORY_BY_KEY[categoryKey].description;
}

export function classifyHomepageCategory(input: ClassificationInput): HomepageCategoryClassification {
  const details = Object.fromEntries(
    HOMEPAGE_CATEGORY_CONFIG.map((category) => [category.key, scoreCategory(category, input)]),
  ) as Record<HomepageCategoryKey, ScoreDetail>;

  const ordered = HOMEPAGE_CATEGORY_CONFIG
    .map((category) => ({
      key: category.key,
      score: details[category.key].score,
    }))
    .sort((left, right) => right.score - left.score);

  const primary = ordered[0];
  const primaryCategory = primary.score >= 4 ? primary.key : null;
  const secondaryCategories = primaryCategory
    ? ordered
        .slice(1)
        .filter((entry) => entry.score >= 4 && primary.score - entry.score <= 3)
        .map((entry) => entry.key)
    : [];

  return {
    primaryCategory,
    secondaryCategories,
    confidence: Math.min(1, primary.score / 12),
    scores: {
      tech: details.tech.score,
      finance: details.finance.score,
      politics: details.politics.score,
    },
    matchedSignals: {
      tech: details.tech.signals,
      finance: details.finance.signals,
      politics: details.politics.signals,
    },
  };
}

export function countSourcesByHomepageCategory(sources: Source[]) {
  const counts: Record<HomepageCategoryKey, number> = {
    tech: 0,
    finance: 0,
    politics: 0,
  };

  for (const source of sources) {
    const classification = classifyHomepageCategory({
      topicName: source.topicName,
      title: source.name,
    });

    if (classification.primaryCategory) {
      counts[classification.primaryCategory] += 1;
    }
  }

  return counts;
}

function scoreCategory(category: CategoryConfig, input: ClassificationInput): ScoreDetail {
  const signals = new Set<string>();
  let score = 0;

  const topicName = normalizeText(input.topicName);
  const title = normalizeText(input.title);
  const summary = normalizeText(input.summary);
  const why = normalizeText(input.whyItMatters);
  const sourceNames = normalizeText((input.sourceNames ?? []).join(" "));
  const keywordMatches = uniqueValues(input.matchedKeywords ?? []);
  const rankingSignals = uniqueValues(input.rankingSignals ?? []);
  const aliasTerms = uniqueValues([...category.aliases, category.label]);
  const allKeywords = uniqueValues([...category.aliases, ...category.keywords, category.label]);

  for (const alias of aliasTerms) {
    if (containsSignal(topicName, alias)) {
      score += 6;
      signals.add(`Topic mapped from "${input.topicName}".`);
    }
  }

  for (const keyword of allKeywords) {
    if (containsSignal(title, keyword)) {
      score += 3;
      signals.add(`Headline matched "${keyword}".`);
    } else if (containsSignal(summary, keyword) || containsSignal(why, keyword) || containsSignal(sourceNames, keyword)) {
      score += 1.5;
      signals.add(`Coverage referenced "${keyword}".`);
    }
  }

  for (const keyword of keywordMatches) {
    if (containsSignal(normalizeText(keyword), keyword) && allKeywords.some((entry) => containsSignal(normalizeText(keyword), entry))) {
      score += 4;
      signals.add(`Matched keyword "${keyword}".`);
    }
  }

  for (const signal of rankingSignals) {
    if (allKeywords.some((keyword) => containsSignal(normalizeText(signal), keyword))) {
      score += 1;
      signals.add("Ranking signal reinforced this category.");
      break;
    }
  }

  return {
    score,
    signals: [...signals].slice(0, 4),
  };
}

function containsSignal(text: string, signal: string) {
  if (!text) return false;
  const normalizedSignal = normalizeText(signal);
  if (!normalizedSignal) return false;

  return text.includes(normalizedSignal);
}

function normalizeText(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}
