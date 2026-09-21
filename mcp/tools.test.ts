import { describe, expect, it, vi } from "vitest";

import { readOnlyFetch, type ReadOnlyDb } from "./db";
import { brief, heldStories, shiftDate } from "./tools";

// Minimal stand-in for the PostgREST builder: every filter call chains, and
// awaiting it resolves to the canned rows.
function fakeDb(data: Array<Record<string, unknown>>) {
  const calls: Array<[string, unknown[]]> = [];
  const builder: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => resolve({ data, error: null }),
  };
  for (const method of ["eq", "gte", "lte", "in", "order", "limit"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  const db = { select: vi.fn(() => builder) } as unknown as ReadOnlyDb;
  return { db, calls };
}

describe("readOnlyFetch", () => {
  it("allows GET and HEAD", async () => {
    const base = vi.fn(async () => new Response("[]"));
    const guarded = readOnlyFetch(base as unknown as typeof fetch);
    await guarded("https://x.supabase.co/rest/v1/signal_posts");
    await guarded("https://x.supabase.co/rest/v1/signal_posts", { method: "HEAD" });
    expect(base).toHaveBeenCalledTimes(2);
  });

  it.each(["POST", "PATCH", "PUT", "DELETE"])("blocks %s before it reaches the network", async (method) => {
    const base = vi.fn();
    const guarded = readOnlyFetch(base as unknown as typeof fetch);
    await expect(guarded("https://x.supabase.co/rest/v1/rpc/anything", { method })).rejects.toThrow(/read-only/);
    expect(base).not.toHaveBeenCalled();
  });
});

describe("heldStories", () => {
  it("returns held rows and folded removals, and drops other removals", async () => {
    const { db, calls } = fakeDb([
      { id: "a", briefing_date: "2026-09-18", rank: 8, title: "AI", source_name: "semafor.com", signal_score: "90", why_it_matters_validation_status: "requires_human_rewrite", editorial_decision: "held", decision_note: "CONFLICT NOTE — BM DECISION: x", held_reason: null },
      { id: "b", briefing_date: "2026-09-18", rank: 11, title: "Ships", source_name: "semafor.com", signal_score: "90", why_it_matters_validation_status: "passed", editorial_decision: "removed_from_slate", decision_note: "Folded (tanker digest dup)", held_reason: null },
      { id: "c", briefing_date: "2026-09-19", rank: 3, title: "Other", source_name: "FT", signal_score: "50", why_it_matters_validation_status: "passed", editorial_decision: "removed_from_slate", decision_note: "CONFLICT NOTE: mentions folded later", held_reason: null },
    ]);

    const result = await heldStories(db, { days: 7, end_date: "2026-09-20" });

    expect(Object.keys(result)[0]).toBe("summary");
    expect(result.window).toEqual({ start: "2026-09-14", end: "2026-09-20", days: 7 });
    expect(result.stories.map((s) => [s.id, s.decision])).toEqual([["a", "held"], ["b", "folded"]]);
    expect(result.stories[0].score).toBe(90);
    expect(result.summary).toContain("1 held, 1 folded; 1 carry a CONFLICT NOTE");
    expect(calls).toContainEqual(["in", ["editorial_decision", ["held", "removed_from_slate"]]]);
  });
});

describe("brief", () => {
  it("applies the public-card rule and orders by slate rank", async () => {
    const base = { editorial_status: "published", editorial_decision: "approved", why_it_matters_validation_status: "passed", published_why_it_matters: "S", published_what_led_to_it: "B", published_what_it_connects_to: "R", source_name: "src" };
    const { db } = fakeDb([
      { ...base, id: "ctx", rank: 20, final_slate_rank: 6, final_slate_tier: "context", title: "Six" },
      { ...base, id: "one", rank: 18, final_slate_rank: 1, final_slate_tier: "core", title: "One" },
      { ...base, id: "gated", rank: 2, final_slate_rank: 2, final_slate_tier: "core", title: "Gated", why_it_matters_validation_status: "requires_human_rewrite" },
      { ...base, id: "held", rank: 3, final_slate_rank: 3, final_slate_tier: "core", title: "Held", editorial_decision: "held" },
    ]);

    const result = await brief(db, { date: "2026-09-18" });

    expect(result.cards.map((c) => [c.id, c.rank, c.card_type])).toEqual([["one", 1, "Core"], ["ctx", 6, "Context"]]);
    expect(result.summary).toBe("Brief for 2026-09-18: 2 published cards (1 Core, 1 Context).");
  });
});

describe("shiftDate", () => {
  it("crosses month boundaries", () => {
    expect(shiftDate("2026-10-01", -1)).toBe("2026-09-30");
  });
});
