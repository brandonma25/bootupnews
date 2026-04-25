import { describe, expect, it } from "vitest";

import { recommendedSources } from "@/lib/source-catalog";

describe("source catalog governance", () => {
  const batchOneSourceIds = [
    "financial-times-global-economy",
    "mit-technology-review",
    "foreign-affairs",
    "the-diplomat",
    "npr-world",
    "foreign-policy",
    "guardian-world",
    "hacker-news-best",
    "politico-politics-news",
    "politico-congress",
    "politico-defense",
  ];

  it("keeps BBC and CNBC out of the onboarding catalog", () => {
    const serialized = JSON.stringify(recommendedSources).toLowerCase();

    expect(serialized).not.toContain("bbc");
    expect(serialized).not.toContain("cnbc");
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
    expect(recommendedSources.some((source) => source.id === "npr-economy")).toBe(false);
    expect(recommendedSources.some((source) => source.id === "brookings-research")).toBe(false);
    expect(recommendedSources.some((source) => source.id === "csis-analysis")).toBe(false);
    expect(recommendedSources.some((source) => source.feedUrl === "https://feeds.content.dowjones.io/public/rss/mktw_wsjonline")).toBe(false);
  });
});
