import { describe, expect, it, vi } from "vitest";

import { getMvpDefaultPublicSources } from "@/lib/demo-data";
import {
  ingestRawItems,
  resolveNoArgumentRuntimeSourceResolutionSnapshot,
} from "@/lib/pipeline/ingestion";
import { getSourcesForPublicSurface } from "@/lib/source-manifest";
import type { Source } from "@/lib/types";

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

function createUserSuppliedSources(count: number): Source[] {
  return Array.from({ length: count }, (_, index) => {
    const sourceNumber = index + 1;

    return {
      id: `user-source-${sourceNumber}`,
      name: `User Source ${sourceNumber}`,
      feedUrl: `https://example.com/source-${sourceNumber}.xml`,
      homepageUrl: `https://example.com/source-${sourceNumber}`,
      topicName: sourceNumber % 2 === 0 ? "Finance" : "Tech",
      status: "active",
    };
  });
}

function createPoliticsSources(): Source[] {
  return [
    {
      id: "source-politico-politics",
      name: "Politico Politics News",
      feedUrl: "https://rss.politico.com/politics-news.xml",
      homepageUrl: "https://www.politico.com/news/politics-policy",
      topicName: "Politics",
      status: "active",
    },
    {
      id: "source-politico-congress",
      name: "Politico Congress",
      feedUrl: "https://rss.politico.com/congress.xml",
      homepageUrl: "https://www.politico.com/congress",
      topicName: "Politics",
      status: "active",
    },
    {
      id: "source-politico-defense",
      name: "Politico Defense",
      feedUrl: "https://rss.politico.com/defense.xml",
      homepageUrl: "https://www.politico.com/defense",
      topicName: "Politics",
      status: "active",
    },
  ];
}

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
      "custom-source-techcrunch",
      "custom-source-ft",
    ]);
    expect(result.source_resolution.resolved_default_donor_source_ids).toEqual([]);
    expect(result.source_resolution.resolved_probationary_source_ids).toEqual([]);
    expect(result.sources.map((source) => source.sourceId)).toEqual([
      "custom-source-verge",
      "custom-source-ars",
      "custom-source-techcrunch",
      "custom-source-ft",
    ]);
    expect(result.sources.map((source) => source.source)).toEqual([
      "The Verge",
      "Ars Technica",
      "TechCrunch",
      "Financial Times",
    ]);
  });

  it("keeps probationary runtime activation out of supplied public MVP defaults", async () => {
    const result = await ingestRawItems({ sources: getMvpDefaultPublicSources() });

    expect(result.sources.map((source) => source.sourceId)).not.toContain("mit-technology-review");
    expect(result.sources.map((source) => source.source)).not.toContain("MIT Technology Review");
  });

  it("resolves the full manifest-supplied source list when manifest provenance is set", async () => {
    const sources = getSourcesForPublicSurface("public.home");
    const result = await ingestRawItems({ sources, suppliedByManifest: true });

    expect(result.sources.map((source) => source.sourceId)).toEqual(
      sources.map((source) => `custom-${source.id}`),
    );
  });

  it("uses source-policy tier metadata for supplied manifest sources", async () => {
    const sources = getSourcesForPublicSurface("public.home");
    const result = await ingestRawItems({ sources, suppliedByManifest: true });
    const sourceById = new Map(result.sources.map((source) => [source.sourceId, source]));

    expect(sourceById.get("custom-source-ft")?.trustTier).toBe("tier_1");
    expect(sourceById.get("custom-source-reuters-business")?.trustTier).toBe("tier_1");
    expect(sourceById.get("custom-source-bbc-world")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-foreign-affairs")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-politico-congress")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-semafor")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-axios")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-404-media")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-heatmap")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-guardian-world")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-pbs-newshour")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-france24")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-npr-economy")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-cnbc-finance")?.trustTier).toBe("tier_2");
    expect(sourceById.get("custom-source-propublica-main")?.trustTier).toBe("tier_1");
    expect(sourceById.get("custom-source-fed-press-all")?.trustTier).toBe("tier_1");
    expect(sourceById.get("custom-source-sec-press-releases")?.trustTier).toBe("tier_1");
    expect(sourceById.get("custom-source-bls-cpi")?.trustTier).toBe("tier_1");
    expect(sourceById.get("custom-source-fed-press-all")?.sourceRole).toBe("primary_institutional");
    expect(sourceById.get("custom-source-sec-press-releases")?.sourceRole).toBe("primary_institutional");
    expect(sourceById.get("custom-source-bls-employment-situation")?.sourceRole).toBe("primary_institutional");
    expect(sourceById.get("custom-source-marketwatch")?.sourceRole).toBe("corroboration_only");
    expect(sourceById.get("custom-source-cnbc-finance")?.sourceRole).toBe("secondary_authoritative");
  });

  it("preserves the five-source cap for six non-manifest supplied sources", async () => {
    const result = await ingestRawItems({ sources: createUserSuppliedSources(6) });

    expect(result.sources.map((source) => source.sourceId)).toEqual([
      "custom-user-source-1",
      "custom-user-source-2",
      "custom-user-source-3",
      "custom-user-source-4",
      "custom-user-source-5",
    ]);
  });

  it("resolves all three manifest-supplied sources when count is below the cap", async () => {
    const sources = getSourcesForPublicSurface("public.home").slice(0, 3);
    const result = await ingestRawItems({ sources, suppliedByManifest: true });

    expect(result.sources.map((source) => source.sourceId)).toEqual(
      sources.map((source) => `custom-${source.id}`),
    );
  });

  it("resolves all three non-manifest supplied sources when count is below the cap", async () => {
    const result = await ingestRawItems({ sources: createUserSuppliedSources(3) });

    expect(result.sources.map((source) => source.sourceId)).toEqual([
      "custom-user-source-1",
      "custom-user-source-2",
      "custom-user-source-3",
    ]);
  });

  it("maps supplied politics sources into the World canonical topic metadata", async () => {
    const result = await ingestRawItems({ sources: createPoliticsSources() });

    expect(result.sources.map((source) => source.sourceId)).toEqual([
      "custom-source-politico-politics",
      "custom-source-politico-congress",
      "custom-source-politico-defense",
    ]);
    expect(result.sources.map((source) => source.topic)).toEqual(["World", "World", "World"]);
    expect(result.sources.map((source) => source.sourceClass)).toEqual(["general_newswire", "general_newswire", "general_newswire"]);
  });

  it("exposes an ID-only no-argument source-resolution audit snapshot without fetching feeds", () => {
    const snapshot = resolveNoArgumentRuntimeSourceResolutionSnapshot();

    expect(snapshot).toEqual({
      resolution_mode: "no_argument_runtime",
      mvp_default_public_source_ids: [
        "source-verge",
        "source-ars",
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
