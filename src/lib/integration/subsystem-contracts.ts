import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { StoryCluster } from "@/lib/models/signal-cluster";
import type { FeedArticle } from "@/lib/rss";

export type CanonicalTopic = "Tech" | "Finance" | "World";

export type SourceClass =
  | "specialist_press"
  | "business_press"
  | "global_wire"
  | "general_newswire";

export type TrustTier = "tier_1" | "tier_2" | "tier_3";

export type SourceStatus = "active" | "inactive";

export type SourceAvailability = "default" | "probationary" | "demo" | "custom";

export type SourceProvenance = "primary_reporting" | "aggregated_wire" | "specialist_analysis";

export type ContractState = "active" | "stubbed" | "future_ready";

export type PipelineSubsystem =
  | "ingestion"
  | "normalization"
  | "clustering"
  | "ranking"
  | "connection"
  | "enrichment";

export type StageOwnership = "canonical" | "donor_assisted";

export interface CanonicalSourceMetadata {
  sourceId: string;
  donor: string;
  source: string;
  homepageUrl: string;
  topic: CanonicalTopic;
  credibility: number;
  reliability: number;
  sourceClass: SourceClass;
  trustTier: TrustTier;
  provenance: SourceProvenance;
  status: SourceStatus;
  availability: SourceAvailability;
}

export interface SourceFetchConfig {
  feedUrl: string;
  timeoutMs?: number;
  retryCount?: number;
  maxItems?: number;
}

export interface SourceDefinition extends CanonicalSourceMetadata {
  fetch: SourceFetchConfig;
  adapterOwner: string;
}

export interface FetchedSourceItem {
  donor: string;
  sourceId: string;
  sourceDefinition: SourceDefinition;
  sourceMetadata: CanonicalSourceMetadata;
  article: FeedArticle;
}

export interface IngestionFetchContext {
  fetchFeed(
    feedUrl: string,
    sourceName: string,
    requestOptions?: {
      timeoutMs?: number;
      retryCount?: number;
      headers?: HeadersInit;
    },
  ): Promise<FeedArticle[]>;
  timeoutMs: number;
  retryCount: number;
}

export interface IngestionAdapter<TSourceDefinition = SourceDefinition> {
  fetchItems(sources: TSourceDefinition[], context: IngestionFetchContext): Promise<FetchedSourceItem[]>;
  normalizeSourceMetadata(source: TSourceDefinition): CanonicalSourceMetadata;
  describeCapabilities(): {
    supportedSourceClasses: SourceClass[];
    supportsRetry: boolean;
    supportsSourceContext: boolean;
  };
}

export interface NormalizationAdapter<TInput = unknown> {
  convertToCanonicalArticle(input: TInput): NormalizedArticle;
}

export interface ClusterCandidate {
  article: NormalizedArticle;
  title_tokens: string[];
  content_tokens: string[];
  keywords: string[];
  specific_keywords: string[];
  normalized_entities: string[];
  event_terms: string[];
  published_at_ms: number;
}

export interface SimilaritySignals {
  title_overlap: number;
  keyword_overlap: number;
  entity_overlap: number;
  content_similarity: number;
  time_proximity: number;
  source_confirmation: number;
  weighted_score: number;
}

export interface MergeDecisionSupport {
  canMerge: boolean;
  reasons: string[];
  similaritySignals: SimilaritySignals;
  representativeArticleId: string;
}

export interface RepresentativeSelectionSupport {
  representativeArticle: NormalizedArticle;
  scores: Array<{
    article_id: string;
    score: number;
    reasons: string[];
  }>;
  reason: string;
}

export interface ClusteringSupport {
  prepareClusterCandidates(articles: NormalizedArticle[]): ClusterCandidate[];
  buildCandidateFingerprint(candidate: ClusterCandidate): string[];
  computeSimilaritySignals(candidate: ClusterCandidate, clusterCandidates: ClusterCandidate[]): SimilaritySignals;
  supportMergeDecision(candidate: ClusterCandidate, clusterCandidates: ClusterCandidate[]): MergeDecisionSupport;
  selectRepresentativeArticle(clusterCandidates: ClusterCandidate[]): RepresentativeSelectionSupport;
  describeCapabilities(): {
    provider: string;
    similaritySignals: Array<keyof SimilaritySignals>;
    representativeSelection: string;
    diversitySupportAvailable: boolean;
  };
}

export interface RankingFeatureProvider {
  describeFeatureSupport(): {
    provider: string;
    supportedFeatures: Array<keyof RankingFeatureSet>;
    trustSignals: string[];
  };
  getKnownSources(): CanonicalSourceMetadata[];
  mapClusterToRankingFeatures(cluster: StoryCluster, allClusters: StoryCluster[]): Partial<RankingFeatureSet>;
}

export interface DiversitySupport {
  available: boolean;
  describeRole(): string;
  evaluateDiversityAdjustment(
    rankedClusters: Array<{
      cluster: StoryCluster;
      features: RankingFeatureSet;
      baseScore: number;
    }>,
  ): DiversityAdjustment[];
}

export interface RankingFeatureSet {
  source_credibility: number;
  trust_tier: number;
  source_confirmation: number;
  recency: number;
  urgency: number;
  novelty: number;
  reinforcement: number;
  cluster_size: number;
  representative_quality: number;
  structural_impact: number;
  downstream_consequence: number;
  actor_significance: number;
  cross_domain_relevance: number;
  actionability_or_decision_value: number;
  persistence_or_endurance: number;
}

export interface DiversityAdjustment {
  cluster_id: string;
  action: "none" | "penalize";
  scoreDelta: number;
  reason: string;
  relatedClusterId?: string;
}

export interface RankingDebug {
  provider: string;
  features: RankingFeatureSet;
  feature_weights: {
    credibility: number;
    novelty: number;
    urgency: number;
    reinforcement: number;
  };
  grouped_scores: {
    trust_timeliness: number;
    event_importance: number;
    support_and_novelty: number;
  };
  diversity: DiversityAdjustment;
  explanation: string;
  active_features: Array<keyof RankingFeatureSet>;
  notes: string[];
}

export type ExplanationMode = "deterministic" | "enriched" | "fallback";

export interface ConnectionLayerPacket {
  what_led_to_this: string;
  what_it_connects_to: string;
  connection_confidence: "high" | "medium" | "low";
  connection_mode: ExplanationMode;
  connection_evidence_summary: string;
  connection_unknowns: string[];
}

export interface ConnectionEvidenceInput {
  title: string;
  topicName: string;
  summary: string;
  eventType: string;
  affectedMarkets: string[];
  topics: string[];
  entities: string[];
  keywords: string[];
  signalStrength: "weak" | "moderate" | "strong";
  confidenceScore: number;
  sourceCount: number;
  signalRole: "core" | "context" | "watch";
  rankingFeatures?: Partial<RankingFeatureSet>;
}

export interface ConnectionSupport {
  describeCapabilities(): {
    provider: string;
    bounded: boolean;
    deterministic_first: boolean;
    supportedFields: Array<keyof ConnectionLayerPacket>;
  };
  buildConnectionLayer(input: ConnectionEvidenceInput): {
    packet: ConnectionLayerPacket;
    debugNotes: string[];
    status: "available" | "fallback" | "declined";
  };
}

export interface CitationSupportSummary {
  source_count: number;
  source_names: string[];
  corroboration: "single_source" | "multi_source";
  strongest_trust_tier: TrustTier | "unknown";
}

export interface ExplanationPacket {
  what_happened: string;
  why_it_matters: string;
  why_this_ranks_here: string;
  what_to_watch: string;
  connection_layer?: ConnectionLayerPacket;
  signal_role: "core" | "context" | "watch";
  confidence: "high" | "medium" | "low";
  unknowns: string[];
  citation_support_summary: CitationSupportSummary;
  explanation_mode: ExplanationMode;
}

export interface TrustLayerDebug {
  evidence_used: string[];
  material_ranking_features: Array<keyof RankingFeatureSet>;
  explanation_mode: ExplanationMode;
  connection: {
    provider: string | null;
    status: "available" | "fallback" | "declined" | "unused";
    mode: ExplanationMode;
    reason: string;
    evidence_used: string[];
  };
  confidence_notes: string[];
  uncertainty_notes: string[];
  deterministic_path_reason: string;
  enrichment: {
    provider: string | null;
    status: "unused" | "used" | "skipped" | "unavailable";
    reason: string;
  };
}

export interface EnrichmentRequest {
  cluster_id: string;
  title: string;
  summary: string;
  what_to_watch: string;
  why_it_matters: string;
  connection_layer?: ConnectionLayerPacket;
  source_count: number;
  material_ranking_features: Array<keyof RankingFeatureSet>;
  unknowns: string[];
}

export interface EnrichmentResult {
  provider: string;
  status: "used" | "skipped" | "unavailable";
  output?: Partial<Pick<ExplanationPacket, "why_it_matters" | "what_to_watch" | "unknowns" | "connection_layer">>;
  notes: string[];
}

export interface EnrichmentSupport {
  enabled: boolean;
  describeCapabilities(): {
    provider: string;
    bounded: boolean;
    schema_safe: boolean;
    output_fields: Array<keyof Pick<ExplanationPacket, "why_it_matters" | "what_to_watch" | "unknowns" | "connection_layer">>;
  };
  prepareEnrichmentPacket(input: {
    cluster: StoryCluster;
    rankingDebug: RankingDebug;
    deterministicExplanation: ExplanationPacket;
  }): EnrichmentRequest | null;
  getStructuredEnrichment(request: EnrichmentRequest): EnrichmentResult;
}
