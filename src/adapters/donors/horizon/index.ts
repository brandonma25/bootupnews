import type { DonorDefinition } from "@/adapters/donors/types";

export const horizonDefinition: DonorDefinition = {
  donor: "horizon",
  displayName: "Horizon",
  summary: "Optional enrichment donor reserved for later explanation and enrichment support.",
  transformationBoundary:
    "Horizon contributes a stub-safe enrichment contract only; canonical ranking and rendering remain deterministic today.",
  contractStates: {
    ingestion: "active",
    clustering: "stubbed",
    ranking: "stubbed",
    enrichment: "future_ready",
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
