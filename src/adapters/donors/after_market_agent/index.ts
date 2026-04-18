import type { DonorDefinition } from "@/adapters/donors/types";

export const afterMarketAgentDefinition: DonorDefinition = {
  donor: "after_market_agent",
  displayName: "after-market-agent",
  summary: "Cluster-first architecture donor that informs clustering and representative selection boundaries.",
  transformationBoundary:
    "after-market-agent contributes clustering-support patterns and finance-oriented feed hints without replacing canonical clustering logic.",
  contractStates: {
    ingestion: "stubbed",
    clustering: "active",
    ranking: "stubbed",
    enrichment: "future_ready",
  },
  feeds: [
    {
      donor: "after_market_agent",
      source: "MarketWatch",
      feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
      homepageUrl: "https://www.marketwatch.com",
      topic: "Finance",
      credibility: 78,
      reliability: 0.78,
      sourceClass: "business_press",
    },
  ],
};
