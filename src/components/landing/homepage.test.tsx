import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ErrorBoundaryPage from "@/app/error";
import Loading from "@/app/loading";
import LandingHomepage from "@/components/landing/homepage";
import type { BriefingItem, DashboardData } from "@/lib/types";

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
  return {
    id: overrides.id ?? "item-1",
    topicId: overrides.topicId ?? "tech",
    topicName: overrides.topicName ?? "Tech",
    title: overrides.title ?? "AI chip demand keeps climbing",
    whatHappened: overrides.whatHappened ?? "Chip makers and cloud providers are expanding capacity.",
    keyPoints: overrides.keyPoints ?? ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? "Capacity changes platform plans.",
    sources:
      overrides.sources ?? [
        { title: "Reuters", url: "https://www.reuters.com/example" },
        { title: "AP", url: "https://apnews.com/example" },
      ],
    estimatedMinutes: overrides.estimatedMinutes ?? 4,
    read: overrides.read ?? false,
    priority: overrides.priority ?? "top",
    matchedKeywords: overrides.matchedKeywords ?? ["ai", "chips"],
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
  it("renders the V1 Home shell with public Top Events and detail navigation", () => {
    render(<LandingHomepage data={createData([createItem({ id: "top-1" })])} viewer={null} />);

    expect(screen.getByRole("heading", { name: "Today's briefing" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Home" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "History" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Account" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("AI chip demand keeps climbing")).toBeInTheDocument();
    expect(screen.getAllByText("Reuters").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Open full briefing" })).toHaveAttribute(
      "href",
      "/briefing/2026-04-15",
    );
  });

  it("renders debug diagnostics for QA when enabled", () => {
    render(<LandingHomepage data={createData([createItem({ id: "top-1" })])} viewer={null} debugEnabled />);

    expect(screen.getByText("Homepage diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Ranked events")).toBeInTheDocument();
  });

  it("shows a clear auth configuration error when requested", () => {
    render(<LandingHomepage data={createData([])} viewer={null} authState="config-error" />);

    expect(
      screen.getAllByText(/Authentication is not configured for this environment yet/i).length,
    ).toBeGreaterThan(0);
  });
});

describe("supporting states", () => {
  it("renders the loading shell", () => {
    render(<Loading />);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByText("Setting up your feed (10–20 seconds)...")).toBeInTheDocument();
  });

  it("renders the route error state", () => {
    render(<ErrorBoundaryPage error={new Error("boom")} reset={() => undefined} />);

    expect(screen.getByText(/This page hit a server problem/i)).toBeInTheDocument();
  });
});
