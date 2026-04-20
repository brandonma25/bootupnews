import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const verifyOtp = vi.fn();
const getUser = vi.fn();
const bootstrapUserDefaults = vi.fn();
const logServerEvent = vi.fn();

vi.mock("@/lib/default-topics", () => ({
  bootstrapUserDefaults,
}));

vi.mock("@/lib/env", () => ({
  env: {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "public-key",
  },
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/observability", () => ({
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
  logServerEvent,
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return actual;
});

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void } }) => ({
    auth: {
      exchangeCodeForSession: async (code: string) => {
        options.cookies.setAll([
          {
            name: "sb-test-auth-token",
            value: `token-for-${code}`,
            options: { path: "/" },
          },
        ]);
        return exchangeCodeForSession(code);
      },
      verifyOtp,
      getUser,
    },
  }),
}));

describe("/auth/callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    verifyOtp.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "analyst@example.com",
        },
      },
    });
    bootstrapUserDefaults.mockResolvedValue(undefined);
  });

  it("keeps the successful redirect and cookies even if post-login bootstrap fails", async () => {
    bootstrapUserDefaults.mockRejectedValue(new Error("profile bootstrap failed"));

    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      {
        url: "http://localhost:3000/auth/callback?code=oauth-code&next=%2Fdashboard",
        cookies: {
          getAll: () => [],
        },
      } as unknown as NextRequest,
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("token-for-oauth-code");
    expect(logServerEvent).toHaveBeenCalledWith(
      "warn",
      "Auth callback completed but post-login bootstrap failed",
      expect.objectContaining({
        route: "/auth/callback",
      }),
    );
  });

  it("returns callback-error when auth code exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: new Error("code exchange failed"),
    });

    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      {
        url: "http://localhost:3000/auth/callback?code=oauth-code&next=%2Fdashboard",
        cookies: {
          getAll: () => [],
        },
      } as unknown as NextRequest,
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?auth=callback-error",
    );
  });

  it("returns callback-error immediately when the provider sends explicit error params", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(
      {
        url: "http://localhost:3000/auth/callback?error=access_denied&error_code=otp_expired&error_description=User%20denied%20access",
        cookies: {
          getAll: () => [],
        },
      } as unknown as NextRequest,
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/?auth=callback-error",
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
