import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryCaptureMessage = vi.fn();
const sentryCaptureException = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureMessage: sentryCaptureMessage,
  captureException: sentryCaptureException,
}));

vi.mock("@/lib/observability", () => ({
  // Avoid Sentry init imports inside `@/lib/observability/index`.
  logServerEvent: vi.fn(),
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
}));

describe("writePipelineLogEntry — observability hygiene (#272 P2)", () => {
  const originalFetch = globalThis.fetch;
  const originalDbId = process.env.NOTION_PIPELINE_LOG_DB_ID;
  const originalToken = process.env.NOTION_TOKEN;
  const originalDsn = process.env.SENTRY_DSN;

  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    process.env.SENTRY_DSN = "https://test@example.test/1"; // wrappers only emit when Sentry is configured
    delete process.env.NOTION_PIPELINE_LOG_DB_ID;
    delete process.env.NOTION_TOKEN;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalDbId === undefined) delete process.env.NOTION_PIPELINE_LOG_DB_ID;
    else process.env.NOTION_PIPELINE_LOG_DB_ID = originalDbId;
    if (originalToken === undefined) delete process.env.NOTION_TOKEN;
    else process.env.NOTION_TOKEN = originalToken;
    if (originalDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalDsn;
  });

  const entry = {
    runType: "ingestion" as const,
    status: "ok" as const,
    rowCount: 7,
    message: "Ingestion completed: RSS=ok",
    briefingDate: "2026-06-03",
  };

  it("captures a Sentry message when NOTION_PIPELINE_LOG_DB_ID is missing", async () => {
    const { writePipelineLogEntry } = await import("@/lib/observability/pipeline-log");

    const result = await writePipelineLogEntry(entry);

    expect(result).toEqual({
      written: false,
      reason: "NOTION_PIPELINE_LOG_DB_ID not configured",
    });
    expect(sentryCaptureMessage).toHaveBeenCalledTimes(1);
    expect(sentryCaptureMessage).toHaveBeenCalledWith(
      "Pipeline log writer no-op",
      expect.objectContaining({
        level: "warning",
        fingerprint: ["pipeline-log-writer-noop", "NOTION_PIPELINE_LOG_DB_ID not configured"],
        tags: expect.objectContaining({
          observability_surface: "pipeline_log",
          writer_noop_reason: "NOTION_PIPELINE_LOG_DB_ID not configured",
        }),
      }),
    );
  });

  it("captures a Sentry message when NOTION_TOKEN is missing", async () => {
    process.env.NOTION_PIPELINE_LOG_DB_ID = "db-id";

    const { writePipelineLogEntry } = await import("@/lib/observability/pipeline-log");
    const result = await writePipelineLogEntry(entry);

    expect(result).toEqual({
      written: false,
      reason: "NOTION_TOKEN not configured",
    });
    expect(sentryCaptureMessage).toHaveBeenCalledWith(
      "Pipeline log writer no-op",
      expect.objectContaining({
        fingerprint: ["pipeline-log-writer-noop", "NOTION_TOKEN not configured"],
      }),
    );
  });

  it("captures a Sentry message when Notion returns a non-2xx response", async () => {
    process.env.NOTION_PIPELINE_LOG_DB_ID = "db-id";
    process.env.NOTION_TOKEN = "tok";
    globalThis.fetch = vi.fn(async () =>
      new Response("{ \"object\": \"error\" }", { status: 403 }),
    ) as typeof fetch;

    const { writePipelineLogEntry } = await import("@/lib/observability/pipeline-log");
    const result = await writePipelineLogEntry(entry);

    expect(result.written).toBe(false);
    if (!result.written) expect(result.reason).toBe("HTTP 403");
    expect(sentryCaptureMessage).toHaveBeenCalledWith(
      "Pipeline log writer no-op",
      expect.objectContaining({
        fingerprint: ["pipeline-log-writer-noop", "HTTP 403"],
      }),
    );
  });

  it("captures a Sentry exception when fetch throws", async () => {
    process.env.NOTION_PIPELINE_LOG_DB_ID = "db-id";
    process.env.NOTION_TOKEN = "tok";
    const networkError = new Error("network unreachable");
    globalThis.fetch = vi.fn(async () => {
      throw networkError;
    }) as typeof fetch;

    const { writePipelineLogEntry } = await import("@/lib/observability/pipeline-log");
    const result = await writePipelineLogEntry(entry);

    expect(result.written).toBe(false);
    if (!result.written) expect(result.reason).toBe("network unreachable");
    expect(sentryCaptureException).toHaveBeenCalledWith(
      networkError,
      expect.objectContaining({
        tags: expect.objectContaining({
          observability_surface: "pipeline_log",
          writer_noop_reason: "threw",
        }),
      }),
    );
  });

  it("does NOT capture Sentry when the write succeeds (no false alarms)", async () => {
    process.env.NOTION_PIPELINE_LOG_DB_ID = "db-id";
    process.env.NOTION_TOKEN = "tok";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: "page-1" }), { status: 200 }),
    ) as typeof fetch;

    const { writePipelineLogEntry } = await import("@/lib/observability/pipeline-log");
    const result = await writePipelineLogEntry(entry);

    expect(result).toEqual({ written: true, pageId: "page-1" });
    expect(sentryCaptureMessage).not.toHaveBeenCalled();
    expect(sentryCaptureException).not.toHaveBeenCalled();
  });
});
