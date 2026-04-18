import { describe, expect, it } from "vitest";

import { buildHomepageViewModel } from "@/lib/homepage-model";
import { createDefaultPersonalizationProfile } from "@/lib/personalization";
import type { DashboardData, BriefingItem } from "@/lib/types";

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
  return {
    id: overrides.id ?? "item-1",
    topicId: overrides.topicId ?? "topic-1",
    topicName: overrides.topicName ?? "General",
    title: overrides.title ?? "Generic event",
    whatHappened: overrides.whatHappened ?? "A generic development happened.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? "It matters because it changes expectations.",
    sources: overrides.sources ?? [
      { title: "Reuters", url: "https://www.reuters.com/world/example" },
      { title: "AP", url: "https://apnews.com/example" },
    ],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    read: overrides.read ?? false,
    priority: overrides.priority ?? "top",
    matchedKeywords: overrides.matchedKeywords ?? [],
    matchScore: overrides.matchScore ?? 8,
    publishedAt: overrides.publishedAt ?? "2026-04-15T08:00:00.000Z",
    sourceCount: overrides.sourceCount ?? 2,
    relatedArticles: overrides.relatedArticles,
    importanceScore: overrides.importanceScore ?? 82,
    importanceLabel: overrides.importanceLabel ?? "High",
    rankingSignals: overrides.rankingSignals ?? ["Fresh reporting in the current cycle."],
    eventIntelligence: overrides.eventIntelligence,
  };
}

function createData(items: BriefingItem[]): DashboardData {
  return {
    mode: "live",
    briefing: {
      id: "briefing-1",
      briefingDate: "2026-04-15T09:00:00.000Z",
      title: "Today",
      intro: "Intro",
      readingWindow: "10 minutes",
      items,
    },
    topics: [],
    sources: [
      { id: "source-tech", name: "TechCrunch", feedUrl: "https://techcrunch.com/feed", status: "active", topicName: "Tech" },
      { id: "source-finance", name: "Financial Times", feedUrl: "https://ft.com/rss", status: "active", topicName: "Finance" },
      { id: "source-politics", name: "Reuters Politics", feedUrl: "https://reuters.com/politics", status: "active", topicName: "Geopolitics" },
    ],
    homepageDiagnostics: {
      totalArticlesFetched: 12,
      totalCandidateEvents: items.length,
      lastSuccessfulFetchTime: "2026-04-15T09:00:00.000Z",
      lastRankingRunTime: "2026-04-15T09:05:00.000Z",
      sourceCountsByCategory: { tech: 1, finance: 1, politics: 1 },
    },
  };
}

describe("buildHomepageViewModel", () => {
  it("keeps a featured finance event out of downstream rails", () => {
    const financeItem = createItem({
      id: "finance-1",
      topicId: "finance",
      topicName: "Finance",
      title: "Fed signals rates will stay elevated",
      whatHappened: "Markets and banks are repricing after a new Federal Reserve signal.",
      whyItMatters: "It changes funding expectations across the market.",
      matchedKeywords: ["fed", "markets", "rates"],
      rankingSignals: ["Covered by 3 sources, which boosts confidence."],
      importanceScore: 95,
      importanceLabel: "Critical",
    });

    const model = buildHomepageViewModel(createData([financeItem]));
    const financeSection = model.categorySections.find((section) => section.key === "finance");

    expect(model.featured?.id).toBe("finance-1");
    expect(model.topRanked.map((event) => event.id)).not.toContain("finance-1");
    expect(financeSection?.events).toHaveLength(0);
    expect(model.debug.semanticDuplicateSuppressedCount).toBeGreaterThan(0);
  });

  it("maps geopolitics coverage into the politics category", () => {
    const politicsItem = createItem({
      id: "politics-1",
      topicId: "geo",
      topicName: "Geopolitics",
      title: "White House weighs new sanctions package",
      whatHappened: "Diplomats and ministers are reacting to a fresh sanctions proposal.",
      whyItMatters: "Policy changes can alter the operating environment quickly.",
      matchedKeywords: ["white house", "sanctions", "diplomacy"],
    });

    const model = buildHomepageViewModel(createData([politicsItem]));
    const politicsSection = model.categorySections.find((section) => section.key === "politics");

    expect(model.featured?.id).toBe("politics-1");
    expect(politicsSection?.events).toHaveLength(0);
  });

  it("renders an empty category only when no eligible events exist", () => {
    const techItem = createItem({
      id: "tech-1",
      topicId: "tech",
      topicName: "Tech",
      title: "Chip makers race to expand AI capacity",
      whatHappened: "Cloud providers and semiconductor vendors are scaling data centers.",
      whyItMatters: "Platform capacity shifts can reshape competitive dynamics.",
      matchedKeywords: ["chips", "ai", "data center"],
    });

    const model = buildHomepageViewModel(createData([techItem]));
    const financeSection = model.categorySections.find((section) => section.key === "finance");

    expect(financeSection?.events).toHaveLength(0);
    expect(financeSection?.state).toBe("empty");
    expect(financeSection?.emptyReason).toContain("No eligible finance events qualified");
  });

  it("renders sparse fallback behavior when a category has thin data", () => {
    const financeItem = createItem({
      id: "finance-thin",
      topicId: "finance",
      topicName: "Finance",
      title: "Earnings season opens with bank guidance cuts",
      whatHappened: "Banking results are reshaping revenue expectations.",
      whyItMatters: "It resets company and market assumptions.",
      matchedKeywords: ["earnings", "banking", "revenue"],
    });

    const model = buildHomepageViewModel(createData([financeItem]));
    const financeSection = model.categorySections.find((section) => section.key === "finance");

    expect(model.featured?.id).toBe("finance-thin");
    expect(financeSection?.state).toBe("empty");
  });

  it("keeps early signals in their primary category instead of duplicating them into unrelated empty rails", () => {
    const earlySignal = createItem({
      id: "early-tech",
      topicId: "tech",
      topicName: "Tech",
      title: "Single-source AI infrastructure update",
      whatHappened: "A single source reported a new AI infrastructure buildout.",
      whyItMatters: "It may influence platform capacity planning.",
      sourceCount: 1,
      sources: [{ title: "TechCrunch", url: "https://techcrunch.com/example" }],
      matchedKeywords: ["ai", "infrastructure", "chips"],
    });

    const model = buildHomepageViewModel(createData([earlySignal]));
    const techSection = model.categorySections.find((section) => section.key === "tech");
    const financeSection = model.categorySections.find((section) => section.key === "finance");

    expect(model.featured?.id).toBe("early-tech");
    expect(techSection?.events).toHaveLength(0);
    expect(financeSection?.fallbackEvents).toHaveLength(0);
  });

  it("does not repeat the same fallback card across multiple empty rails or reuse top-ranked cards", () => {
    const financeEvent = createItem({
      id: "finance-fallback",
      topicId: "finance",
      topicName: "Finance",
      title: "Markets absorb a rates surprise",
      whatHappened: "A finance event moved through the market.",
      whyItMatters: "It changes rate expectations.",
      matchedKeywords: ["rates", "markets", "fed"],
      sourceCount: 3,
    });
    const politicsEarly = createItem({
      id: "politics-early",
      topicId: "politics",
      topicName: "Geopolitics",
      title: "Single-source diplomatic update",
      whatHappened: "A single source reported a diplomatic move.",
      whyItMatters: "It may affect geopolitics.",
      matchedKeywords: ["diplomacy"],
      sourceCount: 1,
      sources: [{ title: "Reuters", url: "https://reuters.com/diplomacy" }],
    });

    const model = buildHomepageViewModel(createData([financeEvent, politicsEarly]));
    const techSection = model.categorySections.find((section) => section.key === "tech");
    const politicsSection = model.categorySections.find((section) => section.key === "politics");
    const fallbackIds = [
      ...(techSection?.fallbackEvents.map((event) => event.id) ?? []),
      ...(politicsSection?.fallbackEvents.map((event) => event.id) ?? []),
    ];

    expect(new Set(fallbackIds).size).toBe(fallbackIds.length);
    expect(fallbackIds).not.toContain("finance-fallback");
    expect(politicsSection?.events.map((event) => event.id)).toContain("politics-early");
  });

  it("keeps surfaced event ids unique across featured, top-ranked, category, and watchlist rails", () => {
    const financeLead = createItem({
      id: "finance-lead",
      topicId: "finance",
      topicName: "Finance",
      title: "Markets absorb a rates surprise",
      matchedKeywords: ["rates", "markets", "fed"],
      sourceCount: 4,
    });
    const techFollow = createItem({
      id: "tech-follow",
      topicId: "tech",
      topicName: "Tech",
      title: "Chip makers expand AI capacity",
      matchedKeywords: ["chips", "ai", "data center"],
      sourceCount: 3,
    });
    const politicsFollow = createItem({
      id: "politics-follow",
      topicId: "politics",
      topicName: "Geopolitics",
      title: "White House weighs new sanctions package",
      matchedKeywords: ["white house", "sanctions", "policy"],
      sourceCount: 3,
    });

    const model = buildHomepageViewModel(createData([financeLead, techFollow, politicsFollow]));
    const surfacedIds = [
      model.featured?.id,
      ...model.topRanked.map((event) => event.id),
      ...model.categorySections.flatMap((section) => section.events.map((event) => event.id)),
      ...model.categorySections.flatMap((section) => section.fallbackEvents.map((event) => event.id)),
      ...model.trending.map((event) => event.id),
    ].filter((eventId): eventId is string => Boolean(eventId));

    expect(new Set(surfacedIds).size).toBe(surfacedIds.length);
    expect(model.debug.surfacedDuplicateCount).toBe(0);
  });

  it("suppresses semantically near-duplicate stories across rails", () => {
    const firstStory = createItem({
      id: "apple-1",
      topicId: "tech",
      topicName: "Tech",
      title: "Apple delays Vision Pro launch timeline",
      whatHappened: "Multiple outlets say Apple is pushing back the Vision Pro schedule.",
      matchedKeywords: ["apple", "vision pro", "launch"],
      sourceCount: 4,
    });
    const secondStory = createItem({
      id: "apple-2",
      topicId: "tech",
      topicName: "Tech",
      title: "Apple pushes back Vision Pro rollout plans",
      whatHappened: "A second cluster candidate describes the same Apple headset delay.",
      matchedKeywords: ["apple", "vision pro", "rollout"],
      sourceCount: 3,
    });
    const thirdStory = createItem({
      id: "rates-1",
      topicId: "finance",
      topicName: "Finance",
      title: "Treasury yields climb after inflation surprise",
      matchedKeywords: ["treasury", "inflation", "yields"],
      sourceCount: 4,
    });

    const model = buildHomepageViewModel(createData([firstStory, secondStory, thirdStory]));
    const surfacedIds = [
      model.featured?.id,
      ...model.topRanked.map((event) => event.id),
      ...model.categorySections.flatMap((section) => section.events.map((event) => event.id)),
      ...model.trending.map((event) => event.id),
    ].filter((eventId): eventId is string => Boolean(eventId));

    expect(surfacedIds).toContain("apple-1");
    expect(surfacedIds).not.toContain("apple-2");
    expect(model.debug.semanticDuplicateSuppressedCount).toBeGreaterThan(0);
  });

  it("keeps ranking explanations free of junk debug phrases", () => {
    const item = createItem({
      id: "politics-clean-copy",
      topicId: "politics",
      topicName: "Politics",
      title: "White House weighs new sanctions package",
      whatHappened: "Multiple outlets report a sanctions package is under active review.",
      matchedKeywords: ["white house", "sanctions", "policy"],
      sourceCount: 4,
    });

    const model = buildHomepageViewModel(createData([item]));
    const event = model.featured;

    expect(event?.whyThisIsHere.toLowerCase()).not.toContain("triggered by");
    expect(event?.whyThisIsHere.toLowerCase()).not.toContain("weighted similarity");
    expect(event?.whyThisIsHere.toLowerCase()).not.toContain("cluster evidence");
    expect(event?.whyThisIsHere.toLowerCase()).not.toContain("signal like");
  });

  it("keeps single-source items out of the top-ranked event rail", () => {
    const earlySignal = createItem({
      id: "early-1",
      sourceCount: 1,
      sources: [{ title: "Reuters", url: "https://www.reuters.com/world/example" }],
      title: "Single-source report surfaces ahead of broader pickup",
    });

    const model = buildHomepageViewModel(createData([earlySignal]));

    expect(model.topRanked).toHaveLength(0);
    expect(model.earlySignals.map((event) => event.id)).toContain("early-1");
  });

  it("counts uncategorized events in debug mode", () => {
    const uncategorized = createItem({
      id: "uncat-1",
      topicId: "general",
      topicName: "General Briefing",
      title: "A broad update with no strong category fit",
      whatHappened: "A broad update happened across several domains.",
      whyItMatters: "It is worth keeping in view.",
      matchedKeywords: [],
      rankingSignals: [],
    });

    const model = buildHomepageViewModel(createData([uncategorized]));

    expect(model.debug.uncategorizedEventsCount).toBe(1);
  });

  it("records why an event was intentionally excluded from a category", () => {
    const financeItem = createItem({
      id: "finance-excluded",
      topicId: "finance",
      topicName: "Finance",
      title: "Treasury markets brace for inflation print",
      whatHappened: "Bond markets are repricing before the latest inflation data.",
      whyItMatters: "It may move expectations around rates.",
      matchedKeywords: ["treasury", "inflation", "rates"],
    });

    const model = buildHomepageViewModel(createData([financeItem]));
    const politicsSection = model.categorySections.find((section) => section.key === "politics");

    expect(politicsSection?.excludedReasons.join(" ")).toContain("classified as Finance");
  });

  it("uses ranking quality instead of the old priority bonus to order homepage events", () => {
    const weakTop = createItem({
      id: "weak-top",
      priority: "top",
      title: "Thin single-source update",
      importanceScore: 50,
      eventIntelligence: {
        id: "intel-weak",
        title: "Thin single-source update",
        summary: "A light update happened.",
        primaryChange: "Thin single-source update",
        keyEntities: ["Company"],
        topics: ["finance"],
        signals: {
          articleCount: 1,
          sourceDiversity: 1,
          recencyScore: 80,
          velocityScore: 20,
        },
        rankingScore: 50,
        rankingReason: "Early single-source coverage kept this on the radar.",
        confidenceScore: 44,
        isHighSignal: true,
        createdAt: "2026-04-15T08:00:00.000Z",
      },
    });
    const strongerNormal = createItem({
      id: "strong-normal",
      priority: "normal",
      title: "Broadly confirmed policy shift",
      importanceScore: 82,
      eventIntelligence: {
        id: "intel-strong",
        title: "Broadly confirmed policy shift",
        summary: "Multiple outlets confirmed a broader policy move.",
        primaryChange: "Broadly confirmed policy shift",
        keyEntities: ["White House"],
        topics: ["politics"],
        signals: {
          articleCount: 6,
          sourceDiversity: 4,
          recencyScore: 75,
          velocityScore: 68,
        },
        rankingScore: 82,
        rankingReason: "Broad multi-source reporting kept this near the top of the briefing.",
        confidenceScore: 78,
        isHighSignal: true,
        createdAt: "2026-04-15T07:00:00.000Z",
      },
    });

    const model = buildHomepageViewModel(createData([weakTop, strongerNormal]));

    expect(model.featured?.id).toBe("strong-normal");
    expect(model.topRanked.map((event) => event.id).slice(0, 1)).toEqual([
      "weak-top",
    ]);
  });
  it("applies controlled personalization to homepage ordering without promoting weak items into Top Events", () => {
    const financeItem = createItem({
      id: "finance-personalization",
      topicId: "finance",
      topicName: "Finance",
      title: "Finance event",
      importanceScore: 84,
      sourceCount: 4,
      eventIntelligence: {
        id: "intel-finance-personalization",
        title: "Finance event",
        summary: "Finance event",
        primaryChange: "Finance event",
        keyEntities: ["Federal Reserve"],
        topics: ["finance"],
        signals: { articleCount: 4, sourceDiversity: 4, recencyScore: 72, velocityScore: 58 },
        rankingScore: 84,
        rankingReason: "High impact • 4 sources • last 6 hours",
        confidenceScore: 78,
        isHighSignal: true,
        createdAt: "2026-04-15T08:00:00.000Z",
      },
    });
    const techItem = createItem({
      id: "tech-personalization",
      topicId: "tech",
      topicName: "Tech",
      title: "Tech event",
      importanceScore: 74,
      sourceCount: 3,
      matchedKeywords: ["nvidia", "ai"],
      eventIntelligence: {
        id: "intel-tech-personalization",
        title: "Tech event",
        summary: "Tech event",
        primaryChange: "Tech event",
        keyEntities: ["Nvidia"],
        topics: ["tech"],
        signals: { articleCount: 3, sourceDiversity: 3, recencyScore: 76, velocityScore: 69 },
        rankingScore: 74,
        rankingReason: "Meaningful impact • 3 sources • last 6 hours",
        confidenceScore: 73,
        isHighSignal: true,
        createdAt: "2026-04-15T08:00:00.000Z",
      },
    });
    const weakEarly = createItem({
      id: "weak-early-personalization",
      topicId: "tech",
      topicName: "Tech",
      title: "Weak early signal",
      sourceCount: 1,
      sources: [{ title: "Reuters", url: "https://www.reuters.com/world/example" }],
      importanceScore: 46,
      importanceLabel: "Watch",
      matchedKeywords: ["nvidia"],
      eventIntelligence: {
        id: "intel-weak-early-personalization",
        title: "Weak early signal",
        summary: "Weak early signal",
        primaryChange: "Weak early signal",
        keyEntities: ["Nvidia"],
        topics: ["tech"],
        signals: { articleCount: 1, sourceDiversity: 1, recencyScore: 78, velocityScore: 20 },
        rankingScore: 46,
        rankingReason: "Watch impact • 1 source • last 6 hours",
        confidenceScore: 36,
        isHighSignal: false,
        createdAt: "2026-04-15T08:00:00.000Z",
      },
    });

    const profile = {
      ...createDefaultPersonalizationProfile("reader@example.com"),
      followedTopicIds: ["tech"],
      followedTopicNames: ["Tech"],
      followedEntities: ["Nvidia"],
    };

    const model = buildHomepageViewModel(createData([financeItem, techItem, weakEarly]), profile);

    expect(model.featured?.id).toBe("tech-personalization");
    expect(model.topRanked.map((event) => event.id).slice(0, 1)).toEqual([
      "finance-personalization",
    ]);
    expect(model.topRanked.map((event) => event.id)).not.toContain("weak-early-personalization");
    expect(model.earlySignals.map((event) => event.id)).toContain("weak-early-personalization");
  });

});
