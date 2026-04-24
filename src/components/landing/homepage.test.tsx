import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ErrorBoundaryPage from "@/app/error";
import Loading from "@/app/loading";
import LandingHomepage from "@/components/landing/homepage";
import { buildHomepageViewModel } from "@/lib/homepage-model";
import type { BriefingItem, DashboardData } from "@/lib/types";

function createItem(overrides: Partial<BriefingItem>): BriefingItem {
  return {
    id: overrides.id ?? "item-1",
    topicId: overrides.topicId ?? "tech",
    topicName: overrides.topicName ?? "Tech",
    title: overrides.title ?? "AI chip demand keeps climbing",
    whatHappened: overrides.whatHappened ?? "Chip makers and cloud providers are expanding capacity.",
    keyPoints: Object.prototype.hasOwnProperty.call(overrides, "keyPoints")
      ? overrides.keyPoints as BriefingItem["keyPoints"]
      : ["Point one", "Point two", "Point three"],
    whyItMatters: overrides.whyItMatters ?? "Capacity changes platform plans.",
    publishedWhyItMatters: overrides.publishedWhyItMatters,
    publishedWhyItMattersStructured: overrides.publishedWhyItMattersStructured,
    editorialWhyItMatters: overrides.editorialWhyItMatters,
    editorialStatus: overrides.editorialStatus,
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
  it("renders the V1 Home shell with public Top Events and key points", () => {
    const data = createData([createItem({ id: "top-1" })]);
    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    expect(screen.getByText("Wednesday, April 15, 2026")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Home" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "History" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Account" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("AI chip demand keeps climbing")).toBeInTheDocument();
    expect(screen.getByText("Point one")).toBeInTheDocument();
    expect(screen.getByText("Point two")).toBeInTheDocument();
    expect(screen.getByText("Point three")).toBeInTheDocument();
    expect(screen.getAllByText("Reuters").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Open full briefing/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute(
      "href",
      "/briefing/2026-04-15",
    );
  });

  it("renders Top Events from the supplied homepage model instead of raw briefing items", () => {
    const rawData = createData([
      createItem({
        id: "raw-item",
        title: "Raw briefing item should not render directly",
      }),
    ]);
    const modelData = createData([
      createItem({
        id: "model-item",
        title: "Model-selected Top Event",
        keyPoints: ["Model key point"],
      }),
    ]);

    render(
      <LandingHomepage
        data={rawData}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(modelData)}
      />,
    );

    expect(screen.getByText("Model-selected Top Event")).toBeInTheDocument();
    expect(screen.getByText("Model key point")).toBeInTheDocument();
    expect(screen.queryByText("Raw briefing item should not render directly")).not.toBeInTheDocument();
  });

  it("shows long published editorial Why it matters as a collapsed UI preview by default", () => {
    const longEditorialText =
      "This is the first published editorial sentence. This second sentence should still be present as the full source of truth. This third sentence gives the editor enough space to explain the real-world consequence. This fourth sentence makes the note long enough to require a preview control on the homepage.";
    const data = createData([
      createItem({
        id: "published-editorial-card",
        whyItMatters: longEditorialText,
        publishedWhyItMatters: longEditorialText,
        editorialStatus: "published",
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    const whyItMatters = screen.getByTestId("home-why-it-matters-text");
    expect(whyItMatters).toHaveTextContent(
      "This is the first published editorial sentence. This second sentence should still be present as the full source of truth.",
    );
    expect(whyItMatters).not.toHaveClass("line-clamp-3");
    expect(screen.getByRole("button", { name: "Read more" })).toHaveAttribute("aria-expanded", "false");
  });

  it("uses a complete sentence for collapsed editorial copy even when the first sentence exceeds the preview budget", () => {
    const longSentence =
      "Full Self-Driving improvements are gaining attention because the update reframes investor expectations around autonomy economics and forces operators to reconsider how quickly deployment assumptions can change across the fleet.";
    const data = createData([
      createItem({
        id: "word-boundary-editorial-card",
        whyItMatters: longSentence,
        publishedWhyItMatters: longSentence,
        editorialStatus: "published",
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    const collapsedText = screen.getByTestId("home-why-it-matters-text").textContent ?? "";
    expect(collapsedText).toBe(longSentence);
    expect(collapsedText).toMatch(/[.!?]$/);
    expect(collapsedText).not.toContain("...");
  });

  it("cleans pre-truncated generated previews so collapsed editorial cards do not end mid-word", () => {
    const truncatedPreview =
      "Tesla resets the corporate baseline because Full Self-Driving wa...";
    const data = createData([
      createItem({
        id: "pre-truncated-editorial-card",
        whyItMatters: truncatedPreview,
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    const collapsedText = screen.getByTestId("home-why-it-matters-text").textContent ?? "";
    expect(collapsedText).toBe("Tesla resets the corporate baseline because Full Self-Driving.");
    expect(collapsedText).toMatch(/[.!?]$/);
    expect(collapsedText).not.toContain("...");
    expect(collapsedText).not.toMatch(/\bwa[.!?]$/);
  });

  it("drops cut-off trailing clauses from pre-truncated collapsed editorial previews", () => {
    const truncatedPreview =
      "Tesla resets the corporate baseline because this changes revenue expectations, so it could move...";
    const data = createData([
      createItem({
        id: "cut-off-clause-editorial-card",
        whyItMatters: truncatedPreview,
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    const collapsedText = screen.getByTestId("home-why-it-matters-text").textContent ?? "";
    expect(collapsedText).toBe(
      "Tesla resets the corporate baseline because this changes revenue expectations.",
    );
    expect(collapsedText).not.toContain("...");
    expect(collapsedText).not.toMatch(/\bso it could[.!?]$/);
  });

  it("uses structured editorial preview for the collapsed homepage state", () => {
    const structuredContent = {
      preview: "Short editor-authored homepage teaser.",
      thesis: "Expanded thesis should not replace collapsed preview.",
      sections: [{ title: "First implication", body: "Expanded body copy." }],
    };
    const data = createData([
      createItem({
        id: "structured-editorial-card",
        whyItMatters: "Legacy combined fallback.",
        publishedWhyItMatters: "Legacy combined fallback.",
        publishedWhyItMattersStructured: structuredContent,
        editorialWhyItMatters: structuredContent,
        editorialStatus: "published",
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    expect(screen.getByTestId("home-why-it-matters-text")).toHaveTextContent(
      "Short editor-authored homepage teaser.",
    );
    expect(screen.getByRole("button", { name: "Read more" })).toBeInTheDocument();
  });

  it("renders structured thesis and sections in the expanded homepage state", () => {
    const structuredContent = {
      preview: "Short editor-authored homepage teaser.",
      thesis: "This is the executive thesis.",
      sections: [
        { title: "Investor read", body: "Markets get a cleaner signal about durability." },
        { title: "Operating impact", body: "Teams can adjust planning assumptions." },
      ],
    };
    const data = createData([
      createItem({
        id: "structured-editorial-card",
        whyItMatters: "Legacy combined fallback.",
        publishedWhyItMatters: "Legacy combined fallback.",
        publishedWhyItMattersStructured: structuredContent,
        editorialWhyItMatters: structuredContent,
        editorialStatus: "published",
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Read more" }));

    expect(screen.getByText("This is the executive thesis.")).toBeInTheDocument();
    expect(screen.getByText("Investor read")).toBeInTheDocument();
    expect(screen.getByText("Markets get a cleaner signal about durability.")).toBeInTheDocument();
    expect(screen.getByText("Operating impact")).toBeInTheDocument();
    expect(screen.getByText("Teams can adjust planning assumptions.")).toBeInTheDocument();
  });

  it("expands and collapses long published editorial Why it matters inline", () => {
    const longEditorialText =
      "This is the first published editorial sentence. This second sentence should still be present as the full source of truth. This third sentence gives the editor enough space to explain the real-world consequence. This fourth sentence makes the note long enough to require a preview control on the homepage.";
    const data = createData([
      createItem({
        id: "published-editorial-card",
        whyItMatters: longEditorialText,
        publishedWhyItMatters: longEditorialText,
        editorialStatus: "published",
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Read more" }));
    const expandedBody = screen.getByTestId("home-why-it-matters-text");
    expect(expandedBody).not.toHaveClass("line-clamp-3");
    expect(
      Array.from(expandedBody.querySelectorAll("p"))
        .map((paragraph) => paragraph.textContent)
        .join(" "),
    ).toBe(longEditorialText);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.getByTestId("home-why-it-matters-text")).not.toHaveClass("line-clamp-3");
    expect(screen.getByTestId("home-why-it-matters-text")).toHaveTextContent(
      "This is the first published editorial sentence. This second sentence should still be present as the full source of truth.",
    );
    expect(screen.getByRole("button", { name: "Read more" })).toHaveAttribute("aria-expanded", "false");
  });

  it("renders expanded long-form editorial copy as readable paragraph sections", () => {
    const longEditorialText =
      "First, the company changed its capacity plan. Second, suppliers now have a clearer demand signal to plan against. Third, competitors may need to adjust their own capital spending. Finally, investors get a cleaner read on whether the growth story is durable.";
    const data = createData([
      createItem({
        id: "structured-editorial-card",
        whyItMatters: longEditorialText,
        publishedWhyItMatters: longEditorialText,
        editorialStatus: "published",
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Read more" }));

    const expandedBody = screen.getByTestId("home-why-it-matters-text");
    const paragraphs = expandedBody.querySelectorAll("p");
    expect(Array.from(paragraphs).map((paragraph) => paragraph.textContent).join(" ")).toBe(longEditorialText);
    expect(expandedBody).toHaveClass("space-y-3");
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs[0]).toHaveTextContent("First, the company changed its capacity plan.");
    expect(paragraphs[3]).toHaveTextContent("Finally, investors get a cleaner read on whether the growth story is durable.");
  });

  it("does not show a Read more control for short Why it matters text", () => {
    const data = createData([
      createItem({
        id: "short-editorial-card",
        whyItMatters: "Short published editorial note.",
        publishedWhyItMatters: "Short published editorial note.",
        editorialStatus: "published",
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    expect(screen.getByTestId("home-why-it-matters-text")).not.toHaveClass("line-clamp-3");
    expect(screen.queryByRole("button", { name: "Read more" })).not.toBeInTheDocument();
  });

  it("renders keyPoints from BriefingItem.keyPoints without substituting internal fields", () => {
    const data = createData([
      createItem({
        id: "top-key-points",
        title: "Top event with explicit key points",
        keyPoints: ["Visible key point from the schema"],
        matchedKeywords: ["INTERNAL_MATCHED_KEYWORD_ONLY"],
        rankingSignals: ["INTERNAL_RANKING_SIGNAL_ONLY"],
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    expect(screen.getByText("Visible key point from the schema")).toBeInTheDocument();
    expect(screen.queryByText("INTERNAL_MATCHED_KEYWORD_ONLY")).not.toBeInTheDocument();
    expect(screen.queryByText("INTERNAL_RANKING_SIGNAL_ONLY")).not.toBeInTheDocument();
  });

  it("keeps Top Events cards stable when keyPoints are empty or missing", () => {
    const data = createData([
      createItem({
        id: "empty-key-points",
        title: "Cloud capacity event with empty key points",
        matchedKeywords: ["cloud", "capacity"],
        keyPoints: [],
      }),
      createItem({
        id: "missing-key-points",
        title: "Treasury market event with missing key points",
        topicId: "finance",
        topicName: "Finance",
        matchedKeywords: ["treasury", "markets"],
        keyPoints: undefined as unknown as BriefingItem["keyPoints"],
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    expect(screen.getByText("Cloud capacity event with empty key points")).toBeInTheDocument();
    expect(screen.getByText("Treasury market event with missing key points")).toBeInTheDocument();
    expect(screen.queryByTestId("home-top-event-key-points")).not.toBeInTheDocument();
  });

  it("renders five public Top Events when the homepage model supports them", () => {
    const data = createData([
      createItem({
        id: "finance-1",
        topicId: "finance",
        topicName: "Finance",
        title: "Treasury yields climb after inflation surprise",
        whatHappened: "Markets repriced after a fresh inflation surprise.",
        matchedKeywords: ["treasury", "inflation", "yields"],
        sourceCount: 4,
      }),
      createItem({
        id: "tech-1",
        topicId: "tech",
        topicName: "Tech",
        title: "Cloud providers expand AI capacity plans",
        whatHappened: "Cloud providers committed more capital to AI capacity.",
        matchedKeywords: ["cloud", "ai", "capacity"],
        sourceCount: 4,
      }),
      createItem({
        id: "politics-1",
        topicId: "politics",
        topicName: "Politics",
        title: "White House weighs new export controls",
        whatHappened: "Officials are weighing a new export-control package.",
        matchedKeywords: ["white house", "exports", "policy"],
        sourceCount: 4,
      }),
      createItem({
        id: "energy-1",
        topicId: "finance",
        topicName: "Finance",
        title: "Oil markets react to shipping disruption",
        whatHappened: "Energy traders reacted to shipping disruptions.",
        matchedKeywords: ["oil", "shipping", "energy"],
        sourceCount: 4,
      }),
      createItem({
        id: "chips-1",
        topicId: "tech",
        topicName: "Tech",
        title: "Chip equipment makers lift shipment outlook",
        whatHappened: "Equipment makers lifted shipment expectations.",
        matchedKeywords: ["chips", "equipment", "shipments"],
        sourceCount: 4,
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={null}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    expect(screen.getAllByTestId("home-top-event-card")).toHaveLength(5);
  });

  it("lets signed-in users read populated category tabs without showing the signed-out gate", () => {
    const data = createData([
      createItem({
        id: "top-finance",
        topicId: "finance",
        topicName: "Finance",
        title: "Treasury yields climb after inflation surprise",
        matchedKeywords: ["treasury", "inflation", "rates"],
        importanceScore: 95,
        sourceCount: 4,
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.95,
          scores: { tech: 0, finance: 12, politics: 0 },
          matchedSignals: { tech: [], finance: ["treasury"], politics: [] },
        },
      }),
      createItem({
        id: "top-politics",
        topicId: "politics",
        topicName: "Politics",
        title: "White House weighs new export controls",
        matchedKeywords: ["white house", "exports", "policy"],
        importanceScore: 92,
        sourceCount: 4,
        homepageClassification: {
          primaryCategory: "politics",
          secondaryCategories: [],
          confidence: 0.95,
          scores: { tech: 0, finance: 0, politics: 12 },
          matchedSignals: { tech: [], finance: [], politics: ["white house"] },
        },
      }),
      createItem({
        id: "top-tech",
        topicId: "tech",
        topicName: "Tech",
        title: "Cloud providers expand AI capacity plans",
        matchedKeywords: ["cloud", "ai", "capacity"],
        importanceScore: 90,
        sourceCount: 4,
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.95,
          scores: { tech: 12, finance: 0, politics: 0 },
          matchedSignals: { tech: ["ai"], finance: [], politics: [] },
        },
      }),
      createItem({
        id: "top-energy",
        topicId: "finance",
        topicName: "Finance",
        title: "Oil markets react to shipping disruption",
        matchedKeywords: ["oil", "shipping", "energy"],
        importanceScore: 88,
        sourceCount: 4,
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.95,
          scores: { tech: 0, finance: 11, politics: 0 },
          matchedSignals: { tech: [], finance: ["oil"], politics: [] },
        },
      }),
      createItem({
        id: "top-chip-equipment",
        topicId: "tech",
        topicName: "Tech",
        title: "Chip equipment makers lift shipment outlook",
        matchedKeywords: ["chips", "equipment", "shipments"],
        importanceScore: 86,
        sourceCount: 4,
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.95,
          scores: { tech: 11, finance: 0, politics: 0 },
          matchedSignals: { tech: ["chips"], finance: [], politics: [] },
        },
      }),
      createItem({
        id: "category-tech",
        topicId: "tech",
        topicName: "Tech",
        title: "Open source database maintainers ship a query planner update",
        whatHappened: "Database maintainers shipped a query planner update for production workloads.",
        matchedKeywords: ["database", "query planner", "open source"],
        importanceScore: 64,
        sourceCount: 2,
        homepageClassification: {
          primaryCategory: "tech",
          secondaryCategories: [],
          confidence: 0.92,
          scores: { tech: 10, finance: 0, politics: 0 },
          matchedSignals: { tech: ["database"], finance: [], politics: [] },
        },
      }),
    ]);

    render(
      <LandingHomepage
        data={data}
        viewer={{
          id: "viewer-1",
          email: "newsweb2026@example.com",
          displayName: "Newsweb2026",
          initials: "N",
          avatarUrl: null,
        }}
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    expect(screen.getByRole("tab", { name: "Top Events" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tech News" })).toBeInTheDocument();
    expect(screen.queryByText("Create a free account to read Tech News, Economics, and Politics")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Tech News" }));

    expect(screen.getByRole("tab", { name: "Tech News" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryAllByTestId("home-top-event-card")).toHaveLength(0);
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Create a free account to read Tech News, Economics, and Politics")).not.toBeInTheDocument();
  });

  it("renders debug diagnostics for QA when enabled", () => {
    const data = createData([createItem({ id: "top-1" })]);
    render(
      <LandingHomepage
        data={data}
        viewer={null}
        debugEnabled
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    expect(screen.getByText("Homepage diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Ranked events")).toBeInTheDocument();
  });

  it("shows a clear auth configuration error when requested", () => {
    const data = createData([]);
    render(
      <LandingHomepage
        data={data}
        viewer={null}
        authState="config-error"
        briefingDateLabel="Wednesday, April 15, 2026"
        homepageViewModel={buildHomepageViewModel(data)}
      />,
    );

    expect(
      screen.getAllByText(/Authentication is not configured for this environment yet/i).length,
    ).toBeGreaterThan(0);
  });
});

describe("supporting states", () => {
  it("renders the loading shell", () => {
    const { container } = render(<Loading />);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByText("Preparing your feed...")).toBeInTheDocument();
    expect(screen.queryByText(/10[–-]20 seconds/)).not.toBeInTheDocument();
    expect(container.querySelectorAll(".skeleton-line, .skeleton-card").length).toBeGreaterThan(0);
  });

  it("renders the route error state", () => {
    const reset = vi.fn();
    render(<ErrorBoundaryPage error={new Error("boom")} reset={reset} />);

    expect(screen.getByText(/This page hit a server problem/i)).toBeInTheDocument();
    screen.getByRole("button", { name: /retry page/i }).click();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
