import { describe, expect, it, vi } from "vitest";

import { seedRawItems } from "@/lib/pipeline/ingestion/seed-items";
import { runClusterFirstPipeline } from "@/lib/pipeline";

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
    expect(result.run.active_sources.length).toBeGreaterThan(0);
    expect(result.run.source_contributions.length).toBeGreaterThan(0);
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
});
