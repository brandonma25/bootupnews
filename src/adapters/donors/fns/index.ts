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
    enrichment: "future_ready",
  },
  feeds: [
    {
      donor: "fns",
      source: "Associated Press",
      feedUrl: "https://apnews.com/hub/ap-top-news?output=xml",
      homepageUrl: "https://apnews.com",
      topic: "World",
      credibility: 88,
      reliability: 0.88,
      sourceClass: "general_newswire",
    },
  ],
};
