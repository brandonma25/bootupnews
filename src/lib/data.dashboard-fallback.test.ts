import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateDailyBriefing, getDashboardData } from "@/lib/data";
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
      ranked_clusters: [
        {
          ranked: {
            cluster_id: "cluster-1",
            score: 81.2,
            score_breakdown: {
              credibility: 90,
              novelty: 72,
              urgency: 84,
              reinforcement: 68,
            },
          },
          cluster: {
            cluster_id: "cluster-1",
            cluster_size: 2,
            topic_keywords: ["finance", "rates", "market"],
            representative_article: {
              id: "article-1",
              title: "Fed signals rates will stay elevated",
              source: "Reuters World",
              url: "https://example.com/story",
              published_at: "2026-04-18T00:00:00.000Z",
              content: "Markets and banks are repricing after a new Federal Reserve signal.",
              entities: ["Federal Reserve"],
              normalized_entities: ["federal reserve"],
              keywords: ["finance", "rates", "market"],
              title_tokens: ["fed", "signals", "rates", "will", "stay", "elevated"],
              content_tokens: ["markets", "banks", "repricing", "federal", "reserve", "signal"],
            },
            articles: [
              {
                id: "article-1",
                title: "Fed signals rates will stay elevated",
                source: "Reuters World",
                url: "https://example.com/story",
                published_at: "2026-04-18T00:00:00.000Z",
                content: "Markets and banks are repricing after a new Federal Reserve signal.",
                entities: ["Federal Reserve"],
                normalized_entities: ["federal reserve"],
                keywords: ["finance", "rates", "market"],
                title_tokens: ["fed", "signals", "rates", "will", "stay", "elevated"],
                content_tokens: ["markets", "banks", "repricing", "federal", "reserve", "signal"],
              },
              {
                id: "article-2",
                title: "Banks reprice after new Federal Reserve guidance",
                source: "AP",
                url: "https://example.com/story-2",
                published_at: "2026-04-17T23:00:00.000Z",
                content: "Banks and markets are adjusting to the latest Federal Reserve guidance.",
                entities: ["Federal Reserve"],
                normalized_entities: ["federal reserve"],
                keywords: ["finance", "rates", "market"],
                title_tokens: ["banks", "reprice", "after", "new", "federal", "reserve", "guidance"],
                content_tokens: ["banks", "markets", "adjusting", "federal", "reserve", "guidance"],
              },
            ],
            cluster_debug: {
              merge_decisions: [
                {
                  article_id: "article-2",
                  compared_to_article_id: "article-1",
                  decision: "merged",
                  reasons: ["weighted similarity 0.74"],
                  breakdown: {
                    title_similarity: 0.61,
                    keyword_overlap: 1,
                    entity_overlap: 1,
                    content_similarity: 0.58,
                    time_proximity: 0.95,
                    weighted_score: 0.74,
                  },
                },
              ],
              prevented_merge_count: 0,
              representative_selection_reason: "Selected article article-1 with score 0.91.",
              representative_scores: [
                {
                  article_id: "article-1",
                  score: 0.91,
                  reasons: ["avg similarity 0.82"],
                },
              ],
            },
          },
          scoringLog: {
            cluster_id: "cluster-1",
            credibility: 90,
            novelty: 72,
            urgency: 84,
            cluster_size: 2,
            final_score: 81.2,
          },
        },
      ],
      run: {
        run_id: "pipeline-1",
        timestamp: "2026-04-18T00:00:00.000Z",
        num_raw_items: 8,
        num_after_dedup: 6,
        num_clusters: 4,
        avg_cluster_size: 1.5,
        singleton_count: 1,
        prevented_merge_count: 0,
        top_scores: [81.2],
        scoring_breakdown: [],
        sample_cluster_rationale: [],
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

  it("grounds public fallback briefing copy in cluster evidence instead of generic score text", async () => {
    const { briefing } = await generateDailyBriefing();
    const lead = briefing.items[0];

    expect(lead.topicName).toBe("Finance");
    expect(lead.whatHappened).toContain("Federal Reserve");
    expect(lead.whyItMatters.toLowerCase()).toMatch(/fed|rates|market/);
    expect(lead.rankingSignals?.[0]).not.toContain("Credibility");
    expect(lead.keyPoints.join(" ").toLowerCase()).not.toContain("cluster evidence");
    expect(lead.keyPoints.join(" ").toLowerCase()).not.toContain("weighted similarity");
    expect(lead.relatedArticles?.[0]?.title).toContain("Fed signals rates");
  });
});
