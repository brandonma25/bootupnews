import { describe, expect, it } from "vitest";

import { buildHomepageEvents, buildHomepageViewModel, selectCategoryTabEvents } from "@/lib/homepage-model";
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
    publishedWhyItMatters: overrides.publishedWhyItMatters,
    publishedWhyItMattersStructured: overrides.publishedWhyItMattersStructured,
    editorialWhyItMatters: overrides.editorialWhyItMatters,
    editorialStatus: overrides.editorialStatus,
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
    homepageClassification: overrides.homepageClassification,
  };
}

function createData(
  items: BriefingItem[],
  options: {
    publicRankedItems?: BriefingItem[] | null;
  } = {},
): DashboardData {
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
    publicRankedItems:
      options.publicRankedItems === null ? undefined : (options.publicRankedItems ?? items),
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
  it("uses the proposed homepageClassification contract before computed fallback taxonomy", () => {
    const [event] = buildHomepageEvents([
      createItem({
        id: "contract-classified",
        topicName: "General",
        title: "Broad update without category words",
        whatHappened: "A broad update happened.",
        matchedKeywords: [],
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.91,
          scores: { tech: 0, finance: 11, politics: 0 },
          matchedSignals: { tech: [], finance: ["backend contract"], politics: [] },
        },
      }),
    ]);

    expect(event?.classification.primaryCategory).toBe("finance");
    expect(event?.classification.confidence).toBe(0.91);
  });

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
    expect(model.debug.surfacedDuplicateCount).toBe(0);
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
    expect(financeSection?.emptyReason).toBe("No major economics signals in today's briefing.");
  });

  it("keeps Top 5 sourced from briefing items while depth layers use publicRankedItems", () => {
    const briefingItems = [
      createItem({
        id: "briefing-finance",
        topicId: "finance",
        topicName: "Finance",
        title: "Fed signals rates will stay elevated",
        matchedKeywords: ["fed", "rates", "markets"],
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.9,
          scores: { tech: 0, finance: 11, politics: 0 },
          matchedSignals: { tech: [], finance: ["fed"], politics: [] },
        },
      }),
    ];
    const depthItems = [
      ...briefingItems,
      createItem({
        id: "depth-tech",
        topicId: "tech",
        topicName: "Tech",
        title: "Database vendors ship a query planner update",
        whatHappened: "Database vendors shipped a planner update for production workloads.",
        matchedKeywords: ["database", "query planner", "open source"],
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.9,
          scores: { tech: 10, finance: 0, politics: 0 },
          matchedSignals: { tech: ["database"], finance: [], politics: [] },
        },
        priority: "normal",
      }),
    ];

    const model = buildHomepageViewModel(createData(briefingItems, { publicRankedItems: depthItems }));

    expect(model.featured?.id).toBe("briefing-finance");
    expect(model.topRanked.map((event) => event.id)).not.toContain("depth-tech");
    expect(model.debug.rankedEventsCount).toBe(depthItems.length);
    expect(model.developingNowEvents.map((event) => event.id)).toContain("depth-tech");
  });

  it("lets Developing Now surface events from publicRankedItems beyond the Top 5 briefing layer", () => {
    const briefingItems = [
      createItem({
        id: "briefing-tech",
        topicId: "tech",
        topicName: "Tech",
        title: "Cloud providers expand AI capacity plans",
        matchedKeywords: ["cloud", "ai", "capacity"],
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.95,
          scores: { tech: 12, finance: 0, politics: 0 },
          matchedSignals: { tech: ["ai"], finance: [], politics: [] },
        },
      }),
    ];
    const depthItems = [
      ...briefingItems,
      createItem({
        id: "depth-finance",
        topicId: "finance",
        topicName: "Finance",
        title: "Credit markets reprice after a guidance reset",
        matchedKeywords: ["credit", "markets", "guidance"],
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.95,
          scores: { tech: 0, finance: 12, politics: 0 },
          matchedSignals: { tech: [], finance: ["credit"], politics: [] },
        },
        sources: [{ title: "Financial Times", url: "https://www.ft.com/content/guidance-reset" }],
        priority: "normal",
      }),
    ];

    const model = buildHomepageViewModel(createData(briefingItems, { publicRankedItems: depthItems }));

    expect(model.developingNowEvents.map((event) => event.id)).toContain("depth-finance");
    expect(model.developingNowEvents.map((event) => event.id)).not.toContain("briefing-tech");
  });

  it("lets By Category surface events from publicRankedItems beyond the Top 5 briefing layer", () => {
    const briefingItems = [
      createItem({
        id: "briefing-politics",
        topicId: "politics",
        topicName: "Politics",
        title: "White House weighs new export controls",
        matchedKeywords: ["white house", "exports", "policy"],
        homepageClassification: {
          primaryCategory: "politics",
          secondaryCategories: [],
          confidence: 0.95,
          scores: { tech: 0, finance: 0, politics: 12 },
          matchedSignals: { tech: [], finance: [], politics: ["white house"] },
        },
      }),
    ];
    const fillerTitles = [
      "Bank funding costs rise after treasury volatility",
      "Private equity deal pacing slows in Europe",
      "Corporate bond issuance rebounds after a pause",
      "Insurers revise catastrophe pricing assumptions",
      "Regional lenders tighten commercial real estate terms",
      "Asset managers prepare for a stronger dollar regime",
      "Treasury clearing reform changes dealer planning",
      "Consumer lenders cut promotional balance-transfer offers",
      "Commodities desks hedge against freight disruptions",
      "Mortgage originators reset refinance expectations",
    ];
    const fillerItems = fillerTitles.map((title, index) =>
      createItem({
        id: `depth-finance-${index + 1}`,
        topicId: "finance",
        topicName: "Finance",
        title,
        matchedKeywords: [`finance-${index + 1}`, `market-${index + 1}`],
        publishedAt: `2026-04-15T${String(12 + index).padStart(2, "0")}:00:00.000Z`,
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.95,
          scores: { tech: 0, finance: 12, politics: 0 },
          matchedSignals: { tech: [], finance: ["credit"], politics: [] },
        },
        priority: "normal",
      }),
    );
    const depthItems = [
      ...briefingItems,
      ...fillerItems,
      createItem({
        id: "depth-tech-preview",
        topicId: "tech",
        topicName: "Tech",
        title: "Database vendors ship a query planner update",
        matchedKeywords: ["database", "query planner", "open source"],
        publishedAt: "2026-04-15T08:30:00.000Z",
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.92,
          scores: { tech: 10, finance: 0, politics: 0 },
          matchedSignals: { tech: ["database"], finance: [], politics: [] },
        },
        priority: "normal",
      }),
    ];

    const model = buildHomepageViewModel(createData(briefingItems, { publicRankedItems: depthItems }));

    expect(model.categoryPreviewEvents.tech.map((event) => event.id)).toContain("depth-tech-preview");
    expect(model.categoryPreviewEvents.tech.map((event) => event.id)).not.toContain("briefing-politics");
  });

  it("keeps depth layers empty when publicRankedItems is absent", () => {
    const model = buildHomepageViewModel(
      createData(
        [
          createItem({
            id: "briefing-tech",
            topicId: "tech",
            topicName: "Tech",
            title: "Chip makers race to expand AI capacity",
            matchedKeywords: ["chips", "ai", "capacity"],
          }),
        ],
        { publicRankedItems: null },
      ),
    );

    expect(model.featured?.id).toBe("briefing-tech");
    expect(model.developingNowEvents).toEqual([]);
    expect(model.categoryPreviewEvents).toEqual({
      tech: [],
      finance: [],
      politics: [],
    });
    expect(model.categorySections.every((section) => section.events.length === 0)).toBe(true);
  });

  it("renders a sparse category tab when a category has thin but eligible data", () => {
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

  it("does not borrow tech or finance fallback cards into an empty politics section", () => {
    const items = [
      createItem({
        id: "tech-1",
        topicId: "tech",
        topicName: "Tech",
        title: "AI chip suppliers expand data center capacity",
        matchedKeywords: ["ai", "chips", "data center"],
        importanceScore: 94,
      }),
      createItem({
        id: "finance-1",
        topicId: "finance",
        topicName: "Finance",
        title: "Bond markets reprice after inflation data",
        matchedKeywords: ["bond", "markets", "inflation"],
        importanceScore: 90,
      }),
      createItem({
        id: "tech-2",
        topicId: "tech",
        topicName: "Tech",
        title: "Cloud platforms update enterprise AI tooling",
        matchedKeywords: ["cloud", "platform", "ai"],
        importanceScore: 84,
      }),
      createItem({
        id: "finance-2",
        topicId: "finance",
        topicName: "Finance",
        title: "Banks trim guidance as credit costs rise",
        matchedKeywords: ["banks", "credit", "guidance"],
        importanceScore: 81,
      }),
      createItem({
        id: "tech-3",
        topicId: "tech",
        topicName: "Tech",
        title: "Security vendors disclose browser exploit response",
        matchedKeywords: ["security", "browser", "exploit"],
        importanceScore: 78,
      }),
      createItem({
        id: "finance-3",
        topicId: "finance",
        topicName: "Finance",
        title: "Currency volatility pressures exporter forecasts",
        matchedKeywords: ["currency", "volatility", "forecasts"],
        importanceScore: 74,
      }),
    ];

    const model = buildHomepageViewModel(createData(items));
    const politicsSection = model.categorySections.find((section) => section.key === "politics");

    expect(politicsSection?.events).toHaveLength(0);
    expect(politicsSection?.fallbackEvents).toHaveLength(0);
    expect(politicsSection?.state).toBe("empty");
    expect(politicsSection?.emptyReason).toBe("No major politics signals in today's briefing.");
    expect(
      [
        ...(politicsSection?.events.map((event) => event.id) ?? []),
        ...(politicsSection?.fallbackEvents.map((event) => event.id) ?? []),
      ],
    ).not.toEqual(expect.arrayContaining(["tech-1", "tech-2", "tech-3", "finance-1", "finance-2", "finance-3"]));
  });

  it("keeps homepage tab category mapping aligned to tech, finance, and politics", () => {
    const [techEvent, financeEvent, politicsEvent] = buildHomepageEvents([
      createItem({
        id: "tech-tab-item",
        topicId: "tech",
        topicName: "Tech",
        title: "Chipmakers expand AI server capacity",
        matchedKeywords: ["ai", "chips", "cloud"],
        importanceScore: 94,
      }),
      createItem({
        id: "finance-tab-item",
        topicId: "finance",
        topicName: "Finance",
        title: "Bond traders reset rate expectations",
        matchedKeywords: ["bond", "rates", "markets"],
        importanceScore: 93,
      }),
      createItem({
        id: "politics-tab-item",
        topicId: "politics",
        topicName: "Politics",
        title: "Diplomats react to a new sanctions package",
        matchedKeywords: ["diplomacy", "sanctions", "government"],
        importanceScore: 92,
      }),
    ]);

    expect(techEvent?.classification.primaryCategory).toBe("tech");
    expect(financeEvent?.classification.primaryCategory).toBe("finance");
    expect(politicsEvent?.classification.primaryCategory).toBe("politics");
  });

  it("selectCategoryTabEvents keeps only the target category in ranked order", () => {
    const events = buildHomepageEvents([
      createItem({
        id: "tech-1",
        topicId: "tech",
        topicName: "Tech",
        title: "AI capacity expands",
        importanceScore: 95,
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 11, finance: 0, politics: 0 },
          matchedSignals: { tech: ["fixture"], finance: [], politics: [] },
        },
      }),
      createItem({
        id: "finance-1",
        topicId: "finance",
        topicName: "Finance",
        title: "Bond market repricing lands",
        importanceScore: 90,
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 0, finance: 11, politics: 0 },
          matchedSignals: { tech: [], finance: ["fixture"], politics: [] },
        },
      }),
      createItem({
        id: "tech-2",
        topicId: "tech-2",
        topicName: "Tech",
        title: "Semiconductor roadmap shifts",
        importanceScore: 84,
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 10, finance: 0, politics: 0 },
          matchedSignals: { tech: ["fixture"], finance: [], politics: [] },
        },
      }),
    ]);

    const result = selectCategoryTabEvents({
      rankedEvents: events,
      category: "tech",
      excludedEventIds: new Set(),
      limit: 6,
    });

    expect(result.events.map((event) => event.id)).toEqual(["tech-1", "tech-2"]);
  });

  it("keeps Top 5, Developing Now, and By Category items out of category tabs", () => {
    const items = [
      createItem({
        id: "tech-top",
        topicId: "tech-top",
        topicName: "Tech",
        title: "AI platform resets deployment plans",
        importanceScore: 99,
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.9,
          scores: { tech: 12, finance: 0, politics: 0 },
          matchedSignals: { tech: ["fixture"], finance: [], politics: [] },
        },
      }),
      createItem({
        id: "finance-top",
        topicId: "finance-top",
        topicName: "Finance",
        title: "Fed policy path reshapes markets",
        importanceScore: 97,
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.9,
          scores: { tech: 0, finance: 12, politics: 0 },
          matchedSignals: { tech: [], finance: ["fixture"], politics: [] },
        },
      }),
      createItem({
        id: "politics-top",
        topicId: "politics-top",
        topicName: "Politics",
        title: "Sanctions debate widens across allies",
        importanceScore: 96,
        homepageClassification: {
          primaryCategory: "politics",
          secondaryCategories: [],
          confidence: 0.9,
          scores: { tech: 0, finance: 0, politics: 12 },
          matchedSignals: { tech: [], finance: [], politics: ["fixture"] },
        },
      }),
      createItem({
        id: "tech-secondary",
        topicId: "tech-secondary",
        topicName: "Tech",
        title: "Cloud vendors update enterprise AI pricing",
        importanceScore: 83,
        publishedAt: "2026-04-15T12:00:00.000Z",
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 10, finance: 0, politics: 0 },
          matchedSignals: { tech: ["fixture"], finance: [], politics: [] },
        },
      }),
      createItem({
        id: "finance-secondary",
        topicId: "finance-secondary",
        topicName: "Finance",
        title: "Treasury auction demand softens",
        importanceScore: 82,
        publishedAt: "2026-04-15T11:00:00.000Z",
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 0, finance: 10, politics: 0 },
          matchedSignals: { tech: [], finance: ["fixture"], politics: [] },
        },
      }),
      createItem({
        id: "politics-secondary",
        topicId: "politics-secondary",
        topicName: "Politics",
        title: "Ministers reopen ceasefire talks",
        importanceScore: 81,
        publishedAt: "2026-04-15T10:00:00.000Z",
        homepageClassification: {
          primaryCategory: "politics",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 0, finance: 0, politics: 10 },
          matchedSignals: { tech: [], finance: [], politics: ["fixture"] },
        },
      }),
      createItem({
        id: "tech-tab",
        topicId: "tech-tab",
        topicName: "Tech",
        title: "Chip suppliers revise enterprise forecasts",
        importanceScore: 78,
        publishedAt: "2026-04-15T09:00:00.000Z",
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.8,
          scores: { tech: 10, finance: 0, politics: 0 },
          matchedSignals: { tech: ["fixture"], finance: [], politics: [] },
        },
      }),
    ];

    const model = buildHomepageViewModel(createData(items));
    const topIds = new Set([model.featured, ...model.topRanked].filter(Boolean).map((event) => event.id));
    const developingNowIds = new Set(model.developingNowEvents.map((event) => event.id));
    const categoryPreviewIds = new Set(
      Object.values(model.categoryPreviewEvents).flatMap((events) => events.map((event) => event.id)),
    );
    const tabIds = new Set(model.categorySections.flatMap((section) => section.events.map((event) => event.id)));

    for (const id of topIds) {
      expect(tabIds.has(id)).toBe(false);
    }

    for (const id of developingNowIds) {
      expect(tabIds.has(id)).toBe(false);
    }

    for (const id of categoryPreviewIds) {
      expect(tabIds.has(id)).toBe(false);
    }
  });

  it("keeps the top visible set anchored around core signals before context signals when enough candidates exist", () => {
    const coreOne = createItem({
      id: "core-1",
      title: "Federal Reserve signals broader policy reset",
      importanceScore: 92,
      importanceLabel: "Critical",
      sourceCount: 4,
      explanationPacket: {
        what_happened: "Policy reset.",
        why_it_matters: "It matters for rates and risk assets.",
        why_this_ranks_here: "Classified as a top signal and ranked highly due to broader consequences.",
        what_to_watch: "Watch the next policy meeting.",
        signal_role: "core",
        confidence: "high",
        unknowns: [],
        citation_support_summary: {
          source_count: 4,
          source_names: ["Reuters", "AP"],
          corroboration: "multi_source",
          strongest_trust_tier: "tier_1",
        },
        explanation_mode: "deterministic",
      },
    });
    const coreTwo = createItem({
      id: "core-2",
      topicId: "politics",
      topicName: "Geopolitics",
      title: "Export controls threaten chip supply chain",
      importanceScore: 88,
      importanceLabel: "Critical",
      sourceCount: 3,
      explanationPacket: {
        what_happened: "Export controls broadened.",
        why_it_matters: "It matters for supply chains.",
        why_this_ranks_here: "Classified as a top signal and ranked highly due to cross-domain impact.",
        what_to_watch: "Watch retaliatory steps.",
        signal_role: "core",
        confidence: "high",
        unknowns: [],
        citation_support_summary: {
          source_count: 3,
          source_names: ["Reuters", "FT"],
          corroboration: "multi_source",
          strongest_trust_tier: "tier_1",
        },
        explanation_mode: "deterministic",
      },
    });
    const coreThree = createItem({
      id: "core-3",
      topicId: "tech",
      topicName: "Tech",
      title: "Cloud capacity crunch changes AI deployment plans",
      importanceScore: 84,
      importanceLabel: "Critical",
      sourceCount: 3,
      explanationPacket: {
        what_happened: "Capacity crunch.",
        why_it_matters: "It matters for AI deployment.",
        why_this_ranks_here: "Classified as a top signal and ranked highly due to platform-level consequences.",
        what_to_watch: "Watch capital spending and delivery timelines.",
        signal_role: "core",
        confidence: "medium",
        unknowns: [],
        citation_support_summary: {
          source_count: 3,
          source_names: ["Reuters", "The Verge"],
          corroboration: "multi_source",
          strongest_trust_tier: "tier_1",
        },
        explanation_mode: "deterministic",
      },
    });
    const contextOne = createItem({
      id: "context-1",
      title: "Regional bank funding costs edge higher",
      importanceScore: 72,
      importanceLabel: "High",
      sourceCount: 2,
      explanationPacket: {
        what_happened: "Funding costs rose.",
        why_it_matters: "It adds context to broader rate pressure.",
        why_this_ranks_here: "Classified as a context signal and ranked because it helps explain the lead event.",
        what_to_watch: "Watch bank guidance.",
        signal_role: "context",
        confidence: "medium",
        unknowns: [],
        citation_support_summary: {
          source_count: 2,
          source_names: ["Reuters", "WSJ"],
          corroboration: "multi_source",
          strongest_trust_tier: "tier_1",
        },
        explanation_mode: "deterministic",
      },
    });
    const contextTwo = createItem({
      id: "context-2",
      topicId: "tech",
      topicName: "Tech",
      title: "Supplier commentary hints at slower component deliveries",
      importanceScore: 69,
      importanceLabel: "High",
      sourceCount: 2,
      explanationPacket: {
        what_happened: "Supplier commentary shifted.",
        why_it_matters: "It adds context to the platform capacity story.",
        why_this_ranks_here: "Classified as a context signal and ranked because it sharpens the main implications.",
        what_to_watch: "Watch follow-on guidance.",
        signal_role: "context",
        confidence: "medium",
        unknowns: [],
        citation_support_summary: {
          source_count: 2,
          source_names: ["Reuters", "Bloomberg"],
          corroboration: "multi_source",
          strongest_trust_tier: "tier_1",
        },
        explanation_mode: "deterministic",
      },
    });

    const model = buildHomepageViewModel(createData([contextOne, coreThree, contextTwo, coreTwo, coreOne]));
    const topSetRoles = [
      model.featured?.signalRole,
      ...model.topRanked.map((event) => event.signalRole),
    ].filter((role): role is "core" | "context" | "watch" => Boolean(role));

    expect(topSetRoles.filter((role) => role === "core").length).toBeGreaterThanOrEqual(3);
    expect(topSetRoles.filter((role) => role === "context").length).toBeGreaterThanOrEqual(1);
    expect(model.debug.coreSignalCount).toBeGreaterThanOrEqual(3);
  });

  it("does not borrow fallback cards or repeat top-ranked items into category tabs", () => {
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
      priority: "normal",
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
    expect(fallbackIds).toHaveLength(0);
    expect(politicsSection?.events.map((event) => event.id)).not.toContain("politics-early");
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

  it("labels core and context signals explicitly in the visible explanation text", () => {
    const coreItem = createItem({
      id: "core-label",
      title: "Federal Reserve policy shift drives top signal",
      importanceScore: 90,
      importanceLabel: "Critical",
      sourceCount: 4,
      explanationPacket: {
        what_happened: "A major policy signal emerged.",
        why_it_matters: "It matters because rates and risk assets may reset.",
        why_this_ranks_here: "Classified as a top signal and ranked highly due to strong structural importance.",
        what_to_watch: "Watch official confirmation.",
        signal_role: "core",
        confidence: "high",
        unknowns: [],
        citation_support_summary: {
          source_count: 4,
          source_names: ["Reuters", "AP"],
          corroboration: "multi_source",
          strongest_trust_tier: "tier_1",
        },
        explanation_mode: "deterministic",
      },
    });
    const contextItem = createItem({
      id: "context-label",
      title: "Regional data sharpens the main policy read",
      importanceScore: 71,
      importanceLabel: "High",
      sourceCount: 2,
      explanationPacket: {
        what_happened: "A regional data point followed.",
        why_it_matters: "It matters because it sharpens the main story.",
        why_this_ranks_here: "Classified as a context signal and ranked because it helps explain the lead event.",
        what_to_watch: "Watch whether this spreads.",
        signal_role: "context",
        confidence: "medium",
        unknowns: [],
        citation_support_summary: {
          source_count: 2,
          source_names: ["Reuters", "FT"],
          corroboration: "multi_source",
          strongest_trust_tier: "tier_1",
        },
        explanation_mode: "deterministic",
      },
    });

    const model = buildHomepageViewModel(createData([contextItem, coreItem]));

    expect(model.featured?.whyThisIsHere).toContain("Top signal");
    expect(model.topRanked[0]?.whyThisIsHere).toContain("Context signal");
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

  it("fills public Top Events from pipeline-selected priority top items when confirmed filtering underfills", () => {
    const items = [
      createItem({
        id: "priority-top-1",
        title: "Chip export review changes supplier plans",
        topicId: "tech",
        topicName: "Tech",
        matchedKeywords: ["chips", "exports", "suppliers"],
        sourceCount: 1,
        sources: [{ title: "The Verge", url: "https://www.theverge.com/chips" }],
        priority: "top",
      }),
      createItem({
        id: "priority-top-2",
        title: "Treasury auction resets rate expectations",
        topicId: "finance",
        topicName: "Finance",
        matchedKeywords: ["treasury", "rates", "auction"],
        sourceCount: 1,
        sources: [{ title: "Financial Times", url: "https://www.ft.com/treasury" }],
        priority: "top",
      }),
      createItem({
        id: "priority-top-3",
        title: "White House policy clock accelerates",
        topicId: "politics",
        topicName: "Politics",
        matchedKeywords: ["white house", "policy", "regulation"],
        sourceCount: 1,
        sources: [{ title: "Reuters", url: "https://www.reuters.com/policy" }],
        priority: "top",
      }),
      createItem({
        id: "priority-top-4",
        title: "Cloud capacity contracts tighten",
        topicId: "tech",
        topicName: "Tech",
        matchedKeywords: ["cloud", "capacity", "contracts"],
        sourceCount: 1,
        sources: [{ title: "TechCrunch", url: "https://techcrunch.com/cloud" }],
        priority: "top",
      }),
    ];

    const model = buildHomepageViewModel(createData(items));
    const visibleTopEventIds = [model.featured, ...model.topRanked]
      .filter((event): event is NonNullable<typeof event> => Boolean(event))
      .map((event) => event.id);

    expect(visibleTopEventIds).toHaveLength(4);
    expect(new Set(visibleTopEventIds)).toEqual(new Set(items.map((item) => item.id)));
  });

  it("does not fabricate the 3-card minimum when fewer pipeline-selected Top Events exist", () => {
    const items = [
      createItem({
        id: "limited-top-1",
        title: "Chip funding round changes capacity plans",
        matchedKeywords: ["chips", "funding"],
        sourceCount: 1,
        sources: [{ title: "Reuters", url: "https://www.reuters.com/one" }],
        priority: "top",
      }),
      createItem({
        id: "limited-top-2",
        title: "Treasury market signal shifts rate views",
        matchedKeywords: ["treasury", "rates"],
        sourceCount: 1,
        sources: [{ title: "AP", url: "https://apnews.com/two" }],
        priority: "top",
      }),
    ];

    const model = buildHomepageViewModel(createData(items));
    const visibleTopEventIds = [model.featured, ...model.topRanked]
      .filter((event): event is NonNullable<typeof event> => Boolean(event))
      .map((event) => event.id);

    expect(visibleTopEventIds).toHaveLength(2);
    expect(new Set(visibleTopEventIds)).toEqual(new Set(items.map((item) => item.id)));
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

  it("preserves full published editorial Why it matters text for homepage rendering", () => {
    const fullEditorialText =
      "This is the first editorial sentence. This second sentence is part of the manually published note and must not be collapsed by the homepage model. This final sentence gives the editor room to preserve nuance.";
    const [event] = buildHomepageEvents([
      createItem({
        id: "published-editorial",
        whyItMatters: fullEditorialText,
        publishedWhyItMatters: fullEditorialText,
        editorialStatus: "published",
      }),
    ]);

    expect(event?.whyItMatters).toBe(fullEditorialText);
  });

  it("uses structured published editorial preview for collapsed homepage copy", () => {
    const structuredWhyItMatters = {
      preview: "Collapsed editorial teaser.",
      thesis: "Expanded editorial thesis.",
      sections: [{ title: "Operator read", body: "This is the structured supporting point." }],
    };
    const [event] = buildHomepageEvents([
      createItem({
        id: "structured-editorial",
        whyItMatters: "Expanded editorial thesis.\n\nOperator read: This is the structured supporting point.",
        publishedWhyItMatters: "Expanded editorial thesis.\n\nOperator read: This is the structured supporting point.",
        publishedWhyItMattersStructured: structuredWhyItMatters,
        editorialStatus: "published",
      }),
    ]);

    expect(event?.whyItMatters).toBe("Collapsed editorial teaser.");
    expect(event?.editorialWhyItMatters).toEqual(structuredWhyItMatters);
  });

  it("keeps generated Why it matters concise for default homepage cards", () => {
    const [event] = buildHomepageEvents([
      createItem({
        id: "generated-copy",
        whyItMatters: "This is the generated first sentence. This second generated sentence remains off the homepage card.",
      }),
    ]);

    expect(event?.whyItMatters).toBe("This is the generated first sentence.");
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
      priority: "normal",
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
