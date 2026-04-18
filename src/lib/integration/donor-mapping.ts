import { getDonorRegistrySnapshot } from "@/adapters/donors";
import type {
  ContractState,
  PipelineSubsystem,
} from "@/lib/integration/subsystem-contracts";

export type DonorSubsystemMapping = {
  donor: string;
  subsystem: PipelineSubsystem;
  state: ContractState;
  canonicalOwner: string;
  boundary: string;
};

const CANONICAL_OWNERS: Record<PipelineSubsystem, string> = {
  ingestion: "src/lib/pipeline/ingestion/index.ts",
  normalization: "src/lib/pipeline/normalization/index.ts",
  clustering: "src/lib/pipeline/clustering/index.ts",
  ranking: "src/lib/scoring/scoring-engine.ts",
  connection: "src/lib/explanation-support.ts",
  enrichment: "src/lib/data.ts",
};

export function getDonorSubsystemMappings(): DonorSubsystemMapping[] {
  return getDonorRegistrySnapshot().flatMap((entry) => [
    {
      donor: entry.donor,
      subsystem: "ingestion" as const,
      state: entry.contractStates.ingestion,
      canonicalOwner: CANONICAL_OWNERS.ingestion,
      boundary: entry.transformationBoundary,
    },
    {
      donor: entry.donor,
      subsystem: "clustering" as const,
      state: entry.contractStates.clustering,
      canonicalOwner: CANONICAL_OWNERS.clustering,
      boundary: entry.transformationBoundary,
    },
    {
      donor: entry.donor,
      subsystem: "ranking" as const,
      state: entry.contractStates.ranking,
      canonicalOwner: CANONICAL_OWNERS.ranking,
      boundary: entry.transformationBoundary,
    },
    {
      donor: entry.donor,
      subsystem: "connection" as const,
      state: entry.contractStates.connection,
      canonicalOwner: CANONICAL_OWNERS.connection,
      boundary: entry.transformationBoundary,
    },
    {
      donor: entry.donor,
      subsystem: "enrichment" as const,
      state: entry.contractStates.enrichment,
      canonicalOwner: CANONICAL_OWNERS.enrichment,
      boundary: entry.transformationBoundary,
    },
  ]);
}

export function getActiveDonorMappings() {
  return getDonorSubsystemMappings().filter((entry) => entry.state === "active");
}
