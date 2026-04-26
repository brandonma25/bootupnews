import type { Source } from "@/lib/types";
import { logPipelineEvent } from "@/lib/observability/logger";
import { getPipelineIntegrationSnapshot } from "@/lib/integration/pipeline-config";
import {
  persistNormalizedArticleCandidates,
  updateArticleCandidateClusters,
  updateArticleCandidateRankingOutcomes,
} from "@/lib/pipeline/article-candidates";
import { clusterNormalizedArticles } from "@/lib/pipeline/clustering";
import { deduplicateArticles } from "@/lib/pipeline/dedup";
import { buildDigestOutput, type DigestOutput } from "@/lib/pipeline/digest";
import { ingestRawItems } from "@/lib/pipeline/ingestion";
import { normalizeRawItems } from "@/lib/pipeline/normalization";
import { rankSignalClusters } from "@/lib/pipeline/ranking";
import { createEmptyPipelineRun, type PipelineRun } from "@/lib/observability/pipeline-run";
import type { RankedClusterResult } from "@/lib/scoring/scoring-engine";

export type ClusterFirstPipelineResult = {
  digest: DigestOutput;
  run: PipelineRun;
  ranked_clusters: RankedClusterResult[];
};

export async function runClusterFirstPipeline(options: {
  sources?: Source[];
  suppliedByManifest?: boolean;
} = {}): Promise<ClusterFirstPipelineResult> {
  const runId = `pipeline-${Date.now()}`;
  const run = createEmptyPipelineRun(runId);
  const integrationSnapshot = getPipelineIntegrationSnapshot();

  logPipelineEvent("info", "Pipeline integration snapshot", integrationSnapshot);

  const ingestion = await ingestRawItems(options);
  run.feed_failures = ingestion.failures;
  run.source_resolution = ingestion.source_resolution;
  run.active_sources = ingestion.sources.map((source) => ({
    source_id: source.sourceId,
    source: source.source,
    donor: source.donor,
    source_class: source.sourceClass,
    trust_tier: source.trustTier,
  }));
  run.source_contributions = ingestion.source_contributions;
  run.used_seed_fallback = ingestion.usedSeedFallback;

  const normalized = normalizeRawItems(ingestion.items);
  persistNormalizedArticleCandidates({ runId: run.run_id, articles: normalized });
  const deduped = deduplicateArticles(normalized);
  const clusters = clusterNormalizedArticles(deduped);
  updateArticleCandidateClusters({ runId: run.run_id, clusters });
  const rankedClusters = rankSignalClusters(clusters);
  updateArticleCandidateRankingOutcomes({
    runId: run.run_id,
    normalizedArticles: normalized,
    dedupedArticles: deduped,
    rankedClusters,
  });
  const digest = buildDigestOutput(rankedClusters);
  const singletonCount = clusters.filter((cluster) => cluster.cluster_size === 1).length;
  const preventedMergeCount = clusters.reduce(
    (sum, cluster) => sum + cluster.cluster_debug.prevented_merge_count,
    0,
  );

  run.num_raw_items = ingestion.items.length;
  run.num_after_dedup = deduped.length;
  run.num_clusters = clusters.length;
  run.avg_cluster_size =
    clusters.length > 0
      ? Number((clusters.reduce((sum, cluster) => sum + cluster.cluster_size, 0) / clusters.length).toFixed(2))
      : 0;
  run.singleton_count = singletonCount;
  run.prevented_merge_count = preventedMergeCount;
  run.top_scores = rankedClusters.slice(0, 5).map((entry) => entry.ranked.score);
  run.scoring_breakdown = rankedClusters.map((entry) => entry.scoringLog);
  run.ranking_provider = rankedClusters[0]?.ranked.ranking_debug.provider ?? null;
  run.diversity_provider = rankedClusters.find((entry) => entry.ranked.ranking_debug.diversity.action !== "none")
    ?.ranked.ranking_debug.provider ?? rankedClusters[0]?.ranked.ranking_debug.provider ?? null;
  run.suppressed_ranked_clusters = rankedClusters
    .filter((entry) => entry.ranked.ranking_debug.diversity.action !== "none")
    .map((entry) => ({
      cluster_id: entry.cluster.cluster_id,
      action: entry.ranked.ranking_debug.diversity.action,
      reason: entry.ranked.ranking_debug.diversity.reason,
      score_delta: entry.ranked.ranking_debug.diversity.scoreDelta,
      related_cluster_id: entry.ranked.ranking_debug.diversity.relatedClusterId,
    }));
  run.sample_cluster_rationale = rankedClusters.slice(0, 3).map((entry) => ({
    cluster_id: entry.cluster.cluster_id,
    representative_title: entry.cluster.representative_article.title,
    cluster_size: entry.cluster.cluster_size,
    topic_keywords: entry.cluster.topic_keywords,
    representative_selection_reason: entry.cluster.cluster_debug.representative_selection_reason,
    recent_merge_reasons: entry.cluster.cluster_debug.merge_decisions
      .slice(-3)
      .map((decision) => `${decision.decision}: ${decision.reasons.join("; ")}`),
  }));

  logPipelineEvent("info", "Cluster quality summary", {
    run_id: run.run_id,
    candidate_articles: deduped.length,
    num_clusters: run.num_clusters,
    avg_cluster_size: run.avg_cluster_size,
    singleton_count: run.singleton_count,
    prevented_merge_count: run.prevented_merge_count,
    ranking_provider: run.ranking_provider,
    diversity_provider: run.diversity_provider,
    suppressed_ranked_clusters: run.suppressed_ranked_clusters,
    sample_cluster_rationale: run.sample_cluster_rationale,
  });

  return {
    digest,
    run,
    ranked_clusters: rankedClusters,
  };
}
