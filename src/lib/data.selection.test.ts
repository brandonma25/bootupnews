import { describe, expect, it } from "vitest";

import { selectPublicBriefingItems } from "@/lib/data";
import type {
  BriefingItem,
  EventIntelligence,
  SignalSelectionEligibility,
  SignalSelectionEligibilityTier,
} from "@/lib/types";

function createIntelligence(overrides: Partial<EventIntelligence> = {}): EventIntelligence {
  return {
    id: overrides.id ?? "intel-1",
    title: overrides.title ?? "Federal Reserve signals rates will stay elevated",
    summary: overrides.summary ?? "Markets are repricing after a fresh Federal Reserve signal.",
    primaryChange: overrides.primaryChange ?? "Federal Reserve signaled rates will stay elevated",
    keyEntities: overrides.keyEntities ?? ["Federal Reserve"],
    topics: overrides.topics ?? ["finance"],
    signals: overrides.signals ?? {
      articleCount: 4,
      sourceDiversity: 3,
      recencyScore: 76,
      velocityScore: 60,
    },
    rankingScore: overrides.rankingScore ?? 72,
    rankingReason: overrides.rankingReason ?? "Legacy event-intelligence coverage score.",
    confidenceScore: overrides.confidenceScore ?? 70,
    isHighSignal: overrides.isHighSignal ?? true,
    createdAt: overrides.createdAt ?? "2026-04-15T08:00:00.000Z",
    eventType: overrides.eventType ?? "policy_regulation",
    affectedMarkets: overrides.affectedMarkets ?? ["rates"],
    primaryImpact: overrides.primaryImpact ?? "The event changes funding and policy assumptions.",
    timeHorizon: overrides.timeHorizon ?? "medium",
    entities: overrides.entities ?? ["Federal Reserve"],
    signalStrength: overrides.signalStrength ?? "strong",
  };
}

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
  return {
    id: overrides.id ?? "item-1",
    topicId: overrides.topicId ?? "topic-1",
    topicName: overrides.topicName ?? "Finance",
    title: overrides.title ?? "Federal Reserve signals rates will stay elevated",
    whatHappened: overrides.whatHappened ?? "Markets repriced after a fresh policy signal.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? "It matters because it changes funding assumptions.",
    sources: overrides.sources ?? [
      { title: "Reuters", url: "https://www.reuters.com/world/example" },
      { title: "Associated Press", url: "https://apnews.com/example" },
    ],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    read: overrides.read ?? false,
    priority: overrides.priority ?? "normal",
    matchedKeywords: overrides.matchedKeywords ?? [],
    publishedAt: overrides.publishedAt ?? "2026-04-15T08:00:00.000Z",
    sourceCount: overrides.sourceCount ?? 2,
    importanceScore: overrides.importanceScore ?? 72,
    importanceLabel: overrides.importanceLabel ?? "High",
    rankingSignals: overrides.rankingSignals ?? ["Strategic score from ranked Story Cluster evidence."],
    eventIntelligence: overrides.eventIntelligence ?? createIntelligence(),
    selectionEligibility: overrides.selectionEligibility,
  };
}

function createEligibility(
  tier: SignalSelectionEligibilityTier,
  overrides: Partial<SignalSelectionEligibility> = {},
): SignalSelectionEligibility {
  return {
    tier,
    reasons: overrides.reasons ?? [],
    warnings: overrides.warnings ?? [],
    filterDecision: overrides.filterDecision ?? (tier === "exclude_from_public_candidates" ? "reject" : "pass"),
    filterSeverity: overrides.filterSeverity ?? (tier === "exclude_from_public_candidates" ? "reject" : "pass"),
    filterReasons: overrides.filterReasons ?? [],
    sourceTier: overrides.sourceTier ?? "tier1",
    headlineQuality: overrides.headlineQuality ?? "strong",
    eventType: overrides.eventType ?? "policy_regulation",
    structuralImportanceScore: overrides.structuralImportanceScore ?? 72,
    sourceQualityScore: overrides.sourceQualityScore ?? 84,
    finalScore: overrides.finalScore ?? 72,
    scoreComponents: overrides.scoreComponents,
    rankingProvider: overrides.rankingProvider ?? "fns",
    diversityProvider: overrides.diversityProvider ?? "fns",
  };
}

describe("selectPublicBriefingItems", () => {
  it("places a high-structural-importance, lower-coverage item above a high-coverage low-importance item", () => {
    const strategicPolicyShift = createItem({
      id: "strategic-policy-shift",
      topicId: "politics",
      topicName: "Politics",
      title: "US export-control review changes chip supply assumptions",
      importanceScore: 88,
      sourceCount: 1,
      eventIntelligence: createIntelligence({
        rankingScore: 48,
        confidenceScore: 58,
        isHighSignal: false,
        signals: {
          articleCount: 1,
          sourceDiversity: 1,
          recencyScore: 45,
          velocityScore: 20,
        },
      }),
    });
    const highCoverageTrivial = createItem({
      id: "high-coverage-trivial",
      topicId: "tech",
      topicName: "Tech",
      title: "Popular app adds a seasonal icon update",
      importanceScore: 61,
      sourceCount: 6,
      eventIntelligence: createIntelligence({
        rankingScore: 96,
        confidenceScore: 88,
        isHighSignal: true,
        signals: {
          articleCount: 14,
          sourceDiversity: 6,
          recencyScore: 98,
          velocityScore: 92,
        },
      }),
    });

    const selected = selectPublicBriefingItems([highCoverageTrivial, strategicPolicyShift], 2);

    expect(selected.map((item) => item.id)).toEqual([
      "strategic-policy-shift",
      "high-coverage-trivial",
    ]);
  });

  it("does not let the legacy 40/30/20/10 coverage formula dominate final Top 5 placement", () => {
    const oldFormulaWinner = createItem({
      id: "old-formula-winner",
      topicName: "Tech",
      importanceScore: 64,
      eventIntelligence: createIntelligence({
        rankingScore: 99,
        signals: {
          articleCount: 20,
          sourceDiversity: 6,
          recencyScore: 100,
          velocityScore: 92,
        },
      }),
    });
    const strategicWinner = createItem({
      id: "strategic-winner",
      topicName: "Finance",
      importanceScore: 84,
      eventIntelligence: createIntelligence({
        rankingScore: 52,
        signals: {
          articleCount: 1,
          sourceDiversity: 1,
          recencyScore: 40,
          velocityScore: 20,
        },
      }),
    });

    expect(selectPublicBriefingItems([oldFormulaWinner, strategicWinner], 2).map((item) => item.id)).toEqual([
      "strategic-winner",
      "old-formula-winner",
    ]);
  });

  it("honors source-authority adjusted importance scores in final ordering", () => {
    const tierOneAdjusted = createItem({
      id: "tier-one-adjusted",
      title: "Reuters confirms central-bank liquidity review",
      sources: [{ title: "Reuters", url: "https://www.reuters.com/world/example" }],
      sourceCount: 1,
      importanceScore: 82,
      eventIntelligence: createIntelligence({
        rankingScore: 54,
        confidenceScore: 60,
      }),
    });
    const tierThreeCoverage = createItem({
      id: "tier-three-coverage",
      title: "Unvetted blogs repeat a consumer-product rumor",
      sources: [{ title: "Unknown Blog", url: "https://example-blog.test/story" }],
      sourceCount: 5,
      importanceScore: 69,
      eventIntelligence: createIntelligence({
        rankingScore: 94,
        confidenceScore: 82,
        signals: {
          articleCount: 10,
          sourceDiversity: 5,
          recencyScore: 90,
          velocityScore: 84,
        },
      }),
    });

    expect(selectPublicBriefingItems([tierThreeCoverage, tierOneAdjusted], 2).map((item) => item.id)).toEqual([
      "tier-one-adjusted",
      "tier-three-coverage",
    ]);
  });

  it("keeps explicit diversity and non-signal constraints after strategic sorting", () => {
    const items = [
      createItem({
        id: "non-signal-fresh",
        topicName: "Tech",
        importanceScore: 99,
        eventIntelligence: createIntelligence({ eventType: "non_signal", rankingScore: 99 }),
      }),
      createItem({ id: "tech-1", topicName: "Tech", importanceScore: 92 }),
      createItem({ id: "tech-2", topicName: "Tech", importanceScore: 90 }),
      createItem({ id: "tech-3", topicName: "Tech", importanceScore: 88 }),
      createItem({ id: "finance-1", topicName: "Finance", importanceScore: 75 }),
    ];

    const selected = selectPublicBriefingItems(items, 3);

    expect(selected.map((item) => item.id)).toEqual(["tech-1", "tech-2", "finance-1"]);
    expect(selected.filter((item) => item.topicName === "Tech")).toHaveLength(2);
    expect(selected.map((item) => item.id)).not.toContain("non-signal-fresh");
  });

  it("does not promote a validator-passing weak consumer item into Core Signals", () => {
    const structuralSignal = createItem({
      id: "structural-signal",
      topicName: "Politics",
      title: "Regulators approve AI export-control review for advanced chips",
      whyItMatters:
        "Export-control reviews reshape who can buy advanced chips and how cloud platforms plan capacity. That makes this a market-structure signal, not a product update.",
      importanceScore: 82,
      selectionEligibility: createEligibility("core_signal_eligible"),
    });
    const validatorPassingWeakConsumerItem = createItem({
      id: "validator-passing-weak-consumer-item",
      topicName: "Tech",
      title: "Streaming app announces a celebrity podcast partnership",
      whyItMatters:
        "The partnership could shift listener attention between platforms and change how advertisers evaluate creator bundles. That makes platform distribution strategy more visible.",
      importanceScore: 96,
      eventIntelligence: createIntelligence({
        eventType: "partnership_major",
        rankingScore: 98,
      }),
      selectionEligibility: createEligibility("exclude_from_public_candidates", {
        reasons: ["weak_entertainment_or_podcast_content", "insufficient_structural_event_evidence"],
        eventType: "partnership_major",
        structuralImportanceScore: 44,
        finalScore: 96,
      }),
    });

    const selected = selectPublicBriefingItems([
      validatorPassingWeakConsumerItem,
      structuralSignal,
    ]);

    expect(selected.map((item) => item.id)).toEqual(["structural-signal"]);
  });

  it("fails closed instead of filling missing Core Signal slots with context, depth, or excluded candidates", () => {
    const coreItems = [
      createItem({
        id: "core-1",
        topicName: "Finance",
        importanceScore: 90,
        selectionEligibility: createEligibility("core_signal_eligible"),
      }),
      createItem({
        id: "core-2",
        topicName: "Politics",
        importanceScore: 88,
        selectionEligibility: createEligibility("core_signal_eligible"),
      }),
    ];
    const nonCoreItems = [
      createItem({
        id: "context-1",
        topicName: "Tech",
        importanceScore: 95,
        selectionEligibility: createEligibility("context_signal_eligible"),
      }),
      createItem({
        id: "depth-1",
        topicName: "World",
        importanceScore: 94,
        selectionEligibility: createEligibility("depth_only"),
      }),
      createItem({
        id: "excluded-1",
        topicName: "Business",
        importanceScore: 99,
        selectionEligibility: createEligibility("exclude_from_public_candidates", {
          reasons: ["weak_gadget_or_review_content"],
        }),
      }),
    ];

    const selected = selectPublicBriefingItems([...nonCoreItems, ...coreItems], 5);

    expect(selected.map((item) => item.id)).toEqual(["core-1", "core-2"]);
  });

  it("does not let category diversity promote weak fillers above stronger structural signals", () => {
    const structuralSignals = [
      createItem({
        id: "policy-1",
        topicName: "Politics",
        importanceScore: 91,
        selectionEligibility: createEligibility("core_signal_eligible"),
      }),
      createItem({
        id: "markets-1",
        topicName: "Finance",
        importanceScore: 89,
        selectionEligibility: createEligibility("core_signal_eligible"),
      }),
    ];
    const weakCategoryFiller = createItem({
      id: "weak-category-filler",
      topicName: "Entertainment",
      title: "Podcast network announces celebrity programming bundle",
      importanceScore: 97,
      eventIntelligence: createIntelligence({
        eventType: "partnership_major",
        rankingScore: 99,
      }),
      selectionEligibility: createEligibility("exclude_from_public_candidates", {
        reasons: ["weak_entertainment_or_podcast_content"],
        finalScore: 97,
      }),
    });

    const selected = selectPublicBriefingItems([
      weakCategoryFiller,
      ...structuralSignals,
    ], 3);

    expect(selected.map((item) => item.id)).toEqual(["policy-1", "markets-1"]);
  });
});
