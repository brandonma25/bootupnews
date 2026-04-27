import { beforeEach, describe, expect, it, vi } from "vitest";

const generateDailyBriefing = vi.fn();
const persistSignalPostsForBriefing = vi.fn();
const logServerEvent = vi.fn();
const captureRssCronCheckIn = vi.fn((status: string) => status === "in_progress" ? "check-in-id" : undefined);
const captureRssFailure = vi.fn();

vi.mock("@/lib/data", () => ({
  generateDailyBriefing,
}));

vi.mock("@/lib/signals-editorial", () => ({
  persistSignalPostsForBriefing,
}));

vi.mock("@/lib/observability", () => ({
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
  logServerEvent,
}));

vi.mock("@/lib/observability/rss", () => ({
  captureRssCronCheckIn,
  captureRssFailure,
  withRssSpan: vi.fn((_name, _phase, _attributes, callback) => callback()),
}));

function buildRequest(secret?: string) {
  return new Request("http://localhost:3000/api/cron/fetch-news", {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

function buildBriefingResult(overrides: {
  usedSeedFallback?: boolean;
  itemCount?: number;
} = {}) {
  const itemCount = overrides.itemCount ?? 5;

  return {
    briefing: {
      briefingDate: "2026-04-27T10:00:00.000Z",
      items: Array.from({ length: itemCount }, (_, index) => ({
        id: `item-${index + 1}`,
        title: `Signal candidate ${index + 1}`,
      })),
    },
    publicRankedItems: Array.from({ length: itemCount }, (_, index) => ({
      id: `ranked-${index + 1}`,
    })),
    pipelineRun: {
      run_id: "pipeline-test",
      num_raw_items: 12,
      num_clusters: itemCount,
      used_seed_fallback: overrides.usedSeedFallback ?? false,
      feed_failures: [],
    },
  };
}

describe("/api/cron/fetch-news", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "local-cron-secret";
    generateDailyBriefing.mockResolvedValue(buildBriefingResult());
    persistSignalPostsForBriefing.mockResolvedValue({
      ok: true,
      briefingDate: "2026-04-27",
      insertedCount: 5,
      message: "Persisted a new daily Top 5 snapshot.",
    });
  });

  it("rejects unauthorized requests without triggering the pipeline", async () => {
    const { GET } = await import("@/app/api/cron/fetch-news/route");
    const response = await GET(buildRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(generateDailyBriefing).not.toHaveBeenCalled();
    expect(persistSignalPostsForBriefing).not.toHaveBeenCalled();
  });

  it("requires CRON_SECRET to be configured", async () => {
    delete process.env.CRON_SECRET;

    const { GET } = await import("@/app/api/cron/fetch-news/route");
    const response = await GET(buildRequest("local-cron-secret"));

    expect(response.status).toBe(401);
    expect(generateDailyBriefing).not.toHaveBeenCalled();
  });

  it("runs the existing pipeline and persists the daily editorial snapshot", async () => {
    const { GET } = await import("@/app/api/cron/fetch-news/route");
    const response = await GET(buildRequest("local-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      summary: {
        briefingDate: "2026-04-27",
        insertedSignalPostCount: 5,
        pipelineRunId: "pipeline-test",
        rawItemCount: 12,
        clusterCount: 5,
        rankedClusterCount: 5,
        usedSeedFallback: false,
      },
    });
    expect(generateDailyBriefing).toHaveBeenCalledTimes(1);
    expect(persistSignalPostsForBriefing).toHaveBeenCalledWith({
      briefingDate: "2026-04-27",
      items: expect.any(Array),
    });
    expect(captureRssCronCheckIn).toHaveBeenCalledWith("in_progress");
    expect(captureRssCronCheckIn).toHaveBeenCalledWith("ok", "check-in-id", expect.any(Number));
  });

  it("captures editorial storage failures as RSS store failures", async () => {
    persistSignalPostsForBriefing.mockResolvedValue({
      ok: false,
      briefingDate: "2026-04-27",
      insertedCount: 0,
      message: "The current Top 5 could not be persisted for editing.",
    });

    const { GET } = await import("@/app/api/cron/fetch-news/route");
    const response = await GET(buildRequest("local-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(captureRssFailure).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        failureType: "rss_cache_write_failed",
        phase: "store",
        extra: expect.objectContaining({
          operation: "persist_signal_posts",
          route: "/api/cron/fetch-news",
        }),
      }),
    );
    expect(captureRssCronCheckIn).toHaveBeenCalledWith("error", "check-in-id", expect.any(Number));
  });

  it("does not persist seed fallback output as editorial signal posts", async () => {
    generateDailyBriefing.mockResolvedValue(buildBriefingResult({ usedSeedFallback: true }));

    const { GET } = await import("@/app/api/cron/fetch-news/route");
    const response = await GET(buildRequest("local-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.summary.usedSeedFallback).toBe(true);
    expect(body.summary.message).toMatch(/seed data/i);
    expect(persistSignalPostsForBriefing).not.toHaveBeenCalled();
    expect(captureRssFailure).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        failureType: "rss_refresh_job_failed",
        phase: "refresh",
      }),
    );
    expect(captureRssCronCheckIn).toHaveBeenCalledWith("error", "check-in-id", expect.any(Number));
  });
});
