import { render, screen } from "@testing-library/react";
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
  });

  it("shows a clear unauthorized state for non-admin users", async () => {
    getEditorialReviewState.mockResolvedValue({
      kind: "unauthorized",
      userEmail: "reader@example.com",
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Not authorized" })).toBeInTheDocument();
    expect(screen.getByText(/reader@example.com does not have admin\/editor access/i)).toBeInTheDocument();
  });

  it("shows the top-level Approve All action for authorized admins", async () => {
    getEditorialReviewState.mockResolvedValue({
      kind: "authorized",
      adminEmail: "admin@example.com",
      posts: [reviewPost],
      storageReady: true,
      warning: null,
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("button", { name: "Approve All" })).toBeEnabled();
    expect(screen.getByLabelText("Why it matters — editorial version")).toHaveValue("Raw AI draft");
  });

  it("disables Approve All when no loaded posts are eligible", async () => {
    getEditorialReviewState.mockResolvedValue({
      kind: "authorized",
      adminEmail: "admin@example.com",
      posts: [{ ...reviewPost, editorialStatus: "approved" }],
      storageReady: true,
      warning: null,
    });

    const Page = (await import("@/app/dashboard/signals/editorial-review/page")).default;
    render(await Page({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("button", { name: "Approve All" })).toBeDisabled();
    expect(screen.getByText(/No draft or review-ready signal posts are eligible/i)).toBeInTheDocument();
  });
});
