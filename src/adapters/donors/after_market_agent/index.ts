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
      id: "after-market-agent-marketwatch",
      donor: "after_market_agent",
      source: "MarketWatch",
      homepageUrl: "https://www.marketwatch.com",
      topic: "Finance",
      credibility: 78,
      reliability: 0.78,
      sourceClass: "business_press",
      trustTier: "tier_2",
      provenance: "specialist_analysis",
      status: "active",
      availability: "default",
      fetch: {
        feedUrl: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
        timeoutMs: 5000,
        retryCount: 1,
        maxItems: 6,
      },
    },
  ],
};
