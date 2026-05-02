import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServiceRoleClient = vi.fn();
const safeGetUser = vi.fn();
const isAdminUser = vi.fn();
const logServerEvent = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient,
  safeGetUser,
}));

vi.mock("@/lib/admin-auth", () => ({
  isAdminUser,
}));

vi.mock("@/lib/observability", () => ({
  logServerEvent,
}));

function buildRequest(days = "30") {
  return new Request(`http://localhost:3000/api/internal/mvp-measurement/summary?days=${days}`);
}

function buildSummaryClient(rows: Array<Record<string, unknown>>) {
  const limit = vi.fn(async () => ({
    data: rows,
    error: null,
  }));
  const order = vi.fn(() => ({ limit }));
  const gte = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ gte }));
  const from = vi.fn(() => ({ select }));

  return {
    client: { from },
    calls: {
      from,
      select,
      gte,
      order,
      limit,
    },
  };
}

describe("/api/internal/mvp-measurement/summary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    safeGetUser.mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com" },
    });
    isAdminUser.mockReturnValue(true);
  });

  it("requires authentication before reading measurement events", async () => {
    safeGetUser.mockResolvedValue({
      user: null,
    });

    const { GET } = await import("@/app/api/internal/mvp-measurement/summary/route");
    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      error: "admin_auth_required",
    });
    expect(createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("requires an admin email before reading measurement events", async () => {
    isAdminUser.mockReturnValue(false);

    const { GET } = await import("@/app/api/internal/mvp-measurement/summary/route");
    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      ok: false,
      error: "admin_access_required",
    });
    expect(createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("returns an unavailable status when server measurement config is missing", async () => {
    createSupabaseServiceRoleClient.mockReturnValue(null);

    const { GET } = await import("@/app/api/internal/mvp-measurement/summary/route");
    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      ok: false,
      error: "measurement_summary_unavailable",
    });
  });

  it("returns aggregate-only measurement summary for authorized admins", async () => {
    const { client, calls } = buildSummaryClient([
      {
        event_name: "homepage_view",
        visitor_id: "mvp_visitor_a",
        session_id: "mvp_session_a1",
        occurred_at: "2026-05-01T12:00:00.000Z",
        route: "/",
      },
      {
        event_name: "signal_details_click",
        visitor_id: "mvp_visitor_a",
        session_id: "mvp_session_a1",
        occurred_at: "2026-05-01T12:05:00.000Z",
        route: "/",
      },
      {
        event_name: "source_click",
        visitor_id: "mvp_visitor_b",
        session_id: "mvp_session_b1",
        occurred_at: "2026-05-02T12:00:00.000Z",
        route: "/signals",
      },
    ]);
    createSupabaseServiceRoleClient.mockReturnValue(client);

    const { GET } = await import("@/app/api/internal/mvp-measurement/summary/route");
    const response = await GET(buildRequest("7"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(calls.from).toHaveBeenCalledWith("mvp_measurement_events");
    expect(calls.select).toHaveBeenCalledWith("event_name, visitor_id, session_id, occurred_at, route, metadata");
    expect(calls.limit).toHaveBeenCalledWith(10000);
    expect(body).toMatchObject({
      ok: true,
      windowDays: 7,
      summary: {
        eventCount: 3,
        uniqueVisitorCount: 2,
        uniqueSessionCount: 2,
        eventCountByEventName: {
          homepage_view: 1,
          signal_details_click: 1,
          source_click: 1,
        },
        eventCountByRoute: {
          "/": 2,
          "/signals": 1,
        },
      },
    });
    expect(JSON.stringify(body)).not.toContain("mvp_visitor_a");
    expect(JSON.stringify(body)).not.toContain("mvp_session_a1");
  });

  it("does not expose query errors to callers", async () => {
    const limit = vi.fn(async () => ({
      data: null,
      error: { message: "relation missing" },
    }));
    createSupabaseServiceRoleClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({ limit })),
          })),
        })),
      })),
    });

    const { GET } = await import("@/app/api/internal/mvp-measurement/summary/route");
    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      ok: false,
      error: "measurement_summary_query_failed",
    });
    expect(logServerEvent).toHaveBeenCalledWith(
      "warn",
      "MVP measurement summary read failed",
      expect.objectContaining({
        route: "/api/internal/mvp-measurement/summary",
      }),
    );
  });
});
