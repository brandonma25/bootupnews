import { describe, expect, it, vi } from "vitest";

import {
  getActiveSourceRegistry,
  getCanonicalSourceMetadata,
  getClusteringSupportAdapters,
  getConnectionSupports,
  getDiversitySupports,
  getDonorModule,
  getDonorRegistrySnapshot,
  getRankingFeatureProviders,
  getSourceRegistrySnapshot,
} from "@/adapters/donors";
import type { StoryCluster } from "@/lib/models/signal-cluster";
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
    expect(registry.find((entry) => entry.donor === "after_market_agent")?.contractStates.connection).toBe("active");
    expect(registry.find((entry) => entry.donor === "fns")?.contractStates.ranking).toBe("active");
    expect(registry.find((entry) => entry.donor === "horizon")?.contractStates.enrichment).toBe("active");
    expect(registry.find((entry) => entry.donor === "after_market_agent")?.clusteringCapabilities?.provider).toBe("after_market_agent");
    expect(registry.find((entry) => entry.donor === "after_market_agent")?.connectionCapabilities?.provider).toBe("after_market_agent");
    expect(registry.find((entry) => entry.donor === "fns")?.diversitySupportAvailable).toBe(true);
    expect(registry.find((entry) => entry.donor === "fns")?.rankingFeatureSupport?.provider).toBe("fns");
    expect(registry.find((entry) => entry.donor === "horizon")?.enrichmentCapabilities?.provider).toBe("horizon");
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
    expect(fetchedItems[0]?.sourceId).toBe("openclaw-the-verge");
    expect(fetchedItems[0]?.sourceMetadata.sourceClass).toBe("specialist_press");
    expect(fetchedItems[0]?.sourceMetadata.topic).toBe("Tech");
    expect(fetchedItems[0]?.sourceMetadata.trustTier).toBe("tier_2");
  });

  it("maps donor-derived ranking features into canonical source credibility data", () => {
    const providers = getRankingFeatureProviders();
    const provider = providers.find((entry) => entry.donor === "fns")?.provider;
    const cluster: StoryCluster = {
      cluster_id: "cluster-1",
      articles: [createArticle()],
      representative_article: createArticle(),
      topic_keywords: ["policy", "market", "impact"],
      cluster_size: 1,
      cluster_debug: {
        provider: "after_market_agent",
        clustering_capabilities: ["title_overlap"],
        candidate_snapshots: [],
        merge_decisions: [],
        prevented_merge_count: 0,
        representative_selection_reason: "only article",
        representative_scores: [{ article_id: "article-1", score: 1, reasons: ["only article"] }],
        diversity_support_available: true,
      },
    };

    expect(provider).toBeDefined();
    expect(provider!.getKnownSources().map((entry) => entry.source)).toContain("Associated Press");
    expect(provider!.describeFeatureSupport().supportedFeatures).toContain("source_credibility");
    expect(provider!.describeFeatureSupport().supportedFeatures).toContain("structural_impact");
    const features = provider!.mapClusterToRankingFeatures(cluster, [cluster]);
    expect(features.source_credibility).toBe(88);
    expect(features.structural_impact).toBeGreaterThan(0);
    expect(features.actionability_or_decision_value).toBeGreaterThan(0);
    expect(getCanonicalSourceMetadata().map((entry) => entry.source)).toContain("Reuters World");
  });

  it("boosts structural features for institutional and public-interest signal patterns", () => {
    const provider = getRankingFeatureProviders().find((entry) => entry.donor === "fns")?.provider;
    const baselineCluster: StoryCluster = {
      cluster_id: "cluster-baseline",
      articles: [createArticle()],
      representative_article: createArticle(),
      topic_keywords: ["policy", "market", "impact"],
      cluster_size: 1,
      cluster_debug: {
        provider: "after_market_agent",
        clustering_capabilities: ["title_overlap"],
        candidate_snapshots: [],
        merge_decisions: [],
        prevented_merge_count: 0,
        representative_selection_reason: "only article",
        representative_scores: [{ article_id: "article-1", score: 1, reasons: ["only article"] }],
        diversity_support_available: true,
      },
    };
    const publicInterestCluster: StoryCluster = {
      ...baselineCluster,
      cluster_id: "cluster-public-interest",
      representative_article: createArticle({
        title: "Purdue settlement victims face accountability deadline",
        content: "The Purdue settlement leaves opioid victims facing legal accountability and restitution questions.",
        keywords: ["purdue", "settlement", "victims", "accountability"],
      }),
      articles: [
        createArticle({
          title: "Purdue settlement victims face accountability deadline",
          content: "The Purdue settlement leaves opioid victims facing legal accountability and restitution questions.",
          keywords: ["purdue", "settlement", "victims", "accountability"],
        }),
      ],
      topic_keywords: ["purdue settlement", "opioid victims", "legal accountability"],
    };

    expect(provider).toBeDefined();
    const baselineFeatures = provider!.mapClusterToRankingFeatures(baselineCluster, [baselineCluster]);
    const calibratedFeatures = provider!.mapClusterToRankingFeatures(publicInterestCluster, [publicInterestCluster]);

    expect(calibratedFeatures.structural_impact).toBeGreaterThan(baselineFeatures.structural_impact ?? 0);
    expect(calibratedFeatures.downstream_consequence).toBeGreaterThan(baselineFeatures.downstream_consequence ?? 0);
    expect(calibratedFeatures.persistence_or_endurance).toBeGreaterThan(baselineFeatures.persistence_or_endurance ?? 0);
  });

  it("exposes a source registry with donor ownership, trust tier, and active status", () => {
    const sourceRegistry = getSourceRegistrySnapshot();
    const activeSources = getActiveSourceRegistry();

    expect(sourceRegistry.some((source) => source.sourceId === "openclaw-the-verge" && source.donor === "openclaw")).toBe(true);
    expect(sourceRegistry.some((source) => source.sourceId === "horizon-reuters-world" && source.donor === "horizon")).toBe(true);
    expect(sourceRegistry.some((source) => source.trustTier === "tier_1" && source.provenance === "aggregated_wire")).toBe(true);
    expect(activeSources.every((source) => source.status === "active")).toBe(true);
  });

  it("exposes after-market-agent clustering support and future-ready FNS diversity support", () => {
    const clusteringSupport = getClusteringSupportAdapters().find((entry) => entry.donor === "after_market_agent");
    const connectionSupport = getConnectionSupports().find((entry) => entry.donor === "after_market_agent");
    const diversitySupport = getDiversitySupports().find((entry) => entry.donor === "fns");
    const cluster: StoryCluster = {
      cluster_id: "cluster-1",
      articles: [createArticle()],
      representative_article: createArticle(),
      topic_keywords: ["policy", "market", "impact"],
      cluster_size: 1,
      cluster_debug: {
        provider: "after_market_agent",
        clustering_capabilities: ["title_overlap"],
        candidate_snapshots: [],
        merge_decisions: [],
        prevented_merge_count: 0,
        representative_selection_reason: "only article",
        representative_scores: [{ article_id: "article-1", score: 1, reasons: ["only article"] }],
        diversity_support_available: true,
      },
    };

    expect(clusteringSupport).toBeDefined();
    expect(connectionSupport?.support.describeCapabilities().supportedFields).toContain("what_led_to_this");
    expect(
      connectionSupport?.support.buildConnectionLayer({
        title: "Federal Reserve signals rates will stay elevated",
        topicName: "Finance",
        summary: "Markets are repricing after fresh Federal Reserve guidance.",
        eventType: "policy_regulation",
        affectedMarkets: ["rates", "equities"],
        topics: ["finance", "policy"],
        entities: ["Federal Reserve"],
        keywords: ["rates", "inflation", "policy"],
        signalStrength: "strong",
        confidenceScore: 74,
        sourceCount: 2,
        signalRole: "core",
        rankingFeatures: {
          structural_impact: 82,
          downstream_consequence: 74,
          cross_domain_relevance: 70,
          actionability_or_decision_value: 72,
          persistence_or_endurance: 71,
        },
      }).packet.what_it_connects_to.toLowerCase(),
    ).toContain("borrowing costs");
    expect(clusteringSupport!.support.describeCapabilities().similaritySignals).toContain("source_confirmation");
    expect(diversitySupport?.support.available).toBe(true);
    expect(diversitySupport?.support.evaluateDiversityAdjustment([
      {
        cluster,
        features: {
          source_credibility: 88,
          trust_tier: 90,
          source_confirmation: 50,
          recency: 80,
          urgency: 80,
          novelty: 70,
          reinforcement: 68,
          cluster_size: 1,
          representative_quality: 72,
          structural_impact: 72,
          downstream_consequence: 70,
          actor_significance: 74,
          cross_domain_relevance: 66,
          actionability_or_decision_value: 71,
          persistence_or_endurance: 69,
        },
        baseScore: 80,
      },
    ])[0]?.action).toBe("none");
  });

  it("exposes Horizon as an active but safe schema-bound enrichment boundary", () => {
    const horizon = getDonorModule("horizon");

    expect(horizon?.enrichmentSupport?.enabled).toBe(true);
    expect(horizon?.enrichmentSupport?.describeCapabilities().schema_safe).toBe(true);
    expect(horizon?.enrichmentSupport?.describeCapabilities().output_fields).toContain("connection_layer");
    expect(horizon?.enrichmentSupport?.getStructuredEnrichment({
      cluster_id: "cluster-1",
      title: "Policy shift",
      summary: "Policy shift summary",
      what_to_watch: "Watch for confirmation.",
      why_it_matters: "It matters because policy expectations are changing.",
      connection_layer: {
        what_led_to_this: "It appears to follow earlier rate pressure.",
        what_it_connects_to: "It connects to borrowing costs and market pricing.",
        connection_confidence: "medium",
        connection_mode: "deterministic",
        connection_evidence_summary: "Built from macro terms and source confirmation.",
        connection_unknowns: [],
      },
      source_count: 2,
      material_ranking_features: ["structural_impact", "source_confirmation"],
      unknowns: [],
    }).status).toBe("skipped");
  });
});
