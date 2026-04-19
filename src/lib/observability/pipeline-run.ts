import {
  DEFAULT_DONOR_FEED_IDS,
  PROBATIONARY_RUNTIME_FEED_IDS,
} from "@/adapters/donors";
import { MVP_DEFAULT_PUBLIC_SOURCE_IDS } from "@/lib/demo-data";
import type { SourceDefinition } from "@/lib/integration/subsystem-contracts";

export type RuntimeSourceResolutionMode = "no_argument_runtime" | "supplied_sources";

export type RuntimeSourceResolutionSnapshot = {
  resolution_mode: RuntimeSourceResolutionMode;
  mvp_default_public_source_ids: string[];
  donor_fallback_default_ids: string[];
  probationary_runtime_source_ids: string[];
  resolved_runtime_source_ids: string[];
  resolved_default_donor_source_ids: string[];
  resolved_probationary_source_ids: string[];
  resolved_other_source_ids: string[];
};

export function buildRuntimeSourceResolutionSnapshot(input: {
  resolutionMode: RuntimeSourceResolutionMode;
  resolvedSources: SourceDefinition[];
}): RuntimeSourceResolutionSnapshot {
  const donorDefaultIds = [...DEFAULT_DONOR_FEED_IDS];
  const probationaryRuntimeIds = [...PROBATIONARY_RUNTIME_FEED_IDS];
  const resolvedRuntimeSourceIds = input.resolvedSources.map((source) => source.sourceId);
  const donorDefaultIdSet = new Set<string>(donorDefaultIds);
  const probationaryRuntimeIdSet = new Set<string>(probationaryRuntimeIds);

  return {
    resolution_mode: input.resolutionMode,
    mvp_default_public_source_ids: [...MVP_DEFAULT_PUBLIC_SOURCE_IDS],
    donor_fallback_default_ids: donorDefaultIds,
    probationary_runtime_source_ids: probationaryRuntimeIds,
    resolved_runtime_source_ids: resolvedRuntimeSourceIds,
    resolved_default_donor_source_ids: resolvedRuntimeSourceIds.filter((sourceId) => donorDefaultIdSet.has(sourceId)),
    resolved_probationary_source_ids: resolvedRuntimeSourceIds.filter((sourceId) => probationaryRuntimeIdSet.has(sourceId)),
    resolved_other_source_ids: resolvedRuntimeSourceIds.filter(
      (sourceId) => !donorDefaultIdSet.has(sourceId) && !probationaryRuntimeIdSet.has(sourceId),
    ),
  };
}

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
  source_resolution: RuntimeSourceResolutionSnapshot | null;
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
    source_resolution: null,
    active_sources: [],
    source_contributions: [],
    used_seed_fallback: false,
  };
}
