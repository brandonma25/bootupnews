import { buildEventIntelligence } from "@/lib/event-intelligence";
import type { FeedArticle } from "@/lib/rss";
import type { BriefingItem, EventIntelligence } from "@/lib/types";

type ArticleCluster = {
  representative: FeedArticle;
  sources: FeedArticle[];
};

export type RankedArticleCluster = ArticleCluster & {
  importanceScore: number;
  importanceLabel: "Critical" | "High" | "Watch";
  // Legacy display evidence labels for BriefingItem cards, not canonical Signal objects.
  rankingSignals: string[];
  eventIntelligence: EventIntelligence;
};

/**
 * @deprecated Use RankedArticleCluster. This legacy path ranks Article Cluster
 * evidence for BriefingItem display and does not create canonical Signal identity.
 */
export type RankedCluster = RankedArticleCluster;

export function rankNewsClusters(
  topicName: string,
  clusters: ArticleCluster[],
): RankedArticleCluster[] {
  return clusters
    .map((cluster) => rankCluster(topicName, cluster))
    .filter((cluster) => cluster.eventIntelligence.isHighSignal)
    .sort(compareRankedClusters);
}

function rankCluster(topicName: string, cluster: ArticleCluster): RankedArticleCluster {
  const eventIntelligence = buildEventIntelligence(cluster.sources, {
    topicName,
    createdAt: cluster.representative.publishedAt,
  });
  const importanceScore = eventIntelligence.rankingScore;

  const rankingSignals = [
    eventIntelligence.rankingReason,
    eventIntelligence.signals.sourceDiversity >= 3
      ? `Confirmed by ${eventIntelligence.signals.sourceDiversity} independent sources.`
      : "Still early coverage with limited source confirmation.",
    eventIntelligence.signals.velocityScore >= 65
      ? "Coverage velocity is increasing."
      : "Coverage is moving at a steadier pace.",
    `Confidence ${eventIntelligence.confidenceScore}/100.`,
  ];

  return {
    ...cluster,
    importanceScore,
    importanceLabel:
      importanceScore >= 80 ? "Critical" : importanceScore >= 65 ? "High" : "Watch",
    rankingSignals,
    eventIntelligence,
  };
}

export function compareRankedClusters(left: RankedArticleCluster, right: RankedArticleCluster) {
  const scoreDelta = right.eventIntelligence.rankingScore - left.eventIntelligence.rankingScore;
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const confidenceDelta =
    right.eventIntelligence.confidenceScore - left.eventIntelligence.confidenceScore;
  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  const freshnessDelta =
    getTimestamp(right.representative.publishedAt) - getTimestamp(left.representative.publishedAt);
  if (freshnessDelta !== 0) {
    return freshnessDelta;
  }

  return left.representative.title.localeCompare(right.representative.title);
}

type BriefingRankSnapshot = {
  isHighSignal: boolean;
  rankingScore: number;
  confidenceScore: number;
  freshestTimestamp: number;
  sourceDiversity: number;
};

export function compareBriefingItemsByRanking(left: BriefingItem, right: BriefingItem) {
  const leftSnapshot = getBriefingRankSnapshot(left);
  const rightSnapshot = getBriefingRankSnapshot(right);

  if (leftSnapshot.isHighSignal !== rightSnapshot.isHighSignal) {
    return Number(rightSnapshot.isHighSignal) - Number(leftSnapshot.isHighSignal);
  }

  const scoreDelta = rightSnapshot.rankingScore - leftSnapshot.rankingScore;
  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const confidenceDelta = rightSnapshot.confidenceScore - leftSnapshot.confidenceScore;
  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  const freshnessDelta = rightSnapshot.freshestTimestamp - leftSnapshot.freshestTimestamp;
  if (freshnessDelta !== 0) {
    return freshnessDelta;
  }

  const sourceDelta = rightSnapshot.sourceDiversity - leftSnapshot.sourceDiversity;
  if (sourceDelta !== 0) {
    return sourceDelta;
  }

  return left.title.localeCompare(right.title);
}

export function sortBriefingItemsByRanking(items: BriefingItem[]) {
  return items.slice().sort(compareBriefingItemsByRanking);
}

export function getBriefingRankSnapshot(item: BriefingItem): BriefingRankSnapshot {
  const intelligence = item.eventIntelligence;
  const rankingScore = intelligence?.rankingScore ?? item.importanceScore ?? 0;
  const confidenceScore = intelligence?.confidenceScore ?? 0;
  const sourceDiversity =
    intelligence?.signals.sourceDiversity ??
    item.sourceCount ??
    new Set(item.sources.map((source) => source.title)).size;

  return {
    isHighSignal:
      intelligence?.isHighSignal ??
      (rankingScore >= 45 && (sourceDiversity >= 2 || (item.relatedArticles?.length ?? 0) >= 2)),
    rankingScore,
    confidenceScore,
    freshestTimestamp: getTimestamp(item.publishedAt ?? intelligence?.createdAt),
    sourceDiversity,
  };
}

// Returns Card display labels derived from ranking evidence, not canonical
// Signal objects.
export function buildRankingDisplaySignals(item: BriefingItem) {
  const intelligence = item.eventIntelligence;
  const articleCount =
    intelligence?.signals.articleCount ??
    item.timeline?.reduce((count, group) => count + group.entries.length, 0) ??
    item.relatedArticles?.length ??
    item.sources.length;
  const sourceCount =
    intelligence?.signals.sourceDiversity ??
    item.sourceCount ??
    new Set(item.sources.map((source) => source.title)).size;
  const signals = [
    buildUpdatedLabel(item.publishedAt ?? intelligence?.createdAt),
    articleCount > 0 ? `Covered by ${articleCount} ${articleCount === 1 ? "article" : "articles"}` : null,
    sourceCount > 0 ? `Seen across ${sourceCount} ${sourceCount === 1 ? "source" : "sources"}` : null,
    intelligence?.signals.velocityScore && intelligence.signals.velocityScore >= 70
      ? "Rapidly developing"
      : null,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(signals)].slice(0, 4);
}

function buildUpdatedLabel(value: string | undefined) {
  const timestamp = getTimestamp(value);
  if (!timestamp) {
    return null;
  }

  const ageHours = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
  if (ageHours < 1) {
    return "Updated <1h ago";
  }

  if (ageHours < 24) {
    return `Updated ${Math.round(ageHours)}h ago`;
  }

  const ageDays = Math.round(ageHours / 24);
  return `Updated ${ageDays}d ago`;
}

function getTimestamp(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
