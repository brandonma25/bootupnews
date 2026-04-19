import type { DashboardData, BriefingItem, EventIntelligence } from "@/lib/types";
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
  summary: string;
  trustLayer: TrustLayerPresentation;
  whyItMatters: string;
  whyThisIsHere: string;
  relatedArticles: EventArticle[];
  timeline: EventTimelineMilestone[];
  estimatedMinutes: number;
  importanceLabel?: BriefingItem["importanceLabel"];
  rankingSignals: string[];
  rankingDisplaySignals: string[];
  matchedKeywords: string[];
  priority: BriefingItem["priority"];
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
  categorySections: HomepageCategorySection[];
  trending: HomepageEvent[];
  earlySignals: HomepageEvent[];
  debug: HomepageDebugModel;
};

const TOP_EVENTS_LIMIT = 4;
const CATEGORY_EVENT_LIMIT = 2;
const TRENDING_EVENT_LIMIT = 3;
const EARLY_SIGNAL_LIMIT = 3;
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
  const events = buildHomepageEvents(data.briefing.items, profile);
  const confirmedEvents = events.filter((event) => !event.intelligence.isEarlySignal);
  const earlySignals = events.filter((event) => event.intelligence.isEarlySignal);
  const featured = confirmedEvents[0] ?? events[0] ?? null;
  const featuredContext = featured ? [featured] : [];
  const topRankedSelection = selectTopVisibleEvents(
    confirmedEvents.filter((event) => event.id !== featured?.id),
    featuredContext,
    TOP_EVENTS_LIMIT,
    featured,
  );
  const topRanked = topRankedSelection.events;
  let semanticDuplicateSuppressedCount = topRankedSelection.suppressedCount;
  const visibleSelectionAdjustmentsCount = topRankedSelection.adjustmentsCount;
  const surfacedEvents = [...featuredContext, ...topRanked];
  const sectionDrafts = HOMEPAGE_CATEGORY_CONFIG.map((category) => {
    const eligibleEvents = events.filter(
      (event) =>
        event.classification.primaryCategory === category.key &&
        !topRanked.some((topEvent) => topEvent.id === event.id),
    );
    const sectionSelection = selectDistinctEvents(eligibleEvents, surfacedEvents, CATEGORY_EVENT_LIMIT);
    const displayEvents = sectionSelection.events;
    semanticDuplicateSuppressedCount += sectionSelection.suppressedCount;
    surfacedEvents.push(...displayEvents);
    const heldBackEvents = eligibleEvents.filter(
      (event) => !displayEvents.some((displayEvent) => displayEvent.id === event.id),
    );
    const placeholderCount =
      displayEvents.length > 0 ? Math.max(0, CATEGORY_EVENT_LIMIT - displayEvents.length) : 0;

    const excludedReasons = [
      ...events
        .filter((event) => event.classification.primaryCategory !== category.key)
        .map((event) => getExclusionReason(event, category.key)),
      ...eligibleEvents
        .filter((event) => !displayEvents.some((displayEvent) => displayEvent.id === event.id))
        .slice(0, 2)
        .map((event) => `Held back to avoid repeating a similar ${event.topicName.toLowerCase()} event elsewhere on the page.`),
      ...heldBackEvents.map(
        () => `Held back because ${getHomepageCategoryLabel(category.key)} is capped at ${CATEGORY_EVENT_LIMIT} event cards.`,
      ),
    ];

    return {
      key: category.key,
      label: category.label,
      description: getHomepageCategoryDescription(category.key),
      events: displayEvents,
      fallbackEvents: [],
      placeholderCount,
      state:
        displayEvents.length >= CATEGORY_EVENT_LIMIT
          ? "populated"
          : displayEvents.length > 0
            ? "sparse"
            : "empty",
      emptyReason: "",
      excludedReasons: dedupeStrings(excludedReasons).slice(0, 6),
    } satisfies HomepageCategorySection;
  });
  const reservedFallbackIds = new Set(surfacedEvents.map((event) => event.id));
  const categorySections = sectionDrafts.map((section) => {
    const fallbackSelection =
      section.events.length === 0
        ? allocateFallbackEvents(section.key, confirmedEvents, earlySignals, reservedFallbackIds, surfacedEvents)
        : { events: [], suppressedCount: 0 };
    semanticDuplicateSuppressedCount += fallbackSelection.suppressedCount;
    surfacedEvents.push(...fallbackSelection.events);
    const fallbackEvents = fallbackSelection.events;

    return {
      ...section,
      fallbackEvents,
      emptyReason: getEmptyReason(section.key, section.events.length, fallbackEvents.length),
    };
  });

  const reservedIds = new Set([
    ...topRanked.map((event) => event.id),
    ...categorySections.flatMap((section) => [
      ...section.events.map((event) => event.id),
      ...section.fallbackEvents.map((event) => event.id),
    ]),
  ]);
  const trendingSelection = selectDistinctEvents(
    confirmedEvents.filter((event) => !reservedIds.has(event.id) && event.id !== featured?.id),
    surfacedEvents,
    TRENDING_EVENT_LIMIT,
  );
  semanticDuplicateSuppressedCount += trendingSelection.suppressedCount;
  const trending = trendingSelection.events;
  const sourceCountsByCategory =
    data.homepageDiagnostics?.sourceCountsByCategory ?? countSourcesByHomepageCategory(data.sources);
  const hiddenLowQualityTimelineSignalsCount = events.filter((event) => event.timeline.length > 0).length;
  const visibleTopSet = [featured, ...topRanked].filter((event): event is HomepageEvent => Boolean(event));

  return {
    featured,
    topRanked,
    categorySections,
    trending,
    earlySignals: earlySignals.slice(0, EARLY_SIGNAL_LIMIT),
    debug: {
      totalArticlesFetched: data.homepageDiagnostics?.totalArticlesFetched ?? null,
      totalCandidateEvents: data.homepageDiagnostics?.totalCandidateEvents ?? null,
      rankedEventsCount: events.length,
      uncategorizedEventsCount: events.filter((event) => !event.classification.primaryCategory).length,
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
        tech: events.filter((event) => event.classification.primaryCategory === "tech").length,
        finance: events.filter((event) => event.classification.primaryCategory === "finance").length,
        politics: events.filter((event) => event.classification.primaryCategory === "politics").length,
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
      const classification = classifyHomepageCategory({
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
      const whyItMatters = sanitizeWhyItMatters(item.whyItMatters, item.title);
      const signalRole = item.signalRole ?? item.explanationPacket?.signal_role ?? classifyBriefingSignalRole(item);

      const personalization = buildPersonalizationMatch(item, profile);

      return {
        id: item.id,
        topicName: item.topicName,
        title: item.title,
        summary: summarize(item.eventIntelligence?.summary ?? item.whatHappened, item.priority === "top" ? 2 : 1),
        trustLayer: buildTrustLayerPresentation(item.eventIntelligence, {
          title: item.title,
          topicName: item.topicName,
          whyItMatters,
          sourceCount,
          rankingSignals: item.rankingSignals,
        }),
        whyItMatters,
        whyThisIsHere: buildWhyThisIsHere(item, classification, intelligence),
        relatedArticles: buildHomepageRelatedArticles(item),
        timeline: buildEventTimeline(item, siblingItems),
        estimatedMinutes: item.estimatedMinutes,
        importanceLabel: item.importanceLabel,
        rankingSignals: item.rankingSignals ?? [],
        rankingDisplaySignals: buildRankingDisplaySignals(item),
        matchedKeywords: item.matchedKeywords ?? [],
        priority: item.priority,
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

function getEmptyReason(categoryKey: HomepageCategoryKey, visibleCount: number, fallbackCount: number) {
  const label = getHomepageCategoryLabel(categoryKey);

  if (visibleCount > 0) {
    return `${label} has ${visibleCount} eligible event${visibleCount === 1 ? "" : "s"}, so placeholders keep the section calm while more clustered coverage builds.`;
  }

  if (fallbackCount > 0) {
    return `No ${label.toLowerCase()} events qualified yet, so the section borrows the best available ranked coverage instead of collapsing into an empty rail.`;
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

function allocateFallbackEvents(
  categoryKey: HomepageCategoryKey,
  confirmedEvents: HomepageEvent[],
  earlySignals: HomepageEvent[],
  reservedIds: Set<string>,
  surfacedEvents: HomepageEvent[],
) {
  const rankedSelection = selectDistinctEvents(
    confirmedEvents.filter(
      (event) =>
        event.classification.primaryCategory !== categoryKey && !reservedIds.has(event.id),
    ),
    surfacedEvents,
    2,
  );
  const earlySelection =
    rankedSelection.events.length < 2
      ? selectDistinctEvents(
          earlySignals.filter(
            (event) =>
              event.classification.primaryCategory !== categoryKey &&
              !reservedIds.has(event.id) &&
              !rankedSelection.events.some((rankedEvent) => rankedEvent.id === event.id),
          ),
          [...surfacedEvents, ...rankedSelection.events],
          2 - rankedSelection.events.length,
        )
      : { events: [], suppressedCount: 0 };
  const selected = [...rankedSelection.events, ...earlySelection.events];

  if (!selected.length) {
    return {
      events: [],
      suppressedCount: rankedSelection.suppressedCount + earlySelection.suppressedCount,
    };
  }

  selected.forEach((event) => reservedIds.add(event.id));
  return {
    events: selected,
    suppressedCount: rankedSelection.suppressedCount + earlySelection.suppressedCount,
  };
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
  const entityOverlap = overlapCount(left.intelligence.keyEntities, right.intelligence.keyEntities);
  const keywordOverlap = overlapCount(left.matchedKeywords, right.matchedKeywords);

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
  const dominantEntity = normalizeSemanticTokens(intelligence.keyEntities[0] ?? "").join("-");
  const titleStem = normalizeSemanticTokens(item.title).slice(0, 4).join("-");

  return [categoryKey, dominantEntity, titleStem].filter(Boolean).join(":");
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
