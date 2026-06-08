import { describe, expect, it } from "vitest";

import { getRankingFeatureProviders } from "@/adapters/donors";

/**
 * PRD-38 — event_importance recalibration (the importance feature-provider).
 *
 * These tests pin the recalibration's behavioural contract on the SAME path prod
 * uses: getRankingFeatureProviders()[0].provider.mapClusterToRankingFeatures →
 * the event_importance blend (scoring-engine.ts buildGroupedScores, replicated
 * below — a NON-GOAL to change, so it will not drift). The ≥52 core gate is the
 * reference line: genuine interstate-conflict / major-legislation / regulatory
 * actions must clear it; evergreen explainers must fall below it; filler that
 * merely brushes the new vocabulary must NOT cross it.
 */
const provider = getRankingFeatureProviders()[0]!.provider;
const CORE_GATE = 52;

// scoring-engine.ts:215-224 — event_importance blend (unchanged by this PR).
function importanceOf(f: Record<string, number>): number {
  return Number(
    (
      f.structural_impact * 0.24 +
      f.downstream_consequence * 0.2 +
      f.actor_significance * 0.18 +
      f.cross_domain_relevance * 0.14 +
      f.actionability_or_decision_value * 0.14 +
      f.persistence_or_endurance * 0.1
    ).toFixed(2),
  );
}

function importance(input: {
  title: string;
  content?: string;
  entities?: string[];
  url?: string;
  source?: string;
}): number {
  const entities = input.entities ?? [];
  const article = {
    id: "a1",
    title: input.title,
    content: input.content ?? "",
    url: input.url ?? "https://example.com/story",
    source: input.source ?? "Example Wire",
    keywords: [],
    entities,
    normalized_entities: entities,
    title_tokens: [],
    content_tokens: [],
    published_at: "2026-06-08T00:00:00.000Z",
    source_metadata: undefined,
  };
  const cluster = {
    cluster_id: "c1",
    cluster_size: 1,
    topic_keywords: [],
    representative_article: article,
    articles: [article],
  };
  const f = provider.mapClusterToRankingFeatures(
    cluster as Parameters<typeof provider.mapClusterToRankingFeatures>[0],
    [cluster] as Parameters<typeof provider.mapClusterToRankingFeatures>[1],
  ) as Record<string, number>;
  return importanceOf(f);
}

describe("PRD-38 importance recalibration — lifts genuine importance over the ≥52 gate", () => {
  it("lifts active interstate conflict (missile strikes) above the core gate", () => {
    const imp = importance({
      title: "Iran launches missiles at Israel as ceasefire collapses",
      content: "Air raid sirens sounded as the military intercepted incoming missile barrages.",
      entities: ["iran", "israel"],
    });
    expect(imp).toBeGreaterThanOrEqual(CORE_GATE);
  });

  it("lifts a passed major bill above the core gate (legislative action)", () => {
    const imp = importance({
      title: "Ukraine aid package passes House in bipartisan vote",
      content: "The military assistance and sanctions package passed the House and now goes to the Senate.",
      entities: ["ukraine", "house"],
    });
    expect(imp).toBeGreaterThanOrEqual(CORE_GATE);
  });

  it("lifts a formal regulatory action (Senate hearing on export controls) above the core gate", () => {
    const imp = importance({
      title: "Warren invites Nvidia CEO to Senate hearing on China AI chip export controls",
      content: "The senate hearing will examine chip sales and export controls to China.",
      entities: ["nvidia", "china"],
    });
    expect(imp).toBeGreaterThanOrEqual(CORE_GATE);
  });

  it("adds conflict actors to actor_significance (Israel/Iran now count as significant actors)", () => {
    const withActor = importance({ title: "Israel and Iran trade air strikes", entities: ["israel", "iran"] });
    const withoutActor = importance({ title: "Two neighbours trade air strikes", entities: ["someplace"] });
    expect(withActor).toBeGreaterThan(withoutActor);
  });
});

describe("PRD-38 importance recalibration — pushes evergreen explainers below the gate", () => {
  it("penalises an evergreen-prone feed (SF Fed blog) below the core gate", () => {
    const imp = importance({
      title: "Economic outlook: inflation, policy, rates, and the central bank",
      content: "A research note on monetary policy, interest rates, tariffs, and trade.",
      url: "https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2026/some-letter",
      source: "SF Fed Research and Insights",
      entities: ["federal reserve"],
    });
    expect(imp).toBeLessThan(CORE_GATE);
  });

  it("penalises an explainer-title pattern (Most Read / Countdown) below the core gate", () => {
    const imp = importance({
      title: "Economic Letter Countdown: Most Read Topics on inflation and monetary policy",
      content: "Our most read research on policy, central bank rates, trade, and tariffs.",
      url: "https://example.com/letters/countdown",
      entities: ["federal reserve"],
    });
    expect(imp).toBeLessThan(CORE_GATE);
  });
});

describe("PRD-38 importance recalibration — ZERO filler: the gates reject non-events", () => {
  it("does NOT lift 'trade war' / 'culture war' (no kinetic term, no conflict actor)", () => {
    expect(importance({ title: "Retailers brace for an escalating trade war over tariffs" })).toBeLessThan(CORE_GATE);
    expect(importance({ title: "The latest culture war flares over a streaming show" })).toBeLessThan(CORE_GATE);
  });

  it("does NOT lift a bare chamber mention without a passage event", () => {
    const imp = importance({
      title: "House members keep losing their bids for higher office",
      content: "Nearly 30 House members who were sworn in have launched campaigns; voters are unmoved.",
      entities: ["house", "congress"],
    });
    expect(imp).toBeLessThan(CORE_GATE);
  });

  it("does NOT lift a non-conflict story that merely references a war in passing", () => {
    const imp = importance({
      title: "Trump's next GOP loyalty test: ending the changing of the clocks",
      content: "It's not about the war in Iran or cabinet nominees; the bill concerns daylight saving time.",
      entities: ["trump", "iran"],
    });
    expect(imp).toBeLessThan(CORE_GATE);
  });

  it("leaves a neutral business story unchanged (no new boost fires)", () => {
    const imp = importance({
      title: "Retailer reports quarterly results in line with expectations",
      content: "The company posted revenue and guidance broadly as forecast.",
      entities: ["acme corp"],
    });
    expect(imp).toBeLessThan(CORE_GATE);
  });
});
