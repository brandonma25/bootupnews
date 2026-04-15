import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "@/app/loading";
import ErrorBoundaryPage from "@/app/error";
import LandingHomepage from "@/components/landing/homepage";
import type { DashboardData, BriefingItem } from "@/lib/types";

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
  return {
    id: overrides.id ?? "item-1",
    topicId: overrides.topicId ?? "topic-1",
    topicName: overrides.topicName ?? "General",
    title: overrides.title ?? "Generic event",
    whatHappened: overrides.whatHappened ?? "A development happened.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? "It matters because expectations changed.",
    sources: overrides.sources ?? [
      { title: "Reuters", url: "https://www.reuters.com/example" },
      { title: "AP", url: "https://apnews.com/example" },
    ],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    read: overrides.read ?? false,
    priority: overrides.priority ?? "top",
    matchedKeywords: overrides.matchedKeywords ?? [],
    matchScore: overrides.matchScore ?? 8,
    publishedAt: overrides.publishedAt ?? "2026-04-15T08:00:00.000Z",
    sourceCount: overrides.sourceCount ?? 2,
    relatedArticles: overrides.relatedArticles,
    importanceScore: overrides.importanceScore ?? 82,
    importanceLabel: overrides.importanceLabel ?? "High",
    rankingSignals: overrides.rankingSignals ?? ["Fresh reporting in the current cycle."],
  };
}

function createData(items: BriefingItem[]): DashboardData {
  return {
    mode: "live",
    briefing: {
      id: "briefing-1",
      briefingDate: "2026-04-15T09:00:00.000Z",
      title: "Today",
      intro: "Intro",
      readingWindow: "10 minutes",
      items,
    },
    topics: [],
    sources: [
      { id: "source-tech", name: "TechCrunch", feedUrl: "https://techcrunch.com/feed", status: "active", topicName: "Tech" },
      { id: "source-finance", name: "Financial Times", feedUrl: "https://ft.com/rss", status: "active", topicName: "Finance" },
      { id: "source-politics", name: "Reuters Politics", feedUrl: "https://reuters.com/politics", status: "active", topicName: "Geopolitics" },
    ],
    homepageDiagnostics: {
      totalArticlesFetched: 20,
      totalCandidateEvents: items.length,
      lastSuccessfulFetchTime: "2026-04-15T09:00:00.000Z",
      lastRankingRunTime: "2026-04-15T09:05:00.000Z",
      sourceCountsByCategory: { tech: 1, finance: 1, politics: 1 },
    },
  };
}

describe("LandingHomepage", () => {
  it("shows a polished empty state only when a category has no eligible events", () => {
    const data = createData([
      createItem({
        id: "tech-1",
        topicId: "tech",
        topicName: "Tech",
        title: "AI chip demand keeps climbing",
        whatHappened: "Chip makers and cloud providers are expanding capacity.",
        whyItMatters: "It changes infrastructure planning.",
        matchedKeywords: ["ai", "chips", "cloud"],
      }),
    ]);

    render(<LandingHomepage data={data} viewer={null} />);

    expect(screen.getByText("No Finance events yet")).toBeInTheDocument();
    expect(screen.getAllByText("Top stories while this category fills in").length).toBeGreaterThan(0);
  });

  it("shows sparse-state messaging when only one category event exists", () => {
    const data = createData([
      createItem({
        id: "finance-1",
        topicId: "finance",
        topicName: "Finance",
        title: "Bank earnings reset market expectations",
        whatHappened: "Revenue guidance and inflation worries moved markets.",
        whyItMatters: "It affects market expectations.",
        matchedKeywords: ["earnings", "revenue", "inflation"],
      }),
    ]);

    render(<LandingHomepage data={data} viewer={null} />);

    expect(screen.getAllByText(/Coverage is still building here/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/More Finance coverage is on the way/i).length).toBeGreaterThan(0);
  });

  it("renders debug visibility for QA when enabled", () => {
    const data = createData([
      createItem({
        id: "uncat-1",
        topicId: "general",
        topicName: "General Briefing",
        title: "General update",
        whatHappened: "A broad update happened.",
        whyItMatters: "It matters.",
        matchedKeywords: [],
        rankingSignals: [],
      }),
    ]);

    render(<LandingHomepage data={data} viewer={null} debugEnabled />);

    expect(screen.getByText("Homepage debug")).toBeInTheDocument();
    expect(screen.getByText("Uncategorized events")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("renders no-data state when no ranked events are available", () => {
    render(<LandingHomepage data={createData([])} viewer={null} />);

    expect(screen.getAllByText("Coverage unavailable right now").length).toBeGreaterThan(0);
  });
});

describe("supporting states", () => {
  it("renders the loading shell", () => {
    render(<Loading />);
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("renders the route error state", () => {
    render(
      <ErrorBoundaryPage
        error={new Error("boom")}
        reset={() => undefined}
      />,
    );

    expect(screen.getByText(/This page hit a server problem/i)).toBeInTheDocument();
  });
});
