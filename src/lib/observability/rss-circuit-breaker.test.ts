import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/source-health-log", () => ({
  writeSourceHealthEntry: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
  logServerEvent: vi.fn(),
}));

import { writeSourceHealthEntry } from "@/lib/observability/source-health-log";
import { logServerEvent } from "@/lib/observability";
import {
  CIRCUIT_BREAKER_THRESHOLD,
  RssCircuitBreakerSkipError,
  checkCircuitBreaker,
  recordFetchOutcome,
} from "@/lib/observability/rss-circuit-breaker";

const writeSourceHealthEntryMock = vi.mocked(writeSourceHealthEntry);
const logServerEventMock = vi.mocked(logServerEvent);

function notionQueryResponse(failCount: number | null): Response {
  if (failCount === null) {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(
    JSON.stringify({
      results: [
        {
          id: "page-1",
          properties: {
            "Fail Count": { number: failCount },
          },
        },
      ],
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}

describe("rss-circuit-breaker — checkCircuitBreaker", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeSourceHealthEntryMock.mockReset();
    logServerEventMock.mockReset();
    process.env.NOTION_SOURCE_HEALTH_LOG_DB_ID = "test-source-health-db";
    process.env.NOTION_TOKEN = "test-token";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.NOTION_SOURCE_HEALTH_LOG_DB_ID;
    delete process.env.NOTION_TOKEN;
  });

  it("returns skip=false when no row exists for today", async () => {
    fetchMock.mockResolvedValueOnce(notionQueryResponse(null));
    const decision = await checkCircuitBreaker("Reuters");
    expect(decision.skip).toBe(false);
    expect(decision.failCount).toBe(0);
    expect(decision.briefingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns skip=false when today's fail count is below the threshold", async () => {
    fetchMock.mockResolvedValueOnce(notionQueryResponse(CIRCUIT_BREAKER_THRESHOLD - 1));
    const decision = await checkCircuitBreaker("Reuters");
    expect(decision.skip).toBe(false);
    expect(decision.failCount).toBe(CIRCUIT_BREAKER_THRESHOLD - 1);
  });

  it("returns skip=true when today's fail count is at or above the threshold", async () => {
    fetchMock.mockResolvedValueOnce(notionQueryResponse(CIRCUIT_BREAKER_THRESHOLD));
    const decision = await checkCircuitBreaker("FlakySource");
    expect(decision.skip).toBe(true);
    expect(decision.failCount).toBe(CIRCUIT_BREAKER_THRESHOLD);
  });

  it("returns skip=false (permissive) when NOTION_SOURCE_HEALTH_LOG_DB_ID is unset", async () => {
    delete process.env.NOTION_SOURCE_HEALTH_LOG_DB_ID;
    const decision = await checkCircuitBreaker("Reuters");
    expect(decision.skip).toBe(false);
    expect(decision.failCount).toBe(0);
    // Did not even attempt a Notion call.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns skip=false (permissive) when the Notion query fails — observability degradation must not disable ingestion", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "boom" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
    const decision = await checkCircuitBreaker("Reuters");
    expect(decision.skip).toBe(false);
    expect(decision.failCount).toBe(0);
    expect(logServerEvent).toHaveBeenCalledWith(
      "warn",
      expect.stringContaining("Circuit breaker query failed"),
      expect.any(Object),
    );
  });

  it("returns skip=false (permissive) when fetch itself throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const decision = await checkCircuitBreaker("Reuters");
    expect(decision.skip).toBe(false);
    expect(decision.failCount).toBe(0);
  });

  it("sends a query body filtered by Source title and Date date", async () => {
    fetchMock.mockResolvedValueOnce(notionQueryResponse(0));
    await checkCircuitBreaker("Reuters");
    const callArgs = fetchMock.mock.calls[0];
    const url = callArgs[0] as string;
    const init = callArgs[1] as RequestInit;
    expect(url).toBe(
      "https://api.notion.com/v1/databases/test-source-health-db/query",
    );
    const body = JSON.parse((init.body as string) ?? "{}");
    expect(body.filter.and[0]).toEqual({
      property: "Source",
      title: { equals: "Reuters" },
    });
    expect(body.filter.and[1].property).toBe("Date");
    expect(body.filter.and[1].date.equals).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("RssCircuitBreakerSkipError", () => {
  it("carries the source name, briefing date, and fail count on the instance", () => {
    const err = new RssCircuitBreakerSkipError("Reuters", "2026-05-17", 7);
    expect(err.name).toBe("RssCircuitBreakerSkipError");
    expect(err.sourceName).toBe("Reuters");
    expect(err.briefingDate).toBe("2026-05-17");
    expect(err.failCount).toBe(7);
    expect(err.message).toContain("Reuters");
    expect(err.message).toContain("7 failures");
  });
});

describe("rss-circuit-breaker — recordFetchOutcome", () => {
  beforeEach(() => {
    writeSourceHealthEntryMock.mockReset();
    logServerEventMock.mockReset();
  });

  it("writes success outcome with a lastSuccessfulFetchAt timestamp", async () => {
    writeSourceHealthEntryMock.mockResolvedValue({ written: true, pageId: "p1", action: "inserted" });
    await recordFetchOutcome({ sourceName: "Reuters", outcome: "success" });

    expect(writeSourceHealthEntry).toHaveBeenCalledTimes(1);
    const arg = writeSourceHealthEntryMock.mock.calls[0][0];
    expect(arg.source).toBe("Reuters");
    expect(arg.outcome).toBe("success");
    expect(typeof arg.lastSuccessfulFetchAt).toBe("string");
    expect(arg.lastSuccessfulFetchAt).toMatch(/T.+Z$/);
  });

  it("writes fail outcome without a lastSuccessfulFetchAt", async () => {
    writeSourceHealthEntryMock.mockResolvedValue({ written: true, pageId: "p1", action: "inserted" });
    await recordFetchOutcome({ sourceName: "Reuters", outcome: "fail", notes: "timeout" });

    const arg = writeSourceHealthEntryMock.mock.calls[0][0];
    expect(arg.outcome).toBe("fail");
    expect(arg.lastSuccessfulFetchAt).toBeUndefined();
    expect(arg.notes).toBe("timeout");
  });

  it("writes skipped_circuit_breaker outcome and logs a warn when the Notion write fails", async () => {
    writeSourceHealthEntryMock.mockResolvedValue({ written: false, reason: "NOTION_TOKEN not configured" });
    await recordFetchOutcome({
      sourceName: "FlakySource",
      outcome: "skipped_circuit_breaker",
      notes: "10 failures today",
    });

    expect(writeSourceHealthEntry).toHaveBeenCalled();
    expect(logServerEvent).toHaveBeenCalledWith(
      "warn",
      expect.stringContaining("Source health log write skipped or failed"),
      expect.any(Object),
    );
  });
});
