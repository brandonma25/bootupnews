import { describe, expect, it } from "vitest";

import { DEFAULT_DONOR_FEED_IDS, getDefaultDonorFeeds } from "@/adapters/donors";
import {
  areMvpDefaultPublicSources,
  demoSources,
  getMvpDefaultPublicSources,
  MVP_DEFAULT_PUBLIC_SOURCE_IDS,
} from "@/lib/demo-data";
import { recommendedSources } from "@/lib/source-catalog";

describe("MVP default source governance", () => {
  it("declares the public MVP default source set explicitly", () => {
    expect(MVP_DEFAULT_PUBLIC_SOURCE_IDS).toEqual([
      "source-verge",
      "source-ars",
      "source-tldr-tech",
      "source-techcrunch",
      "source-ft",
    ]);
    expect(getMvpDefaultPublicSources().map((source) => source.name)).toEqual([
      "The Verge",
      "Ars Technica",
      "TLDR",
      "TechCrunch",
      "Financial Times",
    ]);
  });

  it("does not treat later demo/catalog entries as default public ingestion", () => {
    const defaultSourceIds = new Set(getMvpDefaultPublicSources().map((source) => source.id));
    const nonDefaultDemoSources = demoSources.filter((source) => !defaultSourceIds.has(source.id));

    expect(nonDefaultDemoSources.map((source) => source.name)).toEqual(
      expect.arrayContaining(["MarketWatch", "ZeroHedge", "AP Top News"]),
    );
    expect(areMvpDefaultPublicSources(demoSources)).toBe(false);
    expect(recommendedSources.some((source) => source.lifecycleStatus === "active_default")).toBe(false);
  });

  it("declares the donor fallback defaults explicitly", () => {
    expect(DEFAULT_DONOR_FEED_IDS).toEqual([
      "openclaw-the-verge",
      "openclaw-ars-technica",
      "horizon-reuters-world",
      "horizon-reuters-business",
    ]);
    expect(getDefaultDonorFeeds().map((source) => source.id)).toEqual([...DEFAULT_DONOR_FEED_IDS]);
  });
});
