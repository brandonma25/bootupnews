import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const safeGetUser = vi.fn();
const collectMitInternalReviewData = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  safeGetUser,
}));

vi.mock("@/lib/internal/mit-review", () => ({
  MIT_INTERNAL_REVIEW_ROUTE: "/internal/mit-review",
  collectMitInternalReviewData,
}));

const reviewData = {
  checkedAt: "2026-04-21T03:00:00.000Z",
  route: "/internal/mit-review",
  runtime: {
    resolutionMode: "no_argument_runtime",
    probationaryRuntimeSourceIds: ["mit-technology-review"],
    resolvedProbationarySourceIds: ["mit-technology-review"],
    resolvedOtherSourceIds: [],
    mitIsOnlyProbationaryRuntimeSource: true,
    noArgumentResolutionObserved: true,
  },
  feed: {
    sourceId: "mit-technology-review",
    sourceName: "MIT Technology Review",
    reachable: true,
    observedItemCount: 4,
    sampleItemCount: 4,
    fetchErrorSummary: null,
    topItems: [
      {
        title: "AI chip policy shifts after new export rules",
        summarySnippet: "Technology policy sample.",
        publishedAt: "2026-04-21T00:00:00.000Z",
        ageHours: 3,
        freshnessLabel: "3.0 hours old",
      },
    ],
  },
  review: {
    signalQualityJudgment: "mostly relevant",
    highSignalTopItemCount: 3,
    noisyTopItemCount: 0,
    duplicationNoiseNotes: "No obvious title/snippet duplication against fetched default feeds.",
    contributionUsefulness: "potentially useful; top MIT items include multiple technology or policy-relevant signals",
    baselineComparisonFeedCount: 4,
    baselineFetchFailureCount: 0,
  },
  issue: {
    number: 70,
    url: "https://github.com/brandonma25/bootupnews/issues/70",
    historyAvailableInApp: false,
    note: "Issue #70 remains the durable multi-day review log.",
  },
  proves: ["The current build can resolve the governed no-argument runtime source set."],
  doesNotProve: ["It does not prove MIT contributed to a ranked dashboard card or changed public MVP output."],
  safetyNotes: ["The page intentionally omits feed URLs."],
};

describe("MIT internal review page", () => {
  beforeEach(() => {
    safeGetUser.mockReset();
    collectMitInternalReviewData.mockReset();
  });

  it("withholds review evidence from unauthenticated requests", async () => {
    safeGetUser.mockResolvedValue({
      user: null,
      supabase: null,
      sessionCookiePresent: false,
    });

    const Page = (await import("@/app/internal/mit-review/page")).default;
    render(await Page());

    expect(screen.getByText("Internal access required")).toBeInTheDocument();
    expect(screen.getByText("No evidence exposed")).toBeInTheDocument();
    expect(collectMitInternalReviewData).not.toHaveBeenCalled();
  }, 10000);

  it("renders sanitized MIT review evidence for authenticated requests", async () => {
    safeGetUser.mockResolvedValue({
      user: { id: "user-1", email: "analyst@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });
    collectMitInternalReviewData.mockResolvedValue(reviewData);

    const Page = (await import("@/app/internal/mit-review/page")).default;
    render(await Page());

    expect(screen.getByRole("heading", { name: "MIT probationary review" })).toBeInTheDocument();
    expect(screen.getAllByText("mit-technology-review").length).toBeGreaterThan(0);
    expect(screen.getByText("AI chip policy shifts after new export rules")).toBeInTheDocument();
    expect(screen.getByText("No obvious title/snippet duplication against fetched default feeds.")).toBeInTheDocument();
    expect(screen.queryByText(/feedUrl/i)).not.toBeInTheDocument();
  }, 10000);
});
