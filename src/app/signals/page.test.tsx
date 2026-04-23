import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublishedSignalPosts = vi.fn();

vi.mock("@/lib/signals-editorial", () => {
  return {
    getPublishedSignalPosts,
  };
});

function createPublishedPost(index: number) {
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
  };
}

describe("public signals page", () => {
  beforeEach(() => {
    getPublishedSignalPosts.mockReset();
  });

  it("renders published editorial copy instead of the raw AI draft", async () => {
    getPublishedSignalPosts.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => createPublishedPost(index + 1)),
    );

    const Page = (await import("@/app/signals/page")).default;
    render(await Page());

    expect(screen.getByText("Human final version 1")).toBeInTheDocument();
    expect(screen.queryByText("Raw AI draft should not be public")).not.toBeInTheDocument();
  });
});
