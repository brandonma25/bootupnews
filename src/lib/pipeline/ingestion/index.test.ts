import { describe, expect, it, vi } from "vitest";

import { getMvpDefaultPublicSources } from "@/lib/demo-data";
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
    expect(result.sources.map((source) => source.sourceId)).toEqual([
      "openclaw-the-verge",
      "openclaw-ars-technica",
      "horizon-reuters-world",
      "horizon-reuters-business",
      "mit-technology-review",
    ]);
    expect(result.sources.find((source) => source.sourceId === "mit-technology-review")).toMatchObject({
      source: "MIT Technology Review",
      availability: "probationary",
      donor: "openclaw",
    });
    expect(result.source_contributions.length).toBeGreaterThan(0);
    expect(firstItem?.source_metadata).toBeDefined();
    expect(firstItem?.source_metadata?.sourceId).toBeTruthy();
    expect(firstItem?.source_metadata?.donor).toBeTruthy();
    expect(firstItem?.source_metadata?.sourceClass).toBeTruthy();
    expect(firstItem?.source_metadata?.trustTier).toBeTruthy();
    expect(firstItem?.source_metadata?.provenance).toBeTruthy();
  });

  it("ingests only the explicit public MVP defaults when public sources are supplied", async () => {
    const result = await ingestRawItems({ sources: getMvpDefaultPublicSources() });

    expect(result.sources.map((source) => source.sourceId)).toEqual([
      "custom-source-verge",
      "custom-source-ars",
      "custom-source-tldr-tech",
      "custom-source-techcrunch",
      "custom-source-ft",
    ]);
    expect(result.sources.map((source) => source.source)).toEqual([
      "The Verge",
      "Ars Technica",
      "TLDR",
      "TechCrunch",
      "Financial Times",
    ]);
  });

  it("keeps probationary runtime activation out of supplied public MVP defaults", async () => {
    const result = await ingestRawItems({ sources: getMvpDefaultPublicSources() });

    expect(result.sources.map((source) => source.sourceId)).not.toContain("mit-technology-review");
    expect(result.sources.map((source) => source.source)).not.toContain("MIT Technology Review");
  });
});
