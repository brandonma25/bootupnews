import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublicSignalsPageState = vi.fn();

vi.mock("@/lib/signals-editorial", () => {
  return {
    getPublicSignalsPageState,
  };
});

type PublishedPostFixture = {
  id: string;
  rank: number;
  title: string;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  tags: string[];
  signalScore: number;
  selectionReason: string;
  aiWhyItMatters: string;
  editedWhyItMatters: string;
  publishedWhyItMatters: string;
  editorialStatus: string;
  editedBy: string;
  editedAt: string;
  approvedBy: string;
  approvedAt: string;
  publishedAt: string;
  persisted: boolean;
  finalSlateRank: number | null;
  finalSlateTier: "core" | "context" | null;
};

function createPublishedPost(index: number, overrides: Partial<PublishedPostFixture> = {}) {
  return {
    id: `signal-${index}`,
    rank: index,
    title: `Published signal ${index}`,
    sourceName: "Source",
    sourceUrl: "https://example.com/source",
    summary: "Public summary",
    tags: ["tech"],
    signalScore: 80,
    selectionReason: "Selection reason",
    aiWhyItMatters: "Raw AI draft should not be public",
    editedWhyItMatters: "Human edited version",
    publishedWhyItMatters: `Human final version ${index}`,
    editorialStatus: "published",
    editedBy: "admin@example.com",
    editedAt: "2026-04-23T00:00:00.000Z",
    approvedBy: "admin@example.com",
    approvedAt: "2026-04-23T00:00:00.000Z",
    publishedAt: "2026-04-23T00:00:00.000Z",
    persisted: true,
    finalSlateRank: null,
    finalSlateTier: null,
    ...overrides,
  };
}

describe("public signals page", () => {
  beforeEach(() => {
    getPublicSignalsPageState.mockReset();
  });

  it("renders published editorial copy instead of the raw AI draft", async () => {
    getPublicSignalsPageState.mockResolvedValue({
      kind: "published",
      posts: Array.from({ length: 5 }, (_, index) => ({
        ...createPublishedPost(index + 1),
        contextMaterial: "Private newsletter grounding snippet should never be public",
      })),
    });

    const Page = (await import("@/app/signals/page")).default;
    render(await Page());

    expect(screen.getByText("Human final version 1")).toBeInTheDocument();
    expect(screen.queryByText("Raw AI draft should not be public")).not.toBeInTheDocument();
    expect(screen.queryByText("Private newsletter grounding snippet should never be public")).not.toBeInTheDocument();
  }, 10000);

  it("renders public card-face labels and clamps the why-this-matters preview", async () => {
    getPublicSignalsPageState.mockResolvedValue({
      kind: "published",
      posts: [createPublishedPost(1)],
    });

    const Page = (await import("@/app/signals/page")).default;
    render(await Page());

    expect(screen.getByText("Why this matters")).toBeInTheDocument();
    expect(screen.queryByText("Top Event")).not.toBeInTheDocument();
    expect(screen.queryByText("TOP EVENT")).not.toBeInTheDocument();
    expect(screen.getByTestId("signal-why-this-matters")).toHaveClass("line-clamp-2");
  }, 10000);

  it("renders Core and Context tier markers for the published slate", async () => {
    getPublicSignalsPageState.mockResolvedValue({
      kind: "published",
      posts: [
        ...Array.from({ length: 5 }, (_, index) => createPublishedPost(index + 1)),
        createPublishedPost(6, {
          id: "context-1",
          rank: 6,
          title: "Published context signal 1",
          publishedWhyItMatters: "Human final context version 1",
        }),
        createPublishedPost(7, {
          id: "context-2",
          rank: 7,
          title: "Published context signal 2",
          publishedWhyItMatters: "Human final context version 2",
        }),
      ],
    });

    const Page = (await import("@/app/signals/page")).default;
    render(await Page());

    expect(screen.getByText("Core signal · 01")).toBeInTheDocument();
    expect(screen.getByText("Context · 06")).toBeInTheDocument();
    expect(screen.getByText("Context · 07")).toBeInTheDocument();
    expect(screen.getByText("Published context signal 1")).toBeInTheDocument();
    expect(screen.getByText("Published context signal 2")).toBeInTheDocument();
    expect(screen.getByText("Human final context version 1")).toBeInTheDocument();
    expect(screen.getByText("Human final context version 2")).toBeInTheDocument();
  }, 10000);

  it("renders a partial slate without placeholder or stale slots", async () => {
    getPublicSignalsPageState.mockResolvedValue({
      kind: "published",
      posts: Array.from({ length: 3 }, (_, index) => createPublishedPost(index + 1)),
    });

    const Page = (await import("@/app/signals/page")).default;
    render(await Page());

    expect(screen.getByText("3 signals")).toBeInTheDocument();
    expect(screen.getAllByText(/^Published signal /)).toHaveLength(3);
    expect(screen.queryByText("Published signal 4")).not.toBeInTheDocument();
    expect(screen.queryByText("Published signal 5")).not.toBeInTheDocument();
    expect(screen.queryByText("Context · 06")).not.toBeInTheDocument();
  }, 10000);

  it("renders reader-facing breadcrumb copy instead of internal editorial layer language", async () => {
    getPublicSignalsPageState.mockResolvedValue({
      kind: "published",
      posts: Array.from({ length: 3 }, (_, index) => createPublishedPost(index + 1)),
    });

    const Page = (await import("@/app/signals/page")).default;
    render(await Page());

    expect(screen.getAllByText("All signals").length).toBeGreaterThan(0);
    expect(screen.getByText("3 signals")).toBeInTheDocument();
    expect(screen.queryByText("Published editorial layer")).not.toBeInTheDocument();
  }, 10000);

  it("removes internal editorial tag labels from the compact list", async () => {
    getPublicSignalsPageState.mockResolvedValue({
      kind: "published",
      posts: [
        createPublishedPost(1, {
          tags: ["Finance", "watch", "High"],
        }),
      ],
    });

    const Page = (await import("@/app/signals/page")).default;
    render(await Page());

    expect(screen.queryByText("Finance")).not.toBeInTheDocument();
    expect(screen.queryByText("watch")).not.toBeInTheDocument();
    expect(screen.queryByText("High")).not.toBeInTheDocument();
  }, 10000);

  it("shows a public-safe unavailable state without internal schema details", async () => {
    getPublicSignalsPageState.mockResolvedValue({
      kind: "temporarily_unavailable",
      posts: [],
    });

    const Page = (await import("@/app/signals/page")).default;
    render(await Page());

    expect(screen.getByText("Published briefing is temporarily unavailable")).toBeInTheDocument();
    expect(screen.queryByText("0 signals")).not.toBeInTheDocument();
    expect(screen.queryByText(/schema preflight/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/final_slate_rank|editorial_decision|reviewed_at/i)).not.toBeInTheDocument();
  }, 10000);
});
