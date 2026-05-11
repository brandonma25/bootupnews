import { beforeEach, describe, expect, it, vi } from "vitest";

const runNewsletterIngestion = vi.fn();
const logServerEvent = vi.fn();

vi.mock("@/lib/newsletter-ingestion/runner", () => ({
  runNewsletterIngestion,
}));

vi.mock("@/lib/observability", () => ({
  logServerEvent,
}));

function buildRequest(secret?: string) {
  return new Request("http://localhost:3000/api/cron/newsletter-ingestion", {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

describe("/api/cron/newsletter-ingestion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "local-cron-secret";
    runNewsletterIngestion.mockResolvedValue({
      success: true,
      timestamp: "2026-05-10T00:00:00.000Z",
      summary: {
        message: "Newsletter ingestion is disabled.",
      },
    });
  });

  it("rejects unauthorized requests without triggering Gmail ingestion", async () => {
    const { GET } = await import("@/app/api/cron/newsletter-ingestion/route");
    const response = await GET(buildRequest("wrong-secret"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("requires CRON_SECRET to be configured", async () => {
    delete process.env.CRON_SECRET;

    const { GET } = await import("@/app/api/cron/newsletter-ingestion/route");
    const response = await GET(buildRequest("local-cron-secret"));

    expect(response.status).toBe(401);
    expect(runNewsletterIngestion).not.toHaveBeenCalled();
  });

  it("runs the controlled newsletter ingestion runner with candidate writes still env-gated", async () => {
    const { GET } = await import("@/app/api/cron/newsletter-ingestion/route");
    const response = await GET(buildRequest("local-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(runNewsletterIngestion).toHaveBeenCalledWith({
      writeCandidates: true,
    });
  });

  it("returns 500 when the runner fails closed", async () => {
    runNewsletterIngestion.mockResolvedValue({
      success: false,
      timestamp: "2026-05-10T00:00:00.000Z",
      summary: {
        message: "Newsletter ingestion failed closed before completion.",
      },
    });

    const { GET } = await import("@/app/api/cron/newsletter-ingestion/route");
    const response = await GET(buildRequest("local-cron-secret"));

    expect(response.status).toBe(500);
  });
});
