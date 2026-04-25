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

const TLDR_RSS_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>TLDR Product Management RSS Feed</title>
    <item>
      <title>Digest headline</title>
      <link>https://tldr.tech/product/2026-04-24</link>
      <pubDate>Fri, 24 Apr 2026 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const TLDR_DIGEST_HTML = `
  <main>
    <a href="https://www.cnbc.com/story?utm_source=tldrnewsletter">
      <div>
        <h3>OpenAI announces GPT-5.5</h3>
        <div>Digest summary that should be ignored.</div>
      </div>
    </a>
    <a href="https://tldr.tech/unsubscribe">
      <div>
        <h3>Unsubscribe</h3>
      </div>
    </a>
  </main>
`;

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

  it("expands non-tech TLDR digest feeds into discovery candidates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(TLDR_RSS_XML, { status: 200 }))
      .mockResolvedValueOnce(new Response(TLDR_DIGEST_HTML, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const articles = await fetchFeedArticles("https://tldr.tech/api/rss/product", "TLDR Product");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(articles).toMatchObject([
      {
        title: "OpenAI announces GPT-5.5",
        url: "https://www.cnbc.com/story?utm_source=tldrnewsletter",
        sourceName: "cnbc.com",
        summaryText: "",
        discoveryMetadata: {
          discoverySource: "tldr",
          tldrCategory: "product",
          originalUrl: "https://www.cnbc.com/story?utm_source=tldrnewsletter",
          normalizedUrl: "https://cnbc.com/story",
          sourceDomain: "cnbc.com",
          tldrDigestUrl: "https://tldr.tech/product/2026-04-24",
          ingestionTimestamp: expect.any(String),
        },
      },
    ]);
  });
});
