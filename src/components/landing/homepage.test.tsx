import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import ErrorBoundaryPage from "@/app/error";
import Loading from "@/app/loading";
import LandingHomepage from "@/components/landing/homepage";
import type { BriefingItem, DashboardData } from "@/lib/types";

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
  return {
    id: overrides.id ?? "item-1",
    topicId: overrides.topicId ?? "topic-1",
    topicName: overrides.topicName ?? "General",
    title: overrides.title ?? "Generic event",
    whatHappened: overrides.whatHappened ?? "A development happened.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? "It matters because expectations changed.",
    sources:
      overrides.sources ?? [
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
    eventIntelligence: overrides.eventIntelligence,
    displayState: overrides.displayState ?? "new",
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
    topics: [
      { id: "tech", name: "Tech", description: "Tech coverage", color: "#294f86" },
      { id: "finance", name: "Finance", description: "Finance coverage", color: "#1f4f46" },
      { id: "politics", name: "Politics", description: "Politics coverage", color: "#8a5a11" },
    ],
    sources: [
      { id: "source-tech", name: "TechCrunch", feedUrl: "https://techcrunch.com/feed", status: "active", topicName: "Tech" },
      { id: "source-finance", name: "Financial Times", feedUrl: "https://ft.com/rss", status: "active", topicName: "Finance" },
      { id: "source-politics", name: "Reuters Politics", feedUrl: "https://reuters.com/politics", status: "active", topicName: "Politics" },
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
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
  });

  it("renders confirmed events separately from early signals", () => {
    const data = createData([
      createItem({
        id: "tech-1",
        topicId: "tech",
        topicName: "Tech",
        title: "AI chip demand keeps climbing",
        whatHappened: "Chip makers and cloud providers are expanding capacity.",
        matchedKeywords: ["ai", "chips", "cloud"],
        sourceCount: 3,
      }),
      createItem({
        id: "finance-1",
        topicId: "finance",
        topicName: "Finance",
        title: "Bank funding chatter emerges",
        whatHappened: "One outlet says executives are weighing funding options.",
        matchedKeywords: ["bank", "funding"],
        sourceCount: 1,
        sources: [{ title: "Bloomberg", url: "https://www.bloomberg.com/example" }],
      }),
    ]);

    render(<LandingHomepage data={data} viewer={null} />);

    expect(screen.getByText(/Confirmed developments, ranked with transparent logic/i)).toBeInTheDocument();
    expect(screen.getByText(/Single-source developments kept separate from Top Events/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Early Signal/i).length).toBeGreaterThan(0);
  });

  it("shows public briefing value messaging to guests", () => {
    render(<LandingHomepage data={createData([])} viewer={null} />);

    expect(screen.getAllByText("You're viewing the public briefing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sign in to personalize your intelligence").length).toBeGreaterThan(0);
    expect(screen.getByText("Signed out in public briefing mode")).toBeInTheDocument();
    expect(screen.getByText("Personalized topics")).toBeInTheDocument();
    expect(screen.getByText("Saved history")).toBeInTheDocument();
    expect(screen.getByText("Custom alerts")).toBeInTheDocument();
  });

  it("keeps ranking transparency visible on event cards", () => {
    const data = createData([
      createItem({
        id: "politics-1",
        topicId: "politics",
        topicName: "Politics",
        title: "Senate negotiations intensify",
        whatHappened: "Multiple outlets report fast-moving talks over a new package.",
        matchedKeywords: ["senate", "policy"],
        sourceCount: 4,
        importanceScore: 88,
      }),
    ]);

    render(<LandingHomepage data={data} viewer={null} />);

    expect(screen.getAllByText(/Ranking reason/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/High impact/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4 sources/i).length).toBeGreaterThan(0);
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

  it("hides guest conversion messaging for signed-in viewers", () => {
    render(
      <LandingHomepage
        data={createData([])}
        viewer={{
          id: "viewer-1",
          email: "analyst@example.com",
          displayName: "Alex Analyst",
          initials: "AA",
        }}
      />,
    );

    expect(screen.queryByText("You're viewing the public briefing")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign in to personalize your intelligence")).not.toBeInTheDocument();
    expect(screen.getByText("Signed in as Alex Analyst")).toBeInTheDocument();
  });

  it("shows a personalization summary for signed-in viewers with saved preferences", () => {
    window.localStorage.setItem(
      "daily-intel-preferences",
      JSON.stringify({
        personalizationEnabled: true,
        followedTopicIds: ["tech"],
        followedTopicNames: ["Tech"],
        followedEntities: ["Nvidia"],
      }),
    );

    render(
      <LandingHomepage
        data={createData([
          createItem({
            id: "tech-1",
            topicId: "tech",
            topicName: "Tech",
            title: "AI chip demand keeps climbing",
            matchedKeywords: ["nvidia", "ai"],
            sourceCount: 3,
          }),
        ])}
        viewer={{
          id: "viewer-1",
          email: "analyst@example.com",
          displayName: "Alex Analyst",
          initials: "AA",
        }}
      />,
    );

    expect(screen.getByText(/This homepage is tuned to your tracked priorities/i)).toBeInTheDocument();
    expect(screen.getByText(/Tracking Tech/i)).toBeInTheDocument();
    expect(screen.getByText(/Following Nvidia/i)).toBeInTheDocument();
  });

  it("shows a clear auth configuration error when requested", () => {
    render(<LandingHomepage data={createData([])} viewer={null} authState="config-error" />);

    expect(
      screen.getAllByText(/Authentication is not configured for this environment yet/i).length,
    ).toBeGreaterThan(0);
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
    render(<ErrorBoundaryPage error={new Error("boom")} reset={() => undefined} />);

    expect(screen.getByText(/This page hit a server problem/i)).toBeInTheDocument();
  });
});
