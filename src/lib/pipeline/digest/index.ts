import type { StoryCluster } from "@/lib/models/signal-cluster";
import type { RankedStoryCluster } from "@/lib/models/ranked-signal";
import { clipSentence } from "@/lib/pipeline/shared/text";

type RankedClusterView = {
  cluster: StoryCluster;
  ranked: RankedStoryCluster;
};

export type DigestOutput = {
  most_important_now: Array<{
    cluster_id: string;
    title: string;
    short_summary: string;
    source_links: Array<{ title: string; url: string }>;
    score: number;
    score_breakdown: RankedStoryCluster["score_breakdown"];
    cluster_size: number;
    topic_keywords: string[];
  }>;
};

export function buildDigestOutput(rankedClusters: RankedClusterView[]): DigestOutput {
  return {
    most_important_now: rankedClusters.slice(0, 5).map(({ cluster, ranked }) => {
      const uniqueSources = [...new Set(cluster.articles.map((article) => article.source))];
      const sourceLinks = cluster.articles.slice(0, 4).map((article) => ({
        title: article.source,
        url: article.url,
      }));

      return {
        cluster_id: cluster.cluster_id,
        title: cluster.representative_article.title,
        short_summary: `${cluster.cluster_size} articles across ${uniqueSources.length} sources are converging on ${cluster.topic_keywords.slice(0, 3).join(", ")}. ${clipSentence(cluster.representative_article.content, 150)}`,
        source_links: sourceLinks,
        score: ranked.score,
        score_breakdown: ranked.score_breakdown,
        cluster_size: cluster.cluster_size,
        topic_keywords: cluster.topic_keywords,
      };
    }),
  };
}
