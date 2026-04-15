import type { DashboardData, BriefingItem, EventIntelligence } from "@/lib/types";
import {
  classifyHomepageCategory,
  countSourcesByHomepageCategory,
  getHomepageCategoryDescription,
  getHomepageCategoryLabel,
  HOMEPAGE_CATEGORY_CONFIG,
  HOMEPAGE_CATEGORY_TARGET,
  type HomepageCategoryClassification,
  type HomepageCategoryKey,
} from "@/lib/homepage-taxonomy";
import { buildTrustLayerPresentation, type TrustLayerPresentation } from "@/lib/why-it-matters";
import {
  buildRankingDisplaySignals,
  compareBriefingItemsByRanking,
  getBriefingRankSnapshot,
} from "@/lib/ranking";
import { firstSentence } from "@/lib/utils";

export type EventArticle = {
  title: string;
  url: string;
  sourceName: string;
  note?: string;
};

export type EventTimelineMilestone = {
  label: string;
  detail: string;
};

export type HomepageEvent = {
  id: string;
  topicName: string;
  title: string;
  summary: string;
  trustLayer: TrustLayerPresentation;
  relatedArticles: EventArticle[];
  timeline: EventTimelineMilestone[];
  estimatedMinutes: number;
  importanceLabel?: BriefingItem["importanceLabel"];
  rankingSignals: string[];
  rankingDisplaySignals: string[];
  matchedKeywords: string[];
  priority: BriefingItem["priority"];
  rankScore: number;
  sourceCount: number;
  classification: HomepageCategoryClassification;
  eventIntelligence?: EventIntelligence;
};

export type HomepageCategorySection = {
  key: HomepageCategoryKey;
  label: string;
  description: string;
  events: HomepageEvent[];
  fallbackEvents: HomepageEvent[];
  placeholderCount: number;
  state: "populated" | "sparse" | "empty";
  emptyReason: string;
  excludedReasons: string[];
};

export type HomepageDebugModel = {
  totalArticlesFetched: number | null;
  totalCandidateEvents: number | null;
  rankedEventsCount: number;
  uncategorizedEventsCount: number;
  categoryCounts: Record<HomepageCategoryKey, number>;
  sourceCountsByCategory: Record<HomepageCategoryKey, number>;
  lastSuccessfulFetchTime?: string;
  lastRankingRunTime?: string;
  categoryEmptyReasons: Record<HomepageCategoryKey, string>;
  categoryExclusionReasons: Record<HomepageCategoryKey, string[]>;
};

export type HomepageViewModel = {
  featured: HomepageEvent | null;
  topRanked: HomepageEvent[];
  categorySections: HomepageCategorySection[];
  trending: HomepageEvent[];
  debug: HomepageDebugModel;
};

export function buildHomepageViewModel(data: DashboardData): HomepageViewModel {
  const events = buildHomepageEvents(data.briefing.items);
  const featured = events[0] ?? null;
  const topRanked = events.slice(0, 5);

  const categorySections = HOMEPAGE_CATEGORY_CONFIG.map((category) => {
    const eligibleEvents = events.filter((event) => event.classification.primaryCategory === category.key);
    const displayEvents = eligibleEvents.slice(0, HOMEPAGE_CATEGORY_TARGET);
    const heldBackEvents = eligibleEvents.slice(HOMEPAGE_CATEGORY_TARGET);
    const fallbackEvents =
      eligibleEvents.length === 0
        ? events
            .filter((event) => event.classification.primaryCategory !== category.key)
            .slice(0, 2)
        : [];

    const placeholderCount =
      eligibleEvents.length > 0 ? Math.max(0, HOMEPAGE_CATEGORY_TARGET - displayEvents.length) : 0;

    const excludedReasons = [
      ...events
        .filter((event) => event.classification.primaryCategory !== category.key)
        .map((event) => getExclusionReason(event, category.key)),
      ...heldBackEvents.map(() => `Held back because ${getHomepageCategoryLabel(category.key)} is capped at ${HOMEPAGE_CATEGORY_TARGET} cards.`),
    ];

    return {
      key: category.key,
      label: category.label,
      description: getHomepageCategoryDescription(category.key),
      events: displayEvents,
      fallbackEvents,
      placeholderCount,
      state:
        displayEvents.length >= HOMEPAGE_CATEGORY_TARGET
          ? "populated"
          : displayEvents.length > 0
            ? "sparse"
            : "empty",
      emptyReason: getEmptyReason(category.key, eligibleEvents.length, fallbackEvents.length),
      excludedReasons: dedupeStrings(excludedReasons).slice(0, 6),
    } satisfies HomepageCategorySection;
  });

  const reservedIds = new Set(topRanked.map((event) => event.id));
  const trending = events.filter((event) => !reservedIds.has(event.id)).slice(0, 4);
  const sourceCountsByCategory =
    data.homepageDiagnostics?.sourceCountsByCategory ?? countSourcesByHomepageCategory(data.sources);

  return {
    featured,
    topRanked,
    categorySections,
    trending,
    debug: {
      totalArticlesFetched: data.homepageDiagnostics?.totalArticlesFetched ?? null,
      totalCandidateEvents: data.homepageDiagnostics?.totalCandidateEvents ?? null,
      rankedEventsCount: events.length,
      uncategorizedEventsCount: events.filter((event) => !event.classification.primaryCategory).length,
      categoryCounts: {
        tech: events.filter((event) => event.classification.primaryCategory === "tech").length,
        finance: events.filter((event) => event.classification.primaryCategory === "finance").length,
        politics: events.filter((event) => event.classification.primaryCategory === "politics").length,
      },
      sourceCountsByCategory,
      lastSuccessfulFetchTime: data.homepageDiagnostics?.lastSuccessfulFetchTime,
      lastRankingRunTime: data.homepageDiagnostics?.lastRankingRunTime ?? data.briefing.briefingDate,
      categoryEmptyReasons: Object.fromEntries(
        categorySections.map((section) => [section.key, section.emptyReason]),
      ) as Record<HomepageCategoryKey, string>,
      categoryExclusionReasons: Object.fromEntries(
        categorySections.map((section) => [section.key, section.excludedReasons]),
      ) as Record<HomepageCategoryKey, string[]>,
    },
  };
}

export function buildHomepageEvents(items: BriefingItem[]) {
  return items
    .slice()
    .sort(compareBriefingItemsByRanking)
    .map((item, index, sortedItems) => {
      const classification = classifyHomepageCategory({
        topicName: item.topicName,
        title: item.title,
        summary: item.whatHappened,
        whyItMatters: item.whyItMatters,
        matchedKeywords: item.matchedKeywords,
        rankingSignals: item.rankingSignals,
        sourceNames: item.sources.map((source) => source.title),
      });
      const siblingItems = sortedItems.filter((candidate) => candidate.id !== item.id && candidate.topicId === item.topicId);
      const sourceCount = item.sourceCount ?? new Set(item.sources.map((source) => source.title)).size;

      return {
        id: item.id,
        topicName: item.topicName,
        title: item.title,
        summary: summarize(item.eventIntelligence?.summary ?? item.whatHappened, item.priority === "top" ? 2 : 1),
        trustLayer: buildTrustLayerPresentation(item.eventIntelligence, {
          title: item.title,
          topicName: item.topicName,
          whyItMatters: sanitizeWhyItMatters(item.whyItMatters, item.title),
          sourceCount,
          rankingSignals: item.rankingSignals,
        }),
        relatedArticles: buildHomepageRelatedArticles(item),
        timeline: buildEventTimeline(item, siblingItems),
        estimatedMinutes: item.estimatedMinutes,
        importanceLabel: item.importanceLabel,
        rankingSignals: item.rankingSignals ?? [],
        rankingDisplaySignals: buildRankingDisplaySignals(item),
        matchedKeywords: item.matchedKeywords ?? [],
        priority: item.priority,
        rankScore: getRankScore(item) - index * 0.01,
        sourceCount,
        classification,
        eventIntelligence: item.eventIntelligence,
      };
    });
}

function buildHomepageRelatedArticles(item: BriefingItem) {
  const candidates = (item.relatedArticles?.length ? item.relatedArticles : undefined) ?? item.sources.map((source) => ({
    title: source.title,
    url: source.url,
    sourceName: source.title,
  }));

  const seenSources = new Set<string>();
  const seenTitles = new Set<string>();

  return candidates
    .filter((article) => isValidStoryUrl(article.url))
    .filter((article) => {
      const normalizedTitle = article.title.trim().toLowerCase();
      if (!normalizedTitle || seenTitles.has(normalizedTitle)) {
        return false;
      }
      seenTitles.add(normalizedTitle);
      return true;
    })
    .filter((article) => {
      const normalizedSource = article.sourceName.trim().toLowerCase();
      if (!normalizedSource || seenSources.has(normalizedSource)) {
        return false;
      }
      seenSources.add(normalizedSource);
      return true;
    })
    .slice(0, 4)
    .map((article, index) => ({
      title: article.title,
      url: article.url,
      sourceName: article.sourceName,
      note: index === 0 ? "Lead coverage" : "Corroborating coverage",
    }));
}

function buildEventTimeline(item: BriefingItem, siblingItems: BriefingItem[]) {
  const keywordMilestone = item.matchedKeywords?.length
    ? {
        label: "Trigger",
        detail: `This event surfaced through signals like ${item.matchedKeywords.slice(0, 3).join(", ")}.`,
      }
    : null;

  const keyPointMilestones = item.keyPoints
    .filter((point) => !point.startsWith("Matched on:"))
    .map((point, index) => ({
      label: index === 0 ? "Earlier" : index === 1 ? "Shift" : "Now",
      detail: point,
    }));

  const siblingMilestones = siblingItems.slice(0, 2).map((sibling, index) => ({
    label: index === 0 ? "Build-up" : "Follow-on",
    detail: summarize(sibling.whatHappened, 1),
  }));

  return [keywordMilestone, ...keyPointMilestones, ...siblingMilestones]
    .filter((milestone): milestone is EventTimelineMilestone => Boolean(milestone))
    .slice(0, 3);
}

function sanitizeWhyItMatters(value: string, title: string) {
  const trimmed = summarize(value, 1).replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return `This development is worth watching because it can change assumptions around ${title.toLowerCase()}.`;
  }

  return trimmed
    .replace(/connect an ai key in settings to get analyst-quality analysis instead of this heuristic summary\.?/gi, "")
    .replace(/operators tracking this area should note it:\s*/i, "")
    .trim();
}

function getEmptyReason(categoryKey: HomepageCategoryKey, eligibleCount: number, fallbackCount: number) {
  const label = getHomepageCategoryLabel(categoryKey);

  if (eligibleCount > 0) {
    return `${label} has ${eligibleCount} eligible event${eligibleCount === 1 ? "" : "s"}, so placeholders fill the rest of the rail while coverage builds.`;
  }

  if (fallbackCount > 0) {
    return `No ranked ${label.toLowerCase()} events qualified yet, so the section falls back to clearly labeled top stories instead of collapsing.`;
  }

  return `No eligible ${label.toLowerCase()} events qualified in the current ranked briefing.`;
}

function getExclusionReason(event: HomepageEvent, categoryKey: HomepageCategoryKey) {
  if (!event.classification.primaryCategory) {
    return `"${event.title}" stayed out because it never cleared the category confidence threshold.`;
  }

  if (event.classification.primaryCategory === categoryKey) {
    return `"${event.title}" is eligible for ${getHomepageCategoryLabel(categoryKey)}.`;
  }

  return `"${event.title}" was classified as ${getHomepageCategoryLabel(event.classification.primaryCategory)}, not ${getHomepageCategoryLabel(categoryKey)}.`;
}

function getRankScore(item: BriefingItem) {
  const snapshot = getBriefingRankSnapshot(item);
  return snapshot.rankingScore + snapshot.confidenceScore / 1000 + snapshot.freshestTimestamp / 1_000_000_000_000;
}

function summarize(value: string, maxSentences: number) {
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.slice(0, maxSentences).join(" ") || value;
}

function isValidStoryUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function dedupeStrings(values: string[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

export function buildOverallNoDataMessage(itemCount: number) {
  if (itemCount > 0) {
    return {
      title: "Coverage is loading normally",
      body: "Ranked events are available below.",
    };
  }

  return {
    title: "Coverage unavailable right now",
    body: "We could not build ranked events from the latest coverage yet. Refresh shortly to try again.",
  };
}

export function buildEventFallbackSummary(item: BriefingItem) {
  return firstSentence(item.whatHappened, item.title);
}
