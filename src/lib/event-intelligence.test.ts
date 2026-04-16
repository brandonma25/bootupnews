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
        confidenceScore: 48,
      }),
    ).toBe("weak");

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
        confidenceScore: 67,
      }),
    ).toBe("moderate");

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

  it("classifies personal advice and Q&A content as non-signal", () => {
    const advice = buildEventIntelligence(
      [
        createArticle({
          title: "MarketWatch advice column: Should I refinance before retirement?",
          summaryText: "A personal finance Q&A about mortgage decisions for retirees.",
          contentText: "Advice for readers weighing retirement and refinance timing.",
          sourceName: "MarketWatch",
        }),
      ],
      { topicName: "Finance" },
    );

    expect(advice.eventType).toBe("non_signal");
    expect(advice.signalStrength).toBe("weak");
    expect(advice.isHighSignal).toBe(false);
    expect(advice.primaryImpact.toLowerCase()).toContain("not a market-moving development");
  });

  it("does not let pronouns into extracted entity anchors", () => {
    const intelligence = buildEventIntelligence(
      [
        createArticle({
          title: "She says the White House should revisit chip export policy",
          summaryText: "Commentary references export controls but names no valid principal.",
          sourceName: "Reuters",
        }),
      ],
      { topicName: "Politics" },
    );

    expect(intelligence.entities).not.toContain("She");
  });

  it("keeps defense and political stories out of default equity language", () => {
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
    const political = buildEventIntelligence(
      [
        createArticle({
          title: "Trump Urges Extending Foreign Surveillance Powers",
          summaryText: "The push could reignite debate over executive authority and oversight.",
          sourceName: "Reuters",
        }),
      ],
      { topicName: "Politics" },
    );

    expect(defense.eventType).toBe("defense");
    expect(defense.affectedMarkets).not.toContain("equities");
    expect(political.eventType).toBe("political");
    expect(political.affectedMarkets).not.toContain("technology");
  });

  it("differentiates early funding, IPO, and data-report company events", () => {
    const funding = buildEventIntelligence(
      [
        createArticle({
          title: "InsightFinder raises $15M to help companies monitor AI agents",
          summaryText: "The startup raised funding to expand its AI reliability platform.",
          sourceName: "TechCrunch",
        }),
      ],
      { topicName: "Tech" },
    );
    const ipo = buildEventIntelligence(
      [
        createArticle({
          title: "Madison Air files for IPO",
          summaryText: "The filing gives investors an early look at the HVAC supplier's growth plans.",
          sourceName: "Reuters",
        }),
      ],
      { topicName: "Business" },
    );
    const dataReport = buildEventIntelligence(
      [
        createArticle({
          title: "Adobe says AI retail traffic rose 393% in Q1",
          summaryText: "The company says AI traffic growth is lifting revenue expectations for retailers.",
          sourceName: "Reuters",
        }),
      ],
      { topicName: "Tech" },
    );

    expect(funding.eventType).toBe("early_stage_funding");
    expect(funding.affectedMarkets).toContain("capital formation");
    expect(ipo.eventType).toBe("large_ipo");
    expect(ipo.affectedMarkets).toContain("ipo demand");
    expect(dataReport.eventType).toBe("data_report");
    expect(dataReport.affectedMarkets).toContain("demand");
  });

  it("blocks strong labels for single-source stories", () => {
    expect(
      getSignalStrength({
        eventType: "policy_regulation",
        affectedMarkets: ["policy-sensitive sectors"],
        sourceDiversity: 1,
        articleCount: 1,
        rankingScore: 78,
        topics: ["politics"],
        sourceNames: ["Reuters"],
        recencyScore: 90,
        velocityScore: 60,
        confidenceScore: 70,
      }),
    ).toBe("moderate");
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
