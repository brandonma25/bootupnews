import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSourcesForPublicSurface,
  getPublicSourcePlanForSurface,
  PUBLIC_SURFACE_SOURCE_MANIFEST,
} from "@/lib/source-manifest";

describe("public source manifest", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/demo-data");
    vi.resetModules();
  });

  it("resolves public.home to sources with the same length as the manifest", () => {
    const sources = getSourcesForPublicSurface("public.home");

    expect(sources).toHaveLength(PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"].length);
  });

  it("includes Category 1 sources in the public.home source plan", () => {
    const sources = getSourcesForPublicSurface("public.home");
    const sourceIds = sources.map((source) => source.id);

    expect(sources).toHaveLength(26);
    expect(sourceIds[2]).toBe("source-mit-tech-review");
    expect(sources.find((source) => source.id === "source-mit-tech-review")).toMatchObject({
      name: "MIT Technology Review",
      feedUrl: "https://www.technologyreview.com/feed/",
      homepageUrl: "https://www.technologyreview.com",
      topicName: "Tech",
      status: "active",
    });
    expect(sourceIds[5]).toBe("source-reuters-business");
    expect(sources.find((source) => source.id === "source-reuters-business")).toMatchObject({
      name: "Reuters Business",
      feedUrl: "https://feeds.reuters.com/reuters/businessNews",
      homepageUrl: "https://www.reuters.com/business/",
      topicName: "Finance",
      status: "active",
    });
    expect(sourceIds.slice(6, 17)).toEqual([
      "source-npr-business",
      "source-npr-economy",
      "source-fed-press-all",
      "source-fed-monetary-policy",
      "source-bls-latest",
      "source-bls-cpi",
      "source-bls-employment-situation",
      "source-cnbc-business",
      "source-cnbc-economy",
      "source-cnbc-finance",
      "source-marketwatch",
    ]);
    expect(sources.find((source) => source.id === "source-fed-press-all")).toMatchObject({
      name: "Federal Reserve Press Releases",
      feedUrl: "https://www.federalreserve.gov/feeds/press_all.xml",
      topicName: "Finance",
      status: "active",
    });
    expect(sources.find((source) => source.id === "source-bls-cpi")).toMatchObject({
      name: "BLS Consumer Price Index",
      feedUrl: "https://www.bls.gov/feed/cpi.rss",
      topicName: "Finance",
      status: "active",
    });
    expect(sources.find((source) => source.id === "source-cnbc-finance")).toMatchObject({
      name: "CNBC Finance",
      feedUrl: "https://www.cnbc.com/id/10000664/device/rss/rss.html",
      topicName: "Finance",
      status: "active",
    });
    expect(sourceIds).toContain("source-bbc-world");
    expect(sourceIds[17]).toBe("source-bbc-world");
    expect(sources.find((source) => source.id === "source-bbc-world")).toMatchObject({
      name: "BBC World News",
      feedUrl: "http://feeds.bbci.co.uk/news/world/rss.xml",
      homepageUrl: "https://www.bbc.com/news/world",
      topicName: "World",
      status: "active",
    });
    expect(sourceIds[18]).toBe("source-foreign-affairs");
    expect(sources.find((source) => source.id === "source-foreign-affairs")).toMatchObject({
      name: "Foreign Affairs",
      feedUrl: "https://www.foreignaffairs.com/rss.xml",
      homepageUrl: "https://www.foreignaffairs.com",
      topicName: "World",
      status: "active",
    });
    expect(sourceIds.slice(19, 23)).toEqual([
      "source-npr-world",
      "source-npr-politics",
      "source-propublica-main",
      "source-cnbc-politics",
    ]);
    expect(sourceIds.slice(23)).toEqual([
      "source-politico-politics",
      "source-politico-congress",
      "source-politico-defense",
    ]);
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
      "source-ft",
      "source-reuters-business",
      "source-npr-business",
      "source-npr-economy",
      "source-fed-press-all",
      "source-fed-monetary-policy",
      "source-bls-latest",
      "source-bls-cpi",
      "source-bls-employment-situation",
      "source-cnbc-business",
      "source-cnbc-economy",
      "source-cnbc-finance",
      "source-marketwatch",
      "source-bbc-world",
      "source-foreign-affairs",
      "source-npr-world",
      "source-npr-politics",
      "source-propublica-main",
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
      sourceCount: 26,
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
          id: "source-politico-congress",
          sourceRole: "secondary_authoritative",
          sourceTier: "tier2",
          publicEligible: true,
        }),
        expect.objectContaining({
          id: "source-fed-press-all",
          sourceRole: "primary_institutional",
          sourceTier: "tier1",
          publicEligible: true,
        }),
        expect.objectContaining({
          id: "source-bls-employment-situation",
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
      ]),
    );
  });

  it("keeps TLDR, AP Politics, Congress.gov, and unapproved batch sources outside the public manifest", () => {
    const manifestIds = new Set(PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"]);

    expect([...manifestIds].some((sourceId) => sourceId.includes("tldr"))).toBe(false);
    expect(manifestIds.has("source-ap-top-news")).toBe(false);
    expect(manifestIds.has("source-ap-politics")).toBe(false);
    expect(manifestIds.has("congress-gov-api")).toBe(false);
    expect(manifestIds.has("source-cnbc-top-news")).toBe(false);
    expect(manifestIds.has("source-cnbc-technology")).toBe(false);
    expect(manifestIds.has("source-marketwatch-market-pulse")).toBe(false);
    expect(manifestIds.has("source-treasury-press-releases")).toBe(false);
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
