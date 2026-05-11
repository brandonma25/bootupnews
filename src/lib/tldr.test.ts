import { describe, expect, it } from "vitest";

import { TLDR_FEED_KEYS, extractLinksFromDigest, isTldrFeedUrl, mapToCandidate, normalizeUrl } from "@/lib/tldr";

const DIGEST_HTML = `
  <main>
    <a href="https://example.com/story-a?utm_source=tldrnewsletter&utm_medium=email">
      <div>
        <h3>Example Story A</h3>
        <div>Summary text that should not become canonical content.</div>
      </div>
    </a>
    <a href="https://example.com/story-a?utm_source=tldrnewsletter&utm_medium=email&utm_geo=us">
      <div>
        <h3>Example Story A</h3>
        <div>Duplicate tracked link.</div>
      </div>
    </a>
    <a href="https://tldr.tech/unsubscribe">
      <div>
        <h3>Unsubscribe</h3>
        <div>Ignore this.</div>
      </div>
    </a>
    <a href="https://tldr.tech/track?target=https%3A%2F%2Ftracker.example%2Fstory">
      <div>
        <h3>Tracking Link</h3>
        <div>Ignore this too.</div>
      </div>
    </a>
    <a href="https://tldr.tech/tech/2026-04-24">
      <div>
        <h3>Internal TLDR Link</h3>
        <div>Ignore internal links.</div>
      </div>
    </a>
    <a href="https://ads.example.com/sponsor">
      <div>
        <h3>Sponsored Placement (Sponsor)</h3>
        <div>Ignore sponsor slots.</div>
      </div>
    </a>
    <a href="https://www.another-example.com/story-b?ref=sidebar">
      <div>
        <h3>Example Story B</h3>
        <div>Another valid outbound article.</div>
      </div>
    </a>
  </main>
`;

describe("TLDR discovery adapter", () => {
  it("extracts outbound article links from TLDR digest HTML", () => {
    expect(extractLinksFromDigest(DIGEST_HTML)).toEqual([
      {
        title: "Example Story A",
        originalUrl: "https://example.com/story-a?utm_source=tldrnewsletter&utm_medium=email",
        normalizedUrl: "https://example.com/story-a",
        sourceDomain: "example.com",
      },
      {
        title: "Example Story B",
        originalUrl: "https://www.another-example.com/story-b?ref=sidebar",
        normalizedUrl: "https://another-example.com/story-b",
        sourceDomain: "another-example.com",
      },
    ]);
  });

  it("normalizes tracked TLDR URLs into a stable dedupe key", () => {
    expect(
      normalizeUrl("https://example.com/story-a?utm_source=tldrnewsletter&utm_medium=email&utm_geo=us"),
    ).toBe("https://example.com/story-a");
  });

  it("extracts encoded headings and hrefs without loading a DOM runtime", () => {
    expect(
      extractLinksFromDigest(`
        <a href="https://example.com/story?utm_source=tldrnewsletter&amp;ref=side">
          <h3>AT&amp;T buys &quot;fiber&quot; startup</h3>
        </a>
      `),
    ).toEqual([
      {
        title: "AT&T buys \"fiber\" startup",
        originalUrl: "https://example.com/story?utm_source=tldrnewsletter&ref=side",
        normalizedUrl: "https://example.com/story",
        sourceDomain: "example.com",
      },
    ]);
  });

  it("recognizes every validated official TLDR category feed as a discovery input", () => {
    expect(TLDR_FEED_KEYS).toEqual([
      "tech",
      "ai",
      "product",
      "founders",
      "design",
      "fintech",
      "it",
      "crypto",
      "marketing",
    ]);

    for (const feedKey of TLDR_FEED_KEYS) {
      expect(isTldrFeedUrl(`https://tldr.tech/api/rss/${feedKey}`)).toBe(true);
    }
  });

  it("maps extracted links into the ingestion candidate schema", () => {
    const candidate = mapToCandidate({
      link: {
        title: "Example Story A",
        originalUrl: "https://example.com/story-a?utm_source=tldrnewsletter",
        normalizedUrl: "https://example.com/story-a",
        sourceDomain: "example.com",
      },
      digestUrl: "https://tldr.tech/tech/2026-04-24",
      publishedAt: "2026-04-24T00:00:00.000Z",
      ingestionTimestamp: "2026-04-25T10:00:00.000Z",
      feedKey: "tech",
    });

    expect(candidate).toMatchObject({
      title: "Example Story A",
      url: "https://example.com/story-a?utm_source=tldrnewsletter",
      summaryText: "",
      contentText: "",
      sourceName: "example.com",
      publishedAt: "2026-04-24T00:00:00.000Z",
      discoveryMetadata: {
        discoverySource: "tldr",
        tldrCategory: "tech",
        originalUrl: "https://example.com/story-a?utm_source=tldrnewsletter",
        normalizedUrl: "https://example.com/story-a",
        sourceDomain: "example.com",
        tldrDigestUrl: "https://tldr.tech/tech/2026-04-24",
        ingestionTimestamp: "2026-04-25T10:00:00.000Z",
      },
    });
    expect(candidate.stableId).toHaveLength(12);
  });

  it("maps non-tech digest candidates without treating TLDR as the publisher", () => {
    const candidate = mapToCandidate({
      link: {
        title: "Product Strategy Memo",
        originalUrl: "https://product.example.com/roadmap?utm_source=tldrnewsletter",
        normalizedUrl: "https://product.example.com/roadmap",
        sourceDomain: "product.example.com",
      },
      digestUrl: "https://tldr.tech/product/2026-04-24",
      publishedAt: "2026-04-24T00:00:00.000Z",
      ingestionTimestamp: "2026-04-25T10:00:00.000Z",
      feedKey: "product",
    });

    expect(candidate.sourceName).toBe("product.example.com");
    expect(candidate.summaryText).toBe("");
    expect(candidate.contentText).toBe("");
    expect(candidate.discoveryMetadata).toMatchObject({
      discoverySource: "tldr",
      tldrCategory: "product",
      tldrDigestUrl: "https://tldr.tech/product/2026-04-24",
      normalizedUrl: "https://product.example.com/roadmap",
    });
  });
});
