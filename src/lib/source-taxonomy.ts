import type {
  CanonicalTopic,
  SourceDomainScope,
  SourceProductCategoryKey,
} from "@/lib/integration/subsystem-contracts";

export type { SourceDomainScope, SourceProductCategoryKey };

export type SourceTaxonomyProfile = {
  profileId: string;
  sourceIds: readonly string[];
  canonicalName: string;
  feedUrl: string;
  domainScope: SourceDomainScope;
  defaultCategory?: SourceProductCategoryKey;
  sourceTopic: CanonicalTopic;
  runtimeEnabled: boolean;
  validationStatus: "validated" | "failed";
  note: string;
};

export const SOURCE_TAXONOMY_PROFILES: SourceTaxonomyProfile[] = [
  {
    profileId: "the-verge",
    sourceIds: ["source-verge", "openclaw-the-verge", "the-verge"],
    canonicalName: "The Verge",
    feedUrl: "https://www.theverge.com/rss/index.xml",
    domainScope: "strict",
    defaultCategory: "tech",
    sourceTopic: "Tech",
    runtimeEnabled: true,
    validationStatus: "validated",
    note: "Strict technology source already represented in public and donor defaults.",
  },
  {
    profileId: "ars-technica",
    sourceIds: ["source-ars", "openclaw-ars-technica", "ars-technica"],
    canonicalName: "Ars Technica",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
    domainScope: "strict",
    defaultCategory: "tech",
    sourceTopic: "Tech",
    runtimeEnabled: true,
    validationStatus: "validated",
    note: "Strict technology source already represented in public and donor defaults.",
  },
  {
    profileId: "mit-technology-review",
    sourceIds: ["source-mit-tech-review", "source-mit-technology-review", "mit-technology-review"],
    canonicalName: "MIT Technology Review",
    feedUrl: "https://www.technologyreview.com/feed/",
    domainScope: "strict",
    defaultCategory: "tech",
    sourceTopic: "Tech",
    runtimeEnabled: true,
    validationStatus: "validated",
    note: "Strict technology source activated for public ingestion; donor runtime remains probationary until the MIT review path is retired.",
  },
  {
    profileId: "foreign-affairs",
    sourceIds: ["source-foreign-affairs", "foreign-affairs"],
    canonicalName: "Foreign Affairs",
    feedUrl: "https://www.foreignaffairs.com/rss.xml",
    domainScope: "strict",
    defaultCategory: "politics",
    sourceTopic: "World",
    runtimeEnabled: true,
    validationStatus: "validated",
    note: "Strict politics/geopolitics source.",
  },
  {
    profileId: "the-diplomat",
    sourceIds: ["source-the-diplomat", "the-diplomat"],
    canonicalName: "The Diplomat",
    feedUrl: "https://thediplomat.com/feed",
    domainScope: "strict",
    defaultCategory: "politics",
    sourceTopic: "World",
    runtimeEnabled: true,
    validationStatus: "validated",
    note: "Strict politics/geopolitics source.",
  },
  {
    profileId: "npr-world",
    sourceIds: ["source-npr-world", "npr-world"],
    canonicalName: "NPR World",
    feedUrl: "https://feeds.npr.org/1004/rss.xml",
    domainScope: "strict",
    defaultCategory: "politics",
    sourceTopic: "World",
    runtimeEnabled: true,
    validationStatus: "validated",
    note: "Strict politics/geopolitics source for the website taxonomy.",
  },
  {
    profileId: "brookings-research",
    sourceIds: ["source-brookings-research", "brookings-research"],
    canonicalName: "Brookings Research",
    feedUrl: "https://www.brookings.edu/feeds/rss/research/",
    domainScope: "mixed_domain",
    sourceTopic: "World",
    runtimeEnabled: false,
    validationStatus: "failed",
    note: "Mixed-domain/O3 candidate; supplied URL currently redirects to HTML and is not safe for active RSS ingestion.",
  },
  {
    profileId: "foreign-policy",
    sourceIds: ["source-foreign-policy", "foreign-policy"],
    canonicalName: "Foreign Policy",
    feedUrl: "https://foreignpolicy.com/feed",
    domainScope: "mixed_domain",
    sourceTopic: "World",
    runtimeEnabled: true,
    validationStatus: "validated",
    note: "Mixed-domain/O3 source; items are routed by item-level classification rather than source-level politics flattening.",
  },
  {
    profileId: "guardian-world",
    sourceIds: ["source-guardian-world", "guardian-world"],
    canonicalName: "The Guardian World",
    feedUrl: "https://www.theguardian.com/world/rss",
    domainScope: "mixed_domain",
    sourceTopic: "World",
    runtimeEnabled: true,
    validationStatus: "validated",
    note: "Mixed-domain/O3 source; broad world coverage must not force every item into politics.",
  },
  {
    profileId: "hacker-news-best",
    sourceIds: ["source-hacker-news-best", "hacker-news-best"],
    canonicalName: "Hacker News Best",
    feedUrl: "https://hnrss.org/best",
    domainScope: "strict",
    defaultCategory: "tech",
    sourceTopic: "Tech",
    runtimeEnabled: true,
    validationStatus: "validated",
    note: "Strict technology source, though community-curated rather than editorial.",
  },
  {
    profileId: "csis-analysis",
    sourceIds: ["source-csis-analysis", "csis-analysis"],
    canonicalName: "CSIS Analysis",
    feedUrl: "https://www.csis.org/analysis/feed",
    domainScope: "mixed_domain",
    sourceTopic: "World",
    runtimeEnabled: false,
    validationStatus: "failed",
    note: "Mixed-domain/O3 candidate; supplied endpoint currently returns 404 and is not safe for active RSS ingestion.",
  },
];

const PROFILES_BY_ID = new Map(
  SOURCE_TAXONOMY_PROFILES.flatMap((profile) =>
    profile.sourceIds.map((sourceId) => [normalizeLookupValue(sourceId), profile] as const),
  ),
);
const PROFILES_BY_NAME = new Map(
  SOURCE_TAXONOMY_PROFILES.map((profile) => [normalizeLookupValue(profile.canonicalName), profile] as const),
);
const PROFILES_BY_FEED_URL = new Map(
  SOURCE_TAXONOMY_PROFILES.map((profile) => [normalizeFeedUrl(profile.feedUrl), profile] as const),
);

export function getSourceTaxonomyProfile(input: {
  sourceId?: string;
  sourceName?: string;
  feedUrl?: string;
}) {
  const sourceId = input.sourceId ? PROFILES_BY_ID.get(normalizeLookupValue(input.sourceId)) : undefined;
  if (sourceId) return sourceId;

  const feedUrl = input.feedUrl ? PROFILES_BY_FEED_URL.get(normalizeFeedUrl(input.feedUrl)) : undefined;
  if (feedUrl) return feedUrl;

  return input.sourceName ? PROFILES_BY_NAME.get(normalizeLookupValue(input.sourceName)) : undefined;
}

export function getStrictSourceCategory(input: {
  sourceId?: string;
  sourceName?: string;
  feedUrl?: string;
}) {
  const profile = getSourceTaxonomyProfile(input);
  return profile?.domainScope === "strict" ? profile.defaultCategory : undefined;
}

export function isMixedDomainSource(input: {
  sourceId?: string;
  sourceName?: string;
  feedUrl?: string;
}) {
  return getSourceTaxonomyProfile(input)?.domainScope === "mixed_domain";
}

function normalizeLookupValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeFeedUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}
