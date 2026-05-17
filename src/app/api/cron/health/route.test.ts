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

  it("returns status=fail HTTP 500 when row count is below the expected minimum", async () => {
    fetchMock.mockReset();
    fetchMock.mockImplementationOnce(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return jsonResponse(200, {
        results: [makeQueueRow("Reuters"), makeQueueRow("Bloomberg")],
      });
    });

    const { GET } = await import("@/app/api/cron/health/route");
    const response = await GET(buildRequest("test-cron-secret"));
    const body = (await response.json()) as {
      status: string;
      row_count: number;
      expected_min: number;
      briefing_date: string;
    };

    expect(response.status).toBe(500);
    expect(body.status).toBe("fail");
    expect(body.row_count).toBe(2);
    expect(body.expected_min).toBe(7);
    expect(typeof body.briefing_date).toBe("string");
    // Pipeline Log was written with status=fail
    expect(writePipelineLogEntry).toHaveBeenCalledTimes(1);
    expect(writePipelineLogEntry.mock.calls[0][0]).toMatchObject({
      runType: "health_check",
      status: "fail",
      rowCount: 2,
    });
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
    // 7 rows but no row from "TechCrunch" (the third expected source).
    const sources = ["Reuters", "Bloomberg", "Reuters", "Bloomberg", "Reuters", "Bloomberg", "Reuters"];
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

  it("forgiving source match — manifest 'Reuters' matches Notion 'reuters.com'", async () => {
    // 7 rows; Reuters appears only as a domain, but should still satisfy the manifest entry.
    const sources = ["reuters.com", "Bloomberg", "TechCrunch", "Bloomberg", "Bloomberg", "Bloomberg", "Bloomberg"];
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
