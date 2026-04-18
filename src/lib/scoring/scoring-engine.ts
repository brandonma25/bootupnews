import { getCanonicalSourceMetadata, getRankingFeatureProviders } from "@/adapters/donors";
import type { RankedSignal } from "@/lib/models/ranked-signal";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import type { ClusterScoreLog } from "@/lib/observability/pipeline-run";
import { clipSentence, tokenize } from "@/lib/pipeline/shared/text";

export type RankedClusterResult = {
  ranked: RankedSignal;
  cluster: SignalCluster;
  scoringLog: ClusterScoreLog;
};

const SOURCE_CREDIBILITY: Record<string, number> = {
  "associated press": 88,
  "ars technica": 81,
  marketwatch: 78,
  "reuters business": 90,
  "reuters world": 90,
  "the verge": 74,
};

function getSourceCredibilityMap() {
  const donorSourceEntries = getCanonicalSourceMetadata().map((source) => [source.source.toLowerCase(), source.credibility]);
  return {
    ...SOURCE_CREDIBILITY,
    ...Object.fromEntries(donorSourceEntries),
  };
}

function getProviderCredibilityHints(cluster: SignalCluster) {
  const providers = getRankingFeatureProviders();
  return providers.flatMap(({ provider }) => provider.mapClusterFeatures(cluster).credibilityWeights);
}

function getCredibilityScore(cluster: SignalCluster) {
  const sourceCredibilityMap = getSourceCredibilityMap();
  const sourceScores = cluster.articles.map((article) => sourceCredibilityMap[article.source.toLowerCase()] ?? 68);
  const providerHints = getProviderCredibilityHints(cluster);
  const scores = providerHints.length ? [...sourceScores, ...providerHints] : sourceScores;
  return average(scores);
}

function getNoveltyScore(cluster: SignalCluster, allClusters: SignalCluster[]) {
  const clusterKeywords = cluster.topic_keywords;
  const globalKeywordFrequency = new Map<string, number>();

  allClusters.forEach((entry) => {
    entry.topic_keywords.forEach((keyword) => {
      globalKeywordFrequency.set(keyword, (globalKeywordFrequency.get(keyword) ?? 0) + 1);
    });
  });

  const scarceKeywords = clusterKeywords.filter((keyword) => (globalKeywordFrequency.get(keyword) ?? 0) === 1).length;
  return clamp(45 + scarceKeywords * 9 + clusterKeywords.length * 2, 0, 100);
}

function getUrgencyScore(cluster: SignalCluster) {
  const freshestMs = new Date(cluster.representative_article.published_at).getTime();
  const ageHours = Math.max(0, (Date.now() - freshestMs) / (1000 * 60 * 60));
  const urgencyTokens = tokenize(
    `${cluster.representative_article.title} ${clipSentence(cluster.representative_article.content, 180)}`,
  );
  const urgencyKeywordHits = urgencyTokens.filter((token) =>
    ["breaks", "cut", "cuts", "crisis", "emergency", "outage", "restrict", "review", "tariff"].includes(token),
  ).length;

  return clamp(92 - ageHours * 6 + urgencyKeywordHits * 4, 12, 100);
}

function getReinforcementScore(cluster: SignalCluster) {
  const uniqueSources = new Set(cluster.articles.map((article) => article.source)).size;
  return clamp(30 + cluster.cluster_size * 18 + uniqueSources * 12, 0, 100);
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function rankSignalClusters(clusters: SignalCluster[]): RankedClusterResult[] {
  return clusters
    .map((cluster) => {
      const credibility = Number(getCredibilityScore(cluster).toFixed(2));
      const novelty = Number(getNoveltyScore(cluster, clusters).toFixed(2));
      const urgency = Number(getUrgencyScore(cluster).toFixed(2));
      const reinforcement = Number(getReinforcementScore(cluster).toFixed(2));
      const score = Number(
        (0.3 * credibility + 0.25 * novelty + 0.25 * urgency + 0.2 * reinforcement).toFixed(2),
      );

      return {
        ranked: {
          cluster_id: cluster.cluster_id,
          score,
          score_breakdown: {
            credibility,
            novelty,
            urgency,
            reinforcement,
          },
        },
        cluster,
        scoringLog: {
          cluster_id: cluster.cluster_id,
          credibility,
          novelty,
          urgency,
          cluster_size: cluster.cluster_size,
          final_score: score,
        },
      };
    })
    .sort((left, right) => {
      const scoreDelta = right.ranked.score - left.ranked.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.cluster.cluster_size - left.cluster.cluster_size;
    });
}
