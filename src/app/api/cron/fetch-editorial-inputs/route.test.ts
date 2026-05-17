import { beforeEach, describe, expect, it, vi } from "vitest";

const runDailyNewsCron = vi.fn();
const runNewsletterIngestion = vi.fn();
const runEditorialStaging = vi.fn();
const logServerEvent = vi.fn();

vi.mock("@/lib/cron/fetch-news", () => ({
  runDailyNewsCron,
}));

vi.mock("@/lib/newsletter-ingestion/runner", () => ({
  runNewsletterIngestion,
}));

vi.mock("@/lib/editorial-staging/runner", () => ({
  runEditorialStaging,
}));

vi.mock("@/lib/observability", () => ({
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
  logServerEvent,
}));

type RequestAuth = { header?: "x-cron-secret" | "authorization"; secret?: string };

function buildRequest(auth: RequestAuth | string = {}): Request {
  const normalized: RequestAuth =
    typeof auth === "string" ? { header: "x-cron-secret", secret: auth } : auth;
  const headers: Record<string, string> = {};
  if (normalized.secret) {
    if (normalized.header === "authorization") {
      headers.authorization = `Bearer ${normalized.secret}`;
    } else {
      headers["x-cron-secret"] = normalized.secret;
    }
  }
  return new Request("http://localhost:3000/api/cron/fetch-editorial-inputs", {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  });
}

describe("/api/cron/fetch-editorial-inputs", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    process.env.CRON_SECRET = "local-cron-secret";
    delete process.env.ALLOW_VERCEL_CRON_FALLBACK;
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
    runEditorialStaging.mockResolvedValue({
      success: true,
      timestamp: "2026-05-12T10:15:02.000Z",
      summary: {
        message: "Editorial staging completed.",
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

  it("rejects legacy Authorization Bearer when ALLOW_VERCEL_CRON_FALLBACK is unset", async () => {
    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(
      buildRequest({ header: "authorization", secret: "local-cron-secret" }),
    );

    expect(response.status).toBe(401);
    expect(runDailyNewsCron).not.toHaveBeenCalled();
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("accepts legacy Authorization Bearer when ALLOW_VERCEL_CRON_FALLBACK=true (rollback escape hatch)", async () => {
    process.env.ALLOW_VERCEL_CRON_FALLBACK = "true";

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(
      buildRequest({ header: "authorization", secret: "local-cron-secret" }),
    );

    expect(response.status).toBe(200);
    expect(runDailyNewsCron).toHaveBeenCalledTimes(1);
    expect(runNewsletterIngestion).toHaveBeenCalledTimes(1);
  });

  it("still rejects wrong legacy Bearer when ALLOW_VERCEL_CRON_FALLBACK=true", async () => {
    process.env.ALLOW_VERCEL_CRON_FALLBACK = "true";

    const { GET } = await import("@/app/api/cron/fetch-editorial-inputs/route");
    const response = await GET(
      buildRequest({ header: "authorization", secret: "wrong-secret" }),
    );

    expect(response.status).toBe(401);
    expect(runDailyNewsCron).not.toHaveBeenCalled();
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("runs newsletter first, then RSS, then editorial staging", async () => {
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
        editorialStaging: {
          success: true,
        },
      },
    });
    expect(runDailyNewsCron).toHaveBeenCalledTimes(1);
    expect(runNewsletterIngestion).toHaveBeenCalledWith({
      writeCandidates: true,
    });
    // Newsletter runs before RSS so rank slots are reserved before the RSS snapshot fills them
    expect(runNewsletterIngestion.mock.invocationCallOrder[0]).toBeLessThan(
      runDailyNewsCron.mock.invocationCallOrder[0],
    );
    expect(runDailyNewsCron.mock.invocationCallOrder[0]).toBeLessThan(
      runEditorialStaging.mock.invocationCallOrder[0],
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
