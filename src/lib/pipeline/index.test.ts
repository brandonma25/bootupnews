import { describe, expect, it, vi } from "vitest";

import { seedRawItems } from "@/lib/pipeline/ingestion/seed-items";
import { runClusterFirstPipeline } from "@/lib/pipeline";
import type { Source } from "@/lib/types";

vi.mock("@/lib/rss", () => ({
  fetchFeedArticles: vi.fn(async () => {
    throw new Error("network blocked");
  }),
}));

describe("runClusterFirstPipeline", () => {
  it("falls back to deterministic seed items and produces ranked clusters", async () => {
    const result = await runClusterFirstPipeline();

    expect(result.run.used_seed_fallback).toBe(true);
    expect(result.run.num_raw_items).toBe(seedRawItems.length);
    expect(result.run.num_after_dedup).toBeLessThanOrEqual(seedRawItems.length);
    expect(result.run.num_clusters).toBe(5);
    expect(result.run.avg_cluster_size).toBe(2);
    expect(result.run.singleton_count).toBe(0);
    expect(result.run.prevented_merge_count).toBeGreaterThan(0);
    expect(result.run.source_resolution).toMatchObject({
      resolution_mode: "no_argument_runtime",
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
    expect(result.run.active_sources.length).toBeGreaterThan(0);
    expect(result.run.source_contributions.length).toBeGreaterThan(0);
    expect(result.run.ranking_provider).toBeTruthy();
    expect(result.run.diversity_provider).toBeTruthy();
    expect(result.run.sample_cluster_rationale.length).toBeGreaterThan(0);
    expect(result.digest.most_important_now).toHaveLength(5);
    expect(new Set(result.digest.most_important_now.map((item) => item.score)).size).toBeGreaterThan(1);
  });

  it("returns readable digest summaries with source links", async () => {
    const result = await runClusterFirstPipeline();
    const lead = result.digest.most_important_now[0];

    expect(lead?.title.length).toBeGreaterThan(10);
    expect(lead?.short_summary.split(".").length).toBeGreaterThanOrEqual(2);
    expect(lead?.source_links.length).toBeGreaterThan(0);
    expect(lead?.topic_keywords.length).toBeGreaterThan(0);
  });

  it("keeps ranked cluster depth beyond the Top 5 digest when source data supports it", async () => {
    const rssModule = await import("@/lib/rss");
    const fetchFeedArticlesMock = vi.mocked(rssModule.fetchFeedArticles);
    const sources: Source[] = Array.from({ length: 7 }, (_, index) => {
      const sourceNumber = index + 1;

      return {
        id: `source-depth-${sourceNumber}`,
        name: `Depth Source ${sourceNumber}`,
        feedUrl: `https://example.com/depth-${sourceNumber}.xml`,
        homepageUrl: `https://example.com/depth-${sourceNumber}`,
        topicName: sourceNumber % 3 === 0 ? "Politics" : sourceNumber % 3 === 1 ? "Tech" : "Finance",
        status: "active",
      };
    });

    fetchFeedArticlesMock.mockImplementation(async (feedUrl, sourceName) => {
      const sourceNumber = Number(feedUrl.match(/depth-(\d+)/)?.[1] ?? "1");
      const stories = [
        ["Quantum datacenter buildout accelerates", "Compute buyers reserved new accelerator capacity for frontier model training."],
        ["Copper spreads widen across warehouses", "Metals traders repriced inventories after smelter disruptions tightened supply."],
        ["Defense committee rewrites procurement rules", "Lawmakers advanced acquisition changes affecting missile programs and shipyards."],
        ["Export license review slows chip shipments", "Regulators delayed approvals for advanced semiconductor equipment transfers."],
        ["Central bank liquidity window narrows", "Money markets adjusted funding plans after overnight facility usage changed."],
        ["Election administrators test ballot systems", "State officials completed certification drills for tabulation and chain of custody."],
        ["Enterprise software margins reset guidance", "Cloud vendors revised operating targets after renewal discounts compressed bookings."],
      ];
      const [title, body] = stories[sourceNumber - 1] ?? stories[0];

      return [
        {
          title,
          url: `${feedUrl}/lead-story`,
          summaryText: body,
          contentText: body,
          sourceName,
          publishedAt: `2026-04-25T0${sourceNumber}:00:00.000Z`,
        },
      ];
    });

    const result = await runClusterFirstPipeline({ sources, suppliedByManifest: true });

    expect(result.run.used_seed_fallback).toBe(false);
    expect(result.run.num_raw_items).toBe(7);
    expect(result.run.num_after_dedup).toBe(7);
    expect(result.run.num_clusters).toBeGreaterThan(5);
    expect(result.ranked_clusters.length).toBeGreaterThan(5);
    expect(result.digest.most_important_now).toHaveLength(5);
  });

  it("continues clustering and ranking when one politics source fails", async () => {
    const rssModule = await import("@/lib/rss");
    const fetchFeedArticlesMock = vi.mocked(rssModule.fetchFeedArticles);
    const politicsSources: Source[] = [
      {
        id: "source-ap-politics",
        name: "AP Politics",
        feedUrl: "https://apnews.com/politics.rss",
        homepageUrl: "https://apnews.com/politics",
        topicName: "Politics",
        status: "active",
      },
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
    ];

    fetchFeedArticlesMock.mockImplementation(async (feedUrl, sourceName) => {
      if (feedUrl.includes("politics-news")) {
        throw new Error("temporary politco outage");
      }

      return [
        {
          title: `${sourceName} lead story`,
          url: `${feedUrl}/lead-story`,
          summaryText: `${sourceName} summary`,
          contentText: `${sourceName} content about congress and policy`,
          sourceName,
          publishedAt: "2026-04-25T08:00:00.000Z",
        },
        {
          title: `${sourceName} follow-up`,
          url: `${feedUrl}/follow-up`,
          summaryText: `${sourceName} follow-up summary`,
          contentText: `${sourceName} follow-up content about defense and legislation`,
          sourceName,
          publishedAt: "2026-04-25T07:00:00.000Z",
        },
      ];
    });

    const result = await runClusterFirstPipeline({ sources: politicsSources });

    expect(result.run.used_seed_fallback).toBe(false);
    expect(result.run.feed_failures).toHaveLength(1);
    expect(result.run.feed_failures[0]).toMatchObject({
      source: "Politico Politics News",
    });
    expect(result.run.num_raw_items).toBe(4);
    expect(result.run.num_after_dedup).toBeGreaterThan(0);
    expect(result.run.num_clusters).toBeGreaterThan(0);
    expect(result.ranked_clusters.length).toBeGreaterThan(0);
    expect(result.digest.most_important_now.length).toBeGreaterThan(0);
    expect(result.run.source_contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "AP Politics",
          item_count: 2,
        }),
        expect.objectContaining({
          source: "Politico Politics News",
          item_count: 0,
        }),
        expect.objectContaining({
          source: "Politico Congress",
          item_count: 2,
        }),
      ]),
    );
  });
});
