import { beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  capture: vi.fn(),
  init: vi.fn(),
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: posthogMock,
}));

function installStorage(name: "localStorage" | "sessionStorage") {
  const storage = new Map<string, string>();
  Object.defineProperty(window, name, {
    configurable: true,
    value: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
}

function clearPostHogEnv() {
  delete process.env.NEXT_PUBLIC_ENABLE_POSTHOG;
  delete process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  delete process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY;
  delete process.env.NEXT_PUBLIC_POSTHOG_PAGEVIEWS;
  delete process.env.NEXT_PUBLIC_POSTHOG_AUTOCAPTURE;
  delete process.env.NEXT_PUBLIC_POSTHOG_HEATMAPS;
  delete process.env.NEXT_PUBLIC_POSTHOG_DEAD_CLICKS;
  delete process.env.NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE;
}

function enablePostHog() {
  process.env.NEXT_PUBLIC_ENABLE_POSTHOG = "1";
  process.env.NEXT_PUBLIC_POSTHOG_TOKEN = "phc_project_token";
  process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
}

describe("trackMvpMeasurementEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    clearPostHogEnv();
    installStorage("localStorage");
    installStorage("sessionStorage");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true, stored: true }), { status: 202 })),
    );
    posthogMock.init.mockImplementation((_token, config) => {
      config?.loaded?.(posthogMock);
      return posthogMock;
    });
  });

  it("still posts MVP measurement events to Supabase when PostHog is disabled", async () => {
    const { trackMvpMeasurementEvent } = await import("@/lib/mvp-measurement-client");

    await trackMvpMeasurementEvent({
      eventName: "homepage_view",
      route: "/",
      surface: "home",
      briefingDate: "2026-05-01",
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/mvp-measurement/events",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
      }),
    );
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("captures same-name PostHog events with sanitized properties when enabled", async () => {
    enablePostHog();
    const { trackMvpMeasurementEvent } = await import("@/lib/mvp-measurement-client");

    await trackMvpMeasurementEvent({
      eventName: "source_click",
      route: "/signals?token=secret#fragment",
      surface: "signals_published_slate",
      signalPostId: "3156ce1e-d052-4f88-af1b-4630f78e1104",
      signalRank: 2,
      briefingDate: "2026-05-01",
      metadata: {
        sourceName: "Example Source",
        sourceUrl: "https://example.com/story?utm_source=newsletter#fragment",
        email: "reader@example.com",
        whyItMatters: "Full Why It Matters copy must not be forwarded.",
      },
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    const posthogCall = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).startsWith("https://us.i.posthog.com/capture/"));
    expect(posthogCall).toBeDefined();
    const posthogBody = JSON.parse(String(posthogCall?.[1]?.body));

    expect(posthogBody).toEqual(
      expect.objectContaining({
        api_key: "phc_project_token",
        event: "source_click",
        properties: expect.objectContaining({
          route: "/signals",
          surface: "signals_published_slate",
          signalPostId: "3156ce1e-d052-4f88-af1b-4630f78e1104",
          signalRank: 2,
          briefingDate: "2026-05-01",
          sourceName: "Example Source",
          sourceUrl: "https://example.com/story",
          distinct_id: expect.stringMatching(/^mvp_/),
          $session_id: expect.stringMatching(/^mvp_session_/),
        }),
      }),
    );
    expect(posthogBody.properties).not.toHaveProperty("email");
    expect(posthogBody.properties).not.toHaveProperty("whyItMatters");
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("does not throw or block the Supabase post when analytics capture fails", async () => {
    enablePostHog();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("posthog unavailable"));
    const { trackMvpMeasurementEvent } = await import("@/lib/mvp-measurement-client");

    await expect(
      trackMvpMeasurementEvent({
        eventName: "signal_details_click",
        route: "/",
        surface: "home_top_event",
        signalPostId: "3156ce1e-d052-4f88-af1b-4630f78e1104",
        signalRank: 1,
        briefingDate: "2026-05-01",
      }),
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith(
      "/api/mvp-measurement/events",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
