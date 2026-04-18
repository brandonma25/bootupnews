import type { DonorDefinition } from "@/adapters/donors/types";

export const openclawDefinition: DonorDefinition = {
  donor: "openclaw",
  displayName: "openclaw-newsroom",
  summary: "Ingestion-ops donor that contributes feed transport and source metadata patterns.",
  transformationBoundary:
    "openclaw contributes feed discovery and ingestion shell patterns, while the website keeps canonical RawItem generation.",
  contractStates: {
    ingestion: "active",
    clustering: "stubbed",
    ranking: "stubbed",
    enrichment: "future_ready",
  },
  feeds: [
    {
      id: "openclaw-the-verge",
      donor: "openclaw",
      source: "The Verge",
      homepageUrl: "https://www.theverge.com",
      topic: "Tech",
      credibility: 74,
      reliability: 0.74,
      sourceClass: "specialist_press",
      trustTier: "tier_2",
      provenance: "specialist_analysis",
      status: "active",
      availability: "default",
      fetch: {
        feedUrl: "https://www.theverge.com/rss/index.xml",
        timeoutMs: 4500,
        retryCount: 1,
        maxItems: 6,
      },
    },
    {
      id: "openclaw-ars-technica",
      donor: "openclaw",
      source: "Ars Technica",
      homepageUrl: "https://arstechnica.com",
      topic: "Tech",
      credibility: 81,
      reliability: 0.8,
      sourceClass: "specialist_press",
      trustTier: "tier_1",
      provenance: "specialist_analysis",
      status: "active",
      availability: "default",
      fetch: {
        feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
        timeoutMs: 4500,
        retryCount: 1,
        maxItems: 6,
      },
    },
  ],
};
