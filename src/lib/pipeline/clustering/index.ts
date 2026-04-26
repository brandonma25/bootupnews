import { getClusteringSupportAdapters, getDiversitySupports } from "@/adapters/donors";
import type {
  ClusterMergeDecision,
  ClusterRepresentativeScore,
  ClusterSimilarityBreakdown,
  StoryCluster,
} from "@/lib/models/signal-cluster";
import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type {
  ClusterCandidate,
  ClusteringSupport,
  MergeDecisionSupport,
  RepresentativeSelectionSupport,
  SimilaritySignals,
} from "@/lib/integration/subsystem-contracts";
import { extractKeywords, stableId } from "@/lib/pipeline/shared/text";

function buildClusterKeywords(candidates: ClusterCandidate[]) {
  return extractKeywords(
    candidates
      .map((candidate) => `${candidate.article.title} ${candidate.article.content}`)
      .join(" "),
    10,
  );
}

function buildSimilarityBreakdown(similaritySignals: SimilaritySignals): ClusterSimilarityBreakdown {
  return {
    title_similarity: Number(similaritySignals.title_overlap.toFixed(3)),
    keyword_overlap: Number(similaritySignals.keyword_overlap.toFixed(3)),
    entity_overlap: Number(similaritySignals.entity_overlap.toFixed(3)),
    content_similarity: Number(similaritySignals.content_similarity.toFixed(3)),
    time_proximity: Number(similaritySignals.time_proximity.toFixed(3)),
    source_confirmation: Number(similaritySignals.source_confirmation.toFixed(3)),
    weighted_score: Number(similaritySignals.weighted_score.toFixed(3)),
  };
}

function buildRepresentativeScores(support: RepresentativeSelectionSupport): ClusterRepresentativeScore[] {
  return support.scores.map((score) => ({
    article_id: score.article_id,
    score: score.score,
    reasons: score.reasons,
  }));
}

function getClusteringSupportProvider(): { donor: string; support: ClusteringSupport } {
  const provider = getClusteringSupportAdapters()[0];

  if (!provider) {
    throw new Error("No clustering support provider is registered");
  }

  return provider;
}

function createCluster(
  candidate: ClusterCandidate,
  provider: { donor: string; support: ClusteringSupport },
): StoryCluster {
  const capabilities = provider.support.describeCapabilities();

  return {
    cluster_id: stableId(candidate.article.title, candidate.article.url),
    articles: [candidate.article],
    representative_article: candidate.article,
    topic_keywords: candidate.keywords,
    cluster_size: 1,
    cluster_debug: {
      provider: provider.donor,
      clustering_capabilities: capabilities.similaritySignals.map((signal) => `${signal}`),
      candidate_snapshots: [
        {
          article_id: candidate.article.id,
          fingerprint: provider.support.buildCandidateFingerprint(candidate),
        },
      ],
      merge_decisions: [],
      prevented_merge_count: 0,
      representative_selection_reason: "Selected the only article in the cluster.",
      representative_scores: [
        {
          article_id: candidate.article.id,
          score: 1,
          reasons: ["only article in cluster"],
        },
      ],
      diversity_support_available: capabilities.diversitySupportAvailable,
    },
  };
}

function refreshCluster(cluster: StoryCluster, provider: { donor: string; support: ClusteringSupport }) {
  const candidates = provider.support.prepareClusterCandidates(cluster.articles);
  const representativeSupport = provider.support.selectRepresentativeArticle(candidates);
  const capabilities = provider.support.describeCapabilities();

  cluster.cluster_size = cluster.articles.length;
  cluster.topic_keywords = buildClusterKeywords(candidates);
  cluster.representative_article = representativeSupport.representativeArticle;
  cluster.cluster_debug.provider = provider.donor;
  cluster.cluster_debug.clustering_capabilities = capabilities.similaritySignals.map((signal) => `${signal}`);
  cluster.cluster_debug.candidate_snapshots = candidates.map((candidate) => ({
    article_id: candidate.article.id,
    fingerprint: provider.support.buildCandidateFingerprint(candidate),
  }));
  cluster.cluster_debug.representative_scores = buildRepresentativeScores(representativeSupport);
  cluster.cluster_debug.representative_selection_reason = representativeSupport.reason;
  cluster.cluster_debug.diversity_support_available = capabilities.diversitySupportAvailable;
}

function recordPreventedMerge(
  cluster: StoryCluster,
  candidate: ClusterCandidate,
  decisionSupport: MergeDecisionSupport,
) {
  const preventedDecision: ClusterMergeDecision = {
    article_id: candidate.article.id,
    compared_to_article_id: decisionSupport.representativeArticleId,
    decision: "prevented",
    reasons: decisionSupport.reasons,
    breakdown: buildSimilarityBreakdown(decisionSupport.similaritySignals),
  };

  cluster.cluster_debug.merge_decisions.push(preventedDecision);
  cluster.cluster_debug.prevented_merge_count += 1;
}

function recordAcceptedMerge(
  cluster: StoryCluster,
  candidate: ClusterCandidate,
  decisionSupport: MergeDecisionSupport,
) {
  cluster.cluster_debug.merge_decisions.push({
    article_id: candidate.article.id,
    compared_to_article_id: decisionSupport.representativeArticleId,
    decision: "merged",
    reasons: decisionSupport.reasons,
    breakdown: buildSimilarityBreakdown(decisionSupport.similaritySignals),
  });
}

export function clusterNormalizedArticles(articles: NormalizedArticle[]): StoryCluster[] {
  const provider = getClusteringSupportProvider();
  const diversitySupports = getDiversitySupports();
  const clusters: StoryCluster[] = [];
  const sortedCandidates = provider.support.prepareClusterCandidates(
    articles
      .slice()
      .sort(
        (left, right) =>
          new Date(right.published_at).getTime() - new Date(left.published_at).getTime(),
      ),
  );

  sortedCandidates.forEach((candidate) => {
    const evaluations = clusters.map((cluster) => {
      const clusterCandidates = provider.support.prepareClusterCandidates(cluster.articles);
      const decisionSupport = provider.support.supportMergeDecision(candidate, clusterCandidates);

      return {
        cluster,
        decisionSupport,
      };
    });

    evaluations
      .filter((entry) => !entry.decisionSupport.canMerge)
      .forEach((entry) => {
        recordPreventedMerge(entry.cluster, candidate, entry.decisionSupport);
      });

    const bestMergeCandidate = evaluations
      .filter((entry) => entry.decisionSupport.canMerge)
      .sort(
        (left, right) =>
          right.decisionSupport.similaritySignals.weighted_score - left.decisionSupport.similaritySignals.weighted_score,
      )[0];

    if (!bestMergeCandidate) {
      clusters.push(createCluster(candidate, provider));
      return;
    }

    bestMergeCandidate.cluster.articles.push(candidate.article);
    recordAcceptedMerge(bestMergeCandidate.cluster, candidate, bestMergeCandidate.decisionSupport);
    refreshCluster(bestMergeCandidate.cluster, provider);
  });

  return clusters
    .map((cluster) => {
      if (cluster.cluster_size !== cluster.articles.length) {
        refreshCluster(cluster, provider);
      }

      cluster.cluster_debug.diversity_support_available = diversitySupports.some((support) => support.support.available);
      return cluster;
    })
    .sort((left, right) => right.cluster_size - left.cluster_size);
}
