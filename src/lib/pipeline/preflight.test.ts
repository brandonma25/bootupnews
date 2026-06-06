import { describe, expect, it, vi } from "vitest";

import { runPreflight, type PreflightDeps } from "@/lib/pipeline/preflight";

type SupabaseArg = PreflightDeps["supabaseClient"];

/** Minimal Supabase double exposing only the chain probeSupabase uses. */
function fakeSupabase(reachable: boolean): SupabaseArg {
  const chain = {
    select: () => ({
      limit: async () => ({ error: reachable ? null : { message: "unreachable" } }),
    }),
  };
  return { from: () => chain } as unknown as SupabaseArg;
}

/** fetch double: distinguishes the egress probe from the Notion users/me probe. */
function fakeFetch(opts: { egress: boolean; notion: boolean }): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("api.notion.com")) {
      if (!opts.notion) throw new Error("notion blocked");
      return new Response(null, { status: 200 });
    }
    if (!opts.egress) throw new Error("no egress");
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;
}

const FULL_ENV = {
  GMAIL_CLIENT_ID: "id",
  GMAIL_CLIENT_SECRET: "secret",
  GMAIL_REFRESH_TOKEN: "refresh",
  NOTION_TOKEN: "tok",
  NOTION_EDITORIAL_QUEUE_DB_ID: "db",
} as unknown as NodeJS.ProcessEnv;

const stage = (m: Awaited<ReturnType<typeof runPreflight>>, name: string) =>
  m.stages.find((s) => s.stage === name)!;

describe("runPreflight capability matrix (PART 0 anti-false-success)", () => {
  it("all deps present + reachable → every stage ready", async () => {
    const matrix = await runPreflight({
      env: FULL_ENV,
      supabaseClient: fakeSupabase(true),
      fetchImpl: fakeFetch({ egress: true, notion: true }),
    });
    expect(matrix.allReady).toBe(true);
    expect(matrix.networkEgress).toBe("reachable");
    for (const s of matrix.stages) expect(s.willRun).toBe("ready");
  });

  it("Gmail var unset → newsletter skipped(missing var), never fast/0", async () => {
    const env = { ...FULL_ENV, GMAIL_REFRESH_TOKEN: "" } as unknown as NodeJS.ProcessEnv;
    const matrix = await runPreflight({
      env,
      supabaseClient: fakeSupabase(true),
      fetchImpl: fakeFetch({ egress: true, notion: true }),
    });
    const nl = stage(matrix, "newsletter");
    expect(nl.willRun).toBe("skipped");
    expect(nl.creds).toBe("missing");
    expect(nl.skipReason).toContain("GMAIL_REFRESH_TOKEN");
    // other stages still ready — a missing Gmail var must not poison RSS/sweep
    expect(stage(matrix, "rss").willRun).toBe("ready");
  });

  it("no egress → rss skipped(no egress) and newsletter skipped — NOT '0 candidates'", async () => {
    const matrix = await runPreflight({
      env: FULL_ENV,
      supabaseClient: fakeSupabase(true),
      fetchImpl: fakeFetch({ egress: false, notion: false }),
    });
    expect(matrix.networkEgress).toBe("unreachable");
    expect(stage(matrix, "rss").willRun).toBe("skipped");
    expect(stage(matrix, "rss").skipReason).toBe("no egress");
    expect(stage(matrix, "newsletter").willRun).toBe("skipped");
    expect(stage(matrix, "newsletter").skipReason).toBe("no egress");
  });

  it("Supabase unavailable → sweep + staging skipped(reason), not '0 rows'", async () => {
    const matrix = await runPreflight({
      env: FULL_ENV,
      supabaseClient: null,
      fetchImpl: fakeFetch({ egress: true, notion: true }),
    });
    expect(stage(matrix, "sweep").willRun).toBe("skipped");
    expect(stage(matrix, "sweep").skipReason).toContain("SUPABASE");
    expect(stage(matrix, "staging").willRun).toBe("skipped");
  });

  it("Notion creds missing → staging skipped(missing NOTION_EDITORIAL_QUEUE_DB_ID)", async () => {
    const env = { ...FULL_ENV, NOTION_EDITORIAL_QUEUE_DB_ID: "" } as unknown as NodeJS.ProcessEnv;
    const matrix = await runPreflight({
      env,
      supabaseClient: fakeSupabase(true),
      fetchImpl: fakeFetch({ egress: true, notion: true }),
    });
    const st = stage(matrix, "staging");
    expect(st.willRun).toBe("skipped");
    expect(st.skipReason).toContain("NOTION_EDITORIAL_QUEUE_DB_ID");
  });

  it("a probe that throws yields unreachable, never an exception", async () => {
    const throwingFetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await expect(
      runPreflight({ env: FULL_ENV, supabaseClient: fakeSupabase(false), fetchImpl: throwingFetch }),
    ).resolves.toBeTruthy();
  });
});
