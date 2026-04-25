import { afterEach, describe, expect, it, vi } from "vitest";

import { ingestRawItems } from "@/lib/pipeline/ingestion";
import type { Source } from "@/lib/types";

const TLDR_RSS_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>TLDR Fintech RSS Feed</title>
    <item>
      <title>Digest headline</title>
      <link>https://tldr.tech/fintech/2026-04-23</link>
      <pubDate>Fri, 24 Apr 2026 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const TLDR_DIGEST_HTML = `
  <main>
    <a href="https://example.com/story-a?utm_source=tldrnewsletter">
      <div>
        <h3>Example Story A</h3>
        <div>Digest summary text.</div>
      </div>
    </a>
    <a href="https://example.com/story-a?utm_source=tldrnewsletter&utm_medium=email">
      <div>
        <h3>Example Story A</h3>
        <div>Duplicate tracked link.</div>
      </div>
    </a>
  </main>
`;

const TLDR_SOURCE: Source = {
  id: "source-tldr-fintech",
  name: "TLDR Fintech",
  feedUrl: "https://tldr.tech/api/rss/fintech",
  homepageUrl: "https://tldr.tech/fintech",
  topicId: "topic-finance",
  topicName: "Finance",
  status: "active",
};

describe("ingestRawItems TLDR integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps TLDR discovery candidates inside the native ingestion pipeline", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(TLDR_RSS_XML, { status: 200 }))
      .mockResolvedValueOnce(new Response(TLDR_DIGEST_HTML, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await ingestRawItems({ sources: [TLDR_SOURCE] });

    expect(result.usedSeedFallback).toBe(false);
    expect(result.failures).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      source: "example.com",
      title: "Example Story A",
      url: "https://example.com/story-a?utm_source=tldrnewsletter",
      raw_content: "",
      source_metadata: {
        sourceId: "custom-source-tldr-fintech",
        source: "TLDR Fintech",
      },
      discovery_metadata: {
        discoverySource: "tldr",
        tldrCategory: "fintech",
        normalizedUrl: "https://example.com/story-a",
        sourceDomain: "example.com",
        tldrDigestUrl: "https://tldr.tech/fintech/2026-04-23",
      },
    });
    expect(result.source_contributions).toEqual([
      expect.objectContaining({
        source_id: "custom-source-tldr-fintech",
        item_count: 1,
      }),
    ]);
  });
});
