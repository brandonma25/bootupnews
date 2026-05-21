import { beforeEach, describe, expect, it, vi } from "vitest";

const runDailyNewsCron = vi.fn();
const runNewsletterIngestion = vi.fn();
const runEditorialStaging = vi.fn();
const logServerEvent = vi.fn();
const writePipelineLogEntry = vi.fn();
const sentryCaptureException = vi.fn();
const sentryCaptureMessage = vi.fn();
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
  captureMessage: sentryCaptureMessage,
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
 * Stateful supabase-client double for the run-lock tests. Tracks a single
 * cron_runs row per briefing_date so reclaim semantics (DELETE + re-INSERT)
 * are testable end-to-end.
 *
 * Each helper exposes the underlying state via `_state` so assertions can
 * inspect the final row state without re-querying.
 */
type LockRow = {
  briefing_date: string;
  cron_name: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "fail" | "timeout";
};

function buildLockClient(initialRow: LockRow | null = null, options: { insertError?: { code: string; message: string } } = {}) {
  const state: { row: LockRow | null } = { row: initialRow };
  const calls: { insert: number; update: number; delete: number; select: number } = {
    insert: 0, update: 0, delete: 0, select: 0,
  };

  return {
    _state: state,
    _calls: calls,
    from: vi.fn((table: string) => {
      if (table !== "cron_runs") throw new Error(`Unexpected supabase table: ${table}`);
      return {
        insert: vi.fn((payload: { briefing_date: string; cron_name: string }) => ({
          select: vi.fn(async () => {
            calls.insert += 1;
            if (options.insertError) {
              return { data: null, error: options.insertError };
            }
            if (state.row) {
              return { data: null, error: { code: "23505", message: 'duplicate key value violates unique constraint "cron_runs_pkey"' } };
            }
            state.row = {
              briefing_date: payload.briefing_date,
              cron_name: payload.cron_name,
              started_at: new Date().toISOString(),
              finished_at: null,
              status: "running",
            };
            return { data: [{ briefing_date: state.row.briefing_date }], error: null };
          }),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              calls.select += 1;
              return { data: state.row, error: null };
            }),
          })),
        })),
        update: vi.fn((patch: Partial<LockRow>) => ({
          eq: vi.fn(async () => {
            calls.update += 1;
            if (state.row) state.row = { ...state.row, ...patch };
            return { data: null, error: null };
          }),
        })),
        delete: vi.fn(() => {
          // .delete().eq(...).eq(...) chain — both eq calls return the same thunk
          const chain = {
            eq: vi.fn(() => chain),
            then<T>(resolve: (value: { data: null; error: null }) => T) {
              calls.delete += 1;
              state.row = null;
              return Promise.resolve({ data: null, error: null }).then(resolve);
            },
          };
          return chain;
        }),
      };
    }),
  };
}

/**
 * Legacy helper kept for the existing test cases that don't need the stateful
 * scaffolding. Maps the old true/false/'error' contract onto buildLockClient.
 */
function buildSupabaseLockClient(lockAcquired: true | false | "error") {
  if (lockAcquired === true) return buildLockClient(null);
  if (lockAcquired === false) {
    return buildLockClient({
      briefing_date: "2026-05-12",
      cron_name: "fetch-editorial-inputs",
      started_at: new Date().toISOString(),  // fresh 'running' → "in_progress" deny
      finished_at: null,
      status: "running",
    });
  }
  return buildLockClient(null, { insertError: { code: "08006", message: "connection reset" } });
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

    it("rejects a second call while a fresh 'running' row exists (in_progress)", async () => {
      // Brief: a fresh 'running' row → another instance is mid-flight → no-op.
      createSupabaseServiceRoleClient.mockReturnValue(buildSupabaseLockClient(false));

      const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
      const response = await GET(buildRequest("local-cron-secret"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        success: true,
        status: "skipped",
        reason: "in_progress",
      });
      expect(capturedAfterCallback).toBeNull();
      expect(runDailyNewsCron).not.toHaveBeenCalled();
    });

    // Issue #264 — five regression cases for fail-closed-and-stuck + fall-through hardening.

    it("(1) reclaims a 'fail' row, deletes it, re-claims, and SCHEDULES the pipeline", async () => {
      const client = buildLockClient({
        briefing_date: "2026-05-12",
        cron_name: "fetch-editorial-inputs",
        started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),  // 1h ago
        finished_at: new Date(Date.now() - 59 * 60 * 1000).toISOString(),
        status: "fail",
      });
      createSupabaseServiceRoleClient.mockReturnValue(client);

      const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
      const response = await GET(buildRequest("local-cron-secret"));

      expect(response.status).toBe(202);
      expect(capturedAfterCallback).not.toBeNull();
      // The DELETE was issued and a fresh row was claimed.
      expect(client._calls.delete).toBe(1);
      expect(client._state.row?.status).toBe("running");
    });

    it("(2) reclaims a stale 'running' row older than 70s and SCHEDULES the pipeline", async () => {
      const client = buildLockClient({
        briefing_date: "2026-05-12",
        cron_name: "fetch-editorial-inputs",
        started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),  // 5 min ago
        finished_at: null,
        status: "running",  // stranded after a function-instance death
      });
      createSupabaseServiceRoleClient.mockReturnValue(client);

      const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
      const response = await GET(buildRequest("local-cron-secret"));

      expect(response.status).toBe(202);
      expect(capturedAfterCallback).not.toBeNull();
      expect(client._calls.delete).toBe(1);
    });

    it("(3) REJECTS when a fresh 'running' row exists (in_progress, no schedule)", async () => {
      const client = buildLockClient({
        briefing_date: "2026-05-12",
        cron_name: "fetch-editorial-inputs",
        started_at: new Date(Date.now() - 5_000).toISOString(),  // 5s ago — well within stale window
        finished_at: null,
        status: "running",
      });
      createSupabaseServiceRoleClient.mockReturnValue(client);

      const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
      const response = await GET(buildRequest("local-cron-secret"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.reason).toBe("in_progress");
      expect(capturedAfterCallback).toBeNull();
      expect(client._calls.delete).toBe(0);  // never DELETEs a fresh running row
    });

    it("(4) REJECTS when an 'ok' row exists (already_completed, no schedule)", async () => {
      const client = buildLockClient({
        briefing_date: "2026-05-12",
        cron_name: "fetch-editorial-inputs",
        started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),  // 2h ago
        finished_at: new Date(Date.now() - 119 * 60 * 1000).toISOString(),
        status: "ok",
      });
      createSupabaseServiceRoleClient.mockReturnValue(client);

      const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
      const response = await GET(buildRequest("local-cron-secret"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.reason).toBe("already_completed");
      expect(capturedAfterCallback).toBeNull();
      expect(client._calls.delete).toBe(0);  // never DELETEs an ok row
    });

    it("(5) null service-role client FAILS CLOSED — HTTP 503 + Sentry, pipeline NOT scheduled (no unlocked run)", async () => {
      createSupabaseServiceRoleClient.mockReturnValue(null);

      const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
      const response = await GET(buildRequest("local-cron-secret"));
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toMatchObject({
        success: false,
        status: "fail_closed",
        reason: "service_unavailable",
      });
      // Critical: zero pipeline execution.
      expect(capturedAfterCallback).toBeNull();
      expect(runDailyNewsCron).not.toHaveBeenCalled();
      expect(runNewsletterIngestion).not.toHaveBeenCalled();
      expect(runEditorialStaging).not.toHaveBeenCalled();
      // Operator paging: Sentry capture + flush before returning.
      expect(sentryCaptureMessage).toHaveBeenCalledTimes(1);
      expect(sentryCaptureMessage.mock.calls[0][1]).toMatchObject({
        level: "error",
        tags: expect.objectContaining({ failure_type: "run_lock_service_unavailable" }),
      });
      expect(sentryFlush).toHaveBeenCalled();
    });
  });
});
