import { describe, expect, it } from "vitest";

import { getRankingFeatureProviders } from "@/adapters/donors";

/**
 * PRD-38 follow-up — business/markets importance lift (the magnitude-gated boost).
 *
 * Same harness contract as the conflict/legislation tests: drive the REAL
 * provider + the event_importance blend, with the ≥52 core gate as the reference
 * line. Genuine market-scale business events must clear it; routine business PR
 * (small rounds, minor earnings, product launches, bare mega-cap chatter) must
 * stay below it — the magnitude gate is the filler firewall.
 */
const provider = getRankingFeatureProviders()[0]!.provider;
const CORE_GATE = 52;

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

function importance(input: { title: string; content?: string; entities?: string[] }): number {
  const entities = input.entities ?? [];
  const article = {
    id: "a1",
    title: input.title,
    content: input.content ?? "",
    url: "https://example.com/markets/story",
    source: "Example Wire",
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

describe("PRD-38 business/markets — lifts market-scale events over the ≥52 gate", () => {
  it("lifts a mega IPO with a trillion/billion-dollar figure", () => {
    expect(importance({ title: "SpaceX pitches investors $1.78tn valuation in historic IPO", entities: ["spacex"] }))
      .toBeGreaterThanOrEqual(CORE_GATE);
    expect(importance({ title: "Quantinuum raises $1.68 billion in IPO" })).toBeGreaterThanOrEqual(CORE_GATE);
  });

  it("lifts a mega-cap earnings rout / wipeout", () => {
    expect(importance({ title: "Broadcom suffers $300bn rout as revenue outlook disappoints", entities: ["broadcom"] }))
      .toBeGreaterThanOrEqual(CORE_GATE);
  });

  it("lifts a >= $500M funding round", () => {
    expect(importance({ title: "Ramp raises $750M at $44B valuation as investors pile in" }))
      .toBeGreaterThanOrEqual(CORE_GATE);
  });

  it("lifts a mega-cap structural action without a dollar figure (spinoff)", () => {
    expect(importance({ title: "Honeywell Aerospace readies for its stand-alone spinoff debut", entities: ["honeywell"] }))
      .toBeGreaterThanOrEqual(CORE_GATE);
  });
});

describe("PRD-38 business/markets — magnitude gate keeps routine business filler < 52", () => {
  it("does NOT lift a small funding round (< $500M)", () => {
    expect(importance({ title: "Startup raises $20M Series A to expand its app" })).toBeLessThan(CORE_GATE);
    expect(importance({ title: "Quick-commerce FirstClub doubles valuation to $255M in nine months" })).toBeLessThan(CORE_GATE);
  });

  it("does NOT lift a routine product launch / PR", () => {
    expect(importance({ title: "Acme unveils a new app with refreshed design", entities: ["acme"] })).toBeLessThan(CORE_GATE);
    expect(importance({ title: "Nintendo confirms it will sell a new Switch 2", entities: ["nintendo"] })).toBeLessThan(CORE_GATE);
  });

  it("does NOT lift bare mega-cap chatter without a major action", () => {
    expect(importance({ title: "Apple stock rises 2% in afternoon trading", entities: ["apple"] })).toBeLessThan(CORE_GATE);
    expect(importance({ title: "Analyst upgrades Tesla on delivery hopes", entities: ["tesla"] })).toBeLessThan(CORE_GATE);
  });

  it("does NOT lift a mid-cap earnings line without scale (no mega-cap, no big $)", () => {
    expect(importance({ title: "Regional retailer posts quarterly results in line with expectations" })).toBeLessThan(CORE_GATE);
  });
});
