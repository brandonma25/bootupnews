import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.fn();
const createSupabaseBrowserClient = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient,
}));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: true,
  getSupabasePublicEnvDiagnostics: () => ({
    isConfigured: true,
    missingNames: [],
    keySource: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  }),
}));

describe("AuthModal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createSupabaseBrowserClient.mockReturnValue({
      auth: {
        signInWithOAuth,
      },
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        origin: "http://localhost:3000",
        assign: vi.fn(),
      },
    });
  });

  it("starts Google OAuth with the expected provider and callback URL", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.com/mock-oauth" },
      error: null,
    });

    const { default: AuthModal } = await import("@/components/auth/auth-modal");

    render(<AuthModal open onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "http://localhost:3000/auth/callback?next=%2Fdashboard",
          skipBrowserRedirect: true,
        },
      });
    });

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith(
        "https://accounts.google.com/mock-oauth",
      );
    });
  });
});
