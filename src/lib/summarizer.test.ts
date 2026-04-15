import { describe, expect, it } from "vitest";

import { summarizeHeuristically } from "@/lib/summarizer";

describe("summarizeHeuristically", () => {
  it("avoids repetitive heuristic boilerplate", () => {
    const summary = summarizeHeuristically("Finance", [
      {
        title: "Fed signals higher rates path",
        url: "https://example.com/lead",
        summaryText: "Markets are adjusting after a new Federal Reserve signal.",
        contentText: "Markets are adjusting after a new Federal Reserve signal.",
        sourceName: "Reuters",
        publishedAt: "2026-04-15T10:00:00.000Z",
      },
      {
        title: "Bond traders reprice rate expectations",
        url: "https://example.com/second",
        summaryText: "Treasury yields climbed after the signal.",
        contentText: "Treasury yields climbed after the signal.",
        sourceName: "Financial Times",
        publishedAt: "2026-04-15T10:05:00.000Z",
      },
    ]);

    expect(summary.whyItMatters.toLowerCase()).not.toContain("operators tracking this area should note it");
    expect(summary.whyItMatters.toLowerCase()).not.toContain("connect an ai key");
    expect(summary.whyItMatters.length).toBeLessThan(180);
  });
});
