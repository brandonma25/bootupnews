import type { DonorDefinition } from "@/adapters/donors/types";

export const horizonDefinition: DonorDefinition = {
  donor: "horizon",
  displayName: "Horizon",
  summary: "Optional enrichment donor reserved for later explanation and enrichment support.",
  transformationBoundary:
    "Horizon contributes a stub-safe enrichment contract only; canonical ranking and rendering remain deterministic today.",
  contractStates: {
    ingestion: "stubbed",
    clustering: "stubbed",
    ranking: "stubbed",
    enrichment: "future_ready",
  },
  feeds: [
    {
      donor: "horizon",
      source: "Reuters World",
      feedUrl: "https://feeds.reuters.com/Reuters/worldNews",
      homepageUrl: "https://www.reuters.com/world/",
      topic: "World",
      credibility: 90,
      reliability: 0.91,
      sourceClass: "global_wire",
    },
    {
      donor: "horizon",
      source: "Reuters Business",
      feedUrl: "https://feeds.reuters.com/reuters/businessNews",
      homepageUrl: "https://www.reuters.com/business/",
      topic: "Finance",
      credibility: 90,
      reliability: 0.91,
      sourceClass: "global_wire",
    },
  ],
};
