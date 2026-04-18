import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboardPageState, getViewerAccount } from "@/lib/data";
import { runClusterFirstPipeline } from "@/lib/pipeline";
import { safeGetUser } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  safeGetUser: vi.fn(),
}));

vi.mock("@/lib/pipeline", () => ({
  runClusterFirstPipeline: vi.fn(),
}));

describe("auth-driven SSR viewer detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(safeGetUser).mockReset();
    vi.mocked(runClusterFirstPipeline).mockResolvedValue({
      digest: {
        most_important_now: [],
      },
      ranked_clusters: [],
      run: {
        run_id: "pipeline-test",
        timestamp: "2026-04-19T00:00:00.000Z",
        num_raw_items: 0,
        num_after_dedup: 0,
        num_clusters: 0,
        top_scores: [],
        scoring_breakdown: [],
        active_sources: [],
        feed_failures: [],
        avg_cluster_size: 0,
        singleton_count: 0,
        prevented_merge_count: 0,
        sample_cluster_rationale: [],
        source_contributions: [],
        used_seed_fallback: false,
        ranking_provider: null,
        diversity_provider: null,
        suppressed_ranked_clusters: [],
      },
    });
  });

  it("returns a signed-in viewer account when safeGetUser resolves a user", async () => {
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

    const viewer = await getViewerAccount();

    expect(viewer).toEqual({
      id: "user-1",
      email: "analyst@example.com",
      displayName: "Alex Analyst",
      initials: "AA",
    });
  });

  it("uses one auth lookup for combined dashboard page state", async () => {
    vi.mocked(safeGetUser).mockResolvedValue({
      supabase: null,
      sessionCookiePresent: false,
      user: null,
    });

    const pageState = await getDashboardPageState("/");

    expect(safeGetUser).toHaveBeenCalledTimes(1);
    expect(safeGetUser).toHaveBeenCalledWith("/");
    expect(pageState.viewer).toBeNull();
    expect(pageState.data.mode).toBe("public");
  });
});
