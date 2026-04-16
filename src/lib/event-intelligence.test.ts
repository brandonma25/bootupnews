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
    expect(intelligence.eventType).toBe("macro");
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
        eventType: "regulation",
        affectedMarkets: ["equities", "semiconductors"],
        sourceDiversity: 3,
        articleCount: 4,
        rankingScore: 80,
        topics: ["tech", "finance"],
      }),
    ).toBe("strong");

    expect(
      getSignalStrength({
        eventType: "company-update",
        affectedMarkets: ["technology"],
        sourceDiversity: 1,
        articleCount: 1,
        rankingScore: 35,
        topics: ["tech"],
      }),
    ).toBe("weak");
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
