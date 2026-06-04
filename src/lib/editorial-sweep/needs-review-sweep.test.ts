import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { logServerEvent, writePipelineLogEntry, sentryCaptureMessage, sentryFlush } = vi.hoisted(() => ({
  logServerEvent: vi.fn(),
  writePipelineLogEntry: vi.fn(),
  sentryCaptureMessage: vi.fn(),
  sentryFlush: vi.fn(async () => true),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: sentryCaptureMessage,
  captureException: vi.fn(),
  flush: sentryFlush,
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

import {
  resolveNeedsReviewSweepConfig,
  runNeedsReviewSweep,
  NEEDS_REVIEW_SWEEP_DEFAULTS,
} from "@/lib/editorial-sweep/needs-review-sweep";

/**
 * Fixture date frame. "now" is 2026-06-04 (Taipei). With TTL=7 the cutoff is
 * 2026-05-28, so briefing_date < 2026-05-28 is aged.
 */
const NOW = new Date("2026-06-04T13:00:00.000Z"); // 21:00 Taipei, same calendar day
const CUTOFF = "2026-05-28";
const AGED = "2026-05-20"; // < cutoff → aged
const RECENT = "2026-06-02"; // >= cutoff → within TTL

type Row = {
  id: string;
  editorial_decision: string | null;
  editorial_status: string | null;
  briefing_date: string;
  is_live: boolean | null;
  edited_why_it_matters: string | null;
  edited_what_led_to_it: string | null;
  edited_what_it_connects_to: string | null;
  decision_note?: string | null;
  reviewed_at?: string | null;
};

function row(partial: Partial<Row> & { id: string }): Row {
  return {
    editorial_decision: "pending_review",
    editorial_status: "needs_review",
    briefing_date: AGED,
    is_live: false,
    edited_why_it_matters: null,
    edited_what_led_to_it: null,
    edited_what_it_connects_to: null,
    decision_note: null,
    reviewed_at: null,
    ...partial,
  };
}

/**
 * Filter-applying supabase double. Interprets the .eq/.lt/.not/.in chain
 * against an in-memory master row set, so the test proves the module sends the
 * correct guard predicates (not just that its JS partition works). The UPDATE
 * path mutates the master set in place and returns the affected rows from
 * `.select()`, exactly like PostgREST `update(...).select()`.
 */
function buildSweepClient(rows: Row[]) {
  const master = rows.map((r) => ({ ...r }));
  const calls = { select: 0, update: 0 };

  function makeBuilder() {
    let mode: "read" | "update" = "read";
    let updatePayload: Partial<Row> | null = null;
    const eqs: Array<[string, unknown]> = [];
    const lts: Array<[string, string]> = [];
    const notIns: Array<[string, string[]]> = [];
    const ins: Array<[string, unknown[]]> = [];

    function matches(r: Row): boolean {
      for (const [col, val] of eqs) if ((r as Record<string, unknown>)[col] !== val) return false;
      for (const [col, val] of lts) if (!(String((r as Record<string, unknown>)[col]) < val)) return false;
      for (const [col, vals] of notIns) if (vals.includes(String((r as Record<string, unknown>)[col]))) return false;
      for (const [col, vals] of ins) if (!vals.includes((r as Record<string, unknown>)[col])) return false;
      return true;
    }

    function run() {
      if (mode === "update") {
        calls.update += 1;
        const affected: Row[] = [];
        for (const r of master) {
          if (matches(r)) {
            Object.assign(r, updatePayload);
            affected.push(r);
          }
        }
        return { data: affected.map((r) => ({ id: r.id })), error: null };
      }
      calls.select += 1;
      return { data: master.filter(matches).map((r) => ({ ...r })), error: null };
    }

    const builder: Record<string, unknown> = {
      select: vi.fn((_cols?: string) => builder), // read terminal OR update projection
      update: vi.fn((payload: Partial<Row>) => {
        mode = "update";
        updatePayload = payload;
        return builder;
      }),
      eq: vi.fn((col: string, val: unknown) => {
        eqs.push([col, val]);
        return builder;
      }),
      lt: vi.fn((col: string, val: string) => {
        lts.push([col, val]);
        return builder;
      }),
      not: vi.fn((col: string, _op: string, val: string) => {
        const parsed = val.replace(/^\(|\)$/g, "").split(",").map((s) => s.trim());
        notIns.push([col, parsed]);
        return builder;
      }),
      in: vi.fn((col: string, vals: unknown[]) => {
        ins.push([col, vals]);
        return builder;
      }),
      limit: vi.fn((_n: number) => builder),
      then<T>(resolve: (value: { data: unknown; error: null }) => T) {
        return Promise.resolve(run()).then(resolve);
      },
    };
    return builder;
  }

  return {
    _master: master,
    _calls: calls,
    from: vi.fn((table: string) => {
      if (table !== "signal_posts") throw new Error(`Unexpected table: ${table}`);
      return makeBuilder();
    }),
  };
}

describe("needs_review TTL sweep", () => {
  beforeEach(() => {
    logServerEvent.mockReset();
    writePipelineLogEntry.mockReset();
    writePipelineLogEntry.mockResolvedValue({ written: true, pageId: "log-1" });
    sentryCaptureMessage.mockReset();
    sentryFlush.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const liveEnv = {
    NEEDS_REVIEW_SWEEP_DRY_RUN: "false",
  } as unknown as NodeJS.ProcessEnv;

  it("aged + never-drafted → disposed to removed_from_slate, decision_note set, status unchanged", async () => {
    const client = buildSweepClient([row({ id: "a", briefing_date: AGED })]);

    const summary = await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });

    expect(summary.disposedCount).toBe(1);
    expect(summary.flaggedCount).toBe(0);
    expect(summary.mutated).toBe(true);
    expect(summary.disposition).toBe("removed_from_slate");

    const mutated = client._master.find((r) => r.id === "a")!;
    expect(mutated.editorial_decision).toBe("removed_from_slate");
    expect(mutated.decision_note).toMatch(/Auto-swept 2026-06-04: aged out after 7d in pending_review \(never drafted\)\./);
    expect(mutated.reviewed_at).toBeTruthy();
    // editorial_status must be left untouched.
    expect(mutated.editorial_status).toBe("needs_review");
  });

  it("recent (within TTL) + never-drafted → untouched", async () => {
    const client = buildSweepClient([row({ id: "b", briefing_date: RECENT })]);

    const summary = await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });

    expect(summary.disposedCount).toBe(0);
    expect(summary.flaggedCount).toBe(0);
    expect(summary.mutated).toBe(false);
    expect(client._master.find((r) => r.id === "b")!.editorial_decision).toBe("pending_review");
    expect(client._calls.update).toBe(0);
  });

  it("aged + drafted (any edited_* present) → flagged only, NOT mutated", async () => {
    const client = buildSweepClient([
      row({ id: "c", briefing_date: AGED, edited_why_it_matters: "Editor wrote this." }),
    ]);

    const summary = await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });

    expect(summary.disposedCount).toBe(0);
    expect(summary.flaggedCount).toBe(1);
    expect(summary.flaggedSamples).toEqual([{ id: "c", briefingDate: AGED }]);
    expect(summary.mutated).toBe(false);
    expect(client._master.find((r) => r.id === "c")!.editorial_decision).toBe("pending_review");
    expect(client._calls.update).toBe(0);
  });

  it("whitespace-only edited layer counts as never-drafted (disposed)", async () => {
    const client = buildSweepClient([
      row({ id: "ws", briefing_date: AGED, edited_what_led_to_it: "   \n  " }),
    ]);

    const summary = await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });

    expect(summary.disposedCount).toBe(1);
    expect(summary.flaggedCount).toBe(0);
    expect(client._master.find((r) => r.id === "ws")!.editorial_decision).toBe("removed_from_slate");
  });

  it("published / approved / is_live aged rows → untouched (excluded by guards)", async () => {
    const client = buildSweepClient([
      row({ id: "pub", briefing_date: AGED, editorial_status: "published" }),
      row({ id: "appr", briefing_date: AGED, editorial_status: "approved" }),
      row({ id: "live", briefing_date: AGED, is_live: true }),
      // a genuinely sweepable row to prove the sweep still works around them
      row({ id: "ok", briefing_date: AGED }),
    ]);

    const summary = await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });

    expect(summary.disposedCount).toBe(1); // only "ok"
    expect(client._master.find((r) => r.id === "pub")!.editorial_decision).toBe("pending_review");
    expect(client._master.find((r) => r.id === "appr")!.editorial_decision).toBe("pending_review");
    expect(client._master.find((r) => r.id === "live")!.editorial_decision).toBe("pending_review");
    expect(client._master.find((r) => r.id === "ok")!.editorial_decision).toBe("removed_from_slate");
  });

  it("only pending_review rows are eligible — other decisions are ignored", async () => {
    const client = buildSweepClient([
      row({ id: "rej", briefing_date: AGED, editorial_decision: "rejected" }),
      row({ id: "held", briefing_date: AGED, editorial_decision: "held" }),
      row({ id: "null", briefing_date: AGED, editorial_decision: null }),
      row({ id: "pend", briefing_date: AGED, editorial_decision: "pending_review" }),
    ]);

    const summary = await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });

    expect(summary.disposedCount).toBe(1); // only "pend"
    expect(client._master.find((r) => r.id === "pend")!.editorial_decision).toBe("removed_from_slate");
  });

  it("dry-run → zero mutations, would-dispose/would-flag counts still computed", async () => {
    const client = buildSweepClient([
      row({ id: "d1", briefing_date: AGED }),
      row({ id: "d2", briefing_date: AGED }),
      row({ id: "f1", briefing_date: AGED, edited_what_it_connects_to: "drafted" }),
    ]);

    const summary = await runNeedsReviewSweep({
      client: client as never,
      env: { NEEDS_REVIEW_SWEEP_DRY_RUN: "true" } as unknown as NodeJS.ProcessEnv,
      now: NOW,
    });

    expect(summary.dryRun).toBe(true);
    expect(summary.disposedCount).toBe(2); // would-dispose
    expect(summary.flaggedCount).toBe(1); // would-flag
    expect(summary.mutated).toBe(false);
    expect(client._calls.update).toBe(0);
    expect(client._master.every((r) => r.editorial_decision === "pending_review")).toBe(true);
  });

  it("dispose set > MAX → abort, no mutation, error-level Sentry alert", async () => {
    const many = Array.from({ length: 6 }, (_, i) => row({ id: `m${i}`, briefing_date: AGED }));
    const client = buildSweepClient(many);

    const summary = await runNeedsReviewSweep({
      client: client as never,
      env: { NEEDS_REVIEW_SWEEP_DRY_RUN: "false", NEEDS_REVIEW_SWEEP_MAX: "5" } as unknown as NodeJS.ProcessEnv,
      now: NOW,
    });

    expect(summary.capped).toBe(true);
    expect(summary.mutated).toBe(false);
    expect(summary.disposedCount).toBe(6); // the offending size
    expect(client._calls.update).toBe(0);
    expect(client._master.every((r) => r.editorial_decision === "pending_review")).toBe(true);
    // error-level alert emitted
    const capCall = sentryCaptureMessage.mock.calls.find(([, opts]) =>
      (opts as { tags?: Record<string, string> })?.tags?.failure_type === "needs_review_sweep_cap_exceeded",
    );
    expect(capCall).toBeTruthy();
    expect((capCall![1] as { level: string }).level).toBe("error");
  });

  it("idempotency → second run mutates 0 rows", async () => {
    const client = buildSweepClient([row({ id: "x", briefing_date: AGED })]);

    const first = await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });
    expect(first.disposedCount).toBe(1);
    expect(first.mutated).toBe(true);

    const second = await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });
    expect(second.disposedCount).toBe(0);
    expect(second.mutated).toBe(false);
    expect(client._calls.update).toBe(1); // only the first run issued an UPDATE
  });

  it("no service-role client → error summary, Sentry-captured, never throws", async () => {
    const summary = await runNeedsReviewSweep({ client: null, env: liveEnv, now: NOW });

    expect(summary.error).toMatch(/service role client/i);
    expect(summary.mutated).toBe(false);
    expect(sentryCaptureMessage).toHaveBeenCalled();
  });

  it("writes a Pipeline Log entry on every run (runType=needs_review_sweep)", async () => {
    const client = buildSweepClient([row({ id: "p", briefing_date: AGED })]);

    await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });

    expect(writePipelineLogEntry).toHaveBeenCalledTimes(1);
    expect(writePipelineLogEntry.mock.calls[0][0]).toMatchObject({
      runType: "needs_review_sweep",
      status: "ok",
      rowCount: 1,
    });
  });

  it("Sentry-captures a Pipeline Log writer failure (writer down, not unconfigured)", async () => {
    writePipelineLogEntry.mockResolvedValue({ written: false, reason: "HTTP 500" });
    const client = buildSweepClient([row({ id: "p", briefing_date: AGED })]);

    await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });

    const logCall = sentryCaptureMessage.mock.calls.find(([, opts]) =>
      (opts as { tags?: Record<string, string> })?.tags?.failure_type === "needs_review_sweep_pipeline_log_failed",
    );
    expect(logCall).toBeTruthy();
  });

  it("does NOT Sentry-capture when the Pipeline Log is merely unconfigured", async () => {
    writePipelineLogEntry.mockResolvedValue({ written: false, reason: "NOTION_PIPELINE_LOG_DB_ID not configured" });
    const client = buildSweepClient([row({ id: "p", briefing_date: AGED })]);

    await runNeedsReviewSweep({ client: client as never, env: liveEnv, now: NOW });

    const logCall = sentryCaptureMessage.mock.calls.find(([, opts]) =>
      (opts as { tags?: Record<string, string> })?.tags?.failure_type === "needs_review_sweep_pipeline_log_failed",
    );
    expect(logCall).toBeFalsy();
  });
});

describe("resolveNeedsReviewSweepConfig", () => {
  it("uses defaults when env is empty", () => {
    const config = resolveNeedsReviewSweepConfig({} as NodeJS.ProcessEnv);
    expect(config).toEqual({
      ttlDays: 7,
      disposition: "removed_from_slate",
      max: 200,
      dryRun: true,
    });
    expect(config.dryRun).toBe(NEEDS_REVIEW_SWEEP_DEFAULTS.dryRun);
  });

  it("parses env overrides", () => {
    const config = resolveNeedsReviewSweepConfig({
      NEEDS_REVIEW_TTL_DAYS: "14",
      NEEDS_REVIEW_SWEEP_DISPOSITION: "rejected",
      NEEDS_REVIEW_SWEEP_MAX: "50",
      NEEDS_REVIEW_SWEEP_DRY_RUN: "false",
    } as unknown as NodeJS.ProcessEnv);
    expect(config).toEqual({ ttlDays: 14, disposition: "rejected", max: 50, dryRun: false });
  });

  it("falls back to default disposition when env value is not a terminal disposition", () => {
    // 'pending_review' is not terminal — would leave rows in the queue.
    const config = resolveNeedsReviewSweepConfig({
      NEEDS_REVIEW_SWEEP_DISPOSITION: "pending_review",
    } as unknown as NodeJS.ProcessEnv);
    expect(config.disposition).toBe("removed_from_slate");
  });

  it("falls back to defaults on invalid numeric env values", () => {
    const config = resolveNeedsReviewSweepConfig({
      NEEDS_REVIEW_TTL_DAYS: "-3",
      NEEDS_REVIEW_SWEEP_MAX: "notanumber",
    } as unknown as NodeJS.ProcessEnv);
    expect(config.ttlDays).toBe(7);
    expect(config.max).toBe(200);
  });
});
