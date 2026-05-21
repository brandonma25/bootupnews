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

  // Task 2.B regression — France24 RSS body trips sax-js strict mode with
  // "Attribute without value" at line 8 col 93. parseRssXmlWithFallback
  // retries strict failures whose message matches that diagnostic via
  // `xml2js: { strict: false }`. Strict rejects on `<rss attr>` (no `="…"`);
  // we assert the strict-mode rejection still surfaces as an `RssError`
  // (not a hang, not a silent garbage parse) when the tolerant retry also
  // can't make sense of the body. Real recovery against France24's actual
  // feed body is verified post-deploy by watching BOOT-UP-WEB-5 stay closed.
  it("rejects fallback-eligible XML cleanly when tolerant retry also can't parse it (BOOT-UP-WEB-5)", async () => {
    // `<rss attr>` triggers sax-strict "Attribute without value" → enters
    // the tolerant retry path; the body is not a valid RSS document, so
    // tolerant fails too and we surface the original error as RssError.
    const malformedXml = '<?xml version="1.0"?><rss attr><channel><title>x</title></channel></rss>';
    const fetchMock = vi.fn().mockResolvedValue(new Response(malformedXml, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchFeedArticles("https://example.com/feed.xml", "Tolerant Probe", { retryCount: 0 }),
    ).rejects.toMatchObject({
      name: "RssError",
      failureType: "rss_parse_invalid_xml",
    });
  });

  // Task 2.B — Foreign Affairs 403 mitigation. The default fetch headers
  // now ship a Mozilla/5.0 User-Agent + Accept / Accept-Language so basic
  // bot-protection layers stop returning 403 from Vercel's IAD1 IPs. This
  // test asserts the outgoing headers carry a real browser-shaped UA.
  it("sends a browser-shaped User-Agent + Accept headers by default (BOOT-UP-WEB-2)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(RSS_XML, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchFeedArticles("https://example.com/feed.xml", "UA Feed");

    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["User-Agent"] ?? headers["user-agent"]).toMatch(/Mozilla\/5\.0/);
    expect(headers.Accept ?? headers.accept).toMatch(/application\/rss\+xml/);
    expect(headers["Accept-Language"] ?? headers["accept-language"]).toMatch(/en/);
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
