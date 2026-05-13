import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import ErrorBoundaryPage from "@/app/error";
import Loading from "@/app/loading";
import LandingHomepage from "@/components/landing/homepage";
import { buildHomepageViewModel } from "@/lib/homepage-model";
import type { BriefingItem, DashboardData } from "@/lib/types";

function createItem(overrides: Partial<BriefingItem> = {}): BriefingItem {
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
    homepageClassification: overrides.homepageClassification,
  };
}

function createData(
  items: BriefingItem[],
  options: {
    publicRankedItems?: BriefingItem[] | null;
    homepageFreshnessNotice?: DashboardData["homepageFreshnessNotice"];
    mode?: DashboardData["mode"];
  } = {},
): DashboardData {
  return {
    mode: options.mode ?? "live",
    briefing: {
      id: "briefing-1",
      briefingDate: "2026-04-15T09:00:00.000Z",
      title: "Today",
      intro: "Intro",
      readingWindow: "10 minutes",
      items,
    },
    publicRankedItems:
      options.publicRankedItems === null ? undefined : (options.publicRankedItems ?? items),
    homepageFreshnessNotice: options.homepageFreshnessNotice,
    topics: [
      { id: "tech", name: "Tech", description: "Tech coverage", color: "#294f86" },
      { id: "finance", name: "Finance", description: "Finance coverage", color: "#1f4f46" },
      { id: "politics", name: "Politics", description: "Politics coverage", color: "#8a5a11" },
    ],
    sources: [],
    homepageDiagnostics: {
      totalArticlesFetched: 20,
      totalCandidateEvents: items.length,
      lastSuccessfulFetchTime: "2026-04-15T09:00:00.000Z",
      lastRankingRunTime: "2026-04-15T09:05:00.000Z",
      sourceCountsByCategory: { tech: 1, finance: 1, politics: 1 },
    },
  };
}

function renderHomepage(data: DashboardData, options: Partial<ComponentProps<typeof LandingHomepage>> = {}) {
  return render(
    <LandingHomepage
      data={data}
      viewer={null}
      homepageViewModel={buildHomepageViewModel(data)}
      {...options}
    />,
  );
}

describe("LandingHomepage", () => {
  it("renders the Boot Up shell with the locked tagline and primary nav", () => {
    const data = createData([createItem()]);

    renderHomepage(data);

    expect(screen.getAllByText("Boot Up").length).toBeGreaterThan(0);
    expect(screen.getByText("For people who want to understand the world, not just consume it."))
      .toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Home" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "History" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Account" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Signals" })).not.toBeInTheDocument();
  });

  it("renders the Top 5 as ranked SignalCards with no retired card chrome", () => {
    const titles = [
      "Cloud capacity plans reshape AI spending",
      "Treasury yields reset rate expectations",
      "Export controls change chip supply paths",
      "Shipping disruption moves oil markets",
      "Hospital systems revise cyber defenses",
    ];
    const data = createData(
      titles.map((title, index) =>
        createItem({
          id: `top-${index + 1}`,
          topicId: ["tech", "finance", "politics", "finance", "tech"][index],
          topicName: ["Tech", "Finance", "Politics", "Finance", "Tech"][index],
          title,
          whatHappened: `${title} through a distinct public event.`,
          whyItMatters: `Human final version ${index + 1}`,
          matchedKeywords: title.toLowerCase().split(" ").slice(0, 3),
          sourceCount: 4,
        }),
      ),
    );

    renderHomepage(data);

    const cards = screen.getAllByTestId("signal-card").slice(0, 5);
    expect(cards).toHaveLength(5);
    expect(within(cards[0]).getByText("Core signal · 01")).toBeInTheDocument();
    expect(within(cards[4]).getByText("Core signal · 05")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Why this matters")).toBeInTheDocument();
    expect(within(cards[0]).getByTestId("signal-why-this-matters")).toHaveClass("line-clamp-2");
    // Per-card inline depth expansion: top events no longer link out to
    // /briefing/<date>; they expand in place. The Expand toggle replaces
    // the previous Read more link.
    expect(within(cards[0]).queryByRole("link", { name: "Read more →" })).toBeNull();
    expect(within(cards[0]).getByTestId("signal-card-toggle")).toHaveAccessibleName(/expand/i);
    expect(within(cards[0]).queryByText(/min read/i)).not.toBeInTheDocument();
    expect(within(cards[0]).queryByText("Details")).not.toBeInTheDocument();
    expect(within(cards[0]).queryByText("Tech")).not.toBeInTheDocument();
    expect(within(cards[0]).queryByText("Point one")).not.toBeInTheDocument();
  });

  it("expands a Signal Card in place when the Expand toggle is clicked", () => {
    const data = createData([
      createItem({
        id: "top-1",
        title: "Top event 1",
        whatHappened: "The source headline appears here as the What happened body.",
        whyItMatters: "Why this matters body for the top event.",
      }),
    ]);

    renderHomepage(data);

    const card = screen.getAllByTestId("signal-card")[0];
    expect(card).toHaveAttribute("data-signal-expanded", "false");
    expect(within(card).queryByText("What happened")).not.toBeInTheDocument();

    const toggle = within(card).getByTestId("signal-card-toggle");
    expect(toggle).toHaveAccessibleName(/expand/i);

    fireEvent.click(toggle);

    expect(card).toHaveAttribute("data-signal-expanded", "true");
    expect(within(card).getByText("What happened")).toBeInTheDocument();
    expect(within(card).getByText("What led to this")).toBeInTheDocument();
    expect(toggle).toHaveAccessibleName(/collapse/i);

    fireEvent.click(toggle);
    expect(card).toHaveAttribute("data-signal-expanded", "false");
  });

  it("uses the supplied homepage model instead of raw briefing items", () => {
    const rawData = createData([
      createItem({
        id: "raw-item",
        title: "Raw briefing item should not render directly",
      }),
    ]);
    const modelData = createData([
      createItem({
        id: "model-item",
        title: "Model-selected signal",
      }),
    ]);

    render(
      <LandingHomepage
        data={rawData}
        viewer={null}
        homepageViewModel={buildHomepageViewModel(modelData)}
      />,
    );

    expect(screen.getByText("Model-selected signal")).toBeInTheDocument();
    expect(screen.queryByText("Raw briefing item should not render directly")).not.toBeInTheDocument();
  });

  it("renders the date badge and demoted Browse by category strip below the ranked cards", () => {
    const data = createData([
      createItem({
        id: "tech-1",
        title: "Tech signal",
        topicId: "tech",
        topicName: "Tech",
      }),
      createItem({
        id: "finance-1",
        title: "Finance signal",
        topicId: "finance",
        topicName: "Finance",
        homepageClassification: {
          primaryCategory: "finance",
          secondaryCategories: [],
          confidence: 0.95,
          scores: { tech: 0, finance: 12, politics: 0 },
          matchedSignals: { tech: [], finance: ["rates"], politics: [] },
        },
      }),
    ]);

    renderHomepage(data);

    expect(screen.getByText("Wednesday")).toBeInTheDocument();
    expect(screen.getByText(/April 15, 2026/)).toBeInTheDocument();
    expect(screen.getByText("Today's signals")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Top Events" })).not.toBeInTheDocument();
    expect(screen.getByText("Browse by")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tech" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finance" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Finance" }));

    const financePanel = document.getElementById("finance-panel");
    expect(financePanel).not.toBeNull();
    expect(screen.getByRole("button", { name: "Finance" })).toHaveAttribute("aria-current", "page");
    expect(financePanel).not.toHaveTextContent("Tech signal");
  });

  it("renders freshness and empty states without placeholder copy", () => {
    const data = createData([], {
      homepageFreshnessNotice: {
        kind: "empty",
        text: "The latest briefing is not yet available. Please check back soon.",
        briefingDate: null,
      },
    });

    renderHomepage(data);

    expect(screen.getByTestId("home-freshness-notice")).toHaveTextContent(
      "The latest briefing is not yet available. Please check back soon.",
    );
    expect(screen.queryByText(/placeholder|stored public signal snapshot|sample slot/i)).not.toBeInTheDocument();
  });

  it("renders debug diagnostics for QA when enabled", () => {
    const data = createData([createItem()]);

    renderHomepage(data, { debugEnabled: true });

    expect(screen.getByText("Homepage diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Ranked events")).toBeInTheDocument();
  });

  it("shows a clear auth configuration error when requested", () => {
    const data = createData([]);

    renderHomepage(data, { authState: "config-error" });

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
