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

    expect(sources).toHaveLength(11);
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
    expect(sourceIds).toContain("source-bbc-world");
    expect(sourceIds[6]).toBe("source-bbc-world");
    expect(sources.find((source) => source.id === "source-bbc-world")).toMatchObject({
      name: "BBC World News",
      feedUrl: "http://feeds.bbci.co.uk/news/world/rss.xml",
      homepageUrl: "https://www.bbc.com/news/world",
      topicName: "World",
      status: "active",
    });
    expect(sourceIds[7]).toBe("source-foreign-affairs");
    expect(sources.find((source) => source.id === "source-foreign-affairs")).toMatchObject({
      name: "Foreign Affairs",
      feedUrl: "https://www.foreignaffairs.com/rss.xml",
      homepageUrl: "https://www.foreignaffairs.com",
      topicName: "World",
      status: "active",
    });
    expect(sourceIds.slice(8)).toEqual([
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
      "source-bbc-world",
      "source-foreign-affairs",
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
      "World",
      "World",
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
      sourceCount: 11,
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
      ]),
    );
  });

  it("keeps TLDR, AP Politics, and Congress.gov outside the public manifest", () => {
    const manifestIds = new Set(PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"]);

    expect([...manifestIds].some((sourceId) => sourceId.includes("tldr"))).toBe(false);
    expect(manifestIds.has("source-ap-top-news")).toBe(false);
    expect(manifestIds.has("source-ap-politics")).toBe(false);
    expect(manifestIds.has("congress-gov-api")).toBe(false);
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
