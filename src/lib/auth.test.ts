import { describe, expect, it } from "vitest";

import {
  AUTH_CONFIG_ERROR,
  buildAuthCallbackExchangeUrl,
  buildAuthCallbackUrl,
  buildAuthConfigErrorPath,
  buildAuthReturnNextPath,
  buildAuthRedirectPath,
  hasSupabaseCodeVerifierCookie,
  hasAuthReturnParams,
  hasSupabaseSessionCookie,
  resolveRequestOrigin,
  safeRedirectPath,
} from "@/lib/auth";

describe("auth helpers", () => {
  it("keeps only safe internal next paths", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("https://evil.example")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.example")).toBe("/dashboard");
  });

  it("appends auth state without losing the existing query", () => {
    expect(buildAuthRedirectPath("/?sent=1", AUTH_CONFIG_ERROR)).toBe("/?sent=1&auth=config-error");
    expect(buildAuthConfigErrorPath()).toBe("/?auth=config-error#email-access");
  });

  it("builds callback URLs from the active origin", () => {
    expect(
      buildAuthCallbackUrl({
        origin: "http://localhost:3001",
        next: "/dashboard",
      }),
    ).toBe("http://localhost:3001/auth/callback?next=%2Fdashboard");
  });

  it("resolves the current request origin from forwarded headers", () => {
    expect(
      resolveRequestOrigin({
        forwardedHost: "preview.example.vercel.app",
        forwardedProto: "https",
      }),
    ).toBe("https://preview.example.vercel.app");
  });

  it("detects Supabase session cookies", () => {
    expect(hasSupabaseSessionCookie([{ name: "sb-localhost-auth-token" }])).toBe(true);
    expect(hasSupabaseSessionCookie([{ name: "theme" }])).toBe(false);
  });

  it("detects the Supabase PKCE code verifier cookie", () => {
    expect(
      hasSupabaseCodeVerifierCookie([{ name: "sb-localhost-auth-token-code-verifier" }]),
    ).toBe(true);
    expect(hasSupabaseCodeVerifierCookie([{ name: "sb-localhost-auth-token" }])).toBe(false);
  });

  it("detects auth return params and builds a safe next path", () => {
    const url = new URL("https://example.com/?code=oauth-code&state=abc");

    expect(hasAuthReturnParams(url.searchParams)).toBe(true);
    expect(buildAuthReturnNextPath(url)).toBe("/dashboard");
  });

  it("normalizes a stray homepage auth code into the callback route", () => {
    const callbackUrl = buildAuthCallbackExchangeUrl(
      new URL("https://example.com/?code=oauth-code"),
    );

    expect(callbackUrl.toString()).toBe(
      "https://example.com/auth/callback?code=oauth-code&next=%2Fdashboard",
    );
  });
});
