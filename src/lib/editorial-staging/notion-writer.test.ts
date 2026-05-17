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

  it("inserts when no matching row exists", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return emptyQueryResponse();
      })
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
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`);
    expect(calls[1].url).toBe("https://api.notion.com/v1/pages");
    expect(calls[1].init?.method).toBe("POST");
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

  it("filters the Notion query by both Headline AND Briefing Date", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockImplementationOnce(async (url: string, init?: RequestInit) => {
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

  it("is idempotent: running twice with the same input produces one insert then one update", async () => {
    fetchMock.mockReset();
    fetchMock
      // run 1: query (empty) -> create
      .mockImplementationOnce(async () => emptyQueryResponse())
      .mockImplementationOnce(async () => createSuccessResponse("page-XYZ"))
      // run 2: query (returns the row we just created at raw) -> update
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
    // Two runs total = 4 API calls (2 queries + 1 create + 1 update). Zero
    // duplicate-row writes.
    expect(fetchMock).toHaveBeenCalledTimes(4);
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
