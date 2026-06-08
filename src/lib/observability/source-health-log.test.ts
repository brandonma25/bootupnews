import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryCaptureMessage = vi.fn();
const sentryCaptureException = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureMessage: sentryCaptureMessage,
  captureException: sentryCaptureException,
}));

vi.mock("@/lib/observability", () => ({
  logServerEvent: vi.fn(),
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
}));

describe("writeSourceHealthEntry — observability hygiene (#272 P2)", () => {
  const originalFetch = globalThis.fetch;
  const originalDbId = process.env.NOTION_SOURCE_HEALTH_LOG_DB_ID;
  const originalToken = process.env.NOTION_TOKEN;
  const originalDsn = process.env.SENTRY_DSN;

  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    process.env.SENTRY_DSN = "https://test@example.test/1"; // wrappers only emit when Sentry is configured
    delete process.env.NOTION_SOURCE_HEALTH_LOG_DB_ID;
    delete process.env.NOTION_TOKEN;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalDbId === undefined) delete process.env.NOTION_SOURCE_HEALTH_LOG_DB_ID;
    else process.env.NOTION_SOURCE_HEALTH_LOG_DB_ID = originalDbId;
    if (originalToken === undefined) delete process.env.NOTION_TOKEN;
    else process.env.NOTION_TOKEN = originalToken;
    if (originalDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalDsn;
  });

  const entry = {
    source: "Reuters Politics",
    date: "2026-06-03",
    outcome: "success" as const,
    lastSuccessfulFetchAt: "2026-06-03T12:00:00.000Z",
  };

  it("captures a Sentry message when env is not configured (deduped by reason)", async () => {
    const { writeSourceHealthEntry } = await import("@/lib/observability/source-health-log");

    const result = await writeSourceHealthEntry(entry);

    expect(result).toEqual({
      written: false,
      reason: "NOTION_SOURCE_HEALTH_LOG_DB_ID not configured",
    });
    expect(sentryCaptureMessage).toHaveBeenCalledTimes(1);
    expect(sentryCaptureMessage).toHaveBeenCalledWith(
      "Source health log writer no-op",
      expect.objectContaining({
        level: "warning",
        fingerprint: [
          "source-health-log-writer-noop",
          "NOTION_SOURCE_HEALTH_LOG_DB_ID not configured",
        ],
        tags: expect.objectContaining({
          observability_surface: "source_health_log",
        }),
      }),
    );
  });

  it("captures Sentry once per reason across multiple sources (fingerprint dedup)", async () => {
    const { writeSourceHealthEntry } = await import("@/lib/observability/source-health-log");

    await writeSourceHealthEntry({ ...entry, source: "Reuters Politics" });
    await writeSourceHealthEntry({ ...entry, source: "Axios Tech" });
    await writeSourceHealthEntry({ ...entry, source: "Semafor" });

    // The fingerprint dedup happens server-side at Sentry — but the *call*
    // happens once per writer invocation. We assert all three captures
    // carry the same fingerprint so Sentry can group them, not three
    // distinct issues.
    expect(sentryCaptureMessage).toHaveBeenCalledTimes(3);
    const fingerprints = sentryCaptureMessage.mock.calls.map((c) => c[1]?.fingerprint);
    expect(new Set(fingerprints.map((f) => JSON.stringify(f))).size).toBe(1);
  });

  it("does NOT capture Sentry when the write succeeds", async () => {
    process.env.NOTION_SOURCE_HEALTH_LOG_DB_ID = "db-id";
    process.env.NOTION_TOKEN = "tok";
    // First fetch = findExistingRow query (return empty). Second = create POST.
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "page-1" }), { status: 200 }),
      ) as typeof fetch;

    const { writeSourceHealthEntry } = await import("@/lib/observability/source-health-log");
    const result = await writeSourceHealthEntry(entry);

    expect(result).toEqual({ written: true, pageId: "page-1", action: "inserted" });
    expect(sentryCaptureMessage).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
