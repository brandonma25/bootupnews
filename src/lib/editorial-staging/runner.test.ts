import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * H-3 regression guard: the cron's internal-timeout AbortSignal is threaded into
 * runEditorialStaging, and the staging loop must STOP dispatching new Notion
 * writes once it fires (instead of grinding all candidates to the 60s hard-kill).
 *
 * The boundaries (Supabase reads, dedup, evergreen filter, the Notion writer, the
 * completion email) are mocked so the test isolates the loop-break + signal
 * plumbing. deduplicateCandidates is forced to yield a fixed 2-candidate pool so
 * `selected` is deterministically non-empty (the loop iterates, so an aborted
 * signal is observably the thing that prevents the writes).
 */

const { writeEditorialQueueRow, logServerEvent, sendEditorialCompletionEmail, deduplicateCandidates, applyEvergreenFilter } =
  vi.hoisted(() => ({
    writeEditorialQueueRow: vi.fn(),
    logServerEvent: vi.fn(),
    sendEditorialCompletionEmail: vi.fn(),
    deduplicateCandidates: vi.fn(),
    applyEvergreenFilter: vi.fn(),
  }));

vi.mock("@/lib/observability", () => ({
  logServerEvent,
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
}));
vi.mock("@/lib/editorial-staging/notion-writer", () => ({ writeEditorialQueueRow }));
vi.mock("@/lib/editorial-staging/email", () => ({ sendEditorialCompletionEmail }));
vi.mock("@/lib/editorial-staging/dedup", () => ({ deduplicateCandidates }));
vi.mock("@/lib/editorial/evergreen-filter", () => ({
  applyEvergreenFilter,
  resolveEvergreenFilterConfig: () => ({}),
}));

const createSupabaseServiceRoleClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServiceRoleClient }));

/** Chainable Supabase stub — every query resolves to an empty result set. The
 * candidate pool comes from the mocked deduplicateCandidates, so the real
 * fetch* reads only need to not throw. */
function buildDbStub() {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "gte", "lte", "eq", "neq", "not", "in", "limit"]) {
    chain[m] = () => chain;
  }
  chain.then = (onFulfilled: (v: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(onFulfilled);
  return { from: () => chain };
}

const TWO_CANDIDATES = [
  {
    headline: "Fed raises interest rates by 25 basis points",
    source: "Reuters",
    body: "Body one.",
    url: "https://reuters.com/markets/fed-decision",
    category: "Finance" as const,
    newsletterCoOccurrence: 0,
    sourceOverlap: false,
    baseScore: 80,
  },
  {
    headline: "Senate passes major infrastructure bill",
    source: "AP News",
    body: "Body two.",
    url: "https://apnews.com/politics/infra-bill",
    category: "Politics" as const,
    newsletterCoOccurrence: 0,
    sourceOverlap: false,
    baseScore: 75,
  },
];

const DEADLINE_WARN = "Editorial staging: stopped at run deadline (abort signal)";

describe("runEditorialStaging — H-3 abort-signal loop break", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NOTION_EDITORIAL_QUEUE_DB_ID = "test-db";
    createSupabaseServiceRoleClient.mockReturnValue(buildDbStub());
    deduplicateCandidates.mockReturnValue(TWO_CANDIDATES);
    applyEvergreenFilter.mockReturnValue({
      passed: TWO_CANDIDATES,
      rejected: [],
      candidatesFilteredEvergreen: 0,
      candidatesPenalizedEvergreen: 0,
    });
    writeEditorialQueueRow.mockResolvedValue({ action: "inserted", pageId: "page-x" });
    sendEditorialCompletionEmail.mockResolvedValue(undefined);
  });

  it("dispatches a Notion write for every selected candidate when the signal is NOT aborted", async () => {
    const { runEditorialStaging } = await import("@/lib/editorial-staging/runner");
    const result = await runEditorialStaging({ signal: new AbortController().signal });

    expect(writeEditorialQueueRow).toHaveBeenCalledTimes(2);
    expect(result.summary.notionRowsInserted).toBe(2);
    expect(logServerEvent).not.toHaveBeenCalledWith("warn", DEADLINE_WARN, expect.anything());
  });

  it("does NOT dispatch any Notion write when the signal is already aborted, and logs the deadline warn", async () => {
    const { runEditorialStaging } = await import("@/lib/editorial-staging/runner");
    const controller = new AbortController();
    controller.abort();

    const result = await runEditorialStaging({ signal: controller.signal });

    // The loop breaks on the FIRST iteration, before any write is dispatched.
    expect(writeEditorialQueueRow).not.toHaveBeenCalled();
    expect(result.summary.notionRowsWritten).toBe(0);
    // Selection still ran — the slate is computed; only the writes are skipped.
    expect(result.summary.candidateCount).toBe(2);
    expect(logServerEvent).toHaveBeenCalledWith(
      "warn",
      DEADLINE_WARN,
      expect.objectContaining({ stagedSoFar: 0, remaining: 2 }),
    );
  });

  it("dispatches normally when no signal is provided (back-compat)", async () => {
    const { runEditorialStaging } = await import("@/lib/editorial-staging/runner");
    await runEditorialStaging({});
    expect(writeEditorialQueueRow).toHaveBeenCalledTimes(2);
  });
});
