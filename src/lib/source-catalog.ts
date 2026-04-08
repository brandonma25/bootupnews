export type RecommendedSource = {
  id: string;
  name: string;
  topicLabel: string;
  description: string;
  homepageUrl: string;
  feedUrl?: string;
  cadence: string;
  sourceType: "news" | "newsletter";
  importStatus: "ready" | "manual";
  note?: string;
};

export const recommendedSources: RecommendedSource[] = [
  {
    id: "lennys-newsletter",
    name: "Lenny's Newsletter",
    topicLabel: "Product",
    description: "High-signal product, growth, and operator writing via newsletter RSS.",
    homepageUrl: "https://www.lennysnewsletter.com",
    feedUrl: "https://www.lennysnewsletter.com/feed",
    cadence: "Weekly",
    sourceType: "newsletter",
    importStatus: "ready",
  },
  {
    id: "reuters-top-news",
    name: "Reuters Top News",
    topicLabel: "Geopolitics",
    description: "Top global headlines and breaking developments from Reuters.",
    homepageUrl: "https://www.reuters.com",
    feedUrl: "https://feeds.reuters.com/reuters/topNews",
    cadence: "Daily",
    sourceType: "news",
    importStatus: "ready",
  },
  {
    id: "reuters-business-news",
    name: "Reuters Business",
    topicLabel: "Markets",
    description: "Business, macro, and company news from Reuters Business.",
    homepageUrl: "https://www.reuters.com",
    feedUrl: "https://feeds.reuters.com/reuters/businessNews",
    cadence: "Daily",
    sourceType: "news",
    importStatus: "ready",
  },
  {
    id: "reuters-technology-news",
    name: "Reuters Technology",
    topicLabel: "AI",
    description: "Technology and AI-adjacent coverage from Reuters Technology.",
    homepageUrl: "https://www.reuters.com",
    feedUrl: "https://feeds.reuters.com/reuters/technologyNews",
    cadence: "Daily",
    sourceType: "news",
    importStatus: "ready",
  },
  {
    id: "tldr",
    name: "TLDR",
    topicLabel: "AI",
    description: "Curated tech and startup newsletter coverage from TLDR.",
    homepageUrl: "https://tldr.tech",
    feedUrl: "https://tldr.tech/rss",
    cadence: "Daily",
    sourceType: "newsletter",
    importStatus: "ready",
  },
  {
    id: "tldr-ai",
    name: "TLDR AI",
    topicLabel: "AI",
    description: "AI-specific newsletter coverage from TLDR AI.",
    homepageUrl: "https://tldr.tech/ai",
    feedUrl: "https://tldr.tech/ai/rss",
    cadence: "Daily",
    sourceType: "newsletter",
    importStatus: "ready",
  },
  {
    id: "morning-brew",
    name: "Morning Brew",
    topicLabel: "Markets",
    description: "Business and market updates from Morning Brew.",
    homepageUrl: "https://www.morningbrew.com",
    cadence: "Daily",
    sourceType: "newsletter",
    importStatus: "manual",
    note: "Homepage is available, but feed access appears protected and was not verified for import.",
  },
  {
    id: "alex-rechevskiy",
    name: "Alex Rechevskiy",
    topicLabel: "Product",
    description: "Recent publishing activity from Alex Rechevskiy.",
    homepageUrl: "https://www.linkedin.com/in/alexrechevskiy/recent-activity/all/",
    cadence: "Irregular",
    sourceType: "newsletter",
    importStatus: "manual",
    note: "LinkedIn activity pages do not expose a verified RSS feed for the current importer.",
  },
  {
    id: "matt-levine",
    name: "Matt Levine",
    topicLabel: "Markets",
    description: "Opinion and markets commentary from Matt Levine on Bloomberg.",
    homepageUrl: "https://www.bloomberg.com/opinion/authors/ARbTQlRLRjE/matthew-s-levine",
    cadence: "Frequent",
    sourceType: "newsletter",
    importStatus: "manual",
    note: "Bloomberg author pages were verified, but not a public RSS feed for direct import.",
  },
  {
    id: "a16z",
    name: "a16z",
    topicLabel: "AI",
    description: "Essays, market views, and company perspectives from Andreessen Horowitz.",
    homepageUrl: "https://a16z.com",
    cadence: "Frequent",
    sourceType: "news",
    importStatus: "manual",
    note: "Homepage verified, but a working public RSS URL was not confirmed.",
  },
];
