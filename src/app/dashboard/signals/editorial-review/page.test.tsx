import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getEditorialReviewState = vi.fn();

vi.mock("@/lib/signals-editorial", () => {
  return {
    SIGNALS_EDITORIAL_ROUTE: "/dashboard/signals/editorial-review",
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
}));

const reviewPost = {
  id: "signal-1",
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
  editorialStatus: "needs_review",
  editedBy: null,
  editedAt: null,
  approvedBy: null,
  approvedAt: null,
  publishedAt: null,
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
  });

  it("collapses each editorial panel by default and expands only the selected card", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([reviewPost, approvedPost]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Signal 1")).toBeInTheDocument();
    expect(screen.getByText("Approved Signal")).toBeInTheDocument();
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
    expect(screen.getByText("Signal 1")).toBeInTheDocument();
    expect(screen.getByText("Approved Signal")).toBeInTheDocument();
    expect(screen.getByText("Published Signal")).toBeInTheDocument();
    const expandButtons = screen.getAllByRole("button", { name: "Expand" });
    fireEvent.click(expandButtons[1]);
    fireEvent.click(expandButtons[2]);
    expect(screen.getByLabelText("Thesis / opening statement", { selector: "#editorialThesis-signal-approved" }))
      .toHaveValue("Approved editorial text");
    expect(screen.getByLabelText("Thesis / opening statement", { selector: "#editorialThesis-signal-published" }))
      .toHaveValue("Published editorial text");
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
    expect(screen.getByText("Signal 1")).toBeInTheDocument();
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

  it("allows publishing when approved edits are mixed with already published top posts", async () => {
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

    expect(screen.getByRole("button", { name: "Publish Top 5 Signals" })).toBeEnabled();
  });

  it("shows a per-card Publish action for approved posts waiting to go live", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([approvedPost]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
    expect(screen.getByText(/Approved and waiting to publish/i)).toBeInTheDocument();
  });

  it("explains that draft rows still block publishing even when other rows are already published", async () => {
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

    expect(screen.getByRole("button", { name: "Publish Top 5 Signals" })).toBeDisabled();
    expect(screen.getByText(/Already published posts remain publish-ready/i)).toBeInTheDocument();
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
