import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();

vi.mock("@/lib/env", () => ({
  env: {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "public-key",
  },
  isSupabaseConfigured: true,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser,
    },
  }),
}));

describe("proxy auth return handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getUser.mockResolvedValue({
      data: {
        user: null,
      },
    });
  });

  it("redirects stray homepage auth codes into the callback route", async () => {
    const { proxy } = await import("@/proxy");

    const response = await proxy(
      {
        url: "http://localhost:3000/?code=oauth-code",
        cookies: {
          getAll: () => [],
          set: () => undefined,
        },
      } as unknown as NextRequest,
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/auth/callback?code=oauth-code&next=%2Fdashboard",
    );
  });

  it("does not refresh auth state on the callback route before code exchange", async () => {
    const { proxy } = await import("@/proxy");

    const response = await proxy(
      {
        url: "http://localhost:3000/auth/callback?code=oauth-code&next=%2Fdashboard",
        cookies: {
          getAll: () => [],
          set: () => undefined,
        },
      } as unknown as NextRequest,
    );

    expect(response.headers.get("location")).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("leaves reset-password recovery query params on the reset page", async () => {
    const { proxy } = await import("@/proxy");

    const response = await proxy(
      {
        url: "http://localhost:3000/reset-password?code=recovery-code",
        cookies: {
          getAll: () => [],
          set: () => undefined,
        },
      } as unknown as NextRequest,
    );

    expect(response.headers.get("location")).toBeNull();
    expect(getUser).toHaveBeenCalled();
  });
});
