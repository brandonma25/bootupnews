import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorialSignalPost } from "@/lib/signals-editorial";

const getEditorialReviewState = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

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
  publishFinalSlateAction: vi.fn(),
  publishTopSignalsAction: vi.fn(),
  publishSignalPostAction: vi.fn(),
  assignFinalSlateSlotAction: vi.fn(),
  assignFinalSlateSlotInlineAction: vi.fn().mockResolvedValue({ ok: true }),
  removeFromFinalSlateAction: vi.fn(),
  requestRewriteAction: vi.fn(),
  rejectSignalPostAction: vi.fn(),
  holdSignalPostAction: vi.fn(),
  replaceFinalSlateSlotAction: vi.fn(),
}));

const reviewPost: EditorialSignalPost = {
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

const approvedPost: EditorialSignalPost = {
  ...reviewPost,
  id: "signal-approved",
  title: "Approved Signal",
  editorialStatus: "approved",
  editorialDecision: "approved" as const,
  editedWhyItMatters:
    "This changes how readers should understand the market, policy, and operating context this week.",
};

function createAuthorizedState(posts: EditorialSignalPost[]) {
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
    latestPublishedSlateAudit: null,
    auditStorageReady: true,
    auditWarning: null,
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

  it("renders the two-pane composer with sticky final slate and inline WITM", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([reviewPost, approvedPost]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Editorial composer" })).toBeInTheDocument();
    expect(screen.getAllByText("Final slate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0 / 7").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Core · 5 slots").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Context · 2 slots").length).toBeGreaterThan(0);
    expect(screen.getByText("Candidate pool")).toBeInTheDocument();
    expect(screen.getByText("2 reviewable · 2 unassigned")).toBeInTheDocument();
    expect(screen.getByText("Raw AI draft")).toBeInTheDocument();
    expect(screen.getByText(approvedPost.editedWhyItMatters ?? "")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button", { name: /Publish slate/i })
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);
    expect(screen.queryByText("Published Slate Audit")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve All" })).not.toBeInTheDocument();
  }, 10000);

  it("enables the publish CTA when the selected slate passes existing readiness gates", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([
        {
          ...approvedPost,
          finalSlateRank: 1,
          finalSlateTier: "core" as const,
        },
      ]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByText("1 / 7").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Approved Signal").length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("button", { name: /Publish slate/i })
        .every((button) => !button.hasAttribute("disabled")),
    ).toBe(true);
    expect(screen.getAllByText("Sticky · stays visible on scroll").length).toBeGreaterThan(0);
  }, 10000);

  it("makes rewrite-required rows visually distinct and blocks assignment", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([
        {
          ...reviewPost,
          whyItMattersValidationStatus: "requires_human_rewrite" as const,
          whyItMattersValidationDetails: ["Template placeholder language detected."],
        },
      ]),
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Needs rewrite")).toBeInTheDocument();
    expect(screen.getByText(/Template placeholder language detected/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Assign Signal 1 to a slot/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Open rewrite" })).toBeInTheDocument();
  }, 10000);

  it("renders status and warning banners without restoring the old audit section", async () => {
    getEditorialReviewState.mockResolvedValue({
      ...createAuthorizedState([]),
      warning: "No stored Top 5 signal snapshot exists yet.",
      auditWarning: "Audit storage is unavailable.",
      totalMatchingPosts: 0,
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({
      searchParams: Promise.resolve({
        success: "Saved",
        error: "Publish failed",
      }),
    }));

    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Publish failed")).toBeInTheDocument();
    expect(screen.getByText("No stored Top 5 signal snapshot exists yet.")).toBeInTheDocument();
    expect(screen.getByText("Audit storage is unavailable.")).toBeInTheDocument();
    expect(screen.getByText("No current briefing candidates are available for slate composition."))
      .toBeInTheDocument();
    expect(screen.queryByText("Published Slate Audit")).not.toBeInTheDocument();
  }, 10000);
});
