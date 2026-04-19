import { describe, expect, it, vi } from "vitest";

import { getMvpDefaultPublicSources } from "@/lib/demo-data";
import {
  ingestRawItems,
  resolveNoArgumentRuntimeSourceResolutionSnapshot,
} from "@/lib/pipeline/ingestion";

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
    expect(result.source_resolution).toMatchObject({
      resolution_mode: "no_argument_runtime",
      mvp_default_public_source_ids: [
        "source-verge",
        "source-ars",
        "source-tldr-tech",
        "source-techcrunch",
        "source-ft",
      ],
      donor_fallback_default_ids: [
        "openclaw-the-verge",
        "openclaw-ars-technica",
        "horizon-reuters-world",
        "horizon-reuters-business",
      ],
      probationary_runtime_source_ids: ["mit-technology-review"],
      resolved_runtime_source_ids: [
        "openclaw-the-verge",
        "openclaw-ars-technica",
        "horizon-reuters-world",
        "horizon-reuters-business",
        "mit-technology-review",
      ],
      resolved_probationary_source_ids: ["mit-technology-review"],
      resolved_other_source_ids: [],
    });
    expect(firstItem?.source_metadata).toBeDefined();
    expect(firstItem?.source_metadata?.sourceId).toBeTruthy();
    expect(firstItem?.source_metadata?.donor).toBeTruthy();
    expect(firstItem?.source_metadata?.sourceClass).toBeTruthy();
    expect(firstItem?.source_metadata?.trustTier).toBeTruthy();
    expect(firstItem?.source_metadata?.provenance).toBeTruthy();
  });

  it("ingests only the explicit public MVP defaults when public sources are supplied", async () => {
    const result = await ingestRawItems({ sources: getMvpDefaultPublicSources() });

    expect(result.source_resolution.resolution_mode).toBe("supplied_sources");
    expect(result.source_resolution.resolved_runtime_source_ids).toEqual([
      "custom-source-verge",
      "custom-source-ars",
      "custom-source-tldr-tech",
      "custom-source-techcrunch",
      "custom-source-ft",
    ]);
    expect(result.source_resolution.resolved_default_donor_source_ids).toEqual([]);
    expect(result.source_resolution.resolved_probationary_source_ids).toEqual([]);
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

  it("exposes an ID-only no-argument source-resolution audit snapshot without fetching feeds", () => {
    const snapshot = resolveNoArgumentRuntimeSourceResolutionSnapshot();

    expect(snapshot).toEqual({
      resolution_mode: "no_argument_runtime",
      mvp_default_public_source_ids: [
        "source-verge",
        "source-ars",
        "source-tldr-tech",
        "source-techcrunch",
        "source-ft",
      ],
      donor_fallback_default_ids: [
        "openclaw-the-verge",
        "openclaw-ars-technica",
        "horizon-reuters-world",
        "horizon-reuters-business",
      ],
      probationary_runtime_source_ids: ["mit-technology-review"],
      resolved_runtime_source_ids: [
        "openclaw-the-verge",
        "openclaw-ars-technica",
        "horizon-reuters-world",
        "horizon-reuters-business",
        "mit-technology-review",
      ],
      resolved_default_donor_source_ids: [
        "openclaw-the-verge",
        "openclaw-ars-technica",
        "horizon-reuters-world",
        "horizon-reuters-business",
      ],
      resolved_probationary_source_ids: ["mit-technology-review"],
      resolved_other_source_ids: [],
    });
    expect(JSON.stringify(snapshot)).not.toContain("feedUrl");
    expect(JSON.stringify(snapshot)).not.toContain("https://");
  });

  it("logs a safe source-resolution snapshot without feed URLs or registry dumps", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    let resolutionLog: Record<string, unknown> | undefined;

    try {
      await ingestRawItems();
      resolutionLog = infoSpy.mock.calls
        .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
        .find((entry) => entry.message === "Runtime source resolution snapshot");
    } finally {
      infoSpy.mockRestore();
    }

    expect(resolutionLog).toMatchObject({
      resolved_runtime_source_ids: [
        "openclaw-the-verge",
        "openclaw-ars-technica",
        "horizon-reuters-world",
        "horizon-reuters-business",
        "mit-technology-review",
      ],
      resolved_probationary_source_ids: ["mit-technology-review"],
    });
    expect(JSON.stringify(resolutionLog)).not.toContain("feedUrl");
    expect(JSON.stringify(resolutionLog)).not.toContain("https://");
    expect(resolutionLog).not.toHaveProperty("donor_registry");
    expect(resolutionLog).not.toHaveProperty("source_registry");
  });
});
