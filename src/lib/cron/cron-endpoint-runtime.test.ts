import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runNewsletterIngestion: vi.fn(),
  runDailyNewsCron: vi.fn(),
  runEditorialStaging: vi.fn(),
  sentryCaptureException: vi.fn(),
  sentryFlush: vi.fn(async () => true),
  logServerEvent: vi.fn(),
}));
vi.mock("@/lib/newsletter-ingestion/runner", () => ({ runNewsletterIngestion: mocks.runNewsletterIngestion }));
vi.mock("@/lib/cron/fetch-news", () => ({ runDailyNewsCron: mocks.runDailyNewsCron }));
vi.mock("@/lib/editorial-staging/runner", () => ({ runEditorialStaging: mocks.runEditorialStaging }));
vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.sentryCaptureException,
  flush: mocks.sentryFlush,
}));
vi.mock("@/lib/observability", () => ({
  logServerEvent: mocks.logServerEvent,
  errorContext: (error: unknown) => ({ errorMessage: error instanceof Error ? error.message : String(error) }),
}));

import {
  INTERNAL_STAGE_TIMEOUT_MS,
  isCronAuthorized,
  runEditorialStagesWithTiming,
} from "@/lib/cron/cron-endpoint-runtime";

function req(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/cron/x", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "s3cret";
  delete process.env.ALLOW_VERCEL_CRON_FALLBACK;
  mocks.runNewsletterIngestion.mockResolvedValue({ success: true, timestamp: "t", summary: { message: "nl", fetchedMessageCount: 2 } });
  mocks.runDailyNewsCron.mockResolvedValue({ success: true, timestamp: "t", summary: { message: "rss" } });
  mocks.runEditorialStaging.mockResolvedValue({ success: true, timestamp: "t", summary: { message: "st", briefingDate: "2026-06-07" } });
});

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.ALLOW_VERCEL_CRON_FALLBACK;
});

describe("isCronAuthorized", () => {
  it("accepts the x-cron-secret header", () => {
    expect(isCronAuthorized(req({ "x-cron-secret": "s3cret" }))).toBe(true);
  });

  it("rejects a wrong or missing secret", () => {
    expect(isCronAuthorized(req({ "x-cron-secret": "nope" }))).toBe(false);
    expect(isCronAuthorized(req({}))).toBe(false);
  });

  it("honors the Bearer fallback ONLY when ALLOW_VERCEL_CRON_FALLBACK=true", () => {
    expect(isCronAuthorized(req({ authorization: "Bearer s3cret" }))).toBe(false);
    process.env.ALLOW_VERCEL_CRON_FALLBACK = "true";
    expect(isCronAuthorized(req({ authorization: "Bearer s3cret" }))).toBe(true);
    expect(isCronAuthorized(req({ authorization: "Bearer nope" }))).toBe(false);
  });

  it("returns false when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized(req({ "x-cron-secret": "s3cret" }))).toBe(false);
  });
});

describe("runEditorialStagesWithTiming", () => {
  it("runs the requested subset, returns stage_ms, not timed out", async () => {
    const run = await runEditorialStagesWithTiming({
      routeName: "/api/cron/x",
      stages: ["rss", "editorial_staging"],
    });

    expect(run.timedOut).toBe(false);
    expect(run.results.rss).not.toBeNull();
    expect(run.results.editorialStaging).not.toBeNull();
    expect(run.results.newsletter).toBeNull();
    expect(typeof run.stageMs.total).toBe("number");
    expect(run.stageMs.rss).not.toBe("N/A");
  });

  it("degrades (does NOT throw) when a stage throws — the rest still run, stage_ms present", async () => {
    mocks.runDailyNewsCron.mockRejectedValue(new Error("rss boom"));

    const run = await runEditorialStagesWithTiming({
      routeName: "/api/cron/x",
      stages: ["rss", "editorial_staging"],
    });

    expect(run.timedOut).toBe(false);
    expect(run.results.rss?.success).toBe(false); // caught → failure result, not a throw
    expect(run.results.editorialStaging).not.toBeNull(); // one leg failing did not abort the rest
    expect(mocks.logServerEvent).toHaveBeenCalled();
    expect(run.stageMs.rss).not.toBe("N/A");
  });

  it("on internal timeout: timedOut=true, names the in-flight stage, captures + flushes Sentry, partial stage_ms", async () => {
    vi.useFakeTimers();
    try {
      mocks.runDailyNewsCron.mockImplementation(() => new Promise(() => {
        /* never resolves */
      }));

      const pending = runEditorialStagesWithTiming({
        routeName: "/api/cron/x",
        stages: ["rss", "editorial_staging"],
      });
      await vi.advanceTimersByTimeAsync(INTERNAL_STAGE_TIMEOUT_MS + 1_000);
      const run = await pending;

      expect(run.timedOut).toBe(true);
      expect(run.inFlightStage).toBe("rss");
      expect(mocks.sentryCaptureException).toHaveBeenCalledTimes(1);
      expect((mocks.sentryCaptureException.mock.calls[0][0] as Error).name).toBe("StageTimeoutError");
      expect(mocks.sentryFlush).toHaveBeenCalledWith(2_000);
      // editorial_staging never ran (RSS hung), so it stays null.
      expect(run.results.editorialStaging).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
