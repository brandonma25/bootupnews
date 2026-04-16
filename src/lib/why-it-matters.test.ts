import { describe, expect, it } from "vitest";

import { generateWhyThisMatters, generateWhyThisMattersHeuristically } from "@/lib/why-it-matters";
import type { EventIntelligence } from "@/lib/types";

function createIntelligence(overrides: Partial<EventIntelligence> = {}): EventIntelligence {
  return {
    id: "evt-1",
    title: "Nvidia faces new U.S. chip export restrictions",
    summary: "New restrictions would limit advanced AI chip sales into China.",
    primaryChange: "Nvidia faces new U.S. chip export restrictions",
    entities: ["Nvidia", "United States", "China"],
    eventType: "geopolitical",
    primaryImpact: "Nvidia may face tighter market access and pricing pressure across semiconductors.",
    affectedMarkets: ["semiconductors", "technology"],
    timeHorizon: "long",
    signalStrength: "strong",
    keyEntities: ["Nvidia", "United States", "China"],
    topics: ["tech", "geopolitics"],
    signals: {
      articleCount: 3,
      sourceDiversity: 3,
      recencyScore: 90,
      velocityScore: 80,
    },
    rankingScore: 82,
    rankingReason: "Fresh multi-source reporting on Nvidia kept this event near the top of the briefing.",
    confidenceScore: 78,
    isHighSignal: true,
    createdAt: "2026-04-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("why-it-matters", () => {
  it("builds a causal heuristic explanation with a signal label", async () => {
    const intelligence = createIntelligence();

    const text = await generateWhyThisMatters(intelligence);

    expect(text).toContain("Nvidia");
    expect(text).toContain("semiconductors");
    expect(text).toContain("(Signal: Strong)");
    expect(text.toLowerCase()).not.toContain("this is important because");
  });

  it("rephrases when the first draft is too similar to recent outputs", async () => {
    const intelligence = createIntelligence({
      eventType: "macro",
      entities: ["Federal Reserve"],
      primaryImpact: "The Federal Reserve changes the rate backdrop for equities.",
      affectedMarkets: ["rates", "equities"],
      timeHorizon: "medium",
      signalStrength: "strong",
    });
    const firstDraft = `${generateWhyThisMattersHeuristically(intelligence)} (Signal: Strong)`;

    const deduped = await generateWhyThisMatters(intelligence, {
      previousOutputs: [firstDraft],
    });

    expect(deduped).not.toBe(firstDraft);
    expect(deduped).toContain("(Signal: Strong)");
  });
});
