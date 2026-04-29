import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSourcesForPublicSurface,
  getPublicSourcePlanForSurface,
  PUBLIC_SURFACE_SOURCE_MANIFEST,
} from "@/lib/source-manifest";

const batch2ASourceIds = [
  "source-semafor",
  "source-axios",
  "source-404-media",
  "source-heatmap",
  "source-guardian-world",
  "source-pbs-newshour",
  "source-sec-press-releases",
  "source-france24",
];

describe("public source manifest", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/demo-data");
    vi.resetModules();
  });

  it("resolves public.home to sources with the same length as the manifest", () => {
    const sources = getSourcesForPublicSurface("public.home");

    expect(sources).toHaveLength(PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"].length);
  });

  it("includes governed Batch 1 and Batch 2A sources in the public.home source plan", () => {
    const sources = getSourcesForPublicSurface("public.home");
    const sourceIds = sources.map((source) => source.id);

    expect(sources).toHaveLength(34);
    expect(sourceIds).toEqual([...PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"]]);
    expect(batch2ASourceIds.every((sourceId) => sourceIds.includes(sourceId))).toBe(true);
    expect(sources.find((source) => source.id === "source-mit-tech-review")).toMatchObject({
      name: "MIT Technology Review",
      feedUrl: "https://www.technologyreview.com/feed/",
      homepageUrl: "https://www.technologyreview.com",
      topicName: "Tech",
      status: "active",
    });
    expect(sources.find((source) => source.id === "source-404-media")).toMatchObject({
      name: "404 Media",
      feedUrl: "https://www.404media.co/rss/",
      homepageUrl: "https://www.404media.co",
      topicName: "Tech",
      status: "active",
    });
    expect(sources.find((source) => source.id === "source-sec-press-releases")).toMatchObject({
      name: "SEC Press Releases",
      feedUrl: "https://www.sec.gov/news/pressreleases.rss",
      topicName: "Finance",
      status: "active",
    });
    expect(sources.find((source) => source.id === "source-heatmap")).toMatchObject({
      name: "Heatmap",
      feedUrl: "https://heatmap.news/feeds/feed.rss",
      topicName: "Finance",
      status: "active",
    });
    expect(sources.find((source) => source.id === "source-guardian-world")).toMatchObject({
      name: "The Guardian World",
      feedUrl: "https://www.theguardian.com/world/rss",
      topicName: "World",
      status: "active",
    });
    expect(sources.find((source) => source.id === "source-pbs-newshour")).toMatchObject({
      name: "PBS NewsHour",
      feedUrl: "https://www.pbs.org/newshour/feeds/rss/headlines",
      topicName: "Politics",
      status: "active",
    });
    expect(sources.find((source) => source.id === "source-france24")).toMatchObject({
      name: "France24",
      feedUrl: "https://www.france24.com/en/rss",
      topicName: "World",
      status: "active",
    });
    expect(sources.find((source) => source.id === "source-semafor")).toMatchObject({
      name: "Semafor",
      feedUrl: "https://www.semafor.com/rss.xml",
      topicName: "Politics",
      status: "active",
    });
    expect(sources.find((source) => source.id === "source-axios")).toMatchObject({
      name: "Axios",
      feedUrl: "https://www.axios.com/feeds/feed.rss",
      topicName: "Politics",
      status: "active",
    });
  });

  it("preserves manifest ordering", () => {
    const sources = getSourcesForPublicSurface("public.home");

    expect(sources.map((source) => source.id)).toEqual([...PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"]]);
  });

  it("groups the final public.home ordering by category", () => {
    const sources = getSourcesForPublicSurface("public.home");

    expect(sources.map((source) => source.id)).toEqual([
      "source-verge",
      "source-ars",
      "source-mit-tech-review",
      "source-techcrunch",
      "source-404-media",
      "source-ft",
      "source-reuters-business",
      "source-npr-business",
      "source-npr-economy",
      "source-fed-press-all",
      "source-fed-monetary-policy",
      "source-sec-press-releases",
      "source-bls-latest",
      "source-bls-cpi",
      "source-bls-employment-situation",
      "source-cnbc-business",
      "source-cnbc-economy",
      "source-cnbc-finance",
      "source-marketwatch",
      "source-heatmap",
      "source-bbc-world",
      "source-guardian-world",
      "source-foreign-affairs",
      "source-npr-world",
      "source-npr-politics",
      "source-pbs-newshour",
      "source-france24",
      "source-propublica-main",
      "source-semafor",
      "source-axios",
      "source-cnbc-politics",
      "source-politico-politics",
      "source-politico-congress",
      "source-politico-defense",
    ]);
    expect(sources.map((source) => source.topicName)).toEqual([
      "Tech",
      "Tech",
      "Tech",
      "Tech",
      "Tech",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "Finance",
      "World",
      "World",
      "World",
      "World",
      "Politics",
      "Politics",
      "World",
      "Politics",
      "Politics",
      "Politics",
      "Politics",
      "Politics",
      "Politics",
      "Politics",
    ]);
  });

  it("serializes public source roles, tiering, and eligibility for the controlled source plan", () => {
    const sourcePlan = getPublicSourcePlanForSurface("public.home");

    expect(sourcePlan).toMatchObject({
      plan: "public_manifest",
      surface: "public.home",
      suppliedByManifest: true,
      sourceCount: 34,
      warnings: [],
    });
    expect(sourcePlan.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "source-reuters-business",
          sourceRole: "primary_authoritative",
          sourceTier: "tier1",
          publicEligible: true,
        }),
        expect.objectContaining({
          id: "source-fed-press-all",
          sourceRole: "primary_institutional",
          sourceTier: "tier1",
          publicEligible: true,
        }),
        expect.objectContaining({
          id: "source-sec-press-releases",
          sourceRole: "primary_institutional",
          sourceTier: "tier1",
          publicEligible: true,
        }),
        expect.objectContaining({
          id: "source-marketwatch",
          sourceRole: "corroboration_only",
          sourceTier: "tier2",
          publicEligible: true,
        }),
        expect.objectContaining({
          id: "source-propublica-main",
          sourceRole: "primary_authoritative",
          sourceTier: "tier1",
          publicEligible: true,
        }),
        ...batch2ASourceIds
          .filter((sourceId) => sourceId !== "source-sec-press-releases")
          .map((sourceId) =>
            expect.objectContaining({
              id: sourceId,
              sourceRole: "secondary_authoritative",
              sourceTier: "tier2",
              publicEligible: true,
            }),
          ),
      ]),
    );
  });

  it("keeps TLDR, AP Politics, Congress.gov, and deferred Batch 2B/2C sources outside the public manifest", () => {
    const manifestIds = new Set(PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"]);

    expect([...manifestIds].some((sourceId) => sourceId.includes("tldr"))).toBe(false);
    expect(manifestIds.has("source-ap-top-news")).toBe(false);
    expect(manifestIds.has("source-ap-politics")).toBe(false);
    expect(manifestIds.has("congress-gov-api")).toBe(false);
    expect(manifestIds.has("source-cnbc-top-news")).toBe(false);
    expect(manifestIds.has("source-cnbc-technology")).toBe(false);
    expect(manifestIds.has("source-marketwatch-market-pulse")).toBe(false);
    expect(manifestIds.has("source-treasury-press-releases")).toBe(false);
    expect(manifestIds.has("source-nyt")).toBe(false);
    expect(manifestIds.has("source-wsj")).toBe(false);
    expect(manifestIds.has("source-bloomberg")).toBe(false);
    expect(manifestIds.has("source-economist")).toBe(false);
    expect(manifestIds.has("source-wired")).toBe(false);
    expect(manifestIds.has("source-al-jazeera")).toBe(false);
    expect(manifestIds.has("source-dw")).toBe(false);
  });

  it("throws a descriptive error when a declared source is missing from demoSources", async () => {
    vi.resetModules();
    vi.doMock("@/lib/demo-data", () => ({
      demoSources: [],
    }));

    const { getSourcesForPublicSurface: getSourcesWithMissingDemoSource } = await import("@/lib/source-manifest");

    expect(() => getSourcesWithMissingDemoSource("public.home")).toThrow(
      "Public source manifest for public.home references missing demoSources entry source-verge",
    );
  });
});
