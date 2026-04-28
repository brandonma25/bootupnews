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
  title?: string;
  contentText?: string;
  summaryText?: string;
  url?: string;
} = {}): NormalizedArticle {
  const sourceDefinition = overrides.sourceDefinition ?? source();
  const feedArticle = {
    title: overrides.title ?? "Central bank changes liquidity facility rules",
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

function ranked(
  score = 86,
  overrides: {
    eventImportance?: number;
    structuralImpact?: number;
    downstreamConsequence?: number;
    actorSignificance?: number;
    crossDomainRelevance?: number;
    actionability?: number;
    persistence?: number;
  } = {},
): RankedStoryClusterResult["ranked"] {
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
        structural_impact: overrides.structuralImpact ?? 82,
        downstream_consequence: overrides.downstreamConsequence ?? 78,
        actor_significance: overrides.actorSignificance ?? 76,
        cross_domain_relevance: overrides.crossDomainRelevance ?? 70,
        actionability_or_decision_value: overrides.actionability ?? 68,
        persistence_or_endurance: overrides.persistence ?? 64,
      },
      feature_weights: {
        credibility: 0.3,
        novelty: 0.25,
        urgency: 0.25,
        reinforcement: 0.2,
      },
      grouped_scores: {
        trust_timeliness: 84,
        event_importance: overrides.eventImportance ?? 80,
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

  it("does not label source-substantial public-interest legal accountability as gadget content", () => {
    const publicInterestArticle = article({
      sourceDefinition: source({
        sourceId: "source-propublica-main",
        source: "ProPublica",
        homepageUrl: "https://www.propublica.org",
        trustTier: "tier_1",
        sourceRole: "primary_authoritative",
      }),
      title: "Purdue settlement victims face legal accountability deadline after court review",
      contentText:
        "The Purdue settlement leaves opioid victims facing legal accountability questions after years of court review. ".repeat(20),
    });
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem({
        title: publicInterestArticle.title,
        whatHappened: "The Purdue settlement changed how opioid victims can receive restitution.",
        matchedKeywords: ["Purdue settlement", "opioid victims", "legal accountability"],
      }),
      cluster: cluster([publicInterestArticle]),
      ranked: ranked(56, { eventImportance: 49, structuralImpact: 56, downstreamConsequence: 54 }),
      articleFilterEvaluation: {
        id: "source-propublica-main",
        sourceTier: "tier1",
        headlineQuality: "strong",
        eventType: "public_interest_legal_accountability",
        filterDecision: "pass",
        filterReasons: ["passed_tier1_strong_event", "passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).toBe("context_signal_eligible");
    expect(eligibility.calibratedReasonLabels).toContain("public_interest_legal_accountability");
    expect(eligibility.reasons).not.toContain("weak_gadget_or_review_content");
  });

  it("allows government shutdown agency-capacity stories to become Context", () => {
    const shutdownArticle = article({
      title: "Over 1,000 TSA officers have quit amid shutdown",
      contentText:
        "The shutdown is straining agency capacity as TSA officers quit and airport staffing weakens. ".repeat(20),
    });
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem({
        title: shutdownArticle.title,
        whatHappened: "TSA attrition showed agency capacity strain during the shutdown.",
        matchedKeywords: ["shutdown", "TSA officers", "agency capacity"],
      }),
      cluster: cluster([shutdownArticle]),
      ranked: ranked(56, { eventImportance: 48, structuralImpact: 58, downstreamConsequence: 54 }),
      articleFilterEvaluation: {
        id: "source-politico-congress",
        sourceTier: "tier2",
        headlineQuality: "strong",
        eventType: "government_capacity",
        filterDecision: "pass",
        filterReasons: ["passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).toBe("context_signal_eligible");
    expect(eligibility.calibratedReasonLabels).toContain("institutional_capacity_signal");
  });

  it("keeps ceremonial or low-policy government items out of Core and Context", () => {
    const lowPolicyArticle = article({
      title: "Hill Republicans lack a clear path to get Trump his ballroom",
      contentText:
        "Congressional Republicans discussed a White House ballroom project and political process around a ceremonial venue. ".repeat(20),
    });
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem({
        title: lowPolicyArticle.title,
        whatHappened: "Republicans discussed the political path for a White House ballroom project.",
        matchedKeywords: ["Republicans", "White House", "ballroom"],
      }),
      cluster: cluster([lowPolicyArticle]),
      ranked: ranked(78, { eventImportance: 70, structuralImpact: 78, downstreamConsequence: 68 }),
      articleFilterEvaluation: {
        id: "source-politico-congress",
        sourceTier: "tier2",
        headlineQuality: "strong",
        eventType: "government_capacity",
        filterDecision: "pass",
        filterReasons: ["passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).not.toBe("core_signal_eligible");
    expect(eligibility.tier).not.toBe("context_signal_eligible");
    expect(eligibility.calibratedReasonLabels).toContain("ceremonial_or_low_policy_change");
    expect(eligibility.reasons).toContain("ceremonial_or_low_policy_change");
  });

  it("keeps platform-regulation stories eligible when source-substantial", () => {
    const platformArticle = article({
      title: "EU tells Google to open up AI on Android",
      contentText:
        "European regulators told Google to open AI distribution on Android, changing platform access and market structure. ".repeat(20),
    });
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem({
        title: platformArticle.title,
        whatHappened: "EU regulators pushed Google to open AI distribution on Android.",
        matchedKeywords: ["Android", "AI distribution", "platform regulation"],
      }),
      cluster: cluster([platformArticle]),
      ranked: ranked(62, { eventImportance: 56, structuralImpact: 68, downstreamConsequence: 62 }),
      articleFilterEvaluation: {
        id: "source-ars",
        sourceTier: "tier2",
        headlineQuality: "strong",
        eventType: "platform_regulation",
        filterDecision: "pass",
        filterReasons: ["passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).toBe("core_signal_eligible");
    expect(eligibility.calibratedReasonLabels).toContain("platform_regulation_signal");
  });

  it("keeps AI infrastructure policy stories eligible when source-substantial", () => {
    const infrastructureArticle = article({
      title: "AI data centers become Democratic priority as grid permitting debate grows",
      contentText:
        "AI data centers are moving into infrastructure policy as lawmakers weigh grid capacity, permitting, and power demand. ".repeat(20),
    });
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem({
        title: infrastructureArticle.title,
        whatHappened: "Lawmakers elevated AI data centers as a grid and permitting priority.",
        matchedKeywords: ["AI data centers", "grid", "permitting"],
      }),
      cluster: cluster([infrastructureArticle]),
      ranked: ranked(58, { eventImportance: 48, structuralImpact: 60, downstreamConsequence: 58 }),
      articleFilterEvaluation: {
        id: "source-politico-congress",
        sourceTier: "tier2",
        headlineQuality: "strong",
        eventType: "ai_infrastructure_policy",
        filterDecision: "pass",
        filterReasons: ["passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).toBe("context_signal_eligible");
    expect(eligibility.calibratedReasonLabels).toContain("ai_infrastructure_policy");
  });

  it("keeps routine BLS rollups out of Core and Context", () => {
    const blsArticle = article({
      sourceDefinition: source({
        sourceId: "source-bls-latest",
        source: "BLS Principal Federal Economic Indicators",
        homepageUrl: "https://www.bls.gov",
        trustTier: "tier_1",
        sourceRole: "primary_institutional",
      }),
      title: "Major Economic Indicators Latest Numbers",
      contentText: "Major Economic Indicators Latest Numbers shows the latest numbers for routine data series. ".repeat(10),
    });
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem({
        title: blsArticle.title,
        whatHappened: "BLS published routine latest-number rollups.",
        matchedKeywords: ["major economic indicators", "latest numbers"],
      }),
      cluster: cluster([blsArticle]),
      ranked: ranked(86, { eventImportance: 80 }),
      articleFilterEvaluation: {
        id: "source-bls-latest",
        sourceTier: "tier1",
        headlineQuality: "strong",
        eventType: "macro_data_release",
        filterDecision: "pass",
        filterReasons: ["passed_tier1_strong_event", "passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).not.toBe("core_signal_eligible");
    expect(eligibility.tier).not.toBe("context_signal_eligible");
    expect(eligibility.reasons).toContain("stale_routine_release");
  });

  it("keeps thin market commentary out of Core and Context", () => {
    const commentaryArticle = article({
      sourceDefinition: source({
        sourceId: "source-cnbc-finance",
        source: "CNBC Finance",
        homepageUrl: "https://www.cnbc.com",
        trustTier: "tier_2",
        sourceRole: "secondary_authoritative",
      }),
      title: "Investor says the Fed should not cut rates in a stagflation era",
      contentText: "Investor says the Fed should not cut rates in a stagflation era.",
      summaryText: "Investor says the Fed should not cut rates.",
    });
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem({
        title: commentaryArticle.title,
        whatHappened: "A market commentator argued about Fed rates.",
        matchedKeywords: ["Fed", "rates", "market commentary"],
      }),
      cluster: cluster([commentaryArticle]),
      ranked: ranked(86, { eventImportance: 80 }),
      articleFilterEvaluation: {
        id: "source-cnbc-finance",
        sourceTier: "tier2",
        headlineQuality: "medium",
        eventType: "central_bank_policy",
        filterDecision: "pass",
        filterReasons: ["passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).not.toBe("core_signal_eligible");
    expect(eligibility.tier).not.toBe("context_signal_eligible");
    expect(eligibility.coreBlockingReasons).toContain("source_accessibility_insufficient");
    expect(eligibility.calibratedReasonLabels).toContain("market_commentary_source_thin");
  });

  it("still blocks gadget review content from Core", () => {
    const gadgetArticle = article({
      title: "Hands-on review: new touchscreen mouse gets spring colors",
      contentText:
        "This hands-on review of a consumer gadget covers a touchscreen mouse, colors, discount timing, and product details. ".repeat(20),
    });
    const eligibility = evaluateSignalSelectionEligibility({
      item: briefingItem({
        title: gadgetArticle.title,
        whatHappened: "A consumer gadget review covered a touchscreen mouse.",
        matchedKeywords: ["touchscreen mouse", "review", "gadget"],
      }),
      cluster: cluster([gadgetArticle]),
      ranked: ranked(86, { eventImportance: 80 }),
      articleFilterEvaluation: {
        id: "source-verge",
        sourceTier: "tier2",
        headlineQuality: "strong",
        eventType: "product_launch_major",
        filterDecision: "pass",
        filterReasons: ["passed_allowed_event_type"],
      },
    });

    expect(eligibility.tier).toBe("exclude_from_public_candidates");
    expect(eligibility.reasons).toContain("weak_gadget_or_review_content");
  });
});
