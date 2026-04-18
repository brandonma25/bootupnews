import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDashboardData } from "@/lib/data";
import { logServerEvent } from "@/lib/observability";
import { runClusterFirstPipeline } from "@/lib/pipeline";

vi.mock("@/lib/pipeline", () => ({
  runClusterFirstPipeline: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  logServerEvent: vi.fn(),
}));

function createSupabaseMock({
  topics = [],
  sources = [],
  articles = [],
  events = [],
  articleTopics = [],
}: {
  topics?: Array<Record<string, unknown>>;
  sources?: Array<Record<string, unknown>>;
  articles?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  articleTopics?: Array<Record<string, unknown>>;
}) {
  return {
    from(table: string) {
      if (table === "topics") {
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return Promise.resolve({ data: topics, error: null });
                  },
                };
              },
            };
          },
        };
      }

      if (table === "sources") {
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return Promise.resolve({ data: sources, error: null });
                  },
                };
              },
            };
          },
        };
      }

      if (table === "articles") {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({ data: articles, error: null });
              },
            };
          },
          update() {
            return {
              eq() {
                return Promise.resolve({ error: null });
              },
              in() {
                return Promise.resolve({ error: null });
              },
            };
          },
          insert() {
            return Promise.resolve({ error: null });
          },
        };
      }

      if (table === "events") {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({ data: events, error: null });
              },
            };
          },
          delete() {
            return {
              eq() {
                return Promise.resolve({ error: null });
              },
            };
          },
          insert() {
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({ data: { id: "event-1" }, error: null });
                  },
                };
              },
            };
          },
        };
      }

      if (table === "article_topics") {
        return {
          select() {
            return Promise.resolve({ data: articleTopics, error: null });
          },
          delete() {
            return {
              in() {
                return Promise.resolve({ error: null });
              },
            };
          },
          insert() {
            return Promise.resolve({ error: null });
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

describe("getDashboardData fallback behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runClusterFirstPipeline).mockResolvedValue({
      digest: {
        most_important_now: [
          {
            cluster_id: "cluster-1",
            title: "Fallback signal title",
            short_summary: "Fallback signal summary. It remains readable for signed-in users.",
            source_links: [{ title: "Reuters World", url: "https://example.com/story" }],
            score: 81.2,
            score_breakdown: {
              credibility: 90,
              novelty: 72,
              urgency: 84,
              reinforcement: 68,
            },
            cluster_size: 2,
            topic_keywords: ["finance", "rates", "market"],
          },
        ],
      },
      run: {
        run_id: "pipeline-1",
        timestamp: "2026-04-18T00:00:00.000Z",
        num_raw_items: 8,
        num_after_dedup: 6,
        num_clusters: 4,
        top_scores: [81.2],
        scoring_breakdown: [],
        feed_failures: [],
        used_seed_fallback: false,
      },
    });
  });

  it("uses the public pipeline as a live fallback for signed-in users without bootstrap rows", async () => {
    const supabase = createSupabaseMock({});

    const data = await getDashboardData("/dashboard", {
      route: "/dashboard",
      supabase: supabase as never,
      user: {
        id: "user-1",
        email: "analyst@example.com",
      } as never,
      sessionCookiePresent: true,
      viewer: {
        id: "user-1",
        email: "analyst@example.com",
        displayName: "Alex Analyst",
        initials: "AA",
      },
    });

    expect(data.mode).toBe("live");
    expect(data.briefing.items).toHaveLength(1);
    expect(data.topics.length).toBeGreaterThan(0);
    expect(data.sources.length).toBeGreaterThan(0);
    expect(runClusterFirstPipeline).toHaveBeenCalledTimes(1);
    expect(logServerEvent).toHaveBeenCalledWith(
      "warn",
      "Signed-in dashboard fell back to pipeline briefing",
      expect.objectContaining({
        path: "personalized_fallback_to_public",
        sessionExists: true,
        fallbackReason: "no personalized topics",
      }),
    );
  });
});
