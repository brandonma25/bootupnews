import { describe, expect, it } from "vitest";

import { assembleExplanationPacket } from "@/lib/explanation-support";
import type { RankingDebug } from "@/lib/integration/subsystem-contracts";
import type { StoryCluster } from "@/lib/models/signal-cluster";
import type { EventIntelligence } from "@/lib/types";

function createIntelligence(overrides: Partial<EventIntelligence> = {}): EventIntelligence {
  return {
    id: "intel-1",
    title: "Federal Reserve signals a tighter policy path",
    summary: "Markets are repricing after fresh Federal Reserve guidance on rates.",
    primaryChange: "Federal Reserve signals a tighter policy path",
    entities: ["Federal Reserve"],
    sourceNames: ["Reuters World", "Associated Press"],
    eventType: "policy_regulation",
    primaryImpact: "Rate expectations are moving higher.",
    affectedMarkets: ["rates", "equities"],
    timeHorizon: "medium",
    signalStrength: "strong",
    keyEntities: ["Federal Reserve"],
    topics: ["finance", "policy"],
    signals: {
      articleCount: 3,
      sourceDiversity: 2,
      recencyScore: 84,
      velocityScore: 72,
    },
    rankingScore: 82,
    rankingReason: "Multiple credible sources converged on a policy-relevant development.",
    confidenceScore: 74,
    isHighSignal: true,
    createdAt: "2026-04-19T00:00:00.000Z",
    ...overrides,
  };
}

function createCluster(): StoryCluster {
  const article = {
    id: "article-1",
    title: "Federal Reserve signals a tighter policy path",
    source: "Reuters World",
    url: "https://example.com/story",
    published_at: "2026-04-19T00:00:00.000Z",
    content: "Markets are repricing after fresh Federal Reserve guidance on rates.",
    entities: ["Federal Reserve"],
    normalized_entities: ["federal reserve"],
    keywords: ["policy", "rates", "markets"],
    title_tokens: ["federal", "reserve", "signals", "tighter", "policy", "path"],
    content_tokens: ["markets", "repricing", "federal", "reserve", "guidance", "rates"],
    source_metadata: {
      sourceId: "horizon-reuters-world",
      donor: "horizon",
      source: "Reuters World",
      homepageUrl: "https://www.reuters.com/world/",
      topic: "World" as const,
      credibility: 90,
      reliability: 0.91,
      sourceClass: "global_wire" as const,
      trustTier: "tier_1" as const,
      provenance: "aggregated_wire" as const,
      status: "active" as const,
      availability: "default" as const,
    },
  };

  return {
    cluster_id: "cluster-1",
    articles: [article],
    representative_article: article,
    topic_keywords: ["policy", "rates", "markets"],
    cluster_size: 1,
    cluster_debug: {
      provider: "after_market_agent",
      clustering_capabilities: ["title_overlap"],
      candidate_snapshots: [],
      merge_decisions: [],
      prevented_merge_count: 0,
      representative_selection_reason: "Selected only article.",
      representative_scores: [{ article_id: "article-1", score: 1, reasons: ["only article"] }],
      diversity_support_available: true,
    },
  };
}

function createRankingDebug(): RankingDebug {
  return {
    provider: "fns",
    features: {
      source_credibility: 90,
      trust_tier: 92,
      source_confirmation: 48,
      recency: 84,
      urgency: 84,
      novelty: 68,
      reinforcement: 70,
      cluster_size: 1,
      representative_quality: 76,
      structural_impact: 80,
      downstream_consequence: 74,
      actor_significance: 82,
      cross_domain_relevance: 70,
      actionability_or_decision_value: 75,
      persistence_or_endurance: 72,
    },
    feature_weights: {
      credibility: 0.3,
      novelty: 0.25,
      urgency: 0.25,
      reinforcement: 0.2,
    },
    grouped_scores: {
      trust_timeliness: 82,
      event_importance: 77,
      support_and_novelty: 70,
    },
    diversity: {
      cluster_id: "cluster-1",
      action: "none",
      scoreDelta: 0,
      reason: "No diversity penalty applied.",
    },
    explanation: "Ranked high due to strong structural importance and multiple confirmations.",
    active_features: [
      "source_credibility",
      "trust_tier",
      "source_confirmation",
      "recency",
      "urgency",
      "novelty",
      "reinforcement",
      "representative_quality",
      "structural_impact",
      "downstream_consequence",
      "actor_significance",
      "cross_domain_relevance",
      "actionability_or_decision_value",
      "persistence_or_endurance",
    ],
    notes: ["ranking test"],
  };
}

describe("assembleExplanationPacket", () => {
  it("builds a deterministic explanation packet grounded in ranking and cluster inputs", () => {
    const result = assembleExplanationPacket({
      title: "Federal Reserve signals a tighter policy path",
      topicName: "Finance",
      intelligence: createIntelligence(),
      sourceNames: ["Reuters World", "Associated Press"],
      sourceCount: 2,
      whyItMatters: "This matters because policy expectations are changing across rates and risk assets.",
      rankingExplanation: "Ranked high due to strong structural importance and multiple confirmations.",
      rankingSignals: ["Multiple credible sources converged on the same development."],
      rankingDebug: createRankingDebug(),
      cluster: createCluster(),
    });

    expect(result.packet.explanation_mode).toBe("deterministic");
    expect(result.packet.signal_role).toBe("core");
    expect(result.packet.why_this_ranks_here).toContain("structural importance");
    expect(result.packet.why_this_ranks_here.toLowerCase()).toContain("top signal");
    expect(result.packet.connection_layer?.what_led_to_this.toLowerCase()).toContain("inflation");
    expect(result.packet.connection_layer?.what_it_connects_to.toLowerCase()).toContain("borrowing costs");
    expect(result.packet.connection_layer?.connection_mode).toBe("deterministic");
    expect(result.packet.citation_support_summary.corroboration).toBe("multi_source");
    expect(result.packet.citation_support_summary.strongest_trust_tier).toBe("tier_1");
    expect(result.trustDebug.material_ranking_features).toContain("structural_impact");
    expect(result.trustDebug.connection.provider).toBe("after_market_agent");
    expect(result.trustDebug.connection.status).toBe("available");
    expect(result.trustDebug.enrichment.status).toBe("skipped");
  });

  it("falls back safely when ranking debug is unavailable", () => {
    const result = assembleExplanationPacket({
      title: "Federal Reserve signals a tighter policy path",
      topicName: "Finance",
      intelligence: createIntelligence({ confidenceScore: 42, signalStrength: "moderate" }),
      sourceNames: ["Reuters World"],
      sourceCount: 1,
      whyItMatters: "This matters because the first report could change market expectations if it is confirmed.",
      rankingSignals: ["Still early coverage with limited source confirmation."],
    });

    expect(result.packet.explanation_mode).toBe("fallback");
    expect(result.packet.signal_role).toBe("watch");
    expect(result.packet.confidence).toBe("low");
    expect(result.packet.connection_layer?.connection_mode).toBe("fallback");
    expect(result.packet.connection_layer?.what_led_to_this.toLowerCase()).toContain("too early");
    expect(result.packet.unknowns.join(" ")).toContain("Cross-source confirmation");
    expect(result.trustDebug.deterministic_path_reason).toContain("fallback");
    expect(result.trustDebug.connection.status).toBe("fallback");
  });
});
