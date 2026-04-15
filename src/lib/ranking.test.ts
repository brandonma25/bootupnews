import { describe, expect, it } from "vitest";

import {
  buildRankingDisplaySignals,
  compareBriefingItemsByRanking,
  sortBriefingItemsByRanking,
} from "@/lib/ranking";
import type { BriefingItem } from "@/lib/types";

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
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
    importanceScore: overrides.importanceScore ?? 70,
    importanceLabel: overrides.importanceLabel ?? "High",
    rankingSignals: overrides.rankingSignals ?? ["Broad coverage across multiple outlets."],
    eventIntelligence: overrides.eventIntelligence ?? {
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
    },
  };
}

describe("ranking activation helpers", () => {
  it("orders high-signal stronger events above manually flagged top items", () => {
    const highSignal = createItem({
      id: "high-signal",
      priority: "normal",
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        rankingScore: 90,
        confidenceScore: 80,
      },
    });
    const weakTop = createItem({
      id: "weak-top",
      priority: "top",
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        rankingScore: 52,
        confidenceScore: 51,
      },
    });

    expect(compareBriefingItemsByRanking(highSignal, weakTop)).toBeLessThan(0);
    expect(sortBriefingItemsByRanking([weakTop, highSignal]).map((item) => item.id)).toEqual([
      "high-signal",
      "weak-top",
    ]);
  });

  it("pushes low-signal items below high-signal items even when scores are similar", () => {
    const strong = createItem({
      id: "strong",
      eventIntelligence: {
        ...createItem({}).eventIntelligence!,
        rankingScore: 61,
        confidenceScore: 58,
        isHighSignal: true,
      },
    });
    const weak = createItem({
      id: "weak",
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
