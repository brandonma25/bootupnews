import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BriefingDetailView } from "@/components/briefing/BriefingDetailView";
import type { BriefingItem, DashboardData } from "@/lib/types";

const developerSubtitle =
  "The homepage renders from today's published signal set instead of triggering feed ingestion during SSR.";

function createItem(): BriefingItem {
  return {
    id: "signal-1",
    topicId: "finance",
    topicName: "Finance",
    title: "Economic letter countdown",
    whatHappened: "The latest published briefing item is available for public readers.",
    keyPoints: [
      "First public detail point",
      "Second public detail point",
      "Third public detail point",
    ],
    whyItMatters: "This keeps public briefing detail focused on reader-facing context.",
    sources: [{ title: "Federal Reserve", url: "https://example.com/fed" }],
    estimatedMinutes: 4,
    read: false,
    priority: "top",
    matchedKeywords: ["finance"],
    matchScore: 8,
    publishedAt: "2026-05-06T09:00:00.000Z",
    sourceCount: 1,
    relatedArticles: [
      {
        title: "Economic update",
        url: "https://example.com/fed",
        sourceName: "Federal Reserve",
      },
    ],
    importanceScore: 82,
    importanceLabel: "High",
    rankingSignals: ["Ranked high because the event has clear system-level implications."],
    displayState: "new",
  };
}

function createData(): DashboardData {
  const item = createItem();

  return {
    mode: "public",
    briefing: {
      id: "published-homepage-2026-05-06",
      briefingDate: "2026-05-06T09:00:00.000Z",
      title: "Daily Executive Briefing",
      intro: developerSubtitle,
      readingWindow: "4 minutes",
      items: [item],
    },
    publicRankedItems: [item],
    topics: [
      { id: "finance", name: "Finance", description: "Finance coverage", color: "#1f4f46" },
      { id: "tech", name: "Tech", description: "Tech coverage", color: "#294f86" },
      { id: "politics", name: "Politics", description: "Politics coverage", color: "#8a5a11" },
    ],
    sources: [
      {
        id: "fed",
        name: "Federal Reserve",
        feedUrl: "https://example.com/feed",
        status: "active",
        topicName: "Finance",
      },
    ],
    homepageDiagnostics: {
      totalArticlesFetched: 1,
      totalCandidateEvents: 1,
      sourceCountsByCategory: { tech: 0, finance: 1, politics: 0 },
    },
  };
}

describe("BriefingDetailView", () => {
  it("does not render the developer subtitle or inherited panel border on public detail cards", () => {
    render(<BriefingDetailView data={createData()} viewer={null} />);

    expect(screen.getByRole("heading", { name: "Daily Executive Briefing" })).toBeInTheDocument();
    expect(screen.queryByText(developerSubtitle)).not.toBeInTheDocument();

    const [detailCard] = screen.getAllByTestId("briefing-detail-card");
    expect(detailCard).not.toHaveClass("glass-panel");
    expect(detailCard).toHaveClass("border-transparent");
  });

  it("does not render internal ranking explanation copy on public detail cards", () => {
    render(<BriefingDetailView data={createData()} viewer={null} />);

    expect(screen.queryByText(/why this ranks here/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/confirmed-event rail/i)).not.toBeInTheDocument();
  });

  it("does not duplicate the lead paragraph in the What happened section", () => {
    const item = createItem();

    render(<BriefingDetailView data={createData()} viewer={null} />);

    expect(screen.getAllByText(item.whatHappened)).toHaveLength(1);
    expect(screen.queryByText("What happened")).not.toBeInTheDocument();
  });
});
