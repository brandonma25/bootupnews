import { subDays } from "date-fns";

import { env } from "@/lib/env";
import type { DashboardData, DailyBriefing, Source, Topic } from "@/lib/types";

const today = new Date().toISOString();

export const demoTopics: Topic[] = [
  {
    id: "topic-tech",
    name: "Tech",
    description: "AI, platforms, software, devices, and high-signal technology news.",
    color: "#1F4F46",
  },
  {
    id: "topic-finance",
    name: "Finance",
    description: "Markets, companies, macro moves, and business news that matter today.",
    color: "#73563c",
  },
  {
    id: "topic-politics",
    name: "Politics",
    description: "Government, regulation, geopolitics, and policy shifts affecting the operating environment.",
    color: "#35506b",
  },
];

export const demoSources: Source[] = [
  {
    id: "source-verge",
    name: "The Verge",
    feedUrl: "https://www.theverge.com/rss/index.xml",
    homepageUrl: "https://www.theverge.com",
    topicId: "topic-tech",
    topicName: "Tech",
    status: "active",
  },
  {
    id: "source-ars",
    name: "Ars Technica",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/index",
    homepageUrl: "https://arstechnica.com",
    topicId: "topic-tech",
    topicName: "Tech",
    status: "active",
  },
  {
    id: "source-tldr-tech",
    name: "TLDR",
    feedUrl: "https://tldr.tech/rss",
    homepageUrl: "https://tldr.tech",
    topicId: "topic-tech",
    topicName: "Tech",
    status: "active",
  },
  {
    id: "source-techcrunch",
    name: "TechCrunch",
    feedUrl: "https://techcrunch.com/feed/",
    homepageUrl: "https://techcrunch.com",
    topicId: "topic-tech",
    topicName: "Tech",
    status: "active",
  },
  {
    id: "source-ft",
    name: "Financial Times",
    feedUrl: "https://www.ft.com/rss/home",
    homepageUrl: "https://www.ft.com",
    topicId: "topic-finance",
    topicName: "Finance",
    status: "active",
  },
  {
    id: "source-marketwatch",
    name: "MarketWatch",
    feedUrl: "https://www.marketwatch.com/rss/topstories",
    homepageUrl: "https://www.marketwatch.com",
    topicId: "topic-finance",
    topicName: "Finance",
    status: "active",
  },
  {
    id: "source-zerohedge",
    name: "ZeroHedge",
    feedUrl: "https://feeds.feedburner.com/zerohedge/feed",
    homepageUrl: "https://www.zerohedge.com",
    topicId: "topic-finance",
    topicName: "Finance",
    status: "active",
  },
  {
    id: "source-ap-top-news",
    name: "AP Top News",
    feedUrl: "https://apnews.com/hub/apf-topnews?output=rss",
    homepageUrl: "https://apnews.com",
    topicId: "topic-politics",
    topicName: "Geopolitics",
    status: "active",
  },
  ...(env.newsApiKey
    ? ([
        {
          id: "source-newsapi-business",
          name: "NewsAPI Business",
          feedUrl: "newsapi://newsapi.org/v2/top-headlines?category=business&country=us",
          homepageUrl: "https://newsapi.org",
          topicId: "topic-finance",
          topicName: "Finance",
          status: "active",
        },
      ] satisfies Source[])
    : []),
];

export const MVP_DEFAULT_PUBLIC_SOURCE_IDS = [
  "source-verge",
  "source-ars",
  "source-tldr-tech",
  "source-techcrunch",
  "source-ft",
] as const;

export function getMvpDefaultPublicSources(): Source[] {
  const sourcesById = new Map(demoSources.map((source) => [source.id, source]));

  return MVP_DEFAULT_PUBLIC_SOURCE_IDS.map((sourceId) => {
    const source = sourcesById.get(sourceId);

    if (!source) {
      throw new Error(`MVP default public source ${sourceId} is not defined in demoSources`);
    }

    return source;
  });
}

export function areMvpDefaultPublicSources(sources: Source[]): boolean {
  return (
    sources.length === MVP_DEFAULT_PUBLIC_SOURCE_IDS.length &&
    sources.every((source, index) => source.id === MVP_DEFAULT_PUBLIC_SOURCE_IDS[index])
  );
}

export const demoBriefing: DailyBriefing = {
  id: "briefing-today",
  briefingDate: today,
  title: "Daily Executive Briefing",
  intro:
    "A focused scan of the handful of stories most likely to change product, market, and strategic decisions today.",
  readingWindow: "34 minutes",
  items: [
    {
      id: "item-1",
      topicId: "topic-tech",
      topicName: "Tech",
      title: "The public tech briefing now pulls directly from current RSS feeds instead of static sample copy",
      whatHappened:
        "The dashboard is now set up to favor current public reporting across major technology publications and newsletters, rather than relying on fixed showcase stories.",
      keyPoints: [
        "Tech coverage now centers on live feeds from The Verge, Ars Technica, and TLDR.",
        "The refresh path is designed for frequent updates instead of hand-maintained example content.",
        "If a feed is temporarily unavailable, the app can still fall back without breaking the page.",
      ],
      whyItMatters:
        "The site now behaves more like a real news product: visitors can land on the dashboard and immediately see technology headlines that are actually moving right now.",
      sources: [
        { title: "The Verge", url: "https://www.theverge.com" },
        { title: "Ars Technica", url: "https://arstechnica.com" },
      ],
      estimatedMinutes: 5,
      read: false,
      priority: "top",
      importanceScore: 82,
      importanceLabel: "Critical",
      rankingSignals: [
        "Fresh reporting in the current cycle.",
        "Covered by multiple live tech sources.",
        "Strong match for the tech brief.",
      ],
    },
    {
      id: "item-2",
      topicId: "topic-finance",
      topicName: "Finance",
      title: "The public finance briefing now surfaces market-moving headlines from live business feeds",
      whatHappened:
        "The finance section is configured to pull from live public business and markets feeds so the site stays useful even before a user configures custom sources.",
      keyPoints: [
        "Financial Times provides broad international business coverage.",
        "MarketWatch adds faster market-oriented public headlines.",
        "The site is set to refresh public feed fetches on a 15-minute interval.",
      ],
      whyItMatters:
        "This gives the dashboard a stronger default experience: even without custom setup, visitors can scan timely finance and business stories instead of generic placeholder text.",
      sources: [
        { title: "Financial Times", url: "https://www.ft.com" },
        { title: "MarketWatch", url: "https://www.marketwatch.com" },
      ],
      estimatedMinutes: 4,
      read: false,
      priority: "top",
      importanceScore: 78,
      importanceLabel: "High",
      rankingSignals: [
        "Fresh reporting in the current cycle.",
        "Covered by multiple finance sources.",
        "Strong match for the finance brief.",
      ],
    },
  ],
};

export const demoHistory: DailyBriefing[] = [
  demoBriefing,
  {
    ...demoBriefing,
    id: "briefing-yesterday",
    briefingDate: subDays(new Date(), 1).toISOString(),
    title: "Daily Executive Briefing",
  },
  {
    ...demoBriefing,
    id: "briefing-two-days",
    briefingDate: subDays(new Date(), 2).toISOString(),
    title: "Daily Executive Briefing",
  },
];

export const demoDashboardData: DashboardData = {
  mode: "demo",
  briefing: demoBriefing,
  topics: demoTopics,
  sources: getMvpDefaultPublicSources(),
};
