import { describe, expect, it } from "vitest";

import { syncEventClusters, syncTopicMatches } from "@/lib/data";
import type { Topic } from "@/lib/types";

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
