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
import { buildRuntimeSourceResolutionSnapshot } from "@/lib/observability/pipeline-run";
import { recommendedSources } from "@/lib/source-catalog";

describe("MVP default source governance", () => {
  const guardedBatchOneSourceIds = [
    "financial-times-global-economy",
    "foreign-affairs",
    "the-diplomat",
    "npr-business",
    "npr-economy",
    "federal-reserve-press-all",
    "federal-reserve-monetary-policy",
    "bls-principal-federal-economic-indicators",
    "bls-consumer-price-index",
    "bls-employment-situation",
    "cnbc-business",
    "cnbc-economy",
    "cnbc-finance",
    "marketwatch-top-stories",
    "npr-world",
    "npr-politics",
    "propublica-main",
    "cnbc-politics",
    "foreign-policy",
    "guardian-world",
    "hacker-news-best",
  ];
  const pausedTldrSourceIds = [
    "source-tldr-tech",
    "source-tldr-ai",
    "source-tldr-product",
    "source-tldr-founders",
    "source-tldr-design",
    "source-tldr-fintech",
    "source-tldr-it",
    "source-tldr-crypto",
    "source-tldr-marketing",
  ];

  it("declares the public MVP default source set explicitly", () => {
    expect(MVP_DEFAULT_PUBLIC_SOURCE_IDS).toEqual([
      "source-verge",
      "source-ars",
      "source-techcrunch",
      "source-ft",
    ]);
    expect(getMvpDefaultPublicSources().map((source) => source.name)).toEqual([
      "The Verge",
      "Ars Technica",
      "TechCrunch",
      "Financial Times",
    ]);
  });

  it("does not treat later demo/catalog entries as default public ingestion", () => {
    const defaultSourceIds = new Set(getMvpDefaultPublicSources().map((source) => source.id));
    const nonDefaultDemoSources = demoSources.filter((source) => !defaultSourceIds.has(source.id));

    expect(nonDefaultDemoSources.map((source) => source.name)).toEqual(
      expect.arrayContaining(["BBC World News", "MarketWatch", "ZeroHedge", "AP Top News"]),
    );
    expect(defaultSourceIds.has("source-bbc-world")).toBe(false);
    expect(areMvpDefaultPublicSources(demoSources)).toBe(false);
    expect(recommendedSources.some((source) => source.lifecycleStatus === "active_default")).toBe(false);

    for (const sourceId of pausedTldrSourceIds) {
      expect(defaultSourceIds.has(sourceId)).toBe(false);
    }
  });

  it("keeps all TLDR category sources paused and outside the public default set", () => {
    const sourcesById = new Map(demoSources.map((source) => [source.id, source]));

    for (const sourceId of pausedTldrSourceIds) {
      const source = sourcesById.get(sourceId);

      expect(source).toBeDefined();
      expect(source?.status).toBe("paused");
      expect(MVP_DEFAULT_PUBLIC_SOURCE_IDS).not.toContain(sourceId);
    }
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

  it("builds a safe no-argument runtime source resolution snapshot", () => {
    const snapshot = buildRuntimeSourceResolutionSnapshot({
      resolutionMode: "no_argument_runtime",
      resolvedSources: [
        ...getDefaultDonorFeeds(),
        ...getProbationaryRuntimeFeeds(),
      ].map((feed) => ({
        sourceId: feed.id,
        donor: feed.donor,
        source: feed.source,
        homepageUrl: feed.homepageUrl,
        topic: feed.topic,
        credibility: feed.credibility,
        reliability: feed.reliability,
        sourceClass: feed.sourceClass,
        trustTier: feed.trustTier,
        provenance: feed.provenance,
        status: feed.status,
        availability: feed.availability,
        fetch: feed.fetch,
        adapterOwner: feed.donor,
      })),
    });

    expect(snapshot).toEqual({
      resolution_mode: "no_argument_runtime",
      mvp_default_public_source_ids: [...MVP_DEFAULT_PUBLIC_SOURCE_IDS],
      donor_fallback_default_ids: [...DEFAULT_DONOR_FEED_IDS],
      probationary_runtime_source_ids: ["mit-technology-review"],
      resolved_runtime_source_ids: [
        "openclaw-the-verge",
        "openclaw-ars-technica",
        "horizon-reuters-world",
        "horizon-reuters-business",
        "mit-technology-review",
      ],
      resolved_default_donor_source_ids: [...DEFAULT_DONOR_FEED_IDS],
      resolved_probationary_source_ids: ["mit-technology-review"],
      resolved_other_source_ids: [],
    });
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
