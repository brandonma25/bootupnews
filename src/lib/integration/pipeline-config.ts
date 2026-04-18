import { getDonorRegistrySnapshot } from "@/adapters/donors";
import type {
  ContractState,
  PipelineSubsystem,
  StageOwnership,
} from "@/lib/integration/subsystem-contracts";

export type PipelineStageConfig = {
  stage: PipelineSubsystem | "dedup" | "digest";
  ownership: StageOwnership;
  canonicalModule: string;
  donorIds: string[];
  notes: string;
};

export const PIPELINE_STAGE_CONFIG: PipelineStageConfig[] = [
  {
    stage: "ingestion",
    ownership: "donor_assisted",
    canonicalModule: "src/lib/pipeline/ingestion/index.ts",
    donorIds: ["openclaw"],
    notes: "Canonical ingestion stage uses donor-backed feed metadata and fetch adapters.",
  },
  {
    stage: "normalization",
    ownership: "canonical",
    canonicalModule: "src/lib/pipeline/normalization/index.ts",
    donorIds: [],
    notes: "Canonical normalizer owns RawItem -> NormalizedArticle conversion.",
  },
  {
    stage: "dedup",
    ownership: "canonical",
    canonicalModule: "src/lib/pipeline/dedup/index.ts",
    donorIds: [],
    notes: "Dedup remains canonical and deterministic.",
  },
  {
    stage: "clustering",
    ownership: "donor_assisted",
    canonicalModule: "src/lib/pipeline/clustering/index.ts",
    donorIds: ["after_market_agent"],
    notes: "Canonical clusterer stays local while exposing donor-derived support strategy boundaries.",
  },
  {
    stage: "ranking",
    ownership: "donor_assisted",
    canonicalModule: "src/lib/scoring/scoring-engine.ts",
    donorIds: ["fns"],
    notes: "Deterministic scoring remains canonical and accepts donor-mapped ranking features.",
  },
  {
    stage: "digest",
    ownership: "canonical",
    canonicalModule: "src/lib/pipeline/digest/index.ts",
    donorIds: [],
    notes: "Digest assembly remains fully canonical.",
  },
  {
    stage: "enrichment",
    ownership: "donor_assisted",
    canonicalModule: "src/lib/data.ts",
    donorIds: ["horizon"],
    notes: "Horizon enrichment contract is stub-safe and not required for current runtime output.",
  },
];

export function getPipelineIntegrationSnapshot() {
  const donorSnapshot = getDonorRegistrySnapshot();

  return {
    active_donors: donorSnapshot.map((entry) => entry.donor),
    donor_contracts: donorSnapshot.map((entry) => ({
      donor: entry.donor,
      states: entry.contractStates,
      transformationBoundary: entry.transformationBoundary,
    })),
    stages: PIPELINE_STAGE_CONFIG,
  };
}

export function getStageOwnership(stage: PipelineStageConfig["stage"]): StageOwnership {
  return PIPELINE_STAGE_CONFIG.find((entry) => entry.stage === stage)?.ownership ?? "canonical";
}

export function getContractStateSummary() {
  const donorSnapshot = getDonorRegistrySnapshot();

  return donorSnapshot.reduce<Record<PipelineSubsystem, ContractState[]>>(
    (summary, entry) => {
      summary.ingestion.push(entry.contractStates.ingestion);
      summary.normalization.push("stubbed");
      summary.clustering.push(entry.contractStates.clustering);
      summary.ranking.push(entry.contractStates.ranking);
      summary.enrichment.push(entry.contractStates.enrichment);
      return summary;
    },
    {
      ingestion: [],
      normalization: [],
      clustering: [],
      ranking: [],
      enrichment: [],
    },
  );
}
