import { describe, expect, it, vi } from "vitest";

import {
  getCanonicalSourceMetadata,
  getDonorModule,
  getDonorRegistrySnapshot,
  getRankingFeatureProviders,
} from "@/adapters/donors";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import type { NormalizedArticle } from "@/lib/models/normalized-article";

function createArticle(overrides: Partial<NormalizedArticle> = {}): NormalizedArticle {
  return {
    id: "article-1",
    title: "Associated Press reports major policy shift",
    source: "Associated Press",
    url: "https://example.com/article-1",
    published_at: "2026-04-18T12:00:00.000Z",
    content: "Associated Press reports a major policy shift with broad market impact.",
    entities: ["Associated Press"],
    normalized_entities: ["associated press"],
    keywords: ["policy", "market", "impact"],
    title_tokens: ["associated", "press", "reports", "major", "policy", "shift"],
    content_tokens: ["associated", "press", "reports", "major", "policy", "shift", "market", "impact"],
    ...overrides,
  };
}

describe("donor registry", () => {
  it("formalizes all donor families with contract states", () => {
    const registry = getDonorRegistrySnapshot();

    expect(registry.map((entry) => entry.donor)).toEqual([
      "openclaw",
      "after_market_agent",
      "fns",
      "horizon",
    ]);
    expect(registry.find((entry) => entry.donor === "openclaw")?.contractStates.ingestion).toBe("active");
    expect(registry.find((entry) => entry.donor === "after_market_agent")?.contractStates.clustering).toBe("active");
    expect(registry.find((entry) => entry.donor === "fns")?.contractStates.ranking).toBe("active");
    expect(registry.find((entry) => entry.donor === "horizon")?.contractStates.enrichment).toBe("future_ready");
  });

  it("normalizes donor feed metadata through the canonical ingestion contract", async () => {
    const openclaw = getDonorModule("openclaw");

    expect(openclaw).toBeDefined();

    const fetchFeed = vi.fn(async () => [
      {
        title: "New chipset launch",
        url: "https://example.com/chipset",
        summaryText: "A new chipset launch was announced.",
        contentText: "A new chipset launch was announced with market implications.",
        sourceName: "The Verge",
        publishedAt: "2026-04-18T10:00:00.000Z",
      },
    ]);

    const fetchedItems = await openclaw!.ingestionAdapter.fetchItems([openclaw!.feeds[0]], {
      fetchFeed,
      timeoutMs: 4500,
      retryCount: 1,
    });

    expect(fetchFeed).toHaveBeenCalledTimes(1);
    expect(fetchedItems[0]?.donor).toBe("openclaw");
    expect(fetchedItems[0]?.sourceMetadata.sourceClass).toBe("specialist_press");
    expect(fetchedItems[0]?.sourceMetadata.topic).toBe("Tech");
  });

  it("maps donor-derived ranking features into canonical source credibility data", () => {
    const providers = getRankingFeatureProviders();
    const provider = providers.find((entry) => entry.donor === "fns")?.provider;
    const cluster: SignalCluster = {
      cluster_id: "cluster-1",
      articles: [createArticle()],
      representative_article: createArticle(),
      topic_keywords: ["policy", "market", "impact"],
      cluster_size: 1,
      cluster_debug: {
        merge_decisions: [],
        prevented_merge_count: 0,
        representative_selection_reason: "only article",
        representative_scores: [{ article_id: "article-1", score: 1, reasons: ["only article"] }],
      },
    };

    expect(provider).toBeDefined();
    expect(provider!.getKnownSources().map((entry) => entry.source)).toContain("Associated Press");
    expect(provider!.mapClusterFeatures(cluster).credibilityWeights).toContain(88);
    expect(getCanonicalSourceMetadata().map((entry) => entry.source)).toContain("Reuters World");
  });
});
