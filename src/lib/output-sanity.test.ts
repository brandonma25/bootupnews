import { describe, expect, it } from "vitest";

import { classifyBriefingSignalRole } from "@/lib/output-sanity";
import type { BriefingItem } from "@/lib/types";

function createItem(overrides: Partial<BriefingItem> = {}): BriefingItem {
  return {
    id: "item-1",
    topicId: "topic-1",
    topicName: "Finance",
    title: "Generic signal",
    whatHappened: "A generic development happened.",
    keyPoints: ["One", "Two", "Three"],
    whyItMatters: "It matters because expectations changed.",
    sources: [
      { title: "Reuters", url: "https://example.com/reuters" },
      { title: "AP", url: "https://example.com/ap" },
    ],
    estimatedMinutes: 4,
    read: false,
    priority: "top",
    importanceScore: 78,
    importanceLabel: "High",
    sourceCount: 2,
    eventIntelligence: {
      id: "intel-1",
      title: "Generic signal",
      summary: "A generic development happened.",
      primaryChange: "Generic signal",
      entities: ["Federal Reserve"],
      sourceNames: ["Reuters", "AP"],
      eventType: "policy_regulation",
      primaryImpact: "Policy expectations shifted.",
      affectedMarkets: ["rates", "equities"],
      timeHorizon: "medium",
      signalStrength: "strong",
      keyEntities: ["Federal Reserve"],
      topics: ["finance", "policy"],
      signals: { articleCount: 3, sourceDiversity: 2, recencyScore: 75, velocityScore: 66 },
      rankingScore: 78,
      rankingReason: "Multiple credible sources converged on a policy-relevant development.",
      confidenceScore: 72,
      isHighSignal: true,
      createdAt: "2026-04-19T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("classifyBriefingSignalRole", () => {
  it("classifies strong cross-domain signals as core", () => {
    expect(classifyBriefingSignalRole(createItem())).toBe("core");
  });

  it("classifies confirmed but narrower signals as context", () => {
    expect(
      classifyBriefingSignalRole(
        createItem({
          importanceScore: 71,
          importanceLabel: "High",
          eventIntelligence: {
            ...createItem().eventIntelligence!,
            affectedMarkets: ["adoption"],
            topics: ["tech"],
            confidenceScore: 60,
            rankingScore: 71,
          },
        }),
      ),
    ).toBe("context");
  });

  it("keeps thin single-source signals in watch mode", () => {
    expect(
      classifyBriefingSignalRole(
        createItem({
          sourceCount: 1,
          sources: [{ title: "Reuters", url: "https://example.com/reuters" }],
          eventIntelligence: {
            ...createItem().eventIntelligence!,
            signalStrength: "weak",
            isHighSignal: false,
            confidenceScore: 34,
          },
        }),
      ),
    ).toBe("watch");
  });
});
