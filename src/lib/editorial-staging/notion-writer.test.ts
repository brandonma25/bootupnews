import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  writeEditorialQueueRow,
  type EditorialCandidateForNotion,
} from "@/lib/editorial-staging/notion-writer";

const NOTION_DB_ID = "test-db-id";
const BRIEFING_DATE = "2026-05-17";

const baseCandidate: EditorialCandidateForNotion = {
  headline: "Acme acquires Foo Corp",
  source: "example.com",
  body: "Acme paid $1B for Foo Corp.",
  url: "https://example.com/acme-foo",
  category: "Finance",
  newsletterCoOccurrence: 2,
  slot: "Core",
};

type RecordedFetch = { url: string; init: RequestInit | undefined };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function emptyQueryResponse(): Response {
  return jsonResponse(200, { results: [] });
}

function queryResponseWithMatch(pageId: string, statusName: string | null): Response {
  return jsonResponse(200, {
    results: [
      {
        id: pageId,
        properties: {
          Status: statusName === null ? { select: null } : { select: { name: statusName } },
        },
      },
    ],
  });
}

function createSuccessResponse(pageId: string): Response {
  return jsonResponse(200, { id: pageId, object: "page" });
}

function updateSuccessResponse(pageId: string): Response {
  return jsonResponse(200, { id: pageId, object: "page" });
}

describe("writeEditorialQueueRow — idempotent insert | update | skip", () => {
  const calls: RecordedFetch[] = [];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    calls.length = 0;
    process.env.NOTION_TOKEN = "test-token";
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.NOTION_TOKEN;
  });

  it("inserts when no matching row exists (no same-day, no cross-date)", async () => {
    fetchMock.mockReset();
    fetchMock
      // 1. Same-day Headline+Briefing Date query — empty.
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return emptyQueryResponse();
      })
      // 2. Cross-date lookback query (#P4) — empty.
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return emptyQueryResponse();
      })
      // 3. Create.
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return createSuccessResponse("new-page-1");
      });

    const result = await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
    });

    expect(result).toEqual({ action: "inserted", pageId: "new-page-1" });
    expect(calls).toHaveLength(3);
    expect(calls[0].url).toBe(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`);
    expect(calls[1].url).toBe(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`);
    expect(calls[2].url).toBe("https://api.notion.com/v1/pages");
    expect(calls[2].init?.method).toBe("POST");
  });

  it("updates in place when a matching row exists at Status=raw", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return queryResponseWithMatch("existing-page-7", "raw");
      })
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return updateSuccessResponse("existing-page-7");
      });

    const result = await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
    });

    expect(result).toEqual({ action: "updated", pageId: "existing-page-7" });
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toBe("https://api.notion.com/v1/pages/existing-page-7");
    expect(calls[1].init?.method).toBe("PATCH");
    // Update must NOT overwrite Status — the field should be absent from the patch body.
    const patchBody = JSON.parse((calls[1].init?.body as string) ?? "{}");
    expect(patchBody.properties.Status).toBeUndefined();
  });

  it("skips entirely when the matching row has Status != raw", async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return queryResponseWithMatch("touched-page-3", "Approved");
    });

    const result = await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
    });

    expect(result).toEqual({
      action: "skipped_human_edited",
      pageId: "touched-page-3",
      existingStatus: "Approved",
    });
    // Only the query call happened — no write.
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`);
  });

  it("treats a row with an unset Status select as human-edited (defensive)", async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return queryResponseWithMatch("orphan-page-99", null);
    });

    const result = await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
    });

    expect(result.action).toBe("skipped_human_edited");
    expect(result.pageId).toBe("orphan-page-99");
    expect(result.existingStatus).toBe("(unset)");
  });

  it("filters the same-day Notion query by both Headline AND Briefing Date", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return emptyQueryResponse();
      })
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        // Cross-date query (#P4) — empty so we still exercise the
        // same-day filter assertions below.
        calls.push({ url, init });
        return emptyQueryResponse();
      })
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return createSuccessResponse("new-page-2");
      });

    await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
    });

    const queryBody = JSON.parse((calls[0].init?.body as string) ?? "{}");
    expect(queryBody.filter.and).toHaveLength(2);
    expect(queryBody.filter.and[0]).toEqual({
      property: "Headline",
      title: { equals: baseCandidate.headline },
    });
    expect(queryBody.filter.and[1]).toEqual({
      property: "Briefing Date",
      date: { equals: BRIEFING_DATE },
    });
  });

  // Track 2 P4 — cross-date dedup. Same headline staged at non-`raw`
  // status on a prior briefing date within the 14-day window → skip,
  // do not create a fresh row.
  it("skips when the same headline already exists at non-raw status on a recent briefing date (#P4)", async () => {
    fetchMock.mockReset();
    fetchMock
      // 1. Same-day query — no match.
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return emptyQueryResponse();
      })
      // 2. Cross-date query — match at Approved, briefing date 4 days ago.
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return jsonResponse(200, {
          results: [
            {
              id: "evergreen-page-1",
              properties: {
                Status: { select: { name: "Approved" } },
                "Briefing Date": { date: { start: "2026-05-13" } },
              },
            },
          ],
        });
      });

    const result = await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
    });

    expect(result).toEqual({
      action: "skipped_duplicate_across_dates",
      pageId: "evergreen-page-1",
      existingStatus: "Approved",
      existingBriefingDate: "2026-05-13",
    });
    // No third call (no create) — only the two queries.
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`);
    expect(calls[1].url).toBe(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`);
    // Cross-date filter excludes the current briefing date by upper-bounding
    // on `on_or_before` < BRIEFING_DATE.
    const crossDateBody = JSON.parse((calls[1].init?.body as string) ?? "{}");
    expect(crossDateBody.filter.and).toHaveLength(3);
    expect(crossDateBody.filter.and[0]).toEqual({
      property: "Headline",
      title: { equals: baseCandidate.headline },
    });
    expect(crossDateBody.filter.and[2].property).toBe("Briefing Date");
    expect(crossDateBody.filter.and[2].date.on_or_before).toBe("2026-05-16");
  });

  it("does NOT skip when the cross-date match is still at status=raw (re-staging allowed)", async () => {
    fetchMock.mockReset();
    fetchMock
      // 1. Same-day — no match.
      .mockImplementationOnce(async () => emptyQueryResponse())
      // 2. Cross-date — match at raw (not yet processed). Should NOT skip.
      .mockImplementationOnce(async () =>
        jsonResponse(200, {
          results: [
            {
              id: "stale-raw-1",
              properties: {
                Status: { select: { name: "raw" } },
                "Briefing Date": { date: { start: "2026-05-15" } },
              },
            },
          ],
        }),
      )
      // 3. Create — proceed with insert because cross-date match is raw.
      .mockImplementationOnce(async () => createSuccessResponse("new-page-3"));

    const result = await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
    });

    expect(result.action).toBe("inserted");
    expect(result.pageId).toBe("new-page-3");
  });

  it("is idempotent: running twice with the same input produces one insert then one update", async () => {
    fetchMock.mockReset();
    fetchMock
      // run 1: same-day (empty) -> cross-date (empty) -> create
      .mockImplementationOnce(async () => emptyQueryResponse())
      .mockImplementationOnce(async () => emptyQueryResponse())
      .mockImplementationOnce(async () => createSuccessResponse("page-XYZ"))
      // run 2: same-day query returns the row we just created at raw -> update
      // (no cross-date query because same-day match short-circuits)
      .mockImplementationOnce(async () =>
        queryResponseWithMatch("page-XYZ", "raw"),
      )
      .mockImplementationOnce(async () => updateSuccessResponse("page-XYZ"));

    const first = await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
    });
    const second = await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
    });

    expect(first.action).toBe("inserted");
    expect(second.action).toBe("updated");
    expect(second.pageId).toBe("page-XYZ");
    // Run 1 = 3 calls (same-day query + cross-date query + create).
    // Run 2 = 2 calls (same-day query + update; cross-date skipped
    // because same-day match short-circuits). Total = 5.
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("throws a descriptive error when NOTION_TOKEN is unset", async () => {
    delete process.env.NOTION_TOKEN;
    await expect(
      writeEditorialQueueRow({
        candidate: baseCandidate,
        briefingDate: BRIEFING_DATE,
        notionDbId: NOTION_DB_ID,
      }),
    ).rejects.toThrow(/NOTION_TOKEN/);
  });

  it("surfaces a Notion query failure as a thrown error and does not write", async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(401, { message: "unauthorized" });
    });

    await expect(
      writeEditorialQueueRow({
        candidate: baseCandidate,
        briefingDate: BRIEFING_DATE,
        notionDbId: NOTION_DB_ID,
      }),
    ).rejects.toThrow(/Notion query failed \(401\)/);
    expect(calls).toHaveLength(1);
  });
});

describe("writeEditorialQueueRow — dryRun does READS but ZERO writes (Track 2 PART 1)", () => {
  const calls: RecordedFetch[] = [];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    calls.length = 0;
    process.env.NOTION_TOKEN = "test-token";
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.NOTION_TOKEN;
  });

  it("would-insert: runs both READ queries, NEVER POSTs to /v1/pages", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init }); // same-day query
        return emptyQueryResponse();
      })
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init }); // cross-date (P4) query
        return emptyQueryResponse();
      });

    const result = await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
      dryRun: true,
    });

    expect(result).toEqual({ action: "inserted", pageId: "(dry-run)" });
    // Both READ lookups ran (the computed action is real). Note: Notion DB
    // queries are themselves POST /databases/{id}/query — those are reads. The
    // WRITE is POST /v1/pages (createRow), which must never happen in dryRun.
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.url.endsWith(`/databases/${NOTION_DB_ID}/query`))).toBe(true);
    expect(calls.some((c) => c.url === "https://api.notion.com/v1/pages")).toBe(false);
  });

  it("would-update: runs the same-day READ, NEVER PATCHes the page", async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init }); // same-day match at Status=raw
      return queryResponseWithMatch("existing-page-7", "raw");
    });

    const result = await writeEditorialQueueRow({
      candidate: baseCandidate,
      briefingDate: BRIEFING_DATE,
      notionDbId: NOTION_DB_ID,
      dryRun: true,
    });

    expect(result).toEqual({ action: "updated", pageId: "existing-page-7" });
    expect(calls).toHaveLength(1); // only the read query — no PATCH
    expect(calls.some((c) => (c.init?.method ?? "GET") === "PATCH")).toBe(false);
  });
});
