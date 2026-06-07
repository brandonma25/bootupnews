import { beforeEach, describe, expect, it, vi } from "vitest";

const runNewsletterIngestion = vi.fn();
const runDailyNewsCron = vi.fn();
const runEditorialStaging = vi.fn();
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
vi.mock("@/lib/newsletter-ingestion/runner", () => ({ runNewsletterIngestion }));
vi.mock("@/lib/cron/fetch-news", () => ({ runDailyNewsCron }));
vi.mock("@/lib/editorial-staging/runner", () => ({ runEditorialStaging }));
vi.mock("@/lib/editorial-sweep/needs-review-sweep", () => ({ runNeedsReviewSweep }));
vi.mock("@/lib/observability", () => ({
  logServerEvent,
  errorContext: (error: unknown) => ({ errorMessage: error instanceof Error ? error.message : String(error) }),
}));
vi.mock("@/lib/observability/pipeline-log", () => ({ writePipelineLogEntry }));

function buildRequest(secret?: string): Request {
  const headers: Record<string, string> = {};
  if (secret) headers["x-cron-secret"] = secret;
  return new Request("https://example.com/api/cron/ingest-newsletters", { headers });
}

async function runAfter() {
  if (capturedAfter) await capturedAfter();
}

describe("/api/cron/ingest-newsletters", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    capturedAfter = null;
    process.env.CRON_SECRET = "local-cron-secret";
    delete process.env.ALLOW_VERCEL_CRON_FALLBACK;
    runNewsletterIngestion.mockResolvedValue({
      success: true,
      timestamp: "t",
      summary: { message: "ok", fetchedMessageCount: 3 },
    });
    writePipelineLogEntry.mockResolvedValue({ written: true, pageId: "log-1" });
  });

  it("rejects unauthorized requests (401, no schedule)", async () => {
    const { GET } = await import("@/app/api/cron/ingest-newsletters/route");
    const response = await GET(buildRequest("wrong-secret"));
    expect(response.status).toBe(401);
    expect(capturedAfter).toBeNull();
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("responds 202 and runs the NEWSLETTER stage ONLY via after()", async () => {
    const { GET } = await import("@/app/api/cron/ingest-newsletters/route");
    const response = await GET(buildRequest("local-cron-secret"));
    expect(response.status).toBe(202);
    expect(capturedAfter).not.toBeNull();

    await runAfter();

    expect(runNewsletterIngestion).toHaveBeenCalledWith({ writeCandidates: true });
    // Decoupled: this endpoint runs ONLY newsletter — never RSS / staging / sweep.
    expect(runDailyNewsCron).not.toHaveBeenCalled();
    expect(runEditorialStaging).not.toHaveBeenCalled();
    expect(runNeedsReviewSweep).not.toHaveBeenCalled();
  });

  it("writes a Pipeline Log entry with runType=newsletter_ingestion, status=ok", async () => {
    const { GET } = await import("@/app/api/cron/ingest-newsletters/route");
    await GET(buildRequest("local-cron-secret"));
    await runAfter();

    expect(writePipelineLogEntry).toHaveBeenCalledTimes(1);
    expect(writePipelineLogEntry.mock.calls[0][0]).toMatchObject({
      runType: "newsletter_ingestion",
      status: "ok",
      rowCount: 3,
    });
  });

  it("a degraded newsletter run (success:false) logs warn, NOT fail (supplementary source)", async () => {
    runNewsletterIngestion.mockResolvedValue({
      success: false,
      timestamp: "t",
      summary: { message: "Gmail OAuth expired" },
    });

    const { GET } = await import("@/app/api/cron/ingest-newsletters/route");
    await GET(buildRequest("local-cron-secret"));
    await runAfter();

    expect(writePipelineLogEntry.mock.calls[0][0].status).toBe("warn");
  });
});
