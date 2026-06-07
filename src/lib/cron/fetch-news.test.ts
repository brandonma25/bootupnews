import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Track 2 P7 — wiring proof for the DECOUPLED prod path.
 *
 * The /api/cron/fetch-editorial-inputs endpoint runs stage subset
 * ["rss","editorial_staging"] → runEditorialIngestionPipeline →
 * runStage("rss", () => runDailyNewsCron({dryRun})). Layer 2 (the evergreen
 * filter) is activated by `filterEvergreens: true` passed into
 * generateDailyBriefing from INSIDE runDailyNewsCron — so it cannot be silently
 * inert in the decoupled endpoint (the endpoint does not own the flag; the
 * shared RSS stage does). This test pins that the flag is actually passed, in
 * both real and dry mode.
 */

const mocks = vi.hoisted(() => ({
  generateDailyBriefing: vi.fn(),
  persistSignalPostsForBriefing: vi.fn(),
}));

vi.mock("@/lib/data", () => ({ generateDailyBriefing: mocks.generateDailyBriefing }));
vi.mock("@/lib/signals-editorial", () => ({
  persistSignalPostsForBriefing: mocks.persistSignalPostsForBriefing,
}));
vi.mock("@/lib/observability/rss", () => ({
  captureRssCronCheckIn: vi.fn(() => "checkin-1"),
  captureRssFailure: vi.fn(),
  withRssSpan: (_name: string, _op: string, _attrs: unknown, fn: () => unknown) => fn(),
}));

import { runDailyNewsCron } from "@/lib/cron/fetch-news";

function briefingItem(rank: number) {
  return {
    id: `item-${rank}`,
    topicId: "t",
    topicName: "Tech",
    title: `Item ${rank}`,
    whatHappened: "",
    keyPoints: [],
    whyItMatters: "",
    sources: [{ title: "Source", url: `https://example.com/${rank}` }],
    relatedArticles: [],
    sourceCount: 1,
    estimatedMinutes: 4,
    read: false,
    priority: "top" as const,
    matchedKeywords: [],
    matchScore: 90 - rank,
    publishedAt: "2026-06-07T08:00:00.000Z",
    importanceScore: 90 - rank,
    importanceLabel: "High",
    rankingSignals: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.generateDailyBriefing.mockResolvedValue({
    briefing: {
      id: "b",
      briefingDate: "2026-06-07T00:00:00.000Z",
      title: "",
      intro: "",
      readingWindow: "",
      items: Array.from({ length: 5 }, (_, i) => briefingItem(i + 1)),
    },
    publicRankedItems: Array.from({ length: 5 }, (_, i) => briefingItem(i + 1)),
    pipelineRun: {
      run_id: "run-1",
      num_raw_items: 10,
      num_clusters: 5,
      feed_failures: [],
      used_seed_fallback: false,
    },
  });
  mocks.persistSignalPostsForBriefing.mockResolvedValue({
    ok: true,
    briefingDate: "2026-06-07",
    insertedCount: 5,
    message: "ok",
  });
});

describe("runDailyNewsCron — decoupled RSS stage activates Layer 2", () => {
  it("passes filterEvergreens:true into generateDailyBriefing on a real run (not inert)", async () => {
    const result = await runDailyNewsCron({ dryRun: false });

    expect(result.success).toBe(true);
    expect(mocks.generateDailyBriefing).toHaveBeenCalledTimes(1);
    const optionsArg = mocks.generateDailyBriefing.mock.calls[0][2];
    expect(optionsArg).toEqual(
      expect.objectContaining({ filterEvergreens: true, persistPipelineCandidates: true }),
    );
  });

  it("also passes filterEvergreens:true in dry mode (so the harness DID run Layer 2 — it just had no evergreen inputs)", async () => {
    await runDailyNewsCron({ dryRun: true });

    const optionsArg = mocks.generateDailyBriefing.mock.calls[0][2];
    expect(optionsArg).toEqual(
      expect.objectContaining({ filterEvergreens: true, persistPipelineCandidates: false }),
    );
    // Dry mode must not persist.
    expect(mocks.persistSignalPostsForBriefing).not.toHaveBeenCalled();
  });
});
