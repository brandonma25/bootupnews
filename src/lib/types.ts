export type Topic = {
  id: string;
  userId?: string;
  name: string;
  description: string;
  color: string;
  createdAt?: string;
};

export type Source = {
  id: string;
  userId?: string;
  name: string;
  feedUrl: string;
  homepageUrl?: string;
  topicId?: string;
  topicName?: string;
  status: "active" | "paused";
  createdAt?: string;
};

export type Article = {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  summaryText: string;
  publishedAt: string;
  topicIds: string[];
};

export type BriefingItem = {
  id: string;
  topicId: string;
  topicName: string;
  title: string;
  whatHappened: string;
  keyPoints: [string, string, string];
  whyItMatters: string;
  sources: Array<{ title: string; url: string }>;
  estimatedMinutes: number;
  read: boolean;
  priority: "top" | "normal";
};

export type DailyBriefing = {
  id: string;
  briefingDate: string;
  title: string;
  intro: string;
  readingWindow: string;
  items: BriefingItem[];
};

export type DashboardData = {
  mode: "demo" | "live" | "public";
  briefing: DailyBriefing;
  topics: Topic[];
  sources: Source[];
};
