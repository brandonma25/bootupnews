import type { RankingDebug } from "@/lib/integration/subsystem-contracts";

export interface RankedStoryCluster {
  cluster_id: string;
  score: number;
  score_breakdown: {
    credibility: number;
    novelty: number;
    urgency: number;
    reinforcement: number;
  };
  ranking_debug: RankingDebug;
}

/**
 * @deprecated Use RankedStoryCluster. This object is ranked Story Cluster
 * evidence keyed by cluster_id, not canonical Signal identity.
 */
export type RankedSignal = RankedStoryCluster;
