export type ClusterScoreLog = {
  cluster_id: string;
  provider: string;
  credibility: number;
  novelty: number;
  urgency: number;
  reinforcement: number;
  trust_timeliness: number;
  event_importance: number;
  support_and_novelty: number;
  importance_adjustment: number;
  cluster_size: number;
  final_score: number;
  diversity_action: string;
  diversity_reason: string;
  ranking_explanation: string;
};

export type PipelineRun = {
  run_id: string;
  timestamp: string;
  num_raw_items: number;
  num_after_dedup: number;
  num_clusters: number;
  avg_cluster_size: number;
  singleton_count: number;
  prevented_merge_count: number;
  top_scores: number[];
  scoring_breakdown: ClusterScoreLog[];
  ranking_provider: string | null;
  diversity_provider: string | null;
  suppressed_ranked_clusters: Array<{
    cluster_id: string;
    action: string;
    reason: string;
    score_delta: number;
    related_cluster_id?: string;
  }>;
  sample_cluster_rationale: Array<{
    cluster_id: string;
    representative_title: string;
    cluster_size: number;
    topic_keywords: string[];
    representative_selection_reason: string;
    recent_merge_reasons: string[];
  }>;
  feed_failures: Array<{
    source: string;
    feedUrl: string;
    error: string;
  }>;
  active_sources: Array<{
    source_id: string;
    source: string;
    donor: string;
    source_class: string;
    trust_tier: string;
  }>;
  source_contributions: Array<{
    source_id: string;
    source: string;
    donor: string;
    source_class: string;
    trust_tier: string;
    item_count: number;
  }>;
  used_seed_fallback: boolean;
};

export function createEmptyPipelineRun(runId: string): PipelineRun {
  return {
    run_id: runId,
    timestamp: new Date().toISOString(),
    num_raw_items: 0,
    num_after_dedup: 0,
    num_clusters: 0,
    avg_cluster_size: 0,
    singleton_count: 0,
    prevented_merge_count: 0,
    top_scores: [],
    scoring_breakdown: [],
    ranking_provider: null,
    diversity_provider: null,
    suppressed_ranked_clusters: [],
    sample_cluster_rationale: [],
    feed_failures: [],
    active_sources: [],
    source_contributions: [],
    used_seed_fallback: false,
  };
}
