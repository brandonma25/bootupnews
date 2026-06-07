import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PreflightDeps } from "@/lib/pipeline/preflight";

// Mock the four production stage functions so the orchestrator's gating + dryRun
// propagation can be asserted without touching real Supabase / Notion / feeds.
const mocks = vi.hoisted(() => ({
  runNeedsReviewSweep: vi.fn(),
  runNewsletterIngestion: vi.fn(),
  runControlledPipeline: vi.fn(),
  runEditorialStaging: vi.fn(),
  resolveControlledPipelineConfig: vi.fn(() => ({ mode: "dry_run" })),
}));

vi.mock("@/lib/editorial-sweep/needs-review-sweep", () => ({
  runNeedsReviewSweep: mocks.runNeedsReviewSweep,
}));
vi.mock("@/lib/newsletter-ingestion/runner", () => ({
  runNewsletterIngestion: mocks.runNewsletterIngestion,
}));
vi.mock("@/lib/pipeline/controlled-runner", () => ({
  runControlledPipeline: mocks.runControlledPipeline,
}));
vi.mock("@/lib/editorial-staging/runner", () => ({
  runEditorialStaging: mocks.runEditorialStaging,
}));
vi.mock("@/lib/pipeline/controlled-execution", () => ({
  resolveControlledPipelineConfig: mocks.resolveControlledPipelineConfig,
}));

import { runFullPipelineDryRun } from "@/lib/pipeline/full-dry-run";

type SupabaseArg = PreflightDeps["supabaseClient"];

function fakeSupabase(reachable: boolean): SupabaseArg {
  const chain = {
    select: () => ({ limit: async () => ({ error: reachable ? null : { message: "x" } }) }),
  };
  return { from: () => chain } as unknown as SupabaseArg;
}

function fakeFetch(opts: { egress: boolean; notion: boolean }): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("api.notion.com")) {
      if (!opts.notion) throw new Error("notion blocked");
      return new Response(null, { status: 200 });
    }
    if (!opts.egress) throw new Error("no egress");
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;
}

const FULL_ENV = {
  GMAIL_CLIENT_ID: "id",
  GMAIL_CLIENT_SECRET: "secret",
  GMAIL_REFRESH_TOKEN: "refresh",
  NOTION_TOKEN: "tok",
  NOTION_EDITORIAL_QUEUE_DB_ID: "db",
} as unknown as NodeJS.ProcessEnv;

const NOW = new Date("2026-06-06T12:00:00.000Z");

function primeReadyMocks() {
  mocks.runNeedsReviewSweep.mockResolvedValue({ disposedCount: 2, flaggedCount: 1, mutated: false });
  mocks.runNewsletterIngestion.mockResolvedValue({
    success: true,
    summary: { message: "ok", fetchedMessageCount: 3 },
  });
  mocks.runControlledPipeline.mockResolvedValue({
    candidateCount: 7,
    clusterCount: 5,
    candidate_pool_insufficient: false,
    candidate_pool_insufficient_reason: null,
  });
  mocks.runEditorialStaging.mockResolvedValue({
    success: true,
    summary: {
      candidateCount: 7,
      coreCount: 5,
      contextCount: 2,
      candidatesFilteredEvergreen: 1,
      notionRowsSkippedDuplicateAcrossDates: 1,
      dryRunDetail: { selected: [], evergreenRejected: [], crossDateSkipped: [] },
    },
  });
}

describe("runFullPipelineDryRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveControlledPipelineConfig.mockReturnValue({ mode: "dry_run" });
  });

  it("skips every stage and calls NO stage fn when no deps are available", async () => {
    const report = await runFullPipelineDryRun({
      env: {} as NodeJS.ProcessEnv,
      now: NOW,
      preflight: { supabaseClient: null, fetchImpl: fakeFetch({ egress: false, notion: false }) },
    });

    expect(report.stages.sweep.outcome).toBe("skipped");
    expect(report.stages.newsletter.outcome).toBe("skipped");
    expect(report.stages.rss.outcome).toBe("skipped");
    expect(report.stages.staging.outcome).toBe("skipped");

    // Anti-false-success: a skipped stage records N/A timing, never a fast 0.
    expect(report.stageMs.sweep).toBe("N/A");
    expect(report.stageMs.newsletter).toBe("N/A");
    expect(report.stageMs.rss).toBe("N/A");
    expect(report.stageMs.staging).toBe("N/A");

    // No production stage fn may execute when its dependency is absent.
    expect(mocks.runNeedsReviewSweep).not.toHaveBeenCalled();
    expect(mocks.runNewsletterIngestion).not.toHaveBeenCalled();
    expect(mocks.runControlledPipeline).not.toHaveBeenCalled();
    expect(mocks.runEditorialStaging).not.toHaveBeenCalled();

    expect(report.certifies60sFit).toBe(false);
  });

  it("runs every stage in DRY mode when all deps are ready", async () => {
    primeReadyMocks();
    const report = await runFullPipelineDryRun({
      env: FULL_ENV,
      now: NOW,
      preflight: { supabaseClient: fakeSupabase(true), fetchImpl: fakeFetch({ egress: true, notion: true }) },
    });

    expect(report.stages.sweep.outcome).toBe("ran");
    expect(report.stages.newsletter.outcome).toBe("ran");
    expect(report.stages.rss.outcome).toBe("ran");
    expect(report.stages.staging.outcome).toBe("ran");

    // dryRun must be propagated to the production functions — no fork.
    expect(mocks.runNewsletterIngestion).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    expect(mocks.runEditorialStaging).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    // sweep is forced dry via NEEDS_REVIEW_SWEEP_DRY_RUN in the env it receives.
    expect(mocks.runNeedsReviewSweep).toHaveBeenCalledWith(
      expect.objectContaining({ env: expect.objectContaining({ NEEDS_REVIEW_SWEEP_DRY_RUN: "true" }) }),
    );

    // PART 2 timing present for every ran stage + a wall-clock total.
    expect(report.stageMs.newsletter).not.toBe("N/A");
    expect(report.stageMs.staging).not.toBe("N/A");
    expect(report.stageMs.total).toEqual(expect.any(Number));

    // PART 3 feature-validation visibility surfaced.
    expect(report.stages.staging.evergreenFiltered).toBe(1);
    expect(report.stages.staging.crossDateWouldSkip).toBe(1);
    expect(report.stages.newsletter.itemsProcessed).toBe(3);

    expect(report.certifies60sFit).toBe(false);
  });

  it("degrades (not throws) when all feeds fail → candidate_pool_insufficient", async () => {
    primeReadyMocks();
    mocks.runControlledPipeline.mockResolvedValue({
      candidateCount: 0,
      clusterCount: 0,
      candidate_pool_insufficient: true,
      candidate_pool_insufficient_reason: "all_feeds_failed",
    });

    const report = await runFullPipelineDryRun({
      env: FULL_ENV,
      now: NOW,
      preflight: { supabaseClient: fakeSupabase(true), fetchImpl: fakeFetch({ egress: true, notion: true }) },
    });

    expect(report.stages.rss.outcome).toBe("degraded");
    expect(report.stages.rss.insufficientReason).toBe("all_feeds_failed");
    // Degraded RSS is still timed (it ran) — not N/A.
    expect(report.stageMs.rss).not.toBe("N/A");
  });
});
