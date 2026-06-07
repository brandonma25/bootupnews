import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PreflightDeps } from "@/lib/pipeline/preflight";

// Mock the LEAF stage functions only, so the REAL shared pipeline body
// (runEditorialIngestionPipeline) + the REAL harness mapping run end-to-end.
const mocks = vi.hoisted(() => ({
  runNeedsReviewSweep: vi.fn(),
  runNewsletterIngestion: vi.fn(),
  runDailyNewsCron: vi.fn(),
  runEditorialStaging: vi.fn(),
}));

vi.mock("@/lib/editorial-sweep/needs-review-sweep", () => ({
  runNeedsReviewSweep: mocks.runNeedsReviewSweep,
}));
vi.mock("@/lib/newsletter-ingestion/runner", () => ({
  runNewsletterIngestion: mocks.runNewsletterIngestion,
}));
vi.mock("@/lib/cron/fetch-news", () => ({
  runDailyNewsCron: mocks.runDailyNewsCron,
}));
vi.mock("@/lib/editorial-staging/runner", () => ({
  runEditorialStaging: mocks.runEditorialStaging,
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

const NOW = new Date("2026-06-07T12:00:00.000Z");

function primeHealthyMocks() {
  mocks.runNeedsReviewSweep.mockResolvedValue({ disposedCount: 2, flaggedCount: 1, mutated: false });
  mocks.runNewsletterIngestion.mockResolvedValue({
    success: true,
    timestamp: "t",
    summary: { message: "ok", fetchedMessageCount: 3 },
  });
  mocks.runDailyNewsCron.mockResolvedValue({
    success: true,
    timestamp: "t",
    summary: { rawItemCount: 40, clusterCount: 7, degraded: false, message: "ok" },
  });
  mocks.runEditorialStaging.mockResolvedValue({
    success: true,
    timestamp: "t",
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

describe("runFullPipelineDryRun (run-all-like-prod)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    primeHealthyMocks();
  });

  it("runs the SAME shared pipeline body in dry mode, all stages ran + timed", async () => {
    const report = await runFullPipelineDryRun({
      env: FULL_ENV,
      now: NOW,
      preflight: { supabaseClient: fakeSupabase(true), fetchImpl: fakeFetch({ egress: true, notion: true }) },
    });

    expect(report.stages.sweep.outcome).toBe("ran");
    expect(report.stages.newsletter.outcome).toBe("ran");
    expect(report.stages.rss.outcome).toBe("ran");
    expect(report.stages.staging.outcome).toBe("ran");

    // dryRun threaded into the REAL prod functions — no fork. RSS uses the real
    // runDailyNewsCron (not runControlledPipeline anymore).
    expect(mocks.runNewsletterIngestion).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    expect(mocks.runDailyNewsCron).toHaveBeenCalledWith({ dryRun: true });
    expect(mocks.runEditorialStaging).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
    // sweep forced dry via env.
    expect(mocks.runNeedsReviewSweep).toHaveBeenCalledWith(
      expect.objectContaining({ env: expect.objectContaining({ NEEDS_REVIEW_SWEEP_DRY_RUN: "true" }) }),
    );

    // Every stage timed (none N/A — they all ran), plus a wall-clock total.
    expect(report.stageMs.sweep).not.toBe("N/A");
    expect(report.stageMs.newsletter).not.toBe("N/A");
    expect(report.stageMs.rss).not.toBe("N/A");
    expect(report.stageMs.staging).not.toBe("N/A");
    expect(report.stageMs.total).toEqual(expect.any(Number));

    // Feature-validation visibility.
    expect(report.stages.staging.evergreenFiltered).toBe(1);
    expect(report.stages.staging.crossDateWouldSkip).toBe(1);
    expect(report.stages.newsletter.itemsProcessed).toBe(3);
    expect(report.stages.rss.candidateCount).toBe(40);

    expect(report.certifies60sFit).toBe(false);
  });

  it("RUNS a stage even when its dependency is missing (prod fidelity), surfacing a real error + matrix reason", async () => {
    // Newsletter has no Gmail creds in env, and its real run fails. The harness
    // must still CALL it (prod runs every leg) and report error, not skip.
    const envNoGmail = { NOTION_TOKEN: "tok", NOTION_EDITORIAL_QUEUE_DB_ID: "db" } as unknown as NodeJS.ProcessEnv;
    mocks.runNewsletterIngestion.mockResolvedValue({
      success: false,
      timestamp: "t",
      summary: { message: "Gmail auth failed" },
    });

    const report = await runFullPipelineDryRun({
      env: envNoGmail,
      now: NOW,
      preflight: { supabaseClient: fakeSupabase(true), fetchImpl: fakeFetch({ egress: true, notion: true }) },
    });

    expect(mocks.runNewsletterIngestion).toHaveBeenCalledTimes(1); // RAN despite missing creds
    expect(report.stages.newsletter.outcome).toBe("error");
    expect(report.stages.newsletter.note).toMatch(/GMAIL/); // matrix pre-check names the missing var
    // The other legs still ran — one leg's failure does not abort the rest.
    expect(report.stages.rss.outcome).toBe("ran");
    expect(report.stages.staging.outcome).toBe("ran");
    expect(report.stageMs.newsletter).not.toBe("N/A"); // it ran (and failed), so it is timed
  });

  it("maps RSS degraded (all-feeds-thin) without throwing", async () => {
    mocks.runDailyNewsCron.mockResolvedValue({
      success: true,
      timestamp: "t",
      summary: { rawItemCount: 3, clusterCount: 3, degraded: true, message: "degraded: under target" },
    });

    const report = await runFullPipelineDryRun({
      env: FULL_ENV,
      now: NOW,
      preflight: { supabaseClient: fakeSupabase(true), fetchImpl: fakeFetch({ egress: true, notion: true }) },
    });

    expect(report.stages.rss.outcome).toBe("degraded");
    expect(report.stageMs.rss).not.toBe("N/A");
  });

  it("never throws and still produces a report when ALL deps are missing", async () => {
    mocks.runNeedsReviewSweep.mockResolvedValue({ disposedCount: 0, flaggedCount: 0, mutated: false, error: "no supabase" });
    mocks.runNewsletterIngestion.mockResolvedValue({ success: false, timestamp: "t", summary: { message: "no creds" } });
    mocks.runDailyNewsCron.mockResolvedValue({ success: false, timestamp: "t", summary: { message: "no egress" } });
    mocks.runEditorialStaging.mockResolvedValue({ success: false, timestamp: "t", summary: { message: "no notion" } });

    const report = await runFullPipelineDryRun({
      env: {} as NodeJS.ProcessEnv,
      now: NOW,
      preflight: { supabaseClient: null, fetchImpl: fakeFetch({ egress: false, notion: false }) },
    });

    // All four were attempted (run-all), none aborted the others.
    expect(mocks.runNeedsReviewSweep).toHaveBeenCalled();
    expect(mocks.runNewsletterIngestion).toHaveBeenCalled();
    expect(mocks.runDailyNewsCron).toHaveBeenCalled();
    expect(mocks.runEditorialStaging).toHaveBeenCalled();
    expect(report.stages.sweep.outcome).toBe("error");
    expect(report.stages.rss.outcome).toBe("error");
    expect(report.certifies60sFit).toBe(false);
  });
});
