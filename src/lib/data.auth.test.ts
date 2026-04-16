import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  safeGetUser: vi.fn(),
}));

describe("auth-driven SSR viewer detection", () => {
  it("returns a signed-in viewer account when safeGetUser resolves a user", async () => {
    const { safeGetUser } = await import("@/lib/supabase/server");

    vi.mocked(safeGetUser).mockResolvedValue({
      supabase: null,
      sessionCookiePresent: true,
      user: {
        id: "user-1",
        email: "analyst@example.com",
        user_metadata: {
          full_name: "Alex Analyst",
        },
      },
    });

    const { getViewerAccount } = await import("@/lib/data");
    const viewer = await getViewerAccount();

    expect(viewer).toEqual({
      id: "user-1",
      email: "analyst@example.com",
      displayName: "Alex Analyst",
      initials: "AA",
    });
  });
});
