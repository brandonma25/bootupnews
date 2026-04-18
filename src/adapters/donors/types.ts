import type {
  ClusteringSupport,
  ContractState,
  EnrichmentSupport,
  IngestionAdapter,
  RankingFeatureProvider,
  SourceAvailability,
  SourceClass,
  SourceDefinition,
  SourceProvenance,
  SourceStatus,
  TrustTier,
} from "@/lib/integration/subsystem-contracts";

export type DonorId = "openclaw" | "after_market_agent" | "fns" | "horizon";

export type DonorFeed = {
  id: string;
  donor: DonorId;
  source: string;
  homepageUrl: string;
  topic: "Tech" | "Finance" | "World";
  credibility: number;
  reliability: number;
  sourceClass: SourceClass;
  trustTier: TrustTier;
  provenance: SourceProvenance;
  status: SourceStatus;
  availability: SourceAvailability;
  fetch: {
    feedUrl: string;
    timeoutMs?: number;
    retryCount?: number;
    maxItems?: number;
  };
};

export type DonorDefinition = {
  donor: DonorId;
  displayName: string;
  summary: string;
  transformationBoundary: string;
  contractStates: {
    ingestion: ContractState;
    clustering: ContractState;
    ranking: ContractState;
    enrichment: ContractState;
  };
  feeds: DonorFeed[];
};

export type DonorModule = DonorDefinition & {
  ingestionAdapter: IngestionAdapter<DonorFeed>;
  clusteringSupport?: ClusteringSupport;
  rankingFeatureProvider?: RankingFeatureProvider;
  enrichmentSupport?: EnrichmentSupport;
};

export type SourceRegistryEntry = SourceDefinition;
