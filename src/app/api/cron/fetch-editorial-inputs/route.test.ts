import { beforeEach, describe, expect, it, vi } from "vitest";

const runDailyNewsCron = vi.fn();
const runNewsletterIngestion = vi.fn();
const runEditorialStaging = vi.fn();
const logServerEvent = vi.fn();
const writePipelineLogEntry = vi.fn();
const sentryCaptureException = vi.fn();
const sentryFlush = vi.fn(async () => true);
const createSupabaseServiceRoleClient = vi.fn();

let capturedAfterCallback: (() => void | Promise<void>) | null = null;

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (cb: () => void | Promise<void>) => {
      capturedAfterCallback = cb;
    },
  };
});

vi.mock("@sentry/nextjs", () => ({
  captureException: sentryCaptureException,
  flush: sentryFlush,
}));

vi.mock("@/lib/cron/fetch-news", () => ({
  runDailyNewsCron,
}));

vi.mock("@/lib/newsletter-ingestion/runner", () => ({
  runNewsletterIngestion,
}));

vi.mock("@/lib/editorial-staging/runner", () => ({
  runEditorialStaging,
}));

vi.mock("@/lib/observability", () => ({
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
  logServerEvent,
}));

vi.mock("@/lib/observability/pipeline-log", () => ({
  writePipelineLogEntry,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient,
}));

/**
 * Build a tiny supabase-client double exposing only the surface the cron route
 * uses: `client.from('cron_runs').insert(...).select(...)` and
 * `.from('cron_runs').update(...).eq(...)`.
 *
 * `lockAcquired === true`  → insert succeeds (fresh row).
 * `lockAcquired === false` → insert rejects with Postgres unique_violation
 *                            code 23505 (lock already held).
 * `lockAcquired === 'error'` → insert rejects with a generic DB error
 *                              (fall-through best-effort path).
 */
function buildSupabaseLockClient(lockAcquired: true | false | "error") {
  const insertResult =
    lockAcquired === true
      ? { data: [{ briefing_date: "2026-05-12" }], error: null }
      : lockAcquired === false
        ? { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint \"cron_runs_pkey\"" } }
        : { data: null, error: { code: "08006", message: "connection reset" } };

  return {
    from: vi.fn((table: string) => {
      if (table === "cron_runs") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(async () => insertResult),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: null, error: null })),
          })),
        };
      }
      throw new Error(`Unexpected supabase table in test: ${table}`);
    }),
  };
}

type RequestAuth = { header?: "x-cron-secret" | "authorization"; secret?: string };

function buildRequest(auth: RequestAuth | string = {}): Request {
  const normalized: RequestAuth =
    typeof auth === "string" ? { header: "x-cron-secret", secret: auth } : auth;
  const headers: Record<string, string> = {};
  if (normalized.secret) {
    if (normalized.header === "authorization") {
      headers.authorization = `Bearer ${normalized.secret}`;
    } else {
      headers["x-cron-secret"] = normalized.secret;
    }
  }
  return new Request("http://localhost:3000/api/cron/fetch-editorial-inputs", {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
}

async function runCapturedAfter() {
  if (!capturedAfterCallback) return;
  await capturedAfterCallback();
}

describe("/api/cron/fetch-editorial-inputs", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    capturedAfterCallback = null;
    process.env.CRON_SECRET = "local-cron-secret";
    delete process.env.ALLOW_VERCEL_CRON_FALLBACK;
    runDailyNewsCron.mockResolvedValue({
      success: true,
      timestamp: "2026-05-12T10:15:00.000Z",
      summary: {
        message: "Persisted a new daily Top 5 snapshot.",
      },
    });
    runNewsletterIngestion.mockResolvedValue({
      success: true,
      timestamp: "2026-05-12T10:15:01.000Z",
      summary: {
        message: "Newsletter ingestion processed Gmail newsletter candidates without publishing.",
      },
    });
    runEditorialStaging.mockResolvedValue({
      success: true,
      timestamp: "2026-05-12T10:15:02.000Z",
      summary: {
        message: "Editorial staging completed.",
        briefingDate: "2026-05-12",
        notionRowsInserted: 7,
        notionRowsUpdated: 0,
        notionRowsSkippedHumanEdited: 0,
        notionErrors: [],
      },
    });
    writePipelineLogEntry.mockResolvedValue({ written: true, pageId: "log-1" });
    // Default: lock acquires cleanly. Individual tests override.
    createSupabaseServiceRoleClient.mockReturnValue(buildSupabaseLockClient(true));
  });

  it("rejects unauthorized requests without scheduling the pipeline", async () => {
    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(buildRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(capturedAfterCallback).toBeNull();
    expect(runDailyNewsCron).not.toHaveBeenCalled();
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("requires CRON_SECRET to be configured", async () => {
    delete process.env.CRON_SECRET;

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(buildRequest("local-cron-secret"));

    expect(response.status).toBe(401);
    expect(capturedAfterCallback).toBeNull();
    expect(runDailyNewsCron).not.toHaveBeenCalled();
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("rejects legacy Authorization Bearer when ALLOW_VERCEL_CRON_FALLBACK is unset", async () => {
    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(
      buildRequest({ header: "authorization", secret: "local-cron-secret" }),
    );

    expect(response.status).toBe(401);
    expect(capturedAfterCallback).toBeNull();
    expect(runDailyNewsCron).not.toHaveBeenCalled();
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("accepts legacy Authorization Bearer when ALLOW_VERCEL_CRON_FALLBACK=true (rollback escape hatch)", async () => {
    process.env.ALLOW_VERCEL_CRON_FALLBACK = "true";

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(
      buildRequest({ header: "authorization", secret: "local-cron-secret" }),
    );

    expect(response.status).toBe(202);
    expect(capturedAfterCallback).not.toBeNull();
    await runCapturedAfter();
    expect(runDailyNewsCron).toHaveBeenCalledTimes(1);
    expect(runNewsletterIngestion).toHaveBeenCalledTimes(1);
  });

  it("still rejects wrong legacy Bearer when ALLOW_VERCEL_CRON_FALLBACK=true", async () => {
    process.env.ALLOW_VERCEL_CRON_FALLBACK = "true";

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(
      buildRequest({ header: "authorization", secret: "wrong-secret" }),
    );

    expect(response.status).toBe(401);
    expect(capturedAfterCallback).toBeNull();
    expect(runDailyNewsCron).not.toHaveBeenCalled();
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("responds 202 immediately and runs newsletter, then RSS, then editorial staging via after()", async () => {
    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(buildRequest("local-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      success: true,
      summary: {
        message: expect.stringContaining("Ingestion accepted"),
      },
    });
    // Pipeline has not yet run — it's only scheduled.
    expect(runDailyNewsCron).not.toHaveBeenCalled();
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
    expect(runEditorialStaging).not.toHaveBeenCalled();

    await runCapturedAfter();

    expect(runNewsletterIngestion).toHaveBeenCalledWith({ writeCandidates: true });
    expect(runDailyNewsCron).toHaveBeenCalledTimes(1);
    expect(runEditorialStaging).toHaveBeenCalledTimes(1);
    // Newsletter runs before RSS so rank slots are reserved before the RSS snapshot fills them.
    expect(runNewsletterIngestion.mock.invocationCallOrder[0]).toBeLessThan(
      runDailyNewsCron.mock.invocationCallOrder[0],
    );
    expect(runDailyNewsCron.mock.invocationCallOrder[0]).toBeLessThan(
      runEditorialStaging.mock.invocationCallOrder[0],
    );
  });

  it("writes a Pipeline Log entry on completion with status=ok when all branches succeed", async () => {
    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    await GET(buildRequest("local-cron-secret"));
    await runCapturedAfter();

    expect(writePipelineLogEntry).toHaveBeenCalledTimes(1);
    expect(writePipelineLogEntry.mock.calls[0][0]).toMatchObject({
      runType: "ingestion",
      status: "ok",
      rowCount: 7,
      briefingDate: "2026-05-12",
    });
  });

  it("writes Pipeline Log status=fail when a branch fails", async () => {
    runDailyNewsCron.mockResolvedValue({
      success: false,
      timestamp: "2026-05-12T10:15:00.000Z",
      summary: { message: "RSS failed." },
    });

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    await GET(buildRequest("local-cron-secret"));
    await runCapturedAfter();

    expect(writePipelineLogEntry).toHaveBeenCalledTimes(1);
    expect(writePipelineLogEntry.mock.calls[0][0]).toMatchObject({
      runType: "ingestion",
      status: "fail",
    });
  });

  it("still attempts newsletter ingestion when the RSS path fails closed", async () => {
    runDailyNewsCron.mockResolvedValue({
      success: false,
      timestamp: "2026-05-12T10:15:00.000Z",
      summary: {
        message: "Daily news cron failed before completion.",
      },
    });

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    await GET(buildRequest("local-cron-secret"));
    await runCapturedAfter();

    expect(runNewsletterIngestion).toHaveBeenCalledTimes(1);
    expect(runDailyNewsCron).toHaveBeenCalledTimes(1);
    expect(writePipelineLogEntry.mock.calls[0][0].status).toBe("fail");
  });

  it("a thrown task error is caught by runTask and reported via the pipeline log without crashing the after() callback", async () => {
    runDailyNewsCron.mockRejectedValue(new Error("rss explosion"));

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(buildRequest("local-cron-secret"));

    expect(response.status).toBe(202);
    // Should not throw out of after():
    await expect(runCapturedAfter()).resolves.not.toThrow();

    // logServerEvent should record the per-task failure.
    const errorLog = logServerEvent.mock.calls.find(
      ([level, message]) => level === "error" && typeof message === "string" && message.includes("task failed before completion"),
    );
    expect(errorLog).toBeTruthy();
    expect(writePipelineLogEntry.mock.calls[0][0].status).toBe("fail");
  });

  it("captures IngestionTimeoutInternal to Sentry when the pipeline exceeds the internal budget", async () => {
    vi.useFakeTimers();
    try {
      // Stall the very first stage (newsletter) so the internal timeout fires
      // while stageRef.current === "newsletter".
      runNewsletterIngestion.mockImplementation(
        () => new Promise(() => {
          /* never resolves */
        }),
      );

      const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
      const response = await GET(buildRequest("local-cron-secret"));
      expect(response.status).toBe(202);

      // Kick the after callback; the real pipeline never resolves, so the
      // internal 55s timeout has to win the race.
      const afterPromise = runCapturedAfter();
      // Advance past 55s to trip the internal timeout.
      await vi.advanceTimersByTimeAsync(56_000);
      await afterPromise;

      expect(sentryCaptureException).toHaveBeenCalledTimes(1);
      const [capturedError, captureContext] = sentryCaptureException.mock.calls[0];
      expect(capturedError).toBeInstanceOf(Error);
      expect((capturedError as Error).name).toBe("IngestionTimeoutInternal");
      expect(captureContext).toMatchObject({
        level: "error",
        tags: {
          route: "/api/cron/fetch-editorial-inputs",
          stage: "newsletter",
          failure_type: "ingestion_timeout_internal",
        },
        extra: {
          internalTimeoutMs: 55_000,
        },
      });
      // Pipeline log is NOT written when the pipeline times out — there is no
      // briefingDate available because editorial-staging never ran.
      expect(writePipelineLogEntry).not.toHaveBeenCalled();

      // Sentry must be flushed before the after() callback returns, otherwise
      // the captured timeout event may be lost when Vercel freezes the function
      // instance ~5s later at the 60s maxDuration wall.
      expect(sentryFlush).toHaveBeenCalled();
      expect(sentryFlush.mock.calls[0][0]).toBe(2_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not leak CRON_SECRET in the 202 response body", async () => {
    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(buildRequest("local-cron-secret"));
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("local-cron-secret");
  });

  describe("run-lock (cron_runs)", () => {
    it("first call acquires the lock and schedules the pipeline via after()", async () => {
      createSupabaseServiceRoleClient.mockReturnValue(buildSupabaseLockClient(true));

      const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
      const response = await GET(buildRequest("local-cron-secret"));
      const body = await response.json();

      expect(response.status).toBe(202);
      expect(body.success).toBe(true);
      expect(body.status).toBeUndefined(); // "skipped" only appears on the no-op response.
      expect(typeof body.briefing_date).toBe("string");
      expect(capturedAfterCallback).not.toBeNull();
    });

    it("second call within the same briefing_date no-ops with HTTP 200 status=skipped and does NOT schedule after()", async () => {
      createSupabaseServiceRoleClient.mockReturnValue(buildSupabaseLockClient(false));

      const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
      const response = await GET(buildRequest("local-cron-secret"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        success: true,
        status: "skipped",
        reason: "already_ran",
      });
      expect(typeof body.briefing_date).toBe("string");
      // Critical: the pipeline must NOT be scheduled on the no-op branch,
      // otherwise the second cronjob.org fire still produces a duplicate run.
      expect(capturedAfterCallback).toBeNull();
      expect(runDailyNewsCron).not.toHaveBeenCalled();
      expect(runNewsletterIngestion).not.toHaveBeenCalled();
      expect(runEditorialStaging).not.toHaveBeenCalled();
    });

    it("falls through and runs the pipeline (best-effort) when the lock table is unreachable", async () => {
      // A generic DB error (not Postgres unique_violation 23505) means we cannot
      // tell whether a prior run claimed today's slot. We prefer one duplicate
      // run over a missed run, so we proceed.
      createSupabaseServiceRoleClient.mockReturnValue(buildSupabaseLockClient("error"));

      const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
      const response = await GET(buildRequest("local-cron-secret"));

      expect(response.status).toBe(202);
      expect(capturedAfterCallback).not.toBeNull();
      await runCapturedAfter();
      expect(runDailyNewsCron).toHaveBeenCalledTimes(1);
      expect(runNewsletterIngestion).toHaveBeenCalledTimes(1);
      expect(runEditorialStaging).toHaveBeenCalledTimes(1);

      const warnLog = logServerEvent.mock.calls.find(
        ([level, message]) =>
          level === "warn" &&
          typeof message === "string" &&
          message.includes("Run-lock acquire failed"),
      );
      expect(warnLog).toBeTruthy();
    });
  });
});
