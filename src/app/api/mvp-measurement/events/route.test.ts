import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseServiceRoleClient = vi.fn();
const safeGetUser = vi.fn();
const logServerEvent = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient,
  safeGetUser,
}));

vi.mock("@/lib/observability", () => ({
  logServerEvent,
}));

function buildRequest(body: unknown) {
  return new Request("http://localhost:3000/api/mvp-measurement/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function buildValidBody(overrides: Record<string, unknown> = {}) {
  return {
    eventName: "homepage_view",
    visitorId: "mvp_1234567890abcdef",
    sessionId: "mvp_session_1234567890abcdef",
    route: "/",
    surface: "home",
    briefingDate: "2026-05-01",
    metadata: {
      visibleSignalCount: 5,
    },
    ...overrides,
  };
}

describe("/api/mvp-measurement/events", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    safeGetUser.mockResolvedValue({
      user: { id: "user-1" },
    });
  });

  it("accepts and stores valid events", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const from = vi.fn(() => ({ insert }));
    createSupabaseServiceRoleClient.mockReturnValue({ from });

    const { POST } = await import("@/app/api/mvp-measurement/events/route");
    const response = await POST(buildRequest(buildValidBody()));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({ ok: true, stored: true });
    expect(from).toHaveBeenCalledWith("mvp_measurement_events");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: "homepage_view",
        visitor_id: "mvp_1234567890abcdef",
        session_id: "mvp_session_1234567890abcdef",
        user_id: "user-1",
        route: "/",
        briefing_date: "2026-05-01",
      }),
    );
  });

  it("rejects invalid event names", async () => {
    const { POST } = await import("@/app/api/mvp-measurement/events/route");
    const response = await POST(buildRequest(buildValidBody({ eventName: "rank_for_me" })));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: "Unsupported event name.",
    });
    expect(createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("soft-fails when measurement storage is unavailable", async () => {
    createSupabaseServiceRoleClient.mockReturnValue(null);

    const { POST } = await import("@/app/api/mvp-measurement/events/route");
    const response = await POST(buildRequest(buildValidBody()));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      ok: true,
      stored: false,
      reason: "measurement_storage_unavailable",
    });
  });

  it("does not expose storage failures to public readers", async () => {
    const insert = vi.fn(async () => ({ error: { message: "relation missing" } }));
    createSupabaseServiceRoleClient.mockReturnValue({
      from: vi.fn(() => ({ insert })),
    });

    const { POST } = await import("@/app/api/mvp-measurement/events/route");
    const response = await POST(buildRequest(buildValidBody()));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({
      ok: true,
      stored: false,
      reason: "measurement_insert_failed",
    });
    expect(logServerEvent).toHaveBeenCalledWith(
      "warn",
      "MVP measurement event storage failed",
      expect.objectContaining({
        eventName: "homepage_view",
      }),
    );
  });
});
