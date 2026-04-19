import type { NormalizedArticle } from "@/lib/models/normalized-article";

export interface ClusterCandidateSnapshot {
  article_id: string;
  fingerprint: string[];
}

export interface ClusterSimilarityBreakdown {
  title_similarity: number;
  keyword_overlap: number;
  entity_overlap: number;
  content_similarity: number;
  time_proximity: number;
  source_confirmation: number;
  weighted_score: number;
}

export interface ClusterMergeDecision {
  article_id: string;
  compared_to_article_id: string;
  decision: "merged" | "prevented";
  reasons: string[];
  breakdown: ClusterSimilarityBreakdown;
}

export interface ClusterRepresentativeScore {
  article_id: string;
  score: number;
  reasons: string[];
}

export interface ClusterDebug {
  provider: string;
  clustering_capabilities: string[];
  candidate_snapshots: ClusterCandidateSnapshot[];
  merge_decisions: ClusterMergeDecision[];
  prevented_merge_count: number;
  representative_selection_reason: string;
  representative_scores: ClusterRepresentativeScore[];
  diversity_support_available: boolean;
}

export interface SignalCluster {
  cluster_id: string;
  articles: NormalizedArticle[];
  representative_article: NormalizedArticle;
  topic_keywords: string[];
  cluster_size: number;
  cluster_debug: ClusterDebug;
}
