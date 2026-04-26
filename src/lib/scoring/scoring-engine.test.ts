import { describe, expect, it } from "vitest";

import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { StoryCluster } from "@/lib/models/signal-cluster";
import { rankStoryClusters } from "@/lib/scoring/scoring-engine";

function createArticle(id: string, overrides: Partial<NormalizedArticle> = {}): NormalizedArticle {
  return {
    id,
    title: "Fed signals rates will stay elevated",
    source: "Reuters World",
    url: `https://example.com/${id}`,
    published_at: "2026-04-19T00:00:00.000Z",
    content: "Markets are repricing after a new Federal Reserve signal.",
    entities: ["Federal Reserve"],
    normalized_entities: ["federal reserve"],
    keywords: ["finance", "rates", "market"],
    title_tokens: ["fed", "signals", "rates", "will", "stay", "elevated"],
    content_tokens: ["markets", "repricing", "federal", "reserve", "signal"],
    source_metadata: {
      sourceId: "horizon-reuters-world",
      donor: "horizon",
      source: "Reuters World",
      homepageUrl: "https://www.reuters.com/world/",
      topic: "World",
      credibility: 90,
      reliability: 0.91,
      sourceClass: "global_wire",
      trustTier: "tier_1",
      provenance: "aggregated_wire",
      status: "active",
      availability: "default",
    },
    ...overrides,
  };
}

function createCluster(clusterId: string, title: string, keywords: string[], entities: string[]): StoryCluster {
  const article = createArticle(`${clusterId}-1`, {
    title,
    entities,
    normalized_entities: entities.map((entity) => entity.toLowerCase()),
    keywords,
    title_tokens: title.toLowerCase().split(/\s+/),
  });

  return {
    cluster_id: clusterId,
    articles: [article],
    representative_article: article,
    topic_keywords: keywords,
    cluster_size: 1,
    cluster_debug: {
      provider: "after_market_agent",
      clustering_capabilities: ["title_overlap", "keyword_overlap"],
      candidate_snapshots: [],
      merge_decisions: [],
      prevented_merge_count: 0,
      representative_selection_reason: "Selected the only article in the cluster.",
      representative_scores: [{ article_id: article.id, score: 1, reasons: ["only article"] }],
      diversity_support_available: true,
    },
  };
}

describe("rankStoryClusters", () => {
  it("builds canonical ranking feature sets with FNS ownership", () => {
    const clusters = [createCluster("cluster-1", "Fed signals rates will stay elevated", ["finance", "rates", "market"], ["Federal Reserve"])];
    const ranked = rankStoryClusters(clusters)[0];

    expect(ranked?.ranked.ranking_debug.provider).toBe("fns");
    expect(ranked?.ranked.ranking_debug.features.source_credibility).toBeGreaterThan(0);
    expect(ranked?.ranked.ranking_debug.features.trust_tier).toBeGreaterThan(0);
    expect(ranked?.ranked.ranking_debug.features.source_confirmation).toBeGreaterThanOrEqual(0);
    expect(ranked?.ranked.ranking_debug.features.structural_impact).toBeGreaterThan(0);
    expect(ranked?.ranked.ranking_debug.grouped_scores.event_importance).toBeGreaterThan(0);
    expect(ranked?.ranked.ranking_debug.active_features).toContain("structural_impact");
    expect(ranked?.scoringLog.diversity_action).toBe("none");
  });

  it("applies deterministic diversity penalties to near-redundant ranked outputs", () => {
    const clusters = [
      createCluster("cluster-1", "Fed signals rates will stay elevated", ["finance", "rates", "market"], ["Federal Reserve"]),
      createCluster("cluster-2", "Banks reprice after Fed guidance", ["finance", "rates", "market"], ["Federal Reserve"]),
    ];

    const ranked = rankStoryClusters(clusters);

    expect(ranked).toHaveLength(2);
    expect(ranked[1]?.ranked.ranking_debug.diversity.action).toBe("penalize");
    expect(ranked[1]?.ranked.ranking_debug.diversity.scoreDelta).toBeLessThan(0);
    expect(ranked[1]?.scoringLog.diversity_reason).toContain("similar event family");
  });

  it("lets a high-consequence event outrank a fresher but trivial item", () => {
    const criticalCluster = createCluster(
      "cluster-critical",
      "Federal Reserve launches emergency liquidity review for major banks",
      ["policy", "liquidity", "banks", "market", "rates", "guidance"],
      ["Federal Reserve"],
    );
    const trivialFreshCluster = createCluster(
      "cluster-trivial",
      "Popular handheld fan launches in new spring colors",
      ["launch", "consumer", "product", "colors"],
      ["Dyson"],
    );

    trivialFreshCluster.representative_article = {
      ...trivialFreshCluster.representative_article,
      published_at: "2026-04-19T06:00:00.000Z",
      content: "The new consumer gadget color update is generating social buzz and fresh coverage.",
      source: "The Verge",
    };
    trivialFreshCluster.articles = [trivialFreshCluster.representative_article];

    const ranked = rankStoryClusters([trivialFreshCluster, criticalCluster]);

    expect(ranked[0]?.cluster.cluster_id).toBe("cluster-critical");
    expect(ranked[0]?.ranked.ranking_debug.grouped_scores.event_importance).toBeGreaterThan(
      ranked[1]?.ranked.ranking_debug.grouped_scores.event_importance ?? 0,
    );
  });

  it("keeps a critical overlapping story visible with only a light diversity penalty", () => {
    const primary = createCluster(
      "cluster-primary",
      "US and China weigh new export controls for advanced chips",
      ["policy", "export", "chips", "trade", "supply chain", "security"],
      ["United States", "China"],
    );
    const adjacentCritical = createCluster(
      "cluster-adjacent",
      "China responds as US export-control review hits chip supply chain",
      ["policy", "export", "chips", "trade", "supply chain", "security"],
      ["United States", "China"],
    );

    const ranked = rankStoryClusters([primary, adjacentCritical]);
    const penalized = ranked.find((entry) => entry.cluster.cluster_id === "cluster-adjacent");

    expect(penalized?.ranked.ranking_debug.diversity.action).toBe("penalize");
    expect(penalized?.ranked.ranking_debug.diversity.scoreDelta).toBeGreaterThanOrEqual(-3);
    expect(penalized?.ranked.ranking_debug.explanation).toContain("stayed visible");
  });
});
