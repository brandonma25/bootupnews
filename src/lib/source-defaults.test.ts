import { describe, expect, it } from "vitest";

import {
  DEFAULT_DONOR_FEED_IDS,
  PROBATIONARY_RUNTIME_FEED_IDS,
  getDefaultDonorFeeds,
  getProbationaryRuntimeFeeds,
} from "@/adapters/donors";
import {
  areMvpDefaultPublicSources,
  demoSources,
  getMvpDefaultPublicSources,
  MVP_DEFAULT_PUBLIC_SOURCE_IDS,
} from "@/lib/demo-data";
import { recommendedSources } from "@/lib/source-catalog";

describe("MVP default source governance", () => {
  const guardedBatchOneSourceIds = [
    "financial-times-global-economy",
    "foreign-affairs",
    "the-diplomat",
    "npr-world",
    "foreign-policy",
    "guardian-world",
    "hacker-news-best",
  ];

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

  it("declares the probationary runtime activation set explicitly", () => {
    expect(PROBATIONARY_RUNTIME_FEED_IDS).toEqual(["mit-technology-review"]);
    expect(getProbationaryRuntimeFeeds().map((source) => source.id)).toEqual(["mit-technology-review"]);
    expect(getProbationaryRuntimeFeeds().map((source) => source.availability)).toEqual(["probationary"]);
    expect(getProbationaryRuntimeFeeds().map((source) => source.source)).toEqual(["MIT Technology Review"]);
  });

  it("does not activate other onboarded sources through the probationary path", () => {
    const probationaryRuntimeSourceIds = new Set(PROBATIONARY_RUNTIME_FEED_IDS);

    for (const sourceId of guardedBatchOneSourceIds) {
      expect(probationaryRuntimeSourceIds.has(sourceId)).toBe(false);
    }
    expect(probationaryRuntimeSourceIds.has("bbc")).toBe(false);
    expect(probationaryRuntimeSourceIds.has("cnbc")).toBe(false);
  });
});
