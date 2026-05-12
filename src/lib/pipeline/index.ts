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
import { rankStoryClusters } from "@/lib/pipeline/ranking";
import { createEmptyPipelineRun, type PipelineRun } from "@/lib/observability/pipeline-run";
import type { RankedStoryClusterResult } from "@/lib/scoring/scoring-engine";
import {
  applyArticleSelectionFiltering,
  mapArticleFilterDiagnostic,
} from "@/lib/signal-selection-eligibility";

export type ClusterFirstPipelineResult = {
  digest: DigestOutput;
  run: PipelineRun;
  ranked_clusters: RankedStoryClusterResult[];
};

export async function runClusterFirstPipeline(options: {
  sources?: Source[];
  suppliedByManifest?: boolean;
  persistArticleCandidates?: boolean;
} = {}): Promise<ClusterFirstPipelineResult> {
  const runId = `pipeline-${Date.now()}`;
  const run = createEmptyPipelineRun(runId);
  const integrationSnapshot = getPipelineIntegrationSnapshot();
  const shouldPersistArticleCandidates = options.persistArticleCandidates ?? true;

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
    source_role: source.sourceRole,
    public_eligible: source.publicEligible,
    supplied_by_manifest: source.suppliedByManifest,
  }));
  run.source_contributions = ingestion.source_contributions;
  run.used_seed_fallback = ingestion.usedSeedFallback;

  const normalized = normalizeRawItems(ingestion.items);
  const articleFiltering = applyArticleSelectionFiltering(normalized);
  const filterDiagnosticById = new Map(articleFiltering.evaluations.map((evaluation) => [evaluation.id, evaluation]));
  const deduped = deduplicateArticles(articleFiltering.filteredArticles);
  const clusters = clusterNormalizedArticles(deduped);
  const rankedStoryClusters = rankStoryClusters(clusters);

  if (shouldPersistArticleCandidates) {
    await persistNormalizedArticleCandidates({ runId: run.run_id, articles: normalized });
    await updateArticleCandidateClusters({ runId: run.run_id, clusters });
    await updateArticleCandidateRankingOutcomes({
      runId: run.run_id,
      normalizedArticles: normalized,
      dedupedArticles: deduped,
      rankedClusters: rankedStoryClusters,
    });
  } else {
    logPipelineEvent("info", "Pipeline article candidate persistence skipped by run mode", {
      run_id: run.run_id,
    });
  }

  const digest = buildDigestOutput(rankedStoryClusters);
  const singletonCount = clusters.filter((cluster) => cluster.cluster_size === 1).length;
  const preventedMergeCount = clusters.reduce(
    (sum, cluster) => sum + cluster.cluster_debug.prevented_merge_count,
    0,
  );

  run.num_raw_items = ingestion.items.length;
  run.num_after_filter = articleFiltering.filteredArticles.length;
  run.num_after_dedup = deduped.length;
  run.num_clusters = clusters.length;
  run.avg_cluster_size =
    clusters.length > 0
      ? Number((clusters.reduce((sum, cluster) => sum + cluster.cluster_size, 0) / clusters.length).toFixed(2))
      : 0;
  run.singleton_count = singletonCount;
  run.prevented_merge_count = preventedMergeCount;
  run.top_scores = rankedStoryClusters.slice(0, 5).map((entry) => entry.ranked.score);
  run.scoring_breakdown = rankedStoryClusters.map((entry) => entry.scoringLog);
  run.article_filter_evaluations = normalized.map((article) => {
    const evaluation = filterDiagnosticById.get(article.id);

    if (!evaluation) {
      return {
        article_id: article.id,
        title: article.title,
        source_name: article.source,
        source_url: article.url,
        source_tier: "unknown",
        source_role: article.source_accessibility?.source_role,
        content_accessibility: article.source_accessibility?.content_accessibility,
        accessible_text_length: article.source_accessibility?.accessible_text_length,
        summary_length: article.source_accessibility?.summary_length,
        content_length: article.source_accessibility?.content_length,
        extraction_method: article.source_accessibility?.extraction_method,
        fetch_status: article.source_accessibility?.fetch_status,
        parse_status: article.source_accessibility?.parse_status,
        failure_reason: article.source_accessibility?.failure_reason,
        supplied_by_manifest: article.source_accessibility?.supplied_by_manifest,
        public_eligible: article.source_accessibility?.public_eligible,
        headline_quality: "unknown",
        event_type: "unknown",
        filter_decision: "reject",
        filter_severity: "reject",
        filter_reasons: ["missing_prd13_filter_evaluation"],
      };
    }

    return mapArticleFilterDiagnostic(article, evaluation);
  });
  run.article_filter_summary = articleFiltering.summary;
  run.ranking_provider = rankedStoryClusters[0]?.ranked.ranking_debug.provider ?? null;
  run.diversity_provider = rankedStoryClusters.find((entry) => entry.ranked.ranking_debug.diversity.action !== "none")
    ?.ranked.ranking_debug.provider ?? rankedStoryClusters[0]?.ranked.ranking_debug.provider ?? null;
  run.suppressed_ranked_clusters = rankedStoryClusters
    .filter((entry) => entry.ranked.ranking_debug.diversity.action !== "none")
    .map((entry) => ({
      cluster_id: entry.cluster.cluster_id,
      action: entry.ranked.ranking_debug.diversity.action,
      reason: entry.ranked.ranking_debug.diversity.reason,
      score_delta: entry.ranked.ranking_debug.diversity.scoreDelta,
      related_cluster_id: entry.ranked.ranking_debug.diversity.relatedClusterId,
    }));
  run.sample_cluster_rationale = rankedStoryClusters.slice(0, 3).map((entry) => ({
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
    raw_articles: normalized.length,
    articles_after_prd13_filter: run.num_after_filter,
    article_filter_summary: run.article_filter_summary,
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
    ranked_clusters: rankedStoryClusters,
  };
}
