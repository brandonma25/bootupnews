import type {
  ClusteringSupport,
  ContractState,
  EnrichmentSupport,
  IngestionAdapter,
  RankingFeatureProvider,
  SourceClass,
} from "@/lib/integration/subsystem-contracts";

export type DonorId = "openclaw" | "after_market_agent" | "fns" | "horizon";

export type DonorFeed = {
  donor: DonorId;
  source: string;
  feedUrl: string;
  homepageUrl: string;
  topic: "Tech" | "Finance" | "World";
  credibility: number;
  reliability: number;
  sourceClass: SourceClass;
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
