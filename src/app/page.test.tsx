import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getHomepagePageState = vi.fn();
const landingHomepage = vi.fn((props: unknown) => {
  void props;
  return <div>landing-homepage</div>;
});
const homepageViewModel = {
  featured: null,
  topRanked: [],
  categorySections: [],
  trending: [],
  earlySignals: [],
  debug: {
    totalArticlesFetched: null,
    totalCandidateEvents: null,
    rankedEventsCount: 0,
    uncategorizedEventsCount: 0,
    surfacedDuplicateCount: 0,
    semanticDuplicateSuppressedCount: 0,
    hiddenLowQualityTimelineSignalsCount: 0,
    coreSignalCount: 0,
    contextSignalCount: 0,
    visibleSelectionAdjustmentsCount: 0,
    categoryCounts: { tech: 0, finance: 0, politics: 0 },
    sourceCountsByCategory: { tech: 0, finance: 0, politics: 0 },
    failedSourceCount: 0,
    fallbackSourceCount: 0,
    degradedSourceNames: [],
    categoryEmptyReasons: { tech: "", finance: "", politics: "" },
    categoryExclusionReasons: { tech: [], finance: [], politics: [] },
  },
};
const buildHomepageViewModel = vi.fn(() => homepageViewModel);
const applyHomepageEditorialOverridesToDashboardData = vi.fn(async (data: unknown) => data);

vi.mock("@/lib/data", () => ({
  getHomepagePageState,
}));

vi.mock("@/lib/homepage-model", () => ({
  buildHomepageViewModel,
}));

vi.mock("@/lib/homepage-editorial-overrides", () => ({
  applyHomepageEditorialOverridesToDashboardData,
}));

vi.mock("@/components/landing/homepage", () => ({
  default: (props: unknown) => landingHomepage(props),
}));

describe("homepage SSR auth snapshot", () => {
  it("uses a single dashboard page state lookup for the request", async () => {
    const dashboardData = {
      mode: "live",
      briefing: {
        id: "briefing-1",
        briefingDate: "2020-01-02T09:00:00.000Z",
        title: "Today",
        intro: "Intro",
        readingWindow: "10 minutes",
        items: [],
      },
      topics: [],
      sources: [],
      homepageDiagnostics: {},
    };

    getHomepagePageState.mockResolvedValue({
      data: dashboardData,
      viewer: {
        id: "viewer-1",
        email: "analyst@example.com",
        displayName: "Alex Analyst",
        initials: "AA",
      },
    });

    const editorialData = {
      ...dashboardData,
      briefing: {
        ...dashboardData.briefing,
        items: [
          {
            id: "signal-1",
            title: "Edited signal",
            whyItMatters: "Published editorial override",
          },
        ],
      },
    };
    applyHomepageEditorialOverridesToDashboardData.mockResolvedValue(editorialData);

    const Page = (await import("@/app/page")).default;
    const element = await Page({
      searchParams: Promise.resolve({ auth: "1" }),
    });
    render(element);

    expect(getHomepagePageState).toHaveBeenCalledTimes(1);
    expect(getHomepagePageState).toHaveBeenCalledWith("/");
    expect(applyHomepageEditorialOverridesToDashboardData).toHaveBeenCalledTimes(1);
    expect(applyHomepageEditorialOverridesToDashboardData).toHaveBeenCalledWith(dashboardData);
    expect(buildHomepageViewModel).toHaveBeenCalledTimes(1);
    expect(buildHomepageViewModel).toHaveBeenCalledWith(editorialData, null, {
      includeCategoryTabEvents: false,
    });
    expect(landingHomepage).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          mode: "live",
          briefing: {
            briefingDate: "2020-01-02T09:00:00.000Z",
          },
          homepageFreshnessNotice: undefined,
          publicRankedSignalCount: 0,
        },
        homepageViewModel: expect.objectContaining({
          categorySections: [],
          developingNowEvents: [],
          trending: [],
          earlySignals: [],
        }),
        isAdmin: false,
        viewer: expect.objectContaining({
          email: "analyst@example.com",
        }),
      }),
    );
  }, 10000);
});
