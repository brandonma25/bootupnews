import type { DonorDefinition } from "@/adapters/donors/types";

export const fnsDefinition: DonorDefinition = {
  donor: "fns",
  displayName: "FINANCIAL-NEWS-SUMMARIZER",
  summary: "Ranking-method donor that contributes deterministic source-quality feature mapping.",
  transformationBoundary:
    "FNS contributes ranking feature heuristics and source metadata translation, while the website keeps the final deterministic scoring model.",
  contractStates: {
    ingestion: "stubbed",
    clustering: "stubbed",
    ranking: "active",
    connection: "stubbed",
    enrichment: "future_ready",
  },
  feeds: [
    {
      id: "fns-associated-press",
      donor: "fns",
      source: "Associated Press",
      homepageUrl: "https://apnews.com",
      topic: "World",
      credibility: 88,
      reliability: 0.88,
      sourceClass: "general_newswire",
      trustTier: "tier_1",
      provenance: "aggregated_wire",
      status: "active",
      availability: "default",
      fetch: {
        feedUrl: "https://apnews.com/hub/ap-top-news?output=xml",
        timeoutMs: 5000,
        retryCount: 1,
        maxItems: 6,
      },
    },
  ],
};
