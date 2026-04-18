import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import type { FeedArticle } from "@/lib/rss";

export type CanonicalTopic = "Tech" | "Finance" | "World";

export type SourceClass =
  | "specialist_press"
  | "business_press"
  | "global_wire"
  | "general_newswire";

export type TrustTier = "tier_1" | "tier_2" | "tier_3";

export type SourceStatus = "active" | "inactive";

export type SourceAvailability = "default" | "demo" | "custom";

export type SourceProvenance = "primary_reporting" | "aggregated_wire" | "specialist_analysis";

export type ContractState = "active" | "stubbed" | "future_ready";

export type PipelineSubsystem =
  | "ingestion"
  | "normalization"
  | "clustering"
  | "ranking"
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
  mapClusterToRankingFeatures(cluster: SignalCluster, allClusters: SignalCluster[]): Partial<RankingFeatureSet>;
}

export interface DiversitySupport {
  available: boolean;
  describeRole(): string;
  evaluateDiversityAdjustment(
    rankedClusters: Array<{
      cluster: SignalCluster;
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
  diversity: DiversityAdjustment;
  notes: string[];
}

export interface EnrichmentSupport {
  enabled: boolean;
  prepareEnrichmentPacket(cluster: SignalCluster): {
    clusterId: string;
    title: string;
    summary: string;
    sourceCount: number;
  } | null;
}
