import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSourcesForPublicSurface,
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

  it("includes Reuters World in the public.home source plan", () => {
    const sources = getSourcesForPublicSurface("public.home");

    expect(sources.map((source) => source.id)).toContain("source-reuters-world");
    expect(sources.find((source) => source.id === "source-reuters-world")).toMatchObject({
      name: "Reuters World",
      feedUrl: "https://feeds.reuters.com/Reuters/worldNews",
      homepageUrl: "https://www.reuters.com/world/",
      topicName: "World",
      status: "active",
    });
  });

  it("preserves manifest ordering", () => {
    const sources = getSourcesForPublicSurface("public.home");

    expect(sources.map((source) => source.id)).toEqual([...PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"]]);
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
