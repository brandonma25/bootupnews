import { beforeEach, describe, expect, it, vi } from "vitest";

const persistNormalizedArticleCandidates = vi.fn();
const updateArticleCandidateClusters = vi.fn();
const updateArticleCandidateRankingOutcomes = vi.fn();

vi.mock("@/lib/rss", () => ({
  fetchFeedArticles: vi.fn(async () => {
    throw new Error("network blocked");
  }),
}));

vi.mock("@/lib/pipeline/article-candidates", () => ({
  persistNormalizedArticleCandidates,
  updateArticleCandidateClusters,
  updateArticleCandidateRankingOutcomes,
}));

describe("controlled pipeline candidate persistence", () => {
  beforeEach(() => {
    persistNormalizedArticleCandidates.mockClear();
    updateArticleCandidateClusters.mockClear();
    updateArticleCandidateRankingOutcomes.mockClear();
  });

  it("dry-run pipeline execution can disable all pipeline_article_candidates writes", async () => {
    const { runClusterFirstPipeline } = await import("@/lib/pipeline");

    const result = await runClusterFirstPipeline({ persistArticleCandidates: false });

    expect(result.run.used_seed_fallback).toBe(true);
    expect(result.ranked_clusters.length).toBeGreaterThan(0);
    expect(persistNormalizedArticleCandidates).not.toHaveBeenCalled();
    expect(updateArticleCandidateClusters).not.toHaveBeenCalled();
    expect(updateArticleCandidateRankingOutcomes).not.toHaveBeenCalled();
  }, 15_000);

  it("normal pipeline execution still records article-candidate stages", async () => {
    const { runClusterFirstPipeline } = await import("@/lib/pipeline");

    await runClusterFirstPipeline();

    expect(persistNormalizedArticleCandidates).toHaveBeenCalledTimes(1);
    expect(updateArticleCandidateClusters).toHaveBeenCalledTimes(1);
    expect(updateArticleCandidateRankingOutcomes).toHaveBeenCalledTimes(1);
  }, 15_000);
});
