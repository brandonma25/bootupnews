import { afterEach, describe, expect, it, vi } from "vitest";

import { notionFetch } from "@/lib/notion-fetch";

afterEach(() => vi.restoreAllMocks());

function mockFetchSequence(responses: Array<Response | Error>) {
  let i = 0;
  return vi.spyOn(globalThis, "fetch" as never).mockImplementation((async () => {
    const next = responses[Math.min(i, responses.length - 1)];
    i += 1;
    if (next instanceof Error) throw next;
    return next;
  }) as never);
}

describe("notionFetch", () => {
  it("returns a 200 on the first try without retrying", async () => {
    const spy = mockFetchSequence([new Response("ok", { status: 200 })]);
    const res = await notionFetch("https://api.notion.com/v1/pages", { method: "PATCH" });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("retries 429 for any method (rejected before processing)", async () => {
    const spy = mockFetchSequence([
      new Response(null, { status: 429, headers: { "retry-after": "0" } }),
      new Response("ok", { status: 200 }),
    ]);
    const res = await notionFetch("https://api.notion.com/v1/pages", { method: "POST" }, { maxRetries: 2 });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("retries 5xx for an idempotent call", async () => {
    const spy = mockFetchSequence([
      new Response(null, { status: 502 }),
      new Response("ok", { status: 200 }),
    ]);
    const res = await notionFetch("https://api.notion.com/v1/databases/x/query", { method: "POST" }, { idempotent: true });
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry 5xx for a non-idempotent POST (no double-create)", async () => {
    const spy = mockFetchSequence([
      new Response(null, { status: 502 }),
      new Response("ok", { status: 200 }),
    ]);
    const res = await notionFetch("https://api.notion.com/v1/pages", { method: "POST" }, { maxRetries: 2 });
    expect(res.status).toBe(502);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry a network error for a non-idempotent POST", async () => {
    const spy = mockFetchSequence([new Error("ECONNRESET"), new Response("ok", { status: 200 })]);
    await expect(notionFetch("https://api.notion.com/v1/pages", { method: "POST" })).rejects.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
