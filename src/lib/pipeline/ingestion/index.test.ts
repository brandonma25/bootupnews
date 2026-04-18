import { describe, expect, it, vi } from "vitest";

import { ingestRawItems } from "@/lib/pipeline/ingestion";

vi.mock("@/lib/rss", () => ({
  fetchFeedArticles: vi.fn(async (feedUrl: string, sourceName: string) => [
    {
      title: `${sourceName} lead story`,
      url: `${feedUrl}/story-1`,
      summaryText: `${sourceName} summary text`,
      contentText: `${sourceName} content text`,
      sourceName,
      publishedAt: "2026-04-19T00:00:00.000Z",
    },
  ]),
}));

describe("ingestRawItems", () => {
  it("preserves canonical source metadata for donor-backed sources", async () => {
    const result = await ingestRawItems();
    const firstItem = result.items[0];

    expect(result.usedSeedFallback).toBe(false);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.source_contributions.length).toBeGreaterThan(0);
    expect(firstItem?.source_metadata).toBeDefined();
    expect(firstItem?.source_metadata?.sourceId).toBeTruthy();
    expect(firstItem?.source_metadata?.donor).toBeTruthy();
    expect(firstItem?.source_metadata?.sourceClass).toBeTruthy();
    expect(firstItem?.source_metadata?.trustTier).toBeTruthy();
    expect(firstItem?.source_metadata?.provenance).toBeTruthy();
  });
});
