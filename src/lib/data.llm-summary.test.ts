import { afterEach, describe, expect, it, vi } from "vitest";

import type { FeedArticle } from "@/lib/rss";
import type { BriefingItem } from "@/lib/types";

const fallbackSummary: Pick<
  BriefingItem,
  "title" | "whatHappened" | "keyPoints" | "whyItMatters" | "estimatedMinutes"
> = {
  title: "Deterministic title",
  whatHappened: "Deterministic summary",
  keyPoints: ["Point one", "Point two", "Point three"],
  whyItMatters: "Deterministic rationale",
  estimatedMinutes: 4,
};

const articles: FeedArticle[] = [
  {
    title: "Lead story",
    url: "https://example.com/lead",
    summaryText: "Lead summary",
    contentText: "Lead summary",
    sourceName: "Reuters",
    publishedAt: "2026-04-19T08:00:00.000Z",
  },
];

async function loadResolveClusterSummary(options?: {
  isAiConfigured?: boolean;
  summarizeClusterImpl?: () => Promise<{
    headline: string;
    whatHappened: string;
    keyPoints: [string, string, string];
    whyItMatters: string;
    estimatedMinutes: number;
  }>;
}) {
  vi.resetModules();

  vi.doMock("@/lib/env", async () => {
    const actual = await vi.importActual<typeof import("@/lib/env")>("@/lib/env");

    return {
      ...actual,
      isAiConfigured: options?.isAiConfigured ?? false,
    };
  });

  const summarizeCluster = vi.fn(
    options?.summarizeClusterImpl ??
      (() =>
        Promise.resolve({
          headline: "LLM title",
          whatHappened: "LLM summary",
          keyPoints: ["LLM point 1", "LLM point 2", "LLM point 3"],
          whyItMatters: "LLM rationale",
          estimatedMinutes: 5,
        })),
  );

  vi.doMock("@/lib/summarizer", () => ({
    summarizeCluster,
  }));

  const dataModule = await import("@/lib/data");

  return {
    resolveClusterSummary: dataModule.__testing__.resolveClusterSummary,
    summarizeCluster,
  };
}

describe("resolveClusterSummary", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("@/lib/env");
    vi.doUnmock("@/lib/summarizer");
  });

  it("uses LLM output when AI is configured and the summary succeeds", async () => {
    const { resolveClusterSummary, summarizeCluster } = await loadResolveClusterSummary({
      isAiConfigured: true,
    });

    const summary = await resolveClusterSummary({
      topicName: "Finance",
      articles,
      fallback: fallbackSummary,
      timeoutMs: 10,
    });

    expect(summarizeCluster).toHaveBeenCalledWith("Finance", articles);
    expect(summary).toEqual({
      title: "LLM title",
      whatHappened: "LLM summary",
      keyPoints: ["LLM point 1", "LLM point 2", "LLM point 3"],
      whyItMatters: "LLM rationale",
      estimatedMinutes: 5,
    });
  });

  it("keeps the deterministic fallback when AI is not configured", async () => {
    const { resolveClusterSummary, summarizeCluster } = await loadResolveClusterSummary({
      isAiConfigured: false,
    });

    const summary = await resolveClusterSummary({
      topicName: "Finance",
      articles,
      fallback: fallbackSummary,
      timeoutMs: 10,
    });

    expect(summarizeCluster).not.toHaveBeenCalled();
    expect(summary).toEqual(fallbackSummary);
  });

  it("falls back silently when the AI summary rejects", async () => {
    const { resolveClusterSummary } = await loadResolveClusterSummary({
      isAiConfigured: true,
      summarizeClusterImpl: () => Promise.reject(new Error("provider down")),
    });

    const summary = await resolveClusterSummary({
      topicName: "Finance",
      articles,
      fallback: fallbackSummary,
      timeoutMs: 10,
    });

    expect(summary).toEqual(fallbackSummary);
  });

  it("falls back silently when the AI summary times out", async () => {
    const { resolveClusterSummary } = await loadResolveClusterSummary({
      isAiConfigured: true,
      summarizeClusterImpl: () => new Promise(() => undefined),
    });

    const summary = await resolveClusterSummary({
      topicName: "Finance",
      articles,
      fallback: fallbackSummary,
      timeoutMs: 1,
    });

    expect(summary).toEqual(fallbackSummary);
  });
});
