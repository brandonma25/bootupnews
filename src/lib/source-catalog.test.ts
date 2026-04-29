import { describe, expect, it } from "vitest";

import { recommendedSources } from "@/lib/source-catalog";

describe("source catalog governance", () => {
  const batchOneSourceIds = [
    "financial-times-global-economy",
    "mit-technology-review",
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
    "politico-politics-news",
    "politico-congress",
    "politico-defense",
  ];
  const tldrCategoryIds = [
    "tldr",
    "tldr-ai",
    "tldr-product",
    "tldr-founders",
    "tldr-design",
    "tldr-fintech",
    "tldr-it",
    "tldr-crypto",
    "tldr-marketing",
  ];
  const batchTwoASourceIds = [
    "semafor",
    "axios",
    "404-media",
    "heatmap",
    "guardian-world",
    "pbs-newshour",
    "sec-press-releases",
    "france24",
  ];

  it("keeps blocked broad or unofficial source classes out of the onboarding catalog", () => {
    const serialized = JSON.stringify(recommendedSources).toLowerCase();
    const sourceIds = new Set(recommendedSources.map((source) => source.id));

    expect(serialized).not.toContain("ap direct rss");
    expect(serialized).not.toContain("reuters direct rss");
    expect(serialized).not.toContain("third-party feed");
    expect(serialized).not.toContain("unofficial scraper");
    expect(sourceIds.has("new-york-times")).toBe(false);
    expect(sourceIds.has("bloomberg")).toBe(false);
    expect(sourceIds.has("the-information")).toBe(false);
    expect(sourceIds.has("wall-street-journal")).toBe(false);
    expect(sourceIds.has("the-economist")).toBe(false);
    expect(sourceIds.has("wired")).toBe(false);
    expect(sourceIds.has("al-jazeera")).toBe(false);
    expect(sourceIds.has("dw")).toBe(false);
  });

  it("keeps catalog entries separate from default ingestion", () => {
    expect(recommendedSources.some((source) => source.lifecycleStatus === "active_default")).toBe(false);
    expect(recommendedSources.every((source) => source.mvpDefaultAllowed === false)).toBe(true);
  });

  it("does not label broken, key-gated, or manual-only sources as importable", () => {
    const importableSources = recommendedSources.filter((source) => source.importStatus === "ready");

    expect(importableSources.length).toBeGreaterThan(0);
    expect(importableSources.every((source) => Boolean(source.feedUrl))).toBe(true);
    expect(
      importableSources.every(
        (source) =>
          source.validationStatus !== "failed" &&
          source.validationStatus !== "requires_key" &&
          source.validationStatus !== "manual_only",
      ),
    ).toBe(true);
  });

  it("keeps batch-one onboarded sources out of default and preference treatment", () => {
    const sourcesById = new Map(recommendedSources.map((source) => [source.id, source]));

    for (const sourceId of batchOneSourceIds) {
      const source = sourcesById.get(sourceId);

      expect(source).toBeDefined();
      expect(source?.importStatus).toBe("ready");
      expect(source?.validationStatus).toBe("validated");
      expect(source?.mvpDefaultAllowed).toBe(false);
      expect(source?.editorialPreference).toBe("none");
      expect(source?.lifecycleStatus).not.toBe("active_default");
    }
  });

  it("keeps MIT Technology Review catalog support separate from default activation metadata", () => {
    const source = recommendedSources.find((entry) => entry.id === "mit-technology-review");

    expect(source).toBeDefined();
    expect(source?.importStatus).toBe("ready");
    expect(source?.validationStatus).toBe("validated");
    expect(source?.mvpDefaultAllowed).toBe(false);
    expect(source?.editorialPreference).toBe("none");
    expect(source?.lifecycleStatus).toBe("active_optional");
  });

  it("includes only validated official TLDR category feeds as paused non-default catalog options", () => {
    const sourcesById = new Map(recommendedSources.map((source) => [source.id, source]));

    for (const sourceId of tldrCategoryIds) {
      const source = sourcesById.get(sourceId);

      expect(source).toBeDefined();
      expect(source?.importStatus).toBe("ready");
      expect(source?.validationStatus).toBe("validated");
      expect(source?.mvpDefaultAllowed).toBe(false);
      expect(source?.lifecycleStatus).toBe("active_optional");
      expect(source?.feedUrl).toMatch(/^https:\/\/tldr\.tech\/api\/rss\//);
      expect(source?.note).toContain("Paused by default");
    }
  });

  it("catalogs politics RSS additions as optional non-default sources", () => {
    const sourcesById = new Map(recommendedSources.map((source) => [source.id, source]));

    expect(sourcesById.get("ap-politics")).toMatchObject({
      sourceFormat: "rss",
      importStatus: "manual",
      lifecycleStatus: "catalog_only",
      validationStatus: "failed",
      topicLabel: "Politics",
    });
    expect(sourcesById.get("politico-politics-news")).toMatchObject({
      sourceFormat: "rss",
      importStatus: "ready",
      lifecycleStatus: "active_optional",
      validationStatus: "validated",
      topicLabel: "Politics",
    });
    expect(sourcesById.get("politico-congress")).toMatchObject({
      sourceFormat: "rss",
      importStatus: "ready",
      lifecycleStatus: "active_optional",
      validationStatus: "validated",
      topicLabel: "Politics",
    });
    expect(sourcesById.get("politico-defense")).toMatchObject({
      sourceFormat: "rss",
      importStatus: "ready",
      lifecycleStatus: "active_optional",
      validationStatus: "validated",
      topicLabel: "Politics",
    });
  });

  it("catalogs Batch 1 accessible source additions as validated optional sources", () => {
    const sourcesById = new Map(recommendedSources.map((source) => [source.id, source]));

    expect(sourcesById.get("npr-business")).toMatchObject({
      sourceFormat: "rss",
      importStatus: "ready",
      lifecycleStatus: "active_optional",
      validationStatus: "validated",
      topicLabel: "Markets",
    });
    expect(sourcesById.get("npr-economy")).toMatchObject({
      sourceFormat: "rss",
      importStatus: "ready",
      lifecycleStatus: "active_optional",
      validationStatus: "validated",
      topicLabel: "Economics",
    });
    expect(sourcesById.get("propublica-main")).toMatchObject({
      sourceFormat: "rss",
      importStatus: "ready",
      lifecycleStatus: "active_optional",
      validationStatus: "validated",
      topicLabel: "Politics",
    });
    expect(sourcesById.get("marketwatch-top-stories")).toMatchObject({
      feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
      lifecycleStatus: "active_optional",
      validationStatus: "validated",
    });
  });

  it("catalogs Batch 2A accessible source additions as validated optional non-default sources", () => {
    const sourcesById = new Map(recommendedSources.map((source) => [source.id, source]));

    for (const sourceId of batchTwoASourceIds) {
      const source = sourcesById.get(sourceId);

      expect(source).toBeDefined();
      expect(source).toMatchObject({
        sourceFormat: "rss",
        importStatus: "ready",
        lifecycleStatus: "active_optional",
        validationStatus: "validated",
        mvpDefaultAllowed: false,
        editorialPreference: "none",
      });
      expect(source?.note).toMatch(/2026-04-29|Batch 2A/);
    }
    expect(sourcesById.get("404-media")).toMatchObject({
      feedUrl: "https://www.404media.co/rss/",
      topicLabel: "Technology",
    });
    expect(sourcesById.get("sec-press-releases")).toMatchObject({
      feedUrl: "https://www.sec.gov/news/pressreleases.rss",
      topicLabel: "Markets",
    });
    expect(sourcesById.get("pbs-newshour")?.note).toMatch(/short abstracts|Context/i);
    expect(sourcesById.get("france24")?.note).toMatch(/short abstracts|Context/i);
  });

  it("catalogs institutional Batch 1 sources without treating them as normal publisher defaults", () => {
    const sourcesById = new Map(recommendedSources.map((source) => [source.id, source]));

    for (const sourceId of [
      "federal-reserve-press-all",
      "federal-reserve-monetary-policy",
      "bls-principal-federal-economic-indicators",
      "bls-consumer-price-index",
      "bls-employment-situation",
    ]) {
      const source = sourcesById.get(sourceId);

      expect(source).toMatchObject({
        sourceFormat: "rss",
        importStatus: "ready",
        lifecycleStatus: "active_optional",
        validationStatus: "validated",
        topicLabel: "Economics",
        mvpDefaultAllowed: false,
      });
      expect(source?.note).toMatch(/institutional|Primary institutional|BLS|Federal/i);
    }
  });

  it("keeps Congress.gov cataloged without runtime ingestion support", () => {
    const source = recommendedSources.find((entry) => entry.id === "congress-gov-api");

    expect(source).toMatchObject({
      sourceFormat: "api",
      importStatus: "manual",
      lifecycleStatus: "catalog_only",
      validationStatus: "requires_key",
      topicLabel: "Politics",
    });
    expect(source?.feedUrl).toBeUndefined();
  });

  it("does not duplicate existing or failed batch-one candidates", () => {
    const feedUrls = recommendedSources.flatMap((source) => (source.feedUrl ? [source.feedUrl] : []));
    const duplicateFeedUrls = feedUrls.filter((feedUrl, index) => feedUrls.indexOf(feedUrl) !== index);

    expect(duplicateFeedUrls).toEqual([]);
    expect(recommendedSources.filter((source) => source.id === "ars-technica")).toHaveLength(1);
    expect(recommendedSources.some((source) => source.feedUrl === "https://www.theverge.com/rss/index.xml")).toBe(false);
    expect(recommendedSources.some((source) => source.id === "brookings-research")).toBe(false);
    expect(recommendedSources.some((source) => source.id === "csis-analysis")).toBe(false);
    expect(recommendedSources.some((source) => source.id === "treasury-press-releases")).toBe(false);
    expect(recommendedSources.some((source) => source.id === "marketwatch-market-pulse")).toBe(false);
    expect(recommendedSources.some((source) => source.feedUrl === "https://feeds.content.dowjones.io/public/rss/mktw_wsjonline")).toBe(false);
  });
});
