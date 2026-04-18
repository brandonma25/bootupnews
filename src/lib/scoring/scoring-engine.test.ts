import { describe, expect, it } from "vitest";

import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import { rankSignalClusters } from "@/lib/scoring/scoring-engine";

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

function createCluster(clusterId: string, title: string, keywords: string[], entities: string[]): SignalCluster {
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

describe("rankSignalClusters", () => {
  it("builds canonical ranking feature sets with FNS ownership", () => {
    const clusters = [createCluster("cluster-1", "Fed signals rates will stay elevated", ["finance", "rates", "market"], ["Federal Reserve"])];
    const ranked = rankSignalClusters(clusters)[0];

    expect(ranked?.ranked.ranking_debug.provider).toBe("fns");
    expect(ranked?.ranked.ranking_debug.features.source_credibility).toBeGreaterThan(0);
    expect(ranked?.ranked.ranking_debug.features.trust_tier).toBeGreaterThan(0);
    expect(ranked?.ranked.ranking_debug.features.source_confirmation).toBeGreaterThanOrEqual(0);
    expect(ranked?.scoringLog.diversity_action).toBe("none");
  });

  it("applies deterministic diversity penalties to near-redundant ranked outputs", () => {
    const clusters = [
      createCluster("cluster-1", "Fed signals rates will stay elevated", ["finance", "rates", "market"], ["Federal Reserve"]),
      createCluster("cluster-2", "Banks reprice after Fed guidance", ["finance", "rates", "market"], ["Federal Reserve"]),
    ];

    const ranked = rankSignalClusters(clusters);

    expect(ranked).toHaveLength(2);
    expect(ranked[1]?.ranked.ranking_debug.diversity.action).toBe("penalize");
    expect(ranked[1]?.ranked.ranking_debug.diversity.scoreDelta).toBeLessThan(0);
    expect(ranked[1]?.scoringLog.diversity_reason).toContain("similar event family");
  });
});
