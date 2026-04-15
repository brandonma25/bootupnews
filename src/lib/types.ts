export type Topic = {
  id: string;
  userId?: string;
  name: string;
  description: string;
  color: string;
  keywords?: string[];
  excludeKeywords?: string[];
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

export type RelatedArticle = {
  title: string;
  url: string;
  sourceName: string;
};

export type EventDisplayState = "new" | "changed" | "escalated" | "unchanged";

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
  matchedKeywords?: string[];
  matchScore?: number;
  publishedAt?: string;
  sourceCount?: number;
  relatedArticles?: RelatedArticle[];
  importanceScore?: number;
  importanceLabel?: "Critical" | "High" | "Watch";
  rankingSignals?: string[];
  displayState?: EventDisplayState;
  continuityKey?: string;
  continuityFingerprint?: string;
  lastViewedAt?: string;
};

export type DailyBriefing = {
  id: string;
  briefingDate: string;
  title: string;
  intro: string;
  readingWindow: string;
  items: BriefingItem[];
  sessionSummary?: {
    reviewedCount: number;
    newCount: number;
    changedCount: number;
    escalatedCount: number;
  };
  readingMetrics?: ReadingWindowMetrics;
};

export type ReadingWindowIntensity = "Light" | "Normal" | "Heavy";

export type ReadingWindowMetrics = {
  totalMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  progressRatio: number;
  progressLabel: string;
  deltaVsYesterday: number | null;
  intensity: ReadingWindowIntensity;
};

export type DashboardData = {
  mode: "demo" | "live" | "public";
  briefing: DailyBriefing;
  topics: Topic[];
  sources: Source[];
  homepageDiagnostics?: {
    totalArticlesFetched: number | null;
    totalCandidateEvents: number | null;
    lastSuccessfulFetchTime?: string;
    lastRankingRunTime?: string;
    sourceCountsByCategory: {
      tech: number;
      finance: number;
      politics: number;
    };
  };
};

export type ViewerAccount = {
  id: string;
  email: string;
  displayName: string;
  initials: string;
};
