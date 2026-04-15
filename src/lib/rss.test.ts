import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchFeedArticles } from "@/lib/rss";

const RSS_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Example Feed</title>
    <item>
      <title>Example story</title>
      <link>https://example.com/story</link>
      <description>Example summary</description>
      <pubDate>Wed, 16 Apr 2026 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

describe("fetchFeedArticles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries a transient feed failure before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response(RSS_XML, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const articles = await fetchFeedArticles("https://example.com/feed.xml", "Example Feed");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(articles).toHaveLength(1);
    expect(articles[0]?.title).toBe("Example story");
  });

  it("surfaces a timeout with a source-specific error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFeedArticles("https://example.com/feed.xml", "Slow Feed")).rejects.toThrow(
      "Feed request timed out for Slow Feed",
    );
  });
});
