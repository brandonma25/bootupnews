import { describe, expect, it } from "vitest";

import {
  AUTH_CONFIG_ERROR,
  buildAuthCallbackUrl,
  buildAuthConfigErrorPath,
  buildAuthRedirectPath,
  hasSupabaseSessionCookie,
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

  it("detects Supabase session cookies", () => {
    expect(hasSupabaseSessionCookie([{ name: "sb-localhost-auth-token" }])).toBe(true);
    expect(hasSupabaseSessionCookie([{ name: "theme" }])).toBe(false);
  });
});
