import { describe, expect, it } from "vitest";

import type { SourceDefinition } from "@/lib/integration/subsystem-contracts";
import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { StoryCluster } from "@/lib/models/signal-cluster";
import type { RankedStoryClusterResult } from "@/lib/scoring/scoring-engine";
import { buildArticleSourceAccessibility } from "@/lib/source-accessibility";
import { evaluateSignalSelectionEligibility } from "@/lib/signal-selection-eligibility";
import type { BriefingItem } from "@/lib/types";

const fullText = "A central bank liquidity rule changes how banks fund short-term positions and how markets price stress. ".repeat(18);

function source(overrides: Partial<SourceDefinition> = {}): SourceDefinition {
  return {
    sourceId: "source-reuters-business",
    donor: "openclaw",
    source: "Reuters Business",
    homepageUrl: "https://www.reuters.com/business/",
    topic: "Finance",
    credibility: 90,
    reliability: 0.9,
    sourceClass: "business_press",
    trustTier: "tier_1",
    provenance: "primary_reporting",
    status: "active",
    availability: "custom",
    sourceRole: "primary_authoritative",
    publicEligible: true,
    suppliedByManifest: true,
    fetch: {
      feedUrl: "https://www.reuters.com/business/rss",
    },
    adapterOwner: "openclaw",
    ...overrides,
  };
}

function article(overrides: {
  sourceDefinition?: SourceDefinition;
  contentText?: string;
  summaryText?: string;
  url?: string;
} = {}): NormalizedArticle {
  const sourceDefinition = overrides.sourceDefinition ?? source();
  const feedArticle = {
    title: "Central bank changes liquidity facility rules",
    url: overrides.url ?? "https://www.reuters.com/business/liquidity",
    summaryText: overrides.summaryText ?? fullText.slice(0, 220),
    contentText: overrides.contentText ?? fullText,
    sourceName: sourceDefinition.source,
    publishedAt: "2026-04-27T08:00:00.000Z",
    extractionMethod: overrides.contentText === "" ? "rss_summary" as const : "rss_content" as const,
  };

  return {
    id: sourceDefinition.sourceId,
    title: feedArticle.title,
    source: sourceDefinition.source,
    url: feedArticle.url,
    published_at: feedArticle.publishedAt,
    content: feedArticle.contentText || feedArticle.summaryText,
    entities: ["Central Bank"],
    normalized_entities: ["central bank"],
    keywords: ["central", "bank", "liquidity", "facility"],
    title_tokens: ["central", "bank", "liquidity"],
    content_tokens: ["liquidity", "facility", "funding"],
    source_metadata: sourceDefinition,
    source_accessibility: buildArticleSourceAccessibility(feedArticle, sourceDefinition),
  };
}

function cluster(articles: NormalizedArticle[]): StoryCluster {
  return {
    cluster_id: "cluster-liquidity",
    articles,
    representative_article: articles[0]!,
    topic_keywords: ["central bank", "liquidity", "funding"],
    cluster_size: articles.length,
    cluster_debug: {
      provider: "test",
      clustering_capabilities: [],
      candidate_snapshots: [],
      merge_decisions: [],
      prevented_merge_count: 0,
      representative_selection_reason: "test representative",
      representative_scores: [],
      diversity_support_available: true,
    },
  };
}

function briefingItem(overrides: Partial<BriefingItem> = {}): BriefingItem {
  return {
    id: "generated-cluster-liquidity",
    topicId: "topic-finance",
    topicName: "Finance",
    title: "Central bank changes liquidity facility rules",
    whatHappened: "The central bank changed liquidity facility rules for market participants.",
    keyPoints: ["Point one", "Point two", "Point three"],
    whyItMatters:
      "Liquidity facility changes can alter bank funding behavior and market stress pricing. That makes the rule shift a financial-structure signal.",
    sources: [{ title: "Reuters Business", url: "https://www.reuters.com/business/liquidity" }],
    sourceCount: 1,
    estimatedMinutes: 4,
    read: false,
    priority: "normal",
    matchedKeywords: ["central bank", "liquidity"],
    importanceScore: 86,
    eventIntelligence: {
      id: "intel-liquidity",
      title: "Central bank changes liquidity facility rules",
      summary: "The rule changes how banks manage funding stress.",
      primaryChange: "Central bank changed liquidity rules",
      entities: ["Central Bank"],
      sourceNames: ["Reuters Business"],
      eventType: "macro_market_move",
      primaryImpact: "Bank funding behavior changes",
      affectedMarkets: ["rates", "banks"],
      timeHorizon: "medium",
      signalStrength: "strong",
      keyEntities: ["Central Bank"],
      topics: ["finance"],
      signals: {
        articleCount: 1,
        sourceDiversity: 1,
        recencyScore: 70,
        velocityScore: 54,
      },
      rankingScore: 86,
      rankingReason: "Structural funding signal",
      confidenceScore: 80,
      isHighSignal: true,
      createdAt: "2026-04-27T08:00:00.000Z",
    },
    ...overrides,
  };
}

function ranked(score = 86): RankedStoryClusterResult["ranked"] {
  return {
    cluster_id: "cluster-liquidity",
    score,
    score_breakdown: {
      credibility: 90,
      novelty: 72,
      urgency: 70,
      reinforcement: 64,
    },
    ranking_debug: {
      provider: "fns",
      features: {
        source_credibility: 90,
        trust_tier: 92,
        source_confirmation: 24,
        recency: 70,
        urgency: 70,
        novelty: 72,
        reinforcement: 64,
        cluster_size: 1,
        representative_quality: 80,
        structural_impact: 82,
        downstream_consequence: 78,
        actor_significance: 76,
        cross_domain_relevance: 70,
        actionability_or_decision_value: 68,
        persistence_or_endurance: 64,
      },
      feature_weights: {
        credibility: 0.3,
        novelty: 0.25,
        urgency: 0.25,
        reinforcement: 0.2,
      },
      grouped_scores: {
        trust_timeliness: 84,
        event_importance: 80,
        support_and_novelty: 68,
      },
      diversity: {
        cluster_id: "cluster-liquidity",
        action: "none",
        scoreDelta: 0,
        reason: "none",
      },
      explanation: "High-authority structural finance signal.",
      active_features: [
        "source_credibility",
        "trust_tier",
        "structural_impact",
        "downstream_consequence",
      ],
      notes: [],
    },
  };
}

describe("signal selection source-accessibility eligibility", () => {
  it("keeps a full-text authoritative structural signal Core-eligible", () => {
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem(),
      cluster: cluster([article()]),
      ranked: ranked(),
      articleFilterEvaluation: {
        id: "source-reuters-business",
        sourceTier: "tier1",
        headlineQuality: "strong",
        eventType: "macro_market_move",
        filterDecision: "pass",
        filterReasons: ["passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).toBe("core_signal_eligible");
    expect(eligibility.contentAccessibility).toBe("full_text_available");
  });

  it("excludes a validator-passing but metadata-only tier1 item from Core", () => {
    const metadataOnlyArticle = article({
      contentText: "",
      summaryText: "Central bank changes liquidity facility rules",
    });
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem({
        whyItMatters:
          "Liquidity facility changes can alter bank funding behavior and market stress pricing. That makes the rule shift a financial-structure signal.",
      }),
      cluster: cluster([metadataOnlyArticle]),
      ranked: ranked(),
      articleFilterEvaluation: {
        id: "source-reuters-business",
        sourceTier: "tier1",
        headlineQuality: "strong",
        eventType: "macro_market_move",
        filterDecision: "pass",
        filterReasons: ["passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).toBe("exclude_from_public_candidates");
    expect(eligibility.reasons).toContain("metadata_only");
    expect(eligibility.coreBlockingReasons).toContain("metadata_only");
  });

  it("allows structurally valid but copy-failed stories to remain selection-eligible for review", () => {
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem({
        whyItMatters: "This matters because of rates, demand, or risk rather than.",
      }),
      cluster: cluster([article()]),
      ranked: ranked(),
      articleFilterEvaluation: {
        id: "source-reuters-business",
        sourceTier: "tier1",
        headlineQuality: "strong",
        eventType: "macro_market_move",
        filterDecision: "pass",
        filterReasons: ["passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).toBe("core_signal_eligible");
  });
});
