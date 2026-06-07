import { beforeEach, describe, expect, it, vi } from "vitest";

const runNeedsReviewSweep = vi.fn();
const writePipelineLogEntry = vi.fn();
const logServerEvent = vi.fn();
const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn(async () => true);

let capturedAfter: (() => void | Promise<void>) | null = null;

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (cb: () => void | Promise<void>) => { capturedAfter = cb; } };
});
vi.mock("@sentry/nextjs", () => ({ captureException: sentryCaptureException, flush: sentryFlush }));
vi.mock("@/lib/editorial-sweep/needs-review-sweep", () => ({ runNeedsReviewSweep }));
vi.mock("@/lib/observability", () => ({
  logServerEvent,
  errorContext: (error: unknown) => ({ errorMessage: error instanceof Error ? error.message : String(error) }),
}));
vi.mock("@/lib/observability/pipeline-log", () => ({ writePipelineLogEntry }));

function buildRequest(secret?: string): Request {
  const headers: Record<string, string> = {};
  if (secret) headers["x-cron-secret"] = secret;
  return new Request("https://example.com/api/cron/sweep", { headers });
}

async function runAfter() {
  if (capturedAfter) await capturedAfter();
}

describe("/api/cron/sweep", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    capturedAfter = null;
    process.env.CRON_SECRET = "local-cron-secret";
    runNeedsReviewSweep.mockResolvedValue({ disposedCount: 2, flaggedCount: 1, mutated: true });
    writePipelineLogEntry.mockResolvedValue({ written: true, pageId: "log-1" });
  });

  it("rejects unauthorized requests (401, no schedule)", async () => {
    const { GET } = await import("@/app/api/cron/sweep/route");
    const response = await GET(buildRequest("wrong-secret"));
    expect(response.status).toBe(401);
    expect(capturedAfter).toBeNull();
    expect(runNeedsReviewSweep).not.toHaveBeenCalled();
  });

  it("responds 202 and runs the sweep via after()", async () => {
    const { GET } = await import("@/app/api/cron/sweep/route");
    const response = await GET(buildRequest("local-cron-secret"));
    expect(response.status).toBe(202);
    expect(capturedAfter).not.toBeNull();

    await runAfter();
    expect(runNeedsReviewSweep).toHaveBeenCalledTimes(1);
  });

  it("writes a Pipeline Log entry runType=needs_review_sweep status=ok", async () => {
    const { GET } = await import("@/app/api/cron/sweep/route");
    await GET(buildRequest("local-cron-secret"));
    await runAfter();

    expect(writePipelineLogEntry).toHaveBeenCalledTimes(1);
    expect(writePipelineLogEntry.mock.calls[0][0]).toMatchObject({
      runType: "needs_review_sweep",
      status: "ok",
      rowCount: 2,
    });
  });

  it("a sweep that returns an error string → status=warn (degraded), not a throw", async () => {
    runNeedsReviewSweep.mockResolvedValue({ disposedCount: 0, flaggedCount: 0, mutated: false, error: "db unreachable" });

    const { GET } = await import("@/app/api/cron/sweep/route");
    await GET(buildRequest("local-cron-secret"));
    await expect(runAfter()).resolves.not.toThrow();

    expect(writePipelineLogEntry.mock.calls[0][0].status).toBe("warn");
  });

  it("is safe to double-fire (lock-free idempotent): two runs both complete", async () => {
    const { GET } = await import("@/app/api/cron/sweep/route");

    await GET(buildRequest("local-cron-secret"));
    await runAfter();
    await GET(buildRequest("local-cron-secret"));
    await runAfter();

    // Each fire runs the bounded idempotent UPDATE; no lock blocks the second,
    // and neither throws. Real "no extra mutation" is a property of
    // runNeedsReviewSweep (covered in its own suite).
    expect(runNeedsReviewSweep).toHaveBeenCalledTimes(2);
    expect(writePipelineLogEntry).toHaveBeenCalledTimes(2);
  });
});
