import { afterEach, describe, expect, it, vi } from "vitest";

import { __testing__, syncEventClusters, syncTopicMatches } from "@/lib/data";
import * as rssModule from "@/lib/rss";
import type { FeedArticle } from "@/lib/rss";
import type { Source, Topic } from "@/lib/types";

type QueryResult<T> = Promise<{ data: T; error: null }>;

function createSupabaseMock({
  articles = [],
  articleTopics = [],
}: {
  articles?: Array<Record<string, unknown>>;
  articleTopics?: Array<Record<string, unknown>>;
}) {
  const operations: string[] = [];

  const client = {
    from(table: string) {
      if (table === "articles") {
        return {
          select() {
            return {
              eq(): QueryResult<typeof articles> {
                operations.push("articles.select");
                return Promise.resolve({ data: articles, error: null });
              },
            };
          },
          update() {
            return {
              eq() {
                operations.push("articles.update.eq");
                return Promise.resolve({ error: null });
              },
              in() {
                operations.push("articles.update.in");
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }

      if (table === "article_topics") {
        return {
          select() {
            operations.push("article_topics.select");
            return Promise.resolve({ data: articleTopics, error: null });
          },
          delete() {
            return {
              in() {
                operations.push("article_topics.delete.in");
                return Promise.resolve({ error: null });
              },
            };
          },
          insert() {
            operations.push("article_topics.insert");
            return Promise.resolve({ error: null });
          },
        };
      }

      if (table === "events") {
        return {
          delete() {
            return {
              eq() {
                operations.push("events.delete.eq");
                return Promise.resolve({ error: null });
              },
            };
          },
          insert() {
            operations.push("events.insert");
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

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return {
    client,
    operations,
  };
}

describe("syncTopicMatches", () => {
  it("preserves existing topic matches when recompute returns no rows", async () => {
    const { client, operations } = createSupabaseMock({
      articles: [
        {
          id: "article-1",
          title: "Unrelated weather update",
          summary_text: "A generic weather story with no topic keywords.",
        },
      ],
    });

    const topics: Topic[] = [
      {
        id: "topic-1",
        name: "Finance",
        description: "Finance coverage",
        color: "#111111",
        keywords: ["fed", "inflation"],
        excludeKeywords: [],
      },
    ];

    await syncTopicMatches(client as never, "user-1", topics);

    expect(operations).not.toContain("article_topics.delete.in");
    expect(operations).not.toContain("article_topics.insert");
  });
});

describe("syncEventClusters", () => {
  it("preserves existing events when no seeded articles are available", async () => {
    const { client, operations } = createSupabaseMock({
      articles: [
        {
          id: "article-1",
          title: "Existing coverage",
          summary_text: "Existing summary",
          published_at: "2026-04-16T08:00:00.000Z",
          url: "https://example.com/story",
          source_id: "source-1",
        },
      ],
      articleTopics: [],
    });

    const topics: Topic[] = [
      {
        id: "topic-1",
        name: "Finance",
        description: "Finance coverage",
        color: "#111111",
        keywords: ["fed", "inflation"],
        excludeKeywords: [],
      },
    ];

    await syncEventClusters(client as never, "user-1", topics, []);

    expect(operations).not.toContain("articles.update.eq");
    expect(operations).not.toContain("events.delete.eq");
  });
});

describe("fetchSourceArticlesWithFallback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a curated fallback when a GDELT source hard-fails", async () => {
    const fetchSpy = vi.spyOn(rssModule, "fetchFeedArticles");
    const fallbackArticles: FeedArticle[] = [
      {
        title: "Recovered story",
        url: "https://example.com/recovered",
        summaryText: "Recovered summary",
        sourceName: "AP",
        publishedAt: new Date().toISOString(),
      },
    ];

    fetchSpy
      .mockRejectedValueOnce(new Error("Feed request timed out for GDELT Finance Monitor after 4500ms"))
      .mockResolvedValueOnce(fallbackArticles);

    const source: Source = {
      id: "source-1",
      name: "GDELT Finance Monitor",
      feedUrl: "https://api.gdeltproject.org/api/v2/doc/doc?query=finance",
      topicName: "Finance",
      status: "active",
    };

    const result = await __testing__.fetchSourceArticlesWithFallback(source);

    expect(result.usedFallback).toBe(true);
    expect(result.articles).toHaveLength(1);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      source.feedUrl,
      source.name,
      expect.objectContaining({ timeoutMs: 4500, retryCount: 2 }),
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "https://feeds.reuters.com/reuters/businessNews",
      source.name,
      expect.objectContaining({ timeoutMs: 4500, retryCount: 2 }),
    );
  });

  it("drops stale fallback articles instead of surfacing misleading recovery cards", async () => {
    const fetchSpy = vi.spyOn(rssModule, "fetchFeedArticles");
    const staleArticle: FeedArticle = {
      title: "Old fallback story",
      url: "https://example.com/old-story",
      summaryText: "Old summary",
      sourceName: "TechCrunch",
      publishedAt: "2026-01-01T00:00:00.000Z",
    };

    fetchSpy
      .mockRejectedValueOnce(new Error("Feed request failed"))
      .mockResolvedValueOnce([staleArticle]);

    const source: Source = {
      id: "source-2",
      name: "GDELT AI Monitor",
      feedUrl: "https://api.gdeltproject.org/api/v2/doc/doc?query=ai",
      topicName: "AI",
      status: "active",
    };

    const result = await __testing__.fetchSourceArticlesWithFallback(source);

    expect(result.articles).toHaveLength(0);
    expect(result.failures.at(-1)?.errorMessage).toBe("Feed returned zero articles");
  });
});

describe("topic fallback supplementation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supplements a thin finance category up to the minimum article floor", async () => {
    const fetchSpy = vi.spyOn(rssModule, "fetchFeedArticles");
    const currentArticle: FeedArticle = {
      title: "Current finance story",
      url: "https://example.com/current-finance",
      summaryText: "Current finance summary",
      sourceName: "Reuters Business",
      publishedAt: new Date().toISOString(),
    };
    const fallbackArticles: FeedArticle[] = [
      {
        title: "Fallback finance story 1",
        url: "https://example.com/fallback-finance-1",
        summaryText: "Fallback finance summary 1",
        sourceName: "GDELT Finance Monitor",
        publishedAt: new Date().toISOString(),
      },
      {
        title: "Fallback finance story 2",
        url: "https://example.com/fallback-finance-2",
        summaryText: "Fallback finance summary 2",
        sourceName: "GDELT Finance Monitor",
        publishedAt: new Date().toISOString(),
      },
    ];

    fetchSpy.mockResolvedValueOnce(fallbackArticles);

    const result = await __testing__.ensureTopicMinimumArticles(
      "Finance",
      [
        {
          id: "source-finance",
          name: "Financial Times",
          feedUrl: "https://www.ft.com/rss/home",
          topicName: "Finance",
          status: "active",
        },
      ],
      [currentArticle],
      "/dashboard",
      "user-1",
    );

    expect(result.fallbackTriggered).toBe(true);
    expect(result.articles).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("gdeltproject.org"),
      "GDELT Finance Monitor",
      expect.objectContaining({ timeoutMs: 4500, retryCount: 2 }),
    );
  });

  it("returns an intentional empty supplement result when every fallback source fails", async () => {
    const fetchSpy = vi.spyOn(rssModule, "fetchFeedArticles");
    fetchSpy.mockRejectedValue(new Error("Feed request failed"));

    const result = await __testing__.ensureTopicMinimumArticles(
      "Politics",
      [],
      [],
      "/dashboard",
      "user-1",
    );

    expect(result.fallbackTriggered).toBe(true);
    expect(result.articles).toHaveLength(0);
    expect(result.failures.length).toBeGreaterThan(0);
  });

  it("maps repo topic names into the homepage reliability categories", () => {
    expect(__testing__.inferReliabilityCategory("Business")).toBe("finance");
    expect(__testing__.inferReliabilityCategory("World")).toBe("politics");
    expect(__testing__.inferReliabilityCategory("AI")).toBe("tech");
  });
});
