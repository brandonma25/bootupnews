import { afterEach, describe, expect, it, vi } from "vitest";

import {
  extractMainText,
  fetchAndExtractBody,
  isCoreSupportedWith,
  runWithDeadline,
} from "./extractor";

describe("extractMainText", () => {
  it("returns empty string for empty input", () => {
    expect(extractMainText("")).toBe("");
  });

  it("strips script/style/nav chrome and joins paragraph text", () => {
    const html = `
      <html><head><style>.x{color:red}</style></head><body>
        <nav>Home About Subscribe Newsletter Login</nav>
        <script>tracking('beacon')</script>
        <article>
          <p>The Senate passed a sweeping enforcement bill on Tuesday after a narrow vote.</p>
          <p>The measure now heads to the House, where leaders have signaled resistance.</p>
        </article>
        <footer>Copyright 2026 — terms and privacy</footer>
      </body></html>`;
    const text = extractMainText(html);
    expect(text).toContain("Senate passed a sweeping enforcement bill");
    expect(text).toContain("heads to the House");
    expect(text).not.toContain("tracking");
    expect(text).not.toContain("Subscribe Newsletter");
    expect(text).not.toContain("Copyright 2026");
  });
});

describe("isCoreSupportedWith (coreSupported transition)", () => {
  const base = {
    title: "Senate passes immigration enforcement bill",
    url: "https://www.politico.com/news/2026/06/08/senate-immigration-bill",
    sourceName: "Politico Congress",
    sourceClass: "business_press",
    sourceTier: "tier1",
    summaryText: "Senate passes immigration enforcement bill in a narrow vote.", // short abstract
  };

  it("is NOT coreSupported on a short abstract (no body)", () => {
    expect(isCoreSupportedWith({ ...base, contentText: "" })).toBe(false);
  });

  it("becomes coreSupported once a full body is supplied (the unblock)", () => {
    const body = "word ".repeat(400); // ~2000 chars >= full-text threshold (1200)
    expect(isCoreSupportedWith({ ...base, contentText: body })).toBe(true);
  });
});

describe("runWithDeadline", () => {
  it("processes every item when under budget", async () => {
    const items = [1, 2, 3, 4, 5];
    const outcome = await runWithDeadline(
      items,
      async (n) => n * 2,
      { budgetMs: 1_000, concurrency: 3 },
    );
    expect(outcome.timedOut).toBe(false);
    expect(outcome.processed).toHaveLength(5);
    expect(outcome.unprocessed).toHaveLength(0);
    expect(outcome.results.map((r) => r.value).sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10]);
  });

  it("enforces the hard wall-clock cap and degrades gracefully (Promise.race)", async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const outcome = await runWithDeadline(
      items,
      async (n) => {
        await sleep(80); // each worker far exceeds the budget
        return n;
      },
      { budgetMs: 20, concurrency: 2 },
    );
    // Deadline wins the race → we return early with partial work, the rest
    // flagged unprocessed (the caller marks those extraction_status='timeout').
    expect(outcome.timedOut).toBe(true);
    expect(outcome.processed.length).toBeLessThan(items.length);
    expect(outcome.unprocessed.length).toBeGreaterThan(0);
    expect(outcome.processed.length + outcome.unprocessed.length).toBe(items.length);
  });
});

describe("fetchAndExtractBody", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns extracted text on a successful html fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("<article><p>" + "context ".repeat(20) + "</p></article>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ),
    );
    const result = await fetchAndExtractBody("https://example.com/a", 2_500);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toContain("context");
  });

  it("returns failed on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 403 })));
    const result = await fetchAndExtractBody("https://example.com/b", 2_500);
    expect(result).toEqual({ ok: false, reason: "failed" });
  });

  it("maps an abort/timeout to reason=timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("the operation was aborted");
        err.name = "TimeoutError";
        throw err;
      }),
    );
    const result = await fetchAndExtractBody("https://example.com/c", 2_500);
    expect(result).toEqual({ ok: false, reason: "timeout" });
  });
});
