import type {
  ClusteringSupport,
  ConnectionSupport,
  ContractState,
  DiversitySupport,
  EnrichmentSupport,
  IngestionAdapter,
  RankingFeatureProvider,
  SourceAvailability,
  SourceClass,
  SourceDefinition,
  SourceDomainScope,
  SourceProductCategoryKey,
  SourceProvenance,
  SourceStatus,
  TrustTier,
} from "@/lib/integration/subsystem-contracts";
import type { SourceRole } from "@/lib/source-accessibility-types";

export type DonorId = "openclaw" | "after_market_agent" | "fns" | "horizon";

export type DonorFeed = {
  id: string;
  donor: DonorId;
  source: string;
  homepageUrl: string;
  topic: "Tech" | "Finance" | "World";
  domainScope?: SourceDomainScope;
  defaultCategory?: SourceProductCategoryKey;
  credibility: number;
  reliability: number;
  sourceClass: SourceClass;
  trustTier: TrustTier;
  provenance: SourceProvenance;
  status: SourceStatus;
  availability: SourceAvailability;
  sourceRole?: SourceRole;
  publicEligible?: boolean;
  suppliedByManifest?: boolean;
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
    connection: ContractState;
    enrichment: ContractState;
  };
  feeds: DonorFeed[];
};

export type DonorModule = DonorDefinition & {
  ingestionAdapter: IngestionAdapter<DonorFeed>;
  clusteringSupport?: ClusteringSupport;
  connectionSupport?: ConnectionSupport;
  diversitySupport?: DiversitySupport;
  rankingFeatureProvider?: RankingFeatureProvider;
  enrichmentSupport?: EnrichmentSupport;
};

export type SourceRegistryEntry = SourceDefinition;
