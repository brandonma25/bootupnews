import { describe, expect, it } from "vitest";

import { buildHomepageViewModel } from "@/lib/homepage-model";
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
  it("keeps a ranked finance event visible in the finance category rail", () => {
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

    expect(model.topRanked.map((event) => event.id)).toContain("finance-1");
    expect(financeSection?.events.map((event) => event.id)).toContain("finance-1");
    expect(financeSection?.state).toBe("sparse");
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

    expect(politicsSection?.events.map((event) => event.id)).toContain("politics-1");
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
    expect(financeSection?.emptyReason).toContain("No ranked finance events qualified yet");
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

    expect(financeSection?.state).toBe("sparse");
    expect(financeSection?.placeholderCount).toBe(2);
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

    expect(model.topRanked.map((event) => event.id).slice(0, 2)).toEqual([
      "strong-normal",
      "weak-top",
    ]);
  });
});
