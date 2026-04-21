import { describe, expect, it, vi } from "vitest";

import { collectMitInternalReviewData } from "@/lib/internal/mit-review";
import type { FeedArticle } from "@/lib/rss";

function article(overrides: Partial<FeedArticle> = {}): FeedArticle {
  return {
    title: "AI chip policy shifts after new export rules",
    url: "https://example.com/story",
    summaryText: "A technology policy story with AI, chips, and security context.",
    sourceName: "MIT Technology Review",
    publishedAt: "2026-04-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("MIT internal review evidence", () => {
  it("returns a sanitized current review snapshot without feed or article URLs", async () => {
    const fetcher = vi.fn(async (_feedUrl: string, sourceName: string) => {
      if (sourceName === "MIT Technology Review") {
        return [
          article(),
          article({
            title: "Cybersecurity researchers test safer robots",
            summaryText: "Science and robotics signals without noisy review tags.",
            publishedAt: "2026-04-20T21:00:00.000Z",
          }),
          article({
            title: "Climate technology lab advances energy storage",
            summaryText: "A climate and energy technology item.",
            publishedAt: "2026-04-20T15:00:00.000Z",
          }),
          article({
            title: "Sponsored quiz https://www.technologyreview.com/feed/",
            summaryText: "A noisy item with https://www.technologyreview.com/feed/ embedded.",
            publishedAt: "2026-04-19T00:00:00.000Z",
          }),
        ];
      }

      return [
        article({
          title: "AI chip policy shifts after new export controls",
          summaryText: "A baseline technology policy story.",
          sourceName,
        }),
      ];
    });

    const data = await collectMitInternalReviewData({
      now: new Date("2026-04-21T03:00:00.000Z"),
      fetcher,
    });

    expect(data.runtime.probationaryRuntimeSourceIds).toEqual(["mit-technology-review"]);
    expect(data.runtime.resolvedProbationarySourceIds).toEqual(["mit-technology-review"]);
    expect(data.runtime.mitIsOnlyProbationaryRuntimeSource).toBe(true);
    expect(data.feed.reachable).toBe(true);
    expect(data.feed.topItems).toHaveLength(4);
    expect(data.review.highSignalTopItemCount).toBeGreaterThanOrEqual(3);
    expect(data.review.noisyTopItemCount).toBe(1);
    expect(data.review.duplicationNoiseNotes).toMatch(/Possible duplicate pressure/);

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("feedUrl");
    expect(serialized).not.toContain("technologyreview.com/feed");
    expect(serialized).not.toContain("example.com/story");
  });

  it("keeps feed failures sanitized and non-fatal", async () => {
    const fetcher = vi.fn(async (_feedUrl: string, sourceName: string) => {
      if (sourceName === "MIT Technology Review") {
        throw new Error("Failed to fetch https://www.technologyreview.com/feed/ with token-like detail");
      }

      return [article({ sourceName })];
    });

    const data = await collectMitInternalReviewData({
      now: new Date("2026-04-21T03:00:00.000Z"),
      fetcher,
    });

    expect(data.feed.reachable).toBe(false);
    expect(data.feed.fetchErrorSummary).toContain("[link]");
    expect(data.feed.fetchErrorSummary).toContain("[redacted]");
    expect(JSON.stringify(data.feed)).not.toContain("technologyreview.com/feed");
  });
});
