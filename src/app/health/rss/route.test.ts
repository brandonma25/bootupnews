import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServiceRoleClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient,
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
  captureCheckIn: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn(async () => true),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  startSpan: vi.fn((_options, callback) => callback()),
  withScope: vi.fn((callback) =>
    callback({
      setContext: vi.fn(),
      setLevel: vi.fn(),
      setTag: vi.fn(),
    }),
  ),
}));

function buildSignalPostClient(rows: Array<{ created_at: string | null; published_at: string | null }>) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: rows,
            error: null,
          })),
        })),
      })),
    })),
  };
}

describe("/health/rss", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.SENTRY_DSN;
    (globalThis as typeof globalThis & { __bootUpRssRuntimeState?: unknown }).__bootUpRssRuntimeState = undefined;
  });

  it("returns 503 when no RSS fetch has succeeded and no persisted signal snapshot exists", async () => {
    createSupabaseServiceRoleClient.mockReturnValue(null);
    const { GET } = await import("@/app/health/rss/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "failed",
      rssBootOk: true,
      lastSuccessfulFetchAt: null,
      criticalFailure: true,
    });
  });

  it("returns 200 when persisted cron output proves a recent successful RSS-backed run", async () => {
    createSupabaseServiceRoleClient.mockReturnValue(buildSignalPostClient([
      {
        created_at: new Date().toISOString(),
        published_at: null,
      },
    ]));
    const { GET } = await import("@/app/health/rss/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      criticalFailure: false,
      staleFeedsCount: 0,
    });
    expect(body.lastSuccessfulFetchAt).toEqual(expect.any(String));
  });
});
