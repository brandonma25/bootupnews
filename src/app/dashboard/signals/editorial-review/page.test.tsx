import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getEditorialReviewState = vi.fn();

vi.mock("@/lib/signals-editorial", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/signals-editorial")>();

  return {
    ...actual,
    getEditorialReviewState,
  };
});

vi.mock("@/app/dashboard/signals/editorial-review/actions", () => ({
  approveAllSignalPostsAction: vi.fn(),
  saveSignalDraftAction: vi.fn(),
  approveSignalPostAction: vi.fn(),
  resetSignalPostToAiDraftAction: vi.fn(),
  publishTopSignalsAction: vi.fn(),
  publishSignalPostAction: vi.fn(),
  assignFinalSlateSlotAction: vi.fn(),
  removeFromFinalSlateAction: vi.fn(),
  requestRewriteAction: vi.fn(),
  rejectSignalPostAction: vi.fn(),
  holdSignalPostAction: vi.fn(),
  replaceFinalSlateSlotAction: vi.fn(),
}));

const reviewPost = {
  id: "signal-1",
  briefingDate: "2026-04-24",
  rank: 1,
  title: "Signal 1",
  sourceName: "Source",
  sourceUrl: "https://example.com/source",
  summary: "Signal summary",
  tags: ["tech"],
  signalScore: 88,
  selectionReason: "Strong ranking signal",
  aiWhyItMatters: "Raw AI draft",
  editedWhyItMatters: null,
  publishedWhyItMatters: null,
  editedWhyItMattersStructured: null,
  publishedWhyItMattersStructured: null,
  whyItMattersValidationStatus: "passed" as const,
  whyItMattersValidationFailures: [],
  whyItMattersValidationDetails: [],
  whyItMattersValidatedAt: null,
  editorialStatus: "needs_review",
  finalSlateRank: null,
  finalSlateTier: null,
  editorialDecision: null,
  decisionNote: null,
  rejectedReason: null,
  heldReason: null,
  replacementOfRowId: null,
  reviewedBy: null,
  reviewedAt: null,
  editedBy: null,
  editedAt: null,
  approvedBy: null,
  approvedAt: null,
  publishedAt: null,
  isLive: false,
  createdAt: "2026-04-24T08:00:00.000Z",
  updatedAt: "2026-04-24T08:00:00.000Z",
  persisted: true,
};

const approvedPost = {
  ...reviewPost,
  id: "signal-approved",
  rank: 2,
  title: "Approved Signal",
  editorialStatus: "approved",
  editedWhyItMatters: "Approved editorial text",
};

const publishedPost = {
  ...reviewPost,
  id: "signal-published",
  rank: 3,
  title: "Published Signal",
  editorialStatus: "published",
  publishedWhyItMatters: "Published editorial text",
};

function createAuthorizedState(posts: typeof reviewPost[]) {
  return {
    kind: "authorized" as const,
    adminEmail: "admin@example.com",
    posts,
    currentTopFive: posts,
    currentCandidates: posts,
    storageReady: true,
    warning: null,
    page: 1,
    pageSize: 20,
    totalMatchingPosts: posts.length,
    latestBriefingDate: "2026-04-24",
    appliedScope: "all" as const,
    appliedStatus: "all" as const,
    appliedQuery: "",
    appliedDate: null,
  };
}

describe("signals editorial review page", () => {
  beforeEach(() => {
    getEditorialReviewState.mockReset();
  });

  it("asks unauthenticated visitors to sign in", async () => {
    getEditorialReviewState.mockResolvedValue({
      kind: "unauthenticated",
      sessionCookiePresent: false,
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Admin sign-in required" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?redirectTo=%2Fdashboard%2Fsignals%2Feditorial-review",
    );
  }, 10000);

  it("shows a clear unauthorized state for non-admin users", async () => {
    getEditorialReviewState.mockResolvedValue({
      kind: "unauthorized",
      userEmail: "reader@example.com",
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Not authorized" })).toBeInTheDocument();
    expect(screen.getByText(/reader@example.com does not have admin\/editor access/i)).toBeInTheDocument();
  }, 10000);

  it("shows the top-level Approve All action for authorized admins", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([reviewPost]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("button", { name: "Approve All" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByLabelText("Thesis / opening statement")).toHaveValue("Raw AI draft");
    expect(screen.getByRole("button", { name: "Request Rewrite" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Hold" })).toBeEnabled();
    expect(screen.getByLabelText("Editorial decision note")).toBeInTheDocument();
  });

  it("renders the final-slate composer slots and disabled readiness state", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([reviewPost]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Final Slate Composer" })).toBeInTheDocument();
    expect(screen.getByText("Core slot 1")).toBeInTheDocument();
    expect(screen.getByText("Core slot 5")).toBeInTheDocument();
    expect(screen.getByText("Context slot 6")).toBeInTheDocument();
    expect(screen.getByText("Context slot 7")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Publish Final Slate" })[0]).toBeDisabled();
    expect(screen.getByText("Slate not ready")).toBeInTheDocument();
    expect(screen.getAllByText(/Final slate requires exactly 7 selected rows/i)[0]).toBeInTheDocument();
  });

  it("collapses each editorial panel by default and expands only the selected card", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([reviewPost, approvedPost]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByText("Signal 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Approved Signal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Strong ranking signal")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Expand" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Save Edits" })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Expand" })[0]);

    expect(screen.getByLabelText("Thesis / opening statement", { selector: "#editorialThesis-signal-1" }))
      .toBeVisible();
    expect(screen.getByLabelText("Thesis / opening statement", { selector: "#editorialThesis-signal-approved" }))
      .not.toBeVisible();
    expect(screen.getByRole("button", { name: "Save Edits" })).toBeVisible();

    fireEvent.click(screen.getAllByRole("button", { name: "Collapse" })[0]);

    expect(screen.getAllByRole("button", { name: "Expand" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Save Edits" })).not.toBeInTheDocument();
  });

  it("shows all historical statuses by default", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([reviewPost, approvedPost, publishedPost]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "All Posts (3)" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByText("Signal 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Approved Signal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Published Signal").length).toBeGreaterThan(0);
    const expandButtons = screen.getAllByRole("button", { name: "Expand" });
    fireEvent.click(expandButtons[1]);
    fireEvent.click(expandButtons[2]);
    expect(screen.getByLabelText("Thesis / opening statement", { selector: "#editorialThesis-signal-approved" }))
      .toHaveValue("Approved editorial text");
    expect(screen.getByLabelText("Thesis / opening statement", { selector: "#editorialThesis-signal-published" }))
      .toHaveValue("Published editorial text");
  });

  it("renders editorial history cards in reverse briefing-date order without updated-date jumps", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([
        {
          ...reviewPost,
          id: "signal-apr23",
          title: "April 23 Signal",
          briefingDate: "2026-04-23",
          signalScore: 99,
          createdAt: "2026-04-23T08:00:00.000Z",
          updatedAt: "2026-04-26T12:00:00.000Z",
        },
        {
          ...reviewPost,
          id: "signal-apr26-b",
          title: "April 26 Lower Signal",
          briefingDate: "2026-04-26",
          signalScore: 75,
          createdAt: "2026-04-26T08:00:00.000Z",
          updatedAt: "2026-04-24T12:00:00.000Z",
        },
        {
          ...reviewPost,
          id: "signal-apr25",
          title: "April 25 Signal",
          briefingDate: "2026-04-25",
          signalScore: 88,
          createdAt: "2026-04-25T08:00:00.000Z",
          updatedAt: "2026-04-25T12:00:00.000Z",
        },
        {
          ...reviewPost,
          id: "signal-apr26-a",
          title: "April 26 Higher Signal",
          briefingDate: "2026-04-26",
          signalScore: 95,
          createdAt: "2026-04-26T08:00:00.000Z",
          updatedAt: "2026-04-23T12:00:00.000Z",
        },
      ]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({ scope: "all" }) }));

    expect(Array.from(document.querySelectorAll("h2"))
      .map((heading) => heading.textContent)
      .filter((heading) => heading !== "Final Slate Composer")).toEqual([
      "April 26 Higher Signal",
      "April 26 Lower Signal",
      "April 25 Signal",
      "April 23 Signal",
    ]);
  });

  it("shows structured editorial authoring fields and homepage preview simulation", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([
        {
          ...publishedPost,
          publishedWhyItMattersStructured: {
            preview: "Structured collapsed teaser.",
            thesis: "Structured executive thesis.",
            sections: [{ title: "Investor read", body: "This changes how the signal should be interpreted." }],
          },
        },
      ]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByLabelText("Homepage teaser / collapsed preview")).toHaveValue(
      "Structured collapsed teaser.",
    );
    expect(screen.getByLabelText("Thesis / opening statement")).toHaveValue("Structured executive thesis.");
    expect(screen.getByText("Homepage preview simulation")).toBeInTheDocument();
    expect(screen.getByText("Collapsed homepage version")).toBeInTheDocument();
  });

  it("filters to the review queue while keeping all-post navigation available", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([reviewPost]),
      appliedStatus: "review",
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({ status: "review" }) }));

    expect(screen.getByRole("link", { name: "Review Queue (1)" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByText("Signal 1").length).toBeGreaterThan(0);
    expect(screen.queryByText("Approved Signal")).not.toBeInTheDocument();
    expect(screen.queryByText("Published Signal")).not.toBeInTheDocument();
  });

  it("disables Approve All when no loaded posts are eligible", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([{ ...reviewPost, editorialStatus: "approved" }]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("button", { name: "Approve All" })).toBeDisabled();
    expect(screen.getByText(/Approve All applies only to visible Draft and Needs Review posts/i)).toBeInTheDocument();
  });

  it("keeps final-slate publishing disabled even when older Top 5 inputs were publishable", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([
        {
          ...approvedPost,
          id: "signal-1",
          rank: 1,
          title: "Approved edited signal",
        },
        ...Array.from({ length: 4 }, (_, index) => ({
          ...publishedPost,
          id: `signal-published-${index + 2}`,
          rank: index + 2,
          title: `Published Signal ${index + 2}`,
        })),
      ]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByRole("button", { name: "Publish Final Slate" })[0]).toBeDisabled();
    expect(screen.getAllByText(/Publish is disabled:/)[0]).toBeInTheDocument();
  });

  it("keeps approved rows waiting for the full Top 5 publish gate", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([approvedPost]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
    expect(screen.getByText(/Approved and waiting for the full Top 5 publish gate/i)).toBeInTheDocument();
  });

  it("shows final-slate readiness instead of the old Top 5 publish gate", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([
        reviewPost,
        ...Array.from({ length: 4 }, (_, index) => ({
          ...publishedPost,
          id: `signal-published-${index + 2}`,
          rank: index + 2,
          title: `Published Signal ${index + 2}`,
        })),
      ]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByRole("button", { name: "Publish Final Slate" })[0]).toBeDisabled();
    expect(screen.getByText("Slate not ready")).toBeInTheDocument();
    expect(screen.getAllByText(/Final slate requires exactly 7 selected rows/i)[0]).toBeInTheDocument();
  });

  it("blocks composer readiness with a seven-row slate message for a three-row current set", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([
        reviewPost,
        {
          ...reviewPost,
          id: "signal-2",
          rank: 2,
          title: "Signal 2",
        },
        {
          ...reviewPost,
          id: "signal-3",
          rank: 3,
          title: "Signal 3",
        },
      ]),
      latestBriefingDate: "2026-04-28",
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Current set 2026-04-28")).toBeInTheDocument();
    expect(screen.getByText("3 current candidates")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Publish Final Slate" })[0]).toBeDisabled();
    expect(
      screen.getAllByText("Final slate requires exactly 7 selected rows. Current count: 0.")[0],
    ).toBeInTheDocument();
  });

  it("shows WITM rewrite-required status and failure reasons from a local fixture", async () => {
    const rewritePost = {
      ...reviewPost,
      whyItMattersValidationStatus: "requires_human_rewrite" as const,
      whyItMattersValidationFailures: ["minimum_specificity"],
      whyItMattersValidationDetails: ["missing specific noun: no named entity, number, country, organization, or person found"],
    };
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([
        rewritePost,
        ...Array.from({ length: 4 }, (_, index) => ({
          ...approvedPost,
          id: `approved-${index + 2}`,
          rank: index + 2,
          title: `Approved ${index + 2}`,
        })),
      ]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("WITM rewrite required")).toBeInTheDocument();
    expect(screen.getByText("Quality gate reasons")).toBeInTheDocument();
    expect(
      screen.getAllByText("missing specific noun: no named entity, number, country, organization, or person found")[0],
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve All" })).toBeDisabled();
    expect(
      screen.getByText("1 signal posts require a human rewrite before bulk approval."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Publish Final Slate" })[0]).toBeDisabled();
    expect(
      screen.getAllByText("Final slate requires exactly 7 selected rows. Current count: 0.")[0],
    ).toBeInTheDocument();
  });

  it("shows a clear historical review empty state when older dates have nothing waiting for review", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([]),
      appliedScope: "historical",
      appliedStatus: "review",
      totalMatchingPosts: 0,
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({ scope: "historical", status: "review" }) }));

    expect(screen.getByText("No historical review-queue posts")).toBeInTheDocument();
    expect(screen.getByText(/Older briefing dates currently have no Draft or Needs Review posts/i)).toBeInTheDocument();
  });

  it("shows a clean empty state when no stored Top 5 snapshot exists yet", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([]),
      warning:
        "No stored Top 5 signal snapshot exists yet. This page stays read-only until signal posts have been persisted.",
      latestBriefingDate: null,
      totalMatchingPosts: 0,
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText(/No stored Top 5 signal snapshot exists yet/i)).toBeInTheDocument();
    expect(screen.getByText("No signal posts match this filter")).toBeInTheDocument();
  });
});
