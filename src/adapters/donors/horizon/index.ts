import type { DonorDefinition } from "@/adapters/donors/types";

export const horizonDefinition: DonorDefinition = {
  donor: "horizon",
  displayName: "Horizon",
  summary: "Optional enrichment donor that now exposes a safe schema-bound explanation and connection enrichment boundary.",
  transformationBoundary:
    "Horizon contributes an optional schema-safe enrichment boundary for explanation and connection context; canonical ranking, explanation assembly, and rendering remain deterministic by default.",
  contractStates: {
    ingestion: "active",
    clustering: "stubbed",
    ranking: "stubbed",
    connection: "future_ready",
    enrichment: "active",
  },
  feeds: [
    {
      id: "horizon-reuters-world",
      donor: "horizon",
      source: "Reuters World",
      homepageUrl: "https://www.reuters.com/world/",
      topic: "World",
      credibility: 90,
      reliability: 0.91,
      sourceClass: "global_wire",
      trustTier: "tier_1",
      provenance: "aggregated_wire",
      status: "active",
      availability: "default",
      fetch: {
        feedUrl: "https://feeds.reuters.com/Reuters/worldNews",
        timeoutMs: 5000,
        retryCount: 1,
        maxItems: 6,
      },
    },
    {
      id: "horizon-reuters-business",
      donor: "horizon",
      source: "Reuters Business",
      homepageUrl: "https://www.reuters.com/business/",
      topic: "Finance",
      credibility: 90,
      reliability: 0.91,
      sourceClass: "global_wire",
      trustTier: "tier_1",
      provenance: "aggregated_wire",
      status: "active",
      availability: "default",
      fetch: {
        feedUrl: "https://feeds.reuters.com/reuters/businessNews",
        timeoutMs: 5000,
        retryCount: 1,
        maxItems: 6,
      },
    },
  ],
};
