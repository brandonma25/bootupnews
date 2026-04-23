import { describe, expect, it } from "vitest";

import { buildHomepageEvents, buildHomepageViewModel } from "@/lib/homepage-model";
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
