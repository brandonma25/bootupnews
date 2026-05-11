import { beforeEach, describe, expect, it, vi } from "vitest";

const runDailyNewsCron = vi.fn();
const runNewsletterIngestion = vi.fn();
const logServerEvent = vi.fn();

vi.mock("@/lib/cron/fetch-news", () => ({
  runDailyNewsCron,
}));

vi.mock("@/lib/newsletter-ingestion/runner", () => ({
  runNewsletterIngestion,
}));

vi.mock("@/lib/observability", () => ({
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
  logServerEvent,
}));

function buildRequest(secret?: string) {
  return new Request("http://localhost:3000/api/cron/fetch-editorial-inputs", {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

describe("/api/cron/fetch-editorial-inputs", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    process.env.CRON_SECRET = "local-cron-secret";
    runDailyNewsCron.mockResolvedValue({
      success: true,
      timestamp: "2026-05-12T10:15:00.000Z",
      summary: {
        message: "Persisted a new daily Top 5 snapshot.",
      },
    });
    runNewsletterIngestion.mockResolvedValue({
      success: true,
      timestamp: "2026-05-12T10:15:01.000Z",
      summary: {
        message: "Newsletter ingestion processed Gmail newsletter candidates without publishing.",
      },
    });
  });

  it("rejects unauthorized requests without triggering either fetch path", async () => {
    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(buildRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(runDailyNewsCron).not.toHaveBeenCalled();
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("requires CRON_SECRET to be configured", async () => {
    delete process.env.CRON_SECRET;

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(buildRequest("local-cron-secret"));

    expect(response.status).toBe(401);
    expect(runDailyNewsCron).not.toHaveBeenCalled();
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("runs RSS first, then the env-gated newsletter ingestion path", async () => {
    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(buildRequest("local-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      summary: {
        rss: {
          success: true,
        },
        newsletter: {
          success: true,
        },
      },
    });
    expect(runDailyNewsCron).toHaveBeenCalledTimes(1);
    expect(runNewsletterIngestion).toHaveBeenCalledWith({
      writeCandidates: true,
    });
    expect(runDailyNewsCron.mock.invocationCallOrder[0]).toBeLessThan(
      runNewsletterIngestion.mock.invocationCallOrder[0],
    );
  });

  it("still attempts newsletter ingestion when the RSS path fails closed", async () => {
    runDailyNewsCron.mockResolvedValue({
      success: false,
      timestamp: "2026-05-12T10:15:00.000Z",
      summary: {
        message: "Daily news cron failed before completion.",
      },
    });

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(buildRequest("local-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.summary.rss.success).toBe(false);
    expect(body.summary.newsletter.success).toBe(true);
    expect(runNewsletterIngestion).toHaveBeenCalledTimes(1);
  });

  it("returns a sanitized failure summary when a fetch path throws", async () => {
    runDailyNewsCron.mockRejectedValue(new Error("rss explosion"));

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(buildRequest("local-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.summary.rss.summary).toEqual({
      message: "rss task failed before completion.",
    });
    expect(body.summary.newsletter.success).toBe(true);
    expect(JSON.stringify(body)).not.toContain("local-cron-secret");
  });
});
