import { describe, expect, it } from "vitest";

import { buildEventIntelligence, getSignalStrength, getTrustTier } from "@/lib/event-intelligence";
import { rankNewsClusters } from "@/lib/ranking";
import type { FeedArticle } from "@/lib/rss";

function createArticle(overrides: Partial<FeedArticle>): FeedArticle {
  return {
    title: overrides.title ?? "Fed signals rates will stay elevated",
    url: overrides.url ?? "https://example.com/story",
    summaryText: overrides.summaryText ?? "Markets and banks are repricing after a new Federal Reserve signal.",
    contentText: overrides.contentText ?? overrides.summaryText ?? "Markets and banks are repricing after a new Federal Reserve signal.",
    sourceName: overrides.sourceName ?? "Reuters",
    publishedAt: overrides.publishedAt ?? new Date().toISOString(),
  };
}

describe("buildEventIntelligence", () => {
  it("enriches an event with structured analyst fields, ranking reason, and confidence", () => {
    const intelligence = buildEventIntelligence(
      [
        createArticle({}),
        createArticle({
          title: "Treasury markets reprice after Fed signal",
          summaryText: "Bond markets adjusted after the Federal Reserve signaled a higher-for-longer path.",
          sourceName: "Financial Times",
        }),
        createArticle({
          title: "Bloomberg says banks reset rate outlook after Fed remarks",
          summaryText: "Banks and investors reset funding assumptions after the remarks.",
          sourceName: "Bloomberg",
        }),
      ],
      {
        topicName: "Finance",
        matchedKeywords: ["fed", "rates", "markets"],
      },
    );

    expect(intelligence.summary.length).toBeGreaterThan(20);
    expect(intelligence.entities.length).toBeGreaterThan(0);
    expect(intelligence.eventType).toBe("macro_market_move");
    expect(intelligence.primaryImpact.length).toBeGreaterThan(20);
    expect(intelligence.affectedMarkets).toContain("rates");
    expect(intelligence.timeHorizon).toBe("medium");
    expect(intelligence.signalStrength).toBe("strong");
    expect(intelligence.topics).toContain("finance");
    expect(intelligence.rankingReason.length).toBeGreaterThan(10);
    expect(intelligence.confidenceScore).toBeGreaterThan(45);
    expect(intelligence.isHighSignal).toBe(true);
  });

  it("marks obvious shopping/deal content as low signal", () => {
    const intelligence = buildEventIntelligence(
      [
        createArticle({
          title: "Best laptop deals to shop this weekend",
          summaryText: "A round-up of discounts and gift ideas across retailers.",
          sourceName: "TechCrunch",
        }),
      ],
      {
        topicName: "Tech",
      },
    );

    expect(intelligence.isHighSignal).toBe(false);
  });

  it("maps confidence into trust tiers", () => {
    expect(getTrustTier(80)).toBe("high");
    expect(getTrustTier(55)).toBe("medium");
    expect(getTrustTier(20)).toBe("low");
  });

  it("scores signal strength with simple event heuristics", () => {
    expect(
      getSignalStrength({
        eventType: "policy_regulation",
        affectedMarkets: ["equities", "semiconductors"],
        sourceDiversity: 3,
        articleCount: 4,
        rankingScore: 80,
        topics: ["tech", "finance"],
        sourceNames: ["Reuters", "Financial Times"],
        recencyScore: 88,
        velocityScore: 82,
      }),
    ).toBe("strong");

    expect(
      getSignalStrength({
        eventType: "company_update",
        affectedMarkets: ["technology"],
        sourceDiversity: 1,
        articleCount: 1,
        rankingScore: 35,
        topics: ["tech"],
        sourceNames: ["TechCrunch"],
        recencyScore: 55,
        velocityScore: 20,
      }),
    ).toBe("weak");

    expect(
      getSignalStrength({
        eventType: "corporate",
        affectedMarkets: ["financials", "valuation"],
        sourceDiversity: 1,
        articleCount: 1,
        rankingScore: 48,
        topics: ["finance"],
        sourceNames: ["Reuters"],
        recencyScore: 72,
        velocityScore: 20,
      }),
    ).toBe("moderate");

    expect(
      getSignalStrength({
        eventType: "defense",
        affectedMarkets: ["defense posture", "international relations"],
        sourceDiversity: 1,
        articleCount: 1,
        rankingScore: 67,
        topics: ["politics"],
        sourceNames: ["Reuters"],
        recencyScore: 85,
        velocityScore: 64,
      }),
    ).toBe("strong");

    expect(
      getSignalStrength({
        eventType: "product",
        affectedMarkets: ["adoption"],
        sourceDiversity: 1,
        articleCount: 1,
        rankingScore: 40,
        topics: ["tech"],
        sourceNames: ["TechCrunch"],
        recencyScore: 80,
        velocityScore: 20,
      }),
    ).toBe("weak");
  });

  it("routes product, legal, political, and defense stories into explicit event types and safe domains", () => {
    const product = buildEventIntelligence(
      [
        createArticle({
          title: "Google launches Gemini feature for enterprise buyers",
          summaryText: "The release adds new image generation and workflow tools for paid users.",
          sourceName: "TechCrunch",
        }),
      ],
      { topicName: "Tech" },
    );

    const legal = buildEventIntelligence(
      [
        createArticle({
          title: "DOJ opens investigation into chipmaker pricing practices",
          summaryText: "The probe could widen antitrust pressure on the company.",
          sourceName: "Reuters",
        }),
      ],
      { topicName: "Tech" },
    );

    const governance = buildEventIntelligence(
      [
        createArticle({
          title: "Peter Mandelson failed UK Foreign Office vetting",
          summaryText: "The setback raises questions about diplomatic judgment and political accountability.",
          sourceName: "Reuters",
        }),
      ],
      { topicName: "Politics" },
    );

    const defense = buildEventIntelligence(
      [
        createArticle({
          title: "Google Gemini wins Department of Defense classified prototype contract",
          summaryText: "The agreement ties Google more closely to sensitive U.S. government AI work.",
          sourceName: "Reuters",
        }),
      ],
      { topicName: "Tech" },
    );

    expect(product.eventType).toBe("product");
    expect(legal.eventType).toBe("legal_investigation");
    expect(governance.eventType).toBe("political");
    expect(governance.affectedMarkets).toContain("governance credibility");
    expect(governance.affectedMarkets).not.toContain("technology");
    expect(governance.timeHorizon).toBe("medium");
    expect(defense.eventType).toBe("defense");
    expect(defense.affectedMarkets).toContain("defense posture");
    expect(defense.affectedMarkets).not.toContain("equities");
    expect(defense.signalStrength).not.toBe("weak");
  });
});

describe("rankNewsClusters", () => {
  it("filters low-signal clusters from ranked output", () => {
    const ranked = rankNewsClusters("Tech", [
      {
        representative: createArticle({
          title: "Best streaming deals this weekend",
          summaryText: "A guide to discounts and entertainment bundles.",
          sourceName: "The Verge",
        }),
        sources: [
          createArticle({
            title: "Best streaming deals this weekend",
            summaryText: "A guide to discounts and entertainment bundles.",
            sourceName: "The Verge",
          }),
        ],
      },
    ]);

    expect(ranked).toHaveLength(0);
  });
});
