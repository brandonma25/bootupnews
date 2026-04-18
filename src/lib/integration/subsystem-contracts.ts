import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import type { FeedArticle } from "@/lib/rss";

export type CanonicalTopic = "Tech" | "Finance" | "World";

export type SourceClass =
  | "specialist_press"
  | "business_press"
  | "global_wire"
  | "general_newswire";

export type ContractState = "active" | "stubbed" | "future_ready";

export type PipelineSubsystem =
  | "ingestion"
  | "normalization"
  | "clustering"
  | "ranking"
  | "enrichment";

export type StageOwnership = "canonical" | "donor_assisted";

export interface CanonicalSourceMetadata {
  donor: string;
  source: string;
  homepageUrl: string;
  topic: CanonicalTopic;
  credibility: number;
  reliability: number;
  sourceClass: SourceClass;
}

export interface FetchedSourceItem {
  donor: string;
  feedUrl: string;
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

export interface IngestionAdapter<TFeedConfig extends CanonicalSourceMetadata = CanonicalSourceMetadata> {
  fetchItems(feeds: TFeedConfig[], context: IngestionFetchContext): Promise<FetchedSourceItem[]>;
  normalizeSourceMetadata(feed: TFeedConfig): CanonicalSourceMetadata;
}

export interface NormalizationAdapter<TInput = unknown> {
  convertToCanonicalArticle(input: TInput): NormalizedArticle;
}

export interface ClusteringSupport {
  describeSimilarityStrategy(): string[];
  buildCandidateFingerprint(article: NormalizedArticle): string[];
  describeRepresentativeStrategy(cluster: SignalCluster): string;
}

export interface RankingFeatureProvider {
  getKnownSources(): CanonicalSourceMetadata[];
  mapClusterFeatures(cluster: SignalCluster): {
    credibilityWeights: number[];
    sourceClasses: SourceClass[];
    notes: string[];
  };
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
