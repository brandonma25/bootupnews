import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchFeedArticles } from "@/lib/rss";

const RECENT_TLDR_PUBLISHED_AT = new Date(Date.now() - 12 * 60 * 60 * 1000);
const RECENT_TLDR_DATE_KEY = RECENT_TLDR_PUBLISHED_AT.toISOString().slice(0, 10);
const RECENT_TLDR_PUB_DATE = RECENT_TLDR_PUBLISHED_AT.toUTCString();

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
      <link>https://tldr.tech/product/${RECENT_TLDR_DATE_KEY}</link>
      <pubDate>${RECENT_TLDR_PUB_DATE}</pubDate>
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

  it("classifies HTTP 500 as an RSS fetch HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("server error", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchFeedArticles("https://example.com/feed.xml", "Broken Feed", { retryCount: 0 }),
    ).rejects.toMatchObject({
      failureType: "rss_fetch_http_error",
    });
  });

  it("classifies HTTP 404 as an RSS fetch HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchFeedArticles("https://example.com/feed.xml", "Missing Feed", { retryCount: 0 }),
    ).rejects.toMatchObject({
      failureType: "rss_fetch_http_error",
    });
  });

  it("classifies HTTP 429 as an RSS fetch rate-limit error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchFeedArticles("https://example.com/feed.xml", "Limited Feed", { retryCount: 0 }),
    ).rejects.toMatchObject({
      failureType: "rss_fetch_rate_limited",
    });
  });

  it("classifies retry exhaustion after retryable failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("still busy", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchFeedArticles("https://example.com/feed.xml", "Busy Feed", { retryCount: 1 }),
    ).rejects.toMatchObject({
      failureType: "rss_retry_exhausted",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("classifies an empty response body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFeedArticles("https://example.com/feed.xml", "Empty Feed")).rejects.toMatchObject({
      failureType: "rss_fetch_empty_response",
    });
  });

  it("classifies invalid XML", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<rss><channel>", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFeedArticles("https://example.com/feed.xml", "Invalid XML Feed")).rejects.toMatchObject({
      failureType: "rss_parse_invalid_xml",
    });
  });

  it("classifies an empty RSS feed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(`
      <rss version="2.0">
        <channel>
          <title>Empty Feed</title>
        </channel>
      </rss>
    `, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFeedArticles("https://example.com/feed.xml", "Empty RSS Feed")).rejects.toMatchObject({
      failureType: "rss_parse_empty_feed",
    });
  });

  it("classifies feeds where items are missing required fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(`
      <rss version="2.0">
        <channel>
          <title>Invalid Feed</title>
          <item>
            <description>No title or link</description>
          </item>
        </channel>
      </rss>
    `, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFeedArticles("https://example.com/feed.xml", "Invalid Feed")).rejects.toMatchObject({
      failureType: "rss_parse_missing_required_fields",
    });
  });

  it("classifies invalid RSS content types", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFeedArticles("https://example.com/feed.xml", "JSON Feed")).rejects.toMatchObject({
      failureType: "rss_fetch_invalid_content_type",
    });
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
          tldrDigestUrl: `https://tldr.tech/product/${RECENT_TLDR_DATE_KEY}`,
          ingestionTimestamp: expect.any(String),
        },
      },
    ]);
  });
});
