import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const writePipelineLogEntry = vi.fn();
const logServerEvent = vi.fn();
const getRequiredSourcesForPublicSurface = vi.fn();

vi.mock("@/lib/observability/pipeline-log", () => ({
  writePipelineLogEntry,
}));

vi.mock("@/lib/observability", () => ({
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
  logServerEvent,
}));

vi.mock("@/lib/source-manifest", () => ({
  getRequiredSourcesForPublicSurface,
}));

type FetchCall = { url: string; init?: RequestInit };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeQueueRow(source: string | null) {
  return {
    properties: {
      Source: {
        rich_text: source === null ? [] : [{ plain_text: source }],
      },
    },
  };
}

function buildRequest(headerSecret?: string): Request {
  return new Request("http://localhost:3000/api/cron/health", {
    headers: headerSecret ? { "x-cron-secret": headerSecret } : undefined,
  });
}

describe("/api/cron/health", () => {
  const calls: FetchCall[] = [];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    calls.length = 0;
    vi.resetModules();
    writePipelineLogEntry.mockReset();
    logServerEvent.mockReset();
    getRequiredSourcesForPublicSurface.mockReset();
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.NOTION_EDITORIAL_QUEUE_DB_ID = "test-queue-db";
    process.env.NOTION_TOKEN = "test-notion-token";
    delete process.env.ALLOW_VERCEL_CRON_FALLBACK;

    writePipelineLogEntry.mockResolvedValue({ written: true, pageId: "log-1" });
    getRequiredSourcesForPublicSurface.mockReturnValue([
      { name: "Reuters" },
      { name: "Bloomberg" },
      { name: "TechCrunch" },
    ]);

    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.NOTION_EDITORIAL_QUEUE_DB_ID;
    delete process.env.NOTION_TOKEN;
    delete process.env.ALLOW_VERCEL_CRON_FALLBACK;
  });

  it("rejects unauthorized requests with HTTP 401 and never queries Notion", async () => {
    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("wrong-secret"));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(writePipelineLogEntry).not.toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET is unconfigured even with a header present", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("anything"));
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns HTTP 500 when NOTION_EDITORIAL_QUEUE_DB_ID is unset", async () => {
    delete process.env.NOTION_EDITORIAL_QUEUE_DB_ID;
    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as { status: string; message: string };
    expect(response.status).toBe(500);
    expect(body.status).toBe("fail");
    expect(body.message).toMatch(/NOTION_EDITORIAL_QUEUE_DB_ID/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Track 2 P6 rev — thin-but-functioning day. Row count below the
  // editorial minimum (7) but ABOVE the hard floor (distinct sources >= 3)
  // means a slow news day, not a broken pipeline. Must warn HTTP 200,
  // NOT page (HTTP 500). PR #300 v1 paged here and the user explicitly
  // flagged it as the cry-wolf pattern Track 2 exists to fix.
  it("returns status=warn HTTP 200 (NOT 500) when row count is below 7 but distinct sources >= 3 (thin day)", async () => {
    // 5 rows from 3 distinct sources: under the editorial floor (7), above
    // the hard floor (3 distinct). Pipeline is functioning; day is thin.
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, {
        results: [
          makeQueueRow("Reuters"),
          makeQueueRow("Bloomberg"),
          makeQueueRow("TechCrunch"),
          makeQueueRow("Reuters"),
          makeQueueRow("Bloomberg"),
        ],
      });
    });

    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as {
      status: string;
      row_count: number;
      expected_min: number;
      message: string;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("warn");
    expect(body.row_count).toBe(5);
    expect(body.expected_min).toBe(7);
    expect(body.message).toMatch(/thin day/i);
    expect(writePipelineLogEntry).toHaveBeenCalledTimes(1);
    expect(writePipelineLogEntry.mock.calls[0][0]).toMatchObject({
      runType: "health_check",
      status: "warn",
      rowCount: 5,
    });
  });

  // Track 2 P6 rev — hard fault: zero rows. Ingestion did not deliver
  // anything for the briefing date. This pages (HTTP 500) because nothing
  // happened end-to-end.
  it("returns status=fail HTTP 500 when row count is zero (hard fault: nothing ingested)", async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, { results: [] });
    });

    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as {
      status: string;
      row_count: number;
      message: string;
    };

    expect(response.status).toBe(500);
    expect(body.status).toBe("fail");
    expect(body.row_count).toBe(0);
    expect(body.message).toMatch(/zero rows/i);
    expect(writePipelineLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({ runType: "health_check", status: "fail", rowCount: 0 }),
    );
  });

  // Track 2 P6 rev — hard fault: feed pipeline collapse. Some rows landed
  // but they came from only 1–2 distinct sources, below the hard floor
  // (3). This pages because the feed-fetching path itself is broken,
  // not just light.
  it("returns status=fail HTTP 500 when distinct sources are below the hard floor (feed pipeline collapse)", async () => {
    // 4 rows but all from 2 sources (< HARD_FLOOR_DISTINCT_SOURCES = 3).
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, {
        results: [
          makeQueueRow("Reuters"),
          makeQueueRow("Bloomberg"),
          makeQueueRow("Reuters"),
          makeQueueRow("Bloomberg"),
        ],
      });
    });

    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as {
      status: string;
      row_count: number;
      distinct_source_count: number;
      hard_floor_distinct_sources: number;
      message: string;
    };

    expect(response.status).toBe(500);
    expect(body.status).toBe("fail");
    expect(body.row_count).toBe(4);
    expect(body.distinct_source_count).toBe(2);
    expect(body.hard_floor_distinct_sources).toBe(3);
    expect(body.message).toMatch(/feed pipeline collapse/i);
  });

  it("returns status=ok HTTP 200 when row count >= 7 and all expected sources contributed", async () => {
    const sources = ["Reuters", "Bloomberg", "TechCrunch", "Wired", "Ars", "Verge", "FT"];
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, { results: sources.map(makeQueueRow) });
    });

    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as {
      status: string;
      row_count: number;
      source_health: { missing: string[]; contributed: string[] };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.row_count).toBe(7);
    expect(body.source_health.missing).toEqual([]);
    expect(body.source_health.contributed).toContain("Reuters");
    expect(writePipelineLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ok", runType: "health_check" }),
    );
  });

  it("returns status=warn HTTP 200 when row count >= 7 but an expected source is missing", async () => {
    // 7 rows with 5+ distinct sources (passing the diversity floor) but
    // no row from "TechCrunch" (the third expected source).
    const sources = [
      "Reuters", "Bloomberg", "WSJ", "FT", "Axios",
      "Bloomberg", "Reuters",
    ];
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, { results: sources.map(makeQueueRow) });
    });

    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as {
      status: string;
      source_health: { missing: string[] };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("warn");
    expect(body.source_health.missing).toEqual(["TechCrunch"]);
    expect(writePipelineLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({ status: "warn" }),
    );
  });

  // Track 2 P6 rev — monoculture but functioning. 7+ rows with distinct
  // sources between the hard floor (3) and the diversity target (5) means
  // the pipeline IS delivering and diversity is below target — thin in
  // coverage, not broken. Must warn HTTP 200, NOT page (HTTP 500).
  //
  // PR #300 v1 paged here; user flagged the rewrite. The hard fault for
  // < hard floor (< 3 distinct) is exercised in its own test above.
  it("returns status=warn HTTP 200 (NOT 500) when row count >= 7 but distinct sources between hard floor and target (monoculture but functioning) (#272 P6 rev)", async () => {
    // 7 rows from 3 distinct sources — >= hard floor (3), < target (5).
    const sources = ["Reuters", "Bloomberg", "TechCrunch", "Reuters", "Bloomberg", "TechCrunch", "Reuters"];
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, { results: sources.map(makeQueueRow) });
    });

    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as {
      status: string;
      row_count: number;
      distinct_source_count: number;
      expected_min_distinct_sources: number;
      hard_floor_distinct_sources: number;
      message: string;
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("warn");
    expect(body.row_count).toBe(7);
    expect(body.distinct_source_count).toBe(3);
    expect(body.expected_min_distinct_sources).toBe(5);
    expect(body.hard_floor_distinct_sources).toBe(3);
    expect(body.message).toMatch(/monoculture but functioning/i);
    expect(writePipelineLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({ status: "warn", runType: "health_check" }),
    );
  });

  it("forgiving source match — manifest 'Reuters' matches Notion 'reuters.com' (uses 5+ distinct sources to pass diversity)", async () => {
    // 7 rows; Reuters appears only as a domain, but should still satisfy
    // the manifest entry. Add other distinct sources so the diversity
    // floor is satisfied — the test's intent is the forgiving match.
    const sources = [
      "reuters.com", "Bloomberg", "TechCrunch", "WSJ", "FT",
      "Wired", "Verge",
    ];
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, { results: sources.map(makeQueueRow) });
    });

    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as { status: string; source_health: { missing: string[] } };

    expect(body.status).toBe("ok");
    expect(body.source_health.missing).toEqual([]);
  });

  it("does not block the response when Pipeline Log write fails", async () => {
    const sources = ["Reuters", "Bloomberg", "TechCrunch", "Wired", "Ars", "Verge", "FT"];
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async () => jsonResponse(200, { results: sources.map(makeQueueRow) }));

    writePipelineLogEntry.mockResolvedValue({ written: false, reason: "Notion 500" });

    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as { status: string; pipeline_log_written: boolean };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.pipeline_log_written).toBe(false);
  });

  it("returns status=fail HTTP 500 if the Notion query itself errors", async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async () => jsonResponse(401, { message: "unauthorized" }));

    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as { status: string; row_count: number; message: string };

    expect(response.status).toBe(500);
    expect(body.status).toBe("fail");
    expect(body.row_count).toBe(0);
    expect(body.message).toMatch(/Notion query failed/);
  });

  it("filters the editorial queue query by Briefing Date", async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, { results: [] });
    });

    const { GET } = await import("@/app/api/cron/health/route");
    await GET(buildRequest("test-cron-secret"));

    expect(calls[0].url).toBe(
      "https://api.notion.com/v1/databases/test-queue-db/query",
    );
    const queryBody = JSON.parse((calls[0].init?.body as string) ?? "{}");
    expect(queryBody.filter.property).toBe("Briefing Date");
    expect(queryBody.filter.date.equals).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("accepts legacy Authorization Bearer header only when ALLOW_VERCEL_CRON_FALLBACK=true", async () => {
    process.env.ALLOW_VERCEL_CRON_FALLBACK = "true";
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async () => jsonResponse(200, { results: [] }));

    const request = new Request("http://localhost:3000/api/cron/health", {
      headers: { authorization: `Bearer test-cron-secret` },
    });
    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(request);
    // Authorized but row count is 0 → status=fail (HTTP 500); the point of
    // the test is that auth succeeded, so we should see the Notion query happen.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(500);
  });
});
