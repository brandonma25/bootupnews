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

function clearPostHogEnv() {
  delete process.env.NEXT_PUBLIC_ENABLE_POSTHOG;
  delete process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  delete process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY;
}

describe("PostHog client analytics bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    clearPostHogEnv();
    posthogMock.init.mockImplementation((_token, config) => {
      config?.loaded?.(posthogMock);
      return posthogMock;
    });
  });

  it("is disabled when required env is missing", async () => {
    const { initializePostHogClient } = await import("@/lib/posthog-client");

    expect(initializePostHogClient()).toBeNull();
    expect(posthogMock.init).not.toHaveBeenCalled();
  });

  it("initializes with explicit pageview, autocapture, and replay-safe defaults", async () => {
    process.env.NEXT_PUBLIC_ENABLE_POSTHOG = "1";
    process.env.NEXT_PUBLIC_POSTHOG_TOKEN = "phc_project_token";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com?token=ignored";

    const { initializePostHogClient } = await import("@/lib/posthog-client");
    initializePostHogClient();

    expect(posthogMock.init).toHaveBeenCalledWith(
      "phc_project_token",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        mask_all_element_attributes: true,
        mask_all_text: true,
      }),
    );
  });

  it("keeps the SDK project token sendable while sanitizing captured properties", async () => {
    process.env.NEXT_PUBLIC_ENABLE_POSTHOG = "1";
    process.env.NEXT_PUBLIC_POSTHOG_TOKEN = "phc_project_token";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";

    const { initializePostHogClient } = await import("@/lib/posthog-client");
    initializePostHogClient();

    const [, config] = posthogMock.init.mock.calls[0]!;
    const sanitizedCapture = config.before_send?.({
      event: "source_click",
      properties: {
        token: "phc_project_token",
        sourceUrl: "https://example.com/story?utm_source=email#fragment",
        sourceToken: "source-secret",
        whyItMatters: "Full explanatory copy must not leave the app.",
        linkText: "Source",
      },
    });

    expect(config.property_denylist).not.toContain("token");
    expect(sanitizedCapture?.properties).toEqual({
      token: "phc_project_token",
      sourceUrl: "https://example.com/story",
      linkText: "Source",
    });
  });

  it("sanitizes analytics properties before capture", async () => {
    const { sanitizePostHogProperties } = await import("@/lib/posthog-client");

    expect(
      sanitizePostHogProperties({
        route: "/signals?token=secret",
        sourceUrl: "https://example.com/story?utm_source=email#fragment",
        email: "reader@example.com",
        token: "secret",
        whyItMatters: "Full explanatory copy must not leave the app.",
        linkText: "Source",
      }),
    ).toEqual({
      route: "/signals",
      sourceUrl: "https://example.com/story",
      linkText: "Source",
    });
  });

  it("keeps admin and auth routes ineligible for session replay", async () => {
    const { isPostHogSessionReplayEligible } = await import("@/lib/posthog-client");

    expect(isPostHogSessionReplayEligible("/signals")).toBe(true);
    expect(isPostHogSessionReplayEligible("/dashboard/signals/editorial-review")).toBe(false);
    expect(isPostHogSessionReplayEligible("/login?redirectTo=%2F")).toBe(false);
    expect(isPostHogSessionReplayEligible("/auth/callback")).toBe(false);
  });
});
