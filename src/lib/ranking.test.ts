import { describe, expect, it } from "vitest";

import {
  buildRankingDisplaySignals,
  compareBriefingItemsByRanking,
  getBriefingRankSnapshot,
  sortBriefingItemsByRanking,
} from "@/lib/ranking";
import type { BriefingItem } from "@/lib/types";

function hasOverride<K extends keyof BriefingItem>(
  overrides: Partial<BriefingItem>,
  key: K,
) {
  return Object.prototype.hasOwnProperty.call(overrides, key);
}

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
  const defaultEventIntelligence = {
    id: "intel-1",
    title: "Fed signals rates will stay elevated",
    summary: "Markets are repricing after a fresh Fed signal.",
    primaryChange: "Fed signaled rates will stay elevated",
    keyEntities: ["Federal Reserve"],
    topics: ["finance"],
    signals: {
      articleCount: 5,
      sourceDiversity: 3,
      recencyScore: 82,
      velocityScore: 76,
    },
    rankingScore: 78,
    rankingReason: "Broad coverage around the Federal Reserve across 5 articles from 3 sources.",
    confidenceScore: 74,
    isHighSignal: true,
    createdAt: "2026-04-15T08:00:00.000Z",
  };

  return {
    id: overrides.id ?? "item-1",
    topicId: overrides.topicId ?? "topic-1",
    topicName: overrides.topicName ?? "Finance",
    title: overrides.title ?? "Fed signals rates will stay elevated",
    whatHappened: overrides.whatHappened ?? "Markets are repricing after a fresh Fed signal.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? "It matters because rates expectations are moving.",
    sources: overrides.sources ?? [
      { title: "Reuters", url: "https://example.com/reuters" },
      { title: "Bloomberg", url: "https://example.com/bloomberg" },
    ],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    read: overrides.read ?? false,
    priority: overrides.priority ?? "normal",
    publishedAt: overrides.publishedAt ?? "2026-04-15T08:00:00.000Z",
    sourceCount: overrides.sourceCount ?? 2,
    relatedArticles: overrides.relatedArticles,
    timeline: overrides.timeline,
    importanceScore: hasOverride(overrides, "importanceScore") ? overrides.importanceScore : 70,
    importanceLabel: overrides.importanceLabel ?? "High",
    rankingSignals: overrides.rankingSignals ?? ["Broad coverage across multiple outlets."],
    eventIntelligence: hasOverride(overrides, "eventIntelligence")
      ? overrides.eventIntelligence
      : defaultEventIntelligence,
  };
}

describe("ranking activation helpers", () => {
  it("orders by strategic importance before legacy event-intelligence coverage score", () => {
    const strategicImportant = createItem({
      id: "strategic-important",
      priority: "normal",
      importanceScore: 86,
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        rankingScore: 44,
        confidenceScore: 58,
        isHighSignal: false,
      },
    });
    const highCoverageLegacy = createItem({
      id: "high-coverage-legacy",
      priority: "top",
      importanceScore: 62,
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        signals: {
          articleCount: 12,
          sourceDiversity: 6,
          recencyScore: 94,
          velocityScore: 88,
        },
        rankingScore: 96,
        confidenceScore: 86,
        isHighSignal: true,
      },
    });

    expect(compareBriefingItemsByRanking(strategicImportant, highCoverageLegacy)).toBeLessThan(0);
    expect(sortBriefingItemsByRanking([highCoverageLegacy, strategicImportant]).map((item) => item.id)).toEqual([
      "strategic-important",
      "high-coverage-legacy",
    ]);
    expect(getBriefingRankSnapshot(strategicImportant)).toMatchObject({
      rankingScore: 86,
      scoreSource: "strategic",
    });
  });

  it("uses high-signal state as an explicit tie-breaker only after strategic score ties", () => {
    const strong = createItem({
      id: "strong",
      importanceScore: 70,
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        rankingScore: 61,
        confidenceScore: 58,
        isHighSignal: true,
      },
    });
    const weak = createItem({
      id: "weak",
      importanceScore: 70,
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        rankingScore: 64,
        confidenceScore: 60,
        isHighSignal: false,
      },
    });

    expect(sortBriefingItemsByRanking([weak, strong]).map((item) => item.id)).toEqual([
      "strong",
      "weak",
    ]);
  });

  it("falls back to legacy event-intelligence ranking only when no strategic score exists", () => {
    const legacyHigh = createItem({
      id: "legacy-high",
      importanceScore: undefined,
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        rankingScore: 82,
        confidenceScore: 70,
      },
    });
    const legacyLow = createItem({
      id: "legacy-low",
      importanceScore: undefined,
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        rankingScore: 58,
        confidenceScore: 70,
      },
    });

    expect(sortBriefingItemsByRanking([legacyLow, legacyHigh]).map((item) => item.id)).toEqual([
      "legacy-high",
      "legacy-low",
    ]);
    expect(getBriefingRankSnapshot(legacyHigh)).toMatchObject({
      rankingScore: 82,
      scoreSource: "legacy_event_intelligence",
    });
  });

  it("honors source-tier adjusted strategic scores in final ordering", () => {
    const tierOneAdjusted = createItem({
      id: "tier-one-adjusted",
      title: "Reuters confirms export-control shift",
      sources: [{ title: "Reuters", url: "https://www.reuters.com/world/example" }],
      importanceScore: 83,
      rankingSignals: ["Strategic score includes tier_1 source authority."],
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        rankingScore: 52,
        confidenceScore: 60,
      },
    });
    const tierThreeCoverage = createItem({
      id: "tier-three-coverage",
      title: "Low-authority blogs amplify gadget launch",
      sources: [{ title: "Unknown Blog", url: "https://example-blog.test/post" }],
      importanceScore: 68,
      rankingSignals: ["Strategic score includes tier_3 source authority."],
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        signals: {
          articleCount: 10,
          sourceDiversity: 5,
          recencyScore: 92,
          velocityScore: 85,
        },
        rankingScore: 94,
        confidenceScore: 82,
      },
    });

    expect(sortBriefingItemsByRanking([tierThreeCoverage, tierOneAdjusted]).map((item) => item.id)).toEqual([
      "tier-one-adjusted",
      "tier-three-coverage",
    ]);
  });

  it("builds compact ranking display signals from real event metadata", () => {
    const signals = buildRankingDisplaySignals(
      createItem({
        eventIntelligence: {
          ...createItem({}).eventIntelligence!,
          signals: {
            articleCount: 6,
            sourceDiversity: 4,
            recencyScore: 90,
            velocityScore: 84,
          },
        },
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      }),
    );

    expect(signals).toContain("Covered by 6 articles");
    expect(signals).toContain("Seen across 4 sources");
    expect(signals).toContain("Rapidly developing");
    expect(signals.some((signal) => signal.startsWith("Updated "))).toBe(true);
  });
});
