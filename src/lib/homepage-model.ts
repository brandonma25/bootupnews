import type { DashboardData, BriefingItem, EventIntelligence } from "@/lib/types";
import {
  getEditorialHomepagePreviewText,
  type EditorialWhyItMattersContent,
} from "@/lib/editorial-content";
import {
  classifyHomepageCategory,
  countSourcesByHomepageCategory,
  getHomepageCategoryDescription,
  getHomepageCategoryLabel,
  HOMEPAGE_CATEGORY_CONFIG,
  type HomepageCategoryClassification,
  type HomepageCategoryKey,
} from "@/lib/homepage-taxonomy";
import {
  buildEventIntelligenceSignals,
  TOP_EVENT_SOURCE_THRESHOLD,
  type EventDisplaySignals,
} from "@/lib/event-intelligence";
import { buildTrustLayerPresentation, type TrustLayerPresentation } from "@/lib/why-it-matters";
import { buildRankingDisplaySignals, getBriefingRankSnapshot } from "@/lib/ranking";
import { classifyBriefingSignalRole, type SignalRole } from "@/lib/output-sanity";
import { firstSentence } from "@/lib/utils";
import {
  buildPersonalizationMatch,
  compareBriefingItemsByPersonalization,
  type BriefingPersonalizationProfile,
  type PersonalizationMatch,
} from "@/lib/personalization";

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
  whatHappened: string;
  keyPoints: string[];
  summary: string;
  trustLayer: TrustLayerPresentation;
  whyItMatters: string;
  editorialWhyItMatters?: EditorialWhyItMattersContent | null;
  whyThisIsHere: string;
  relatedArticles: EventArticle[];
  timeline: EventTimelineMilestone[];
  estimatedMinutes: number;
  importanceLabel?: BriefingItem["importanceLabel"];
  rankingSignals: string[];
  rankingDisplaySignals: string[];
  matchedKeywords: string[];
  priority: BriefingItem["priority"];
  publishedAt?: string;
  signalRole: SignalRole;
  rankScore: number;
  sourceCount: number;
  classification: HomepageCategoryClassification;
  eventIntelligence?: EventIntelligence;
  intelligence: EventDisplaySignals;
  personalization: PersonalizationMatch;
  semanticFingerprint: string;
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

export type HomepageCategoryPreviewMap = Record<HomepageCategoryKey, HomepageEvent[]>;

export type HomepageDebugModel = {
  totalArticlesFetched: number | null;
  totalCandidateEvents: number | null;
  rankedEventsCount: number;
  uncategorizedEventsCount: number;
  surfacedDuplicateCount: number;
  semanticDuplicateSuppressedCount: number;
  hiddenLowQualityTimelineSignalsCount: number;
  coreSignalCount: number;
  contextSignalCount: number;
  visibleSelectionAdjustmentsCount: number;
  categoryCounts: Record<HomepageCategoryKey, number>;
  sourceCountsByCategory: Record<HomepageCategoryKey, number>;
  lastSuccessfulFetchTime?: string;
  lastRankingRunTime?: string;
  failedSourceCount: number;
  fallbackSourceCount: number;
  degradedSourceNames: string[];
  categoryEmptyReasons: Record<HomepageCategoryKey, string>;
  categoryExclusionReasons: Record<HomepageCategoryKey, string[]>;
};

export type HomepageViewModel = {
  featured: HomepageEvent | null;
  topRanked: HomepageEvent[];
  developingNowEvents: HomepageEvent[];
  categoryPreviewEvents: HomepageCategoryPreviewMap;
  categorySections: HomepageCategorySection[];
  trending: HomepageEvent[];
  earlySignals: HomepageEvent[];
  debug: HomepageDebugModel;
};

const TOP_EVENTS_LIMIT = 4;
const MIN_PUBLIC_TOP_EVENTS = 3;
const EDITORIAL_SIGNAL_SET_SIZE = 5;
const CATEGORY_TAB_LIMIT = 6;
const DEVELOPING_NOW_EVENT_LIMIT = 10;
const CATEGORY_PREVIEW_LIMIT = 3;
const TRENDING_EVENT_LIMIT = 3;
const EARLY_SIGNAL_LIMIT = 3;
const GENERIC_SEMANTIC_SIGNALS = new Set([
  "core",
  "critical",
  "developing",
  "economic",
  "economics",
  "finance",
  "financial",
  "geopolitics",
  "government",
  "high",
  "live",
  "normal",
  "policy",
  "politics",
  "published",
  "signal",
  "signals",
  "tech",
  "technology",
  "top",
  "watch",
  "world",
]);
const SEMANTIC_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "new",
  "of",
  "on",
  "says",
  "say",
  "that",
  "the",
  "their",
  "this",
  "to",
  "will",
  "with",
]);

export function buildHomepageViewModel(
  data: DashboardData,
  profile?: BriefingPersonalizationProfile | null,
): HomepageViewModel {
  const topLayerEvents = buildHomepageEvents(data.briefing.items, profile);
  const depthLayerEvents = buildHomepageEvents(data.publicRankedItems ?? [], profile);
  const confirmedTopLayerEvents = topLayerEvents.filter((event) => !event.intelligence.isEarlySignal);
  const confirmedDepthLayerEvents = depthLayerEvents.filter((event) => !event.intelligence.isEarlySignal);
  const earlySignals = depthLayerEvents.filter((event) => event.intelligence.isEarlySignal);
  const featured = topLayerEvents[0] ?? null;
  const featuredContext = featured ? [featured] : [];
  const confirmedTopRankedCandidates = confirmedTopLayerEvents.filter((event) => event.id !== featured?.id);
  const priorityTopRankedCandidates = topLayerEvents.filter(
    (event) => event.id !== featured?.id && event.priority === "top",
  );
  const topRankedCandidatePool =
    featuredContext.length + confirmedTopRankedCandidates.length < MIN_PUBLIC_TOP_EVENTS &&
    priorityTopRankedCandidates.length > confirmedTopRankedCandidates.length
      ? priorityTopRankedCandidates
      : confirmedTopRankedCandidates;
  const topRankedSelection = selectTopVisibleEvents(
    topRankedCandidatePool,
    featuredContext,
    TOP_EVENTS_LIMIT,
    featured,
  );
  const topRanked = topRankedSelection.events;
  const topSignalEventIds = new Set(
    [featured, ...topRanked].filter((event): event is HomepageEvent => Boolean(event)).map((event) => event.id),
  );
  let semanticDuplicateSuppressedCount = topRankedSelection.suppressedCount;
  const visibleSelectionAdjustmentsCount = topRankedSelection.adjustmentsCount;
  const categoryTabPool = resolveCategoryTabPool({
    topLayerEvents,
    depthLayerEvents,
    topSignalEventIds,
  });
  const categoryTabSourceEvents = categoryTabPool.sourceEvents;
  const excludedCategoryTabIds = new Set(categoryTabPool.initialExcludedEventIds);
  const categorySections = HOMEPAGE_CATEGORY_CONFIG.map((category) => {
    const sectionSelection = selectCategoryTabEvents({
      rankedEvents: categoryTabSourceEvents,
      category: category.key,
      excludedEventIds: excludedCategoryTabIds,
      limit: CATEGORY_TAB_LIMIT,
    });
    semanticDuplicateSuppressedCount += sectionSelection.suppressedCount;
    const displayEvents = sectionSelection.events;
    const eligibleEvents = categoryTabSourceEvents.filter(
      (event) => event.classification.primaryCategory === category.key,
    );
    const heldBackEvents = eligibleEvents.filter(
      (event) => !excludedCategoryTabIds.has(event.id) && !displayEvents.some((displayEvent) => displayEvent.id === event.id),
    );

    displayEvents.forEach((event) => {
      excludedCategoryTabIds.add(event.id);
    });

    const emptyReason = getCategoryTabEmptyReason(category.key);
    const excludedReasons = [
      ...depthLayerEvents
        .filter((event) => !categoryTabPool.usesTopLayerFallback || !displayEvents.some((displayEvent) => displayEvent.id === event.id))
        .filter((event) => event.classification.primaryCategory !== category.key)
        .map((event) => getExclusionReason(event, category.key)),
      ...eligibleEvents
        .filter((event) => excludedCategoryTabIds.has(event.id) && !displayEvents.some((displayEvent) => displayEvent.id === event.id))
        .slice(0, 2)
        .map(
          (event) =>
            `Held back to avoid repeating a similar ${event.topicName.toLowerCase()} event already surfaced elsewhere on the homepage.`,
        ),
      ...heldBackEvents
        .slice(0, 2)
        .map(
          () =>
            `Held back because ${getCategoryTabLabel(category.key)} is capped at ${CATEGORY_TAB_LIMIT} items in the current homepage tab.`,
        ),
    ];

    return {
      key: category.key,
      label: getCategoryTabLabel(category.key),
      description: getHomepageCategoryDescription(category.key),
      events: displayEvents,
      fallbackEvents: [] as HomepageEvent[],
      placeholderCount: 0,
      state:
        displayEvents.length >= 3
          ? "populated"
          : displayEvents.length > 0
            ? "sparse"
            : "empty",
      emptyReason,
      excludedReasons: dedupeStrings(excludedReasons).slice(0, 6),
    } satisfies HomepageCategorySection;
  });
  const categoryTabEventIds = new Set(
    categorySections.flatMap((section) => section.events.map((event) => event.id)),
  );
  const volumeLayers = buildVolumeLayersViewModel(
    depthLayerEvents,
    new Set([...topSignalEventIds, ...categoryTabEventIds]),
  );
  const surfacedEvents = [
    ...featuredContext,
    ...topRanked,
    ...categorySections.flatMap((section) => section.events),
    ...volumeLayers.developingNow,
    ...Object.values(volumeLayers.categoryPreviews).flat(),
  ];

  const reservedIds = new Set([
    ...topRanked.map((event) => event.id),
    ...volumeLayers.developingNow.map((event) => event.id),
    ...categorySections.flatMap((section) => [
      ...section.events.map((event) => event.id),
      ...section.fallbackEvents.map((event) => event.id),
    ]),
  ]);
  const trendingSelection = selectDistinctEvents(
    confirmedDepthLayerEvents.filter((event) => !reservedIds.has(event.id) && event.id !== featured?.id),
    surfacedEvents,
    TRENDING_EVENT_LIMIT,
  );
  semanticDuplicateSuppressedCount += trendingSelection.suppressedCount;
  const trending = trendingSelection.events;
  const sourceCountsByCategory =
    data.homepageDiagnostics?.sourceCountsByCategory ?? countSourcesByHomepageCategory(data.sources);
  const hiddenLowQualityTimelineSignalsCount = depthLayerEvents.filter((event) => event.timeline.length > 0).length;
  const visibleTopSet = [featured, ...topRanked].filter((event): event is HomepageEvent => Boolean(event));

  return {
    featured,
    topRanked,
    developingNowEvents: volumeLayers.developingNow,
    categoryPreviewEvents: volumeLayers.categoryPreviews,
    categorySections,
    trending,
    earlySignals: earlySignals.slice(0, EARLY_SIGNAL_LIMIT),
    debug: {
      totalArticlesFetched: data.homepageDiagnostics?.totalArticlesFetched ?? null,
      totalCandidateEvents: data.homepageDiagnostics?.totalCandidateEvents ?? null,
      rankedEventsCount: depthLayerEvents.length,
      uncategorizedEventsCount: depthLayerEvents.filter((event) => !event.classification.primaryCategory).length,
      surfacedDuplicateCount: countDuplicateSurfaceIds(
        [
          featured?.id,
          ...topRanked.map((event) => event.id),
          ...categorySections.flatMap((section) => section.events.map((event) => event.id)),
          ...categorySections.flatMap((section) => section.fallbackEvents.map((event) => event.id)),
          ...trending.map((event) => event.id),
        ].filter((eventId): eventId is string => Boolean(eventId)),
      ),
      semanticDuplicateSuppressedCount,
      hiddenLowQualityTimelineSignalsCount,
      coreSignalCount: visibleTopSet.filter((event) => event.signalRole === "core").length,
      contextSignalCount: visibleTopSet.filter((event) => event.signalRole === "context").length,
      visibleSelectionAdjustmentsCount,
      categoryCounts: {
        tech: depthLayerEvents.filter((event) => event.classification.primaryCategory === "tech").length,
        finance: depthLayerEvents.filter((event) => event.classification.primaryCategory === "finance").length,
        politics: depthLayerEvents.filter((event) => event.classification.primaryCategory === "politics").length,
      },
      sourceCountsByCategory,
      lastSuccessfulFetchTime: data.homepageDiagnostics?.lastSuccessfulFetchTime,
      lastRankingRunTime: data.homepageDiagnostics?.lastRankingRunTime ?? data.briefing.briefingDate,
      failedSourceCount: data.homepageDiagnostics?.failedSourceCount ?? 0,
      fallbackSourceCount: data.homepageDiagnostics?.fallbackSourceCount ?? 0,
      degradedSourceNames: data.homepageDiagnostics?.degradedSourceNames ?? [],
      categoryEmptyReasons: Object.fromEntries(
        categorySections.map((section) => [section.key, section.emptyReason]),
      ) as Record<HomepageCategoryKey, string>,
      categoryExclusionReasons: Object.fromEntries(
        categorySections.map((section) => [section.key, section.excludedReasons]),
      ) as Record<HomepageCategoryKey, string[]>,
    },
  };
}

export function buildHomepageEvents(
  items: BriefingItem[],
  profile?: BriefingPersonalizationProfile | null,
) {
  return items
    .slice()
    .sort((left, right) => compareBriefingItemsByPersonalization(left, right, profile))
    .map((item, index, sortedItems) => {
      const intelligence = buildEventIntelligenceSignals(item);
      const classification =
        item.homepageClassification ??
        classifyHomepageCategory({
          topicName: item.topicName,
          title: item.title,
          summary: item.whatHappened,
          whyItMatters: item.whyItMatters,
          matchedKeywords: item.matchedKeywords,
          rankingSignals: item.rankingSignals,
          sourceNames: item.sources.map((source) => source.title),
        });
      const siblingItems = sortedItems.filter(
        (candidate) => candidate.id !== item.id && candidate.topicId === item.topicId,
      );
      const sourceCount = intelligence.sourceCount;
      const editorialWhyItMatters =
        item.editorialStatus === "published" ? item.editorialWhyItMatters ?? item.publishedWhyItMattersStructured : null;
      const whyItMatters = editorialWhyItMatters
        ? getEditorialHomepagePreviewText(
            editorialWhyItMatters,
            sanitizeWhyItMatters(item.whyItMatters, item.title, { preserveFullText: true }),
          )
        : sanitizeWhyItMatters(item.whyItMatters, item.title, {
            preserveFullText: item.editorialStatus === "published" && Boolean(item.publishedWhyItMatters),
          });
      const signalRole = item.signalRole ?? item.explanationPacket?.signal_role ?? classifyBriefingSignalRole(item);
      const keyPoints = normalizeKeyPoints(item.keyPoints);

      const personalization = buildPersonalizationMatch(item, profile);

      return {
        id: item.id,
        topicName: item.topicName,
        title: item.title,
        whatHappened: item.whatHappened,
        keyPoints,
        summary: summarize(item.eventIntelligence?.summary ?? item.whatHappened, item.priority === "top" ? 2 : 1),
        trustLayer: buildTrustLayerPresentation(item.eventIntelligence, {
          title: item.title,
          topicName: item.topicName,
          whyItMatters,
          sourceCount,
          rankingSignals: item.rankingSignals,
        }),
        whyItMatters,
        editorialWhyItMatters,
        whyThisIsHere: buildWhyThisIsHere(item, classification, intelligence),
        relatedArticles: buildHomepageRelatedArticles(item),
        timeline: buildEventTimeline(item, siblingItems),
        estimatedMinutes: item.estimatedMinutes,
        importanceLabel: item.importanceLabel,
        rankingSignals: item.rankingSignals ?? [],
        rankingDisplaySignals: buildRankingDisplaySignals(item),
        matchedKeywords: item.matchedKeywords ?? [],
        priority: item.priority,
        publishedAt: item.publishedAt,
        signalRole,
        rankScore: getRankScore(item) - index * 0.01,
        sourceCount,
        classification,
        eventIntelligence: item.eventIntelligence,
        intelligence,
        personalization,
        semanticFingerprint: buildSemanticFingerprint(item, intelligence, classification),
      } satisfies HomepageEvent;
    });
}

export function selectDevelopingNowEvents(
  rankedEvents: HomepageEvent[],
  topSignalEventIds: Set<string>,
  options: Record<string, never> = {},
) {
  void options;

  const topSignalEvents = rankedEvents.filter((event) => topSignalEventIds.has(event.id));
  const representedSourceKeys = new Set(topSignalEvents.flatMap((event) => deriveSourceKeys(event)));
  const candidates = rankedEvents.filter((event) => !topSignalEventIds.has(event.id));

  if (!candidates.length) {
    return [];
  }

  const timestamps = candidates.map((event) => getFreshnessTimestamp(event));
  const oldestTimestamp = Math.min(...timestamps);
  const newestTimestamp = Math.max(...timestamps);
  const timestampRange = newestTimestamp - oldestTimestamp;

  const scoredCandidates = candidates
    .map((event) => {
      const freshnessTimestamp = getFreshnessTimestamp(event);
      const freshnessScore =
        timestampRange > 0 ? (freshnessTimestamp - oldestTimestamp) / timestampRange : 1;
      const sourceDiversityBonus = deriveSourceKeys(event).some(
        (sourceKey) => !representedSourceKeys.has(sourceKey),
      )
        ? 0.3
        : 0;

      return {
        event,
        freshnessScore,
        freshnessTimestamp,
        compositeScore: freshnessScore + sourceDiversityBonus,
      };
    })
    .sort((left, right) => {
      if (right.compositeScore !== left.compositeScore) {
        return right.compositeScore - left.compositeScore;
      }

      return right.freshnessTimestamp - left.freshnessTimestamp;
    })
    .map((entry) => entry.event);

  const distinctSelection = selectDistinctEvents(
    scoredCandidates,
    topSignalEvents,
    DEVELOPING_NOW_EVENT_LIMIT,
  );

  return distinctSelection.events;
}

export function selectCategoryPreviewEvents(
  rankedEvents: HomepageEvent[],
  excludedEventIds: Set<string>,
  category: HomepageCategoryKey,
  limit = CATEGORY_PREVIEW_LIMIT,
) {
  return rankedEvents
    .filter(
      (event) =>
        event.classification.primaryCategory === category && !excludedEventIds.has(event.id),
    )
    .sort((left, right) => {
      const freshnessDelta = getFreshnessTimestamp(right) - getFreshnessTimestamp(left);
      if (freshnessDelta !== 0) {
        return freshnessDelta;
      }

      return right.rankScore - left.rankScore;
    })
    .slice(0, limit);
}

function resolveCategoryTabPool({
  topLayerEvents,
  depthLayerEvents,
  topSignalEventIds,
}: {
  topLayerEvents: HomepageEvent[];
  depthLayerEvents: HomepageEvent[];
  topSignalEventIds: Set<string>;
}) {
  const nonTopCategoryDepthEvents = depthLayerEvents.filter(
    (event) => Boolean(event.classification.primaryCategory) && !topSignalEventIds.has(event.id),
  );
  const usesTopLayerFallback =
    nonTopCategoryDepthEvents.length === 0 && topLayerEvents.length === EDITORIAL_SIGNAL_SET_SIZE;

  return {
    sourceEvents: usesTopLayerFallback ? topLayerEvents : depthLayerEvents,
    initialExcludedEventIds: usesTopLayerFallback ? [] : Array.from(topSignalEventIds),
    usesTopLayerFallback,
  };
}

export function selectCategoryTabEvents({
  rankedEvents,
  category,
  excludedEventIds,
  limit = CATEGORY_TAB_LIMIT,
}: {
  rankedEvents: HomepageEvent[];
  category: HomepageCategoryKey;
  excludedEventIds: Set<string>;
  limit?: number;
}) {
  if (!rankedEvents.length || limit <= 0) {
    return {
      events: [],
      suppressedCount: 0,
    };
  }

  const rankedCandidates = rankedEvents
    .map((event, index) => ({ event, index }))
    .filter(
      ({ event }) =>
        event.classification.primaryCategory === category && !excludedEventIds.has(event.id),
    )
    .sort((left, right) => {
      const rankDelta = right.event.rankScore - left.event.rankScore;
      if (rankDelta !== 0) {
        return rankDelta;
      }

      const freshnessDelta = getFreshnessTimestamp(right.event) - getFreshnessTimestamp(left.event);
      if (freshnessDelta !== 0) {
        return freshnessDelta;
      }

      return left.index - right.index;
    })
    .map(({ event }) => event);

  const excludedEvents = rankedEvents.filter((event) => excludedEventIds.has(event.id));
  return selectDistinctEvents(rankedCandidates, excludedEvents, limit);
}

export function buildVolumeLayersViewModel(
  rankedEvents: HomepageEvent[],
  topSignalEventIds: Set<string>,
): {
  developingNow: HomepageEvent[];
  categoryPreviews: HomepageCategoryPreviewMap;
} {
  const topSignalEvents = rankedEvents.filter((event) => topSignalEventIds.has(event.id));
  const developingNow = selectDevelopingNowEvents(rankedEvents, topSignalEventIds);
  const surfacedEvents = [...topSignalEvents, ...developingNow];
  const excludedEventIds = new Set(surfacedEvents.map((event) => event.id));
  const categoryPreviews: HomepageCategoryPreviewMap = {
    tech: [],
    finance: [],
    politics: [],
  };

  for (const category of HOMEPAGE_CATEGORY_CONFIG) {
    const candidates = selectCategoryPreviewEvents(
      rankedEvents,
      excludedEventIds,
      category.key,
      CATEGORY_PREVIEW_LIMIT,
    );
    const distinctSelection = selectDistinctEvents(
      candidates,
      surfacedEvents,
      CATEGORY_PREVIEW_LIMIT,
    );

    categoryPreviews[category.key] = distinctSelection.events;
    surfacedEvents.push(...distinctSelection.events);
    distinctSelection.events.forEach((event) => excludedEventIds.add(event.id));
  }

  return {
    developingNow,
    categoryPreviews,
  };
}

function buildHomepageRelatedArticles(item: BriefingItem) {
  const candidates =
    (item.relatedArticles?.length ? item.relatedArticles : undefined) ??
    item.sources.map((source) => ({
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

function normalizeKeyPoints(value: BriefingItem["keyPoints"] | undefined) {
  return Array.isArray(value)
    ? value.filter((point): point is string => typeof point === "string")
    : [];
}

function buildEventTimeline(item: BriefingItem, siblingItems: BriefingItem[]) {
  const keywordMilestone = item.matchedKeywords?.length
    ? {
        label: "Trigger",
        detail: `This event surfaced through signals like ${item.matchedKeywords.slice(0, 3).join(", ")}.`,
      }
    : null;

  const keyPointMilestones = normalizeKeyPoints(item.keyPoints)
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

function buildWhyThisIsHere(
  item: BriefingItem,
  classification: HomepageCategoryClassification,
  intelligence: EventDisplaySignals,
) {
  const primaryCategory = classification.primaryCategory
    ? getHomepageCategoryLabel(classification.primaryCategory)
    : "General";
  const sourceCount = intelligence.sourceCount;
  const hasBroadConfirmation = sourceCount >= TOP_EVENT_SOURCE_THRESHOLD;
  const likelyImpact = item.importanceLabel?.toLowerCase() ?? intelligence.impactLabel.toLowerCase();
  const recency = intelligence.recencyLabel.toLowerCase();
  const signalRole = item.signalRole ?? item.explanationPacket?.signal_role ?? classifyBriefingSignalRole(item);

  if (intelligence.isEarlySignal) {
    return `Visible in ${primaryCategory} because it may matter, but only ${sourceCount} ${sourceCount === 1 ? "source has" : "sources have"} reported it so far. It stays below the confirmed-event rail until broader coverage arrives.`;
  }

  if (signalRole === "core" && hasBroadConfirmation) {
    return `Top signal in ${primaryCategory} because multiple sources converged on a development with broader consequences ${recency}, making it one of the clearest things readers should understand first.`;
  }

  if (signalRole === "context") {
    return `Context signal in ${primaryCategory} because it helps explain what the lead stories may change next, even if it is less central than the strongest system-level events.`;
  }

  if (hasBroadConfirmation && likelyImpact.includes("high")) {
    return `Ranked high in ${primaryCategory} because multiple sources converged on the same development ${recency}, and the event looks material enough to change what readers should watch next.`;
  }

  if (hasBroadConfirmation) {
    return `Ranked in ${primaryCategory} because the development has cross-source confirmation ${recency} and cleared the briefing threshold for a confirmed event.`;
  }

  return `Visible in ${primaryCategory} because it is recent and potentially meaningful, but the sourcing is still thin enough that it remains a watch item rather than a lead event.`;
}

function sanitizeWhyItMatters(
  value: string,
  title: string,
  options: {
    preserveFullText?: boolean;
  } = {},
) {
  const trimmed = (options.preserveFullText ? value : summarize(value, 1)).replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .replace(/connect an ai key in settings to get analyst-quality analysis instead of this heuristic summary\.?/gi, "")
    .replace(/operators tracking this area should note it:\s*/i, "")
    .trim();
}

function getCategoryTabLabel(categoryKey: HomepageCategoryKey) {
  switch (categoryKey) {
    case "tech":
      return "Technology";
    case "finance":
      return "Economics";
    case "politics":
      return "Politics";
  }
}

function getCategoryTabEmptyReason(categoryKey: HomepageCategoryKey) {
  switch (categoryKey) {
    case "tech":
      return "No major technology signals in today's briefing.";
    case "finance":
      return "No major economics signals in today's briefing.";
    case "politics":
      return "No major politics signals in today's briefing.";
  }
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

function getFreshnessTimestamp(event: HomepageEvent) {
  const candidateTimestamps = [
    event.publishedAt,
    event.eventIntelligence?.createdAt,
  ]
    .map((value) => {
      if (!value) {
        return Number.NaN;
      }

      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .filter((value) => Number.isFinite(value));

  return candidateTimestamps[0] ?? 0;
}

function selectTopVisibleEvents(
  candidates: HomepageEvent[],
  surfacedEvents: HomepageEvent[],
  limit: number,
  featured: HomepageEvent | null,
) {
  const baselineIds = new Set(candidates.slice(0, limit).map((event) => event.id));
  const featuredCoreCount = featured?.signalRole === "core" ? 1 : 0;
  const featuredContextCount = featured?.signalRole === "context" ? 1 : 0;
  const targetCoreCount = Math.max(0, Math.min(limit, 3 - featuredCoreCount));
  const targetContextCount = Math.max(0, Math.min(limit - targetCoreCount, 2 - featuredContextCount));

  const coreSelection = selectDistinctEvents(
    candidates.filter((event) => event.signalRole === "core"),
    surfacedEvents,
    targetCoreCount,
  );
  const contextSelection = selectDistinctEvents(
    candidates.filter((event) => event.signalRole === "context" && !coreSelection.events.some((selected) => selected.id === event.id)),
    [...surfacedEvents, ...coreSelection.events],
    targetContextCount,
  );
  const fillSelection = selectDistinctEvents(
    candidates.filter(
      (event) =>
        !coreSelection.events.some((selected) => selected.id === event.id)
        && !contextSelection.events.some((selected) => selected.id === event.id),
    ),
    [...surfacedEvents, ...coreSelection.events, ...contextSelection.events],
    Math.max(0, limit - coreSelection.events.length - contextSelection.events.length),
  );

  const events = [...coreSelection.events, ...contextSelection.events, ...fillSelection.events];

  return {
    events,
    suppressedCount:
      coreSelection.suppressedCount + contextSelection.suppressedCount + fillSelection.suppressedCount,
    adjustmentsCount: events.filter((event) => !baselineIds.has(event.id)).length,
  };
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

function countDuplicateSurfaceIds(ids: string[]) {
  const uniqueIds = new Set(ids);
  return ids.length - uniqueIds.size;
}

function selectDistinctEvents(
  candidates: HomepageEvent[],
  existing: HomepageEvent[],
  limit: number,
) {
  const selected: HomepageEvent[] = [];
  let suppressedCount = 0;

  for (const candidate of candidates) {
    const hasDuplicate = [...existing, ...selected].some((event) => isSemanticDuplicate(event, candidate));

    if (hasDuplicate) {
      suppressedCount += 1;
      continue;
    }

    selected.push(candidate);
    if (selected.length === limit) {
      break;
    }
  }

  return {
    events: selected,
    suppressedCount,
  };
}

function deriveSourceKeys(item: HomepageEvent) {
  const sourceKeys = item.relatedArticles
    .map((article) => normalizeSourceKey(article.url, article.sourceName))
    .filter(Boolean);

  return [...new Set(sourceKeys)];
}

function normalizeSourceKey(url: string | undefined, fallbackTitle: string | undefined) {
  if (url) {
    try {
      // Source keys are intentionally derived from hostname-only URLs because briefing items do not
      // carry a stable source identifier. This deliberately collapses Reuters World and Reuters
      // Business under feeds.reuters.com when that is the shared feed hostname for diversity scoring.
      // Future manifest additions should verify the URL pattern resolves distinctly or confirm that
      // any hostname collision is editorially acceptable.
      return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      // Fall through to the source title when the URL is malformed.
    }
  }

  return fallbackTitle?.trim().toLowerCase() ?? "";
}

function isSemanticDuplicate(left: HomepageEvent, right: HomepageEvent) {
  if (left.id === right.id) {
    return true;
  }

  if (left.semanticFingerprint === right.semanticFingerprint) {
    return true;
  }

  const leftTitleTokens = normalizeSemanticTokens(left.title);
  const rightTitleTokens = normalizeSemanticTokens(right.title);
  const titleSimilarity = jaccard(leftTitleTokens, rightTitleTokens);
  const entityOverlap = overlapCount(
    getSpecificSemanticSignals(left.intelligence.keyEntities),
    getSpecificSemanticSignals(right.intelligence.keyEntities),
  );
  const keywordOverlap = overlapCount(
    getSpecificSemanticSignals(left.matchedKeywords),
    getSpecificSemanticSignals(right.matchedKeywords),
  );

  if (titleSimilarity >= 0.7) {
    return true;
  }

  if (entityOverlap > 0 && titleSimilarity >= 0.4) {
    return true;
  }

  if (entityOverlap > 0 && keywordOverlap >= 2) {
    return true;
  }

  return false;
}

function buildSemanticFingerprint(
  item: BriefingItem,
  intelligence: EventDisplaySignals,
  classification: HomepageCategoryClassification,
) {
  const categoryKey = classification.primaryCategory ?? item.topicName.toLowerCase();
  const dominantEntity = normalizeSemanticTokens(getSpecificSemanticSignals(intelligence.keyEntities)[0] ?? "").join("-");
  const titleStem = normalizeSemanticTokens(item.title).slice(0, 4).join("-");

  return [categoryKey, dominantEntity, titleStem].filter(Boolean).join(":");
}

function getSpecificSemanticSignals(values: string[]) {
  return values.filter((value) => {
    const normalized = normalizeSemanticSignal(value);
    return normalized && !GENERIC_SEMANTIC_SIGNALS.has(normalized);
  });
}

function normalizeSemanticSignal(value: string) {
  return normalizeSemanticTokens(value).join(" ");
}

function normalizeSemanticTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !SEMANTIC_STOPWORDS.has(token));
}

function jaccard(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const overlap = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : overlap / union;
}

function overlapCount(left: string[], right: string[]) {
  const leftSet = new Set(left.map((value) => value.toLowerCase()));
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return [...leftSet].filter((value) => rightSet.has(value)).length;
}

export function buildOverallNoDataMessage(itemCount: number) {
  if (itemCount > 0) {
    return {
      title: "Coverage is loading normally",
      body: `Ranked events are available below once they clear the ${TOP_EVENT_SOURCE_THRESHOLD}-source confirmation threshold.`,
    };
  }

  return {
    title: "No updates yet — check back shortly",
    body: "We could not confirm enough live coverage to populate this view yet, so the layout stays intentional instead of rendering blank sections.",
  };
}

export function buildEventFallbackSummary(item: BriefingItem) {
  return firstSentence(item.whatHappened, item.title);
}
