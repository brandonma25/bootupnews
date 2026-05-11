import Parser from "rss-parser";

import { env } from "@/lib/env";
import { normalizeUrl as normalizePipelineUrl, stableId } from "@/lib/pipeline/shared/text";

import type { FeedArticle } from "@/lib/rss";

export type TldrDiscoveryMetadata = {
  discoverySource: "tldr";
  tldrCategory: TldrFeedKey;
  originalUrl: string;
  normalizedUrl: string;
  sourceDomain: string;
  tldrDigestUrl: string;
  ingestionTimestamp: string;
};

export const TLDR_FEED_KEYS = [
  "tech",
  "ai",
  "product",
  "founders",
  "design",
  "fintech",
  "it",
  "crypto",
  "marketing",
] as const;

export type TldrFeedKey = (typeof TLDR_FEED_KEYS)[number];

type TldrDigestLink = {
  title: string;
  originalUrl: string;
  normalizedUrl: string;
  sourceDomain: string;
};

type RequestFeed = (
  url: string,
  options: {
    timeoutMs?: number;
    retryCount?: number;
    headers?: HeadersInit;
  },
  sourceName: string,
) => Promise<Response>;

const parser = new Parser();
const DEFAULT_TLDR_MAX_ITEMS_PER_RUN = 12;
const DEFAULT_TLDR_LOOKBACK_DAYS = 2;
const TLDR_INTERNAL_HOSTS = new Set(["tldr.tech", "www.tldr.tech", "advertise.tldr.tech"]);
const TLDR_DISCOVERY_FEEDS: Record<TldrFeedKey, { digestFeedUrl: string; homepageUrl: string }> = {
  tech: {
    digestFeedUrl: "https://tldr.tech/api/rss/tech",
    homepageUrl: "https://tldr.tech",
  },
  ai: {
    digestFeedUrl: "https://tldr.tech/api/rss/ai",
    homepageUrl: "https://tldr.tech/ai",
  },
  product: {
    digestFeedUrl: "https://tldr.tech/api/rss/product",
    homepageUrl: "https://tldr.tech/product",
  },
  founders: {
    digestFeedUrl: "https://tldr.tech/api/rss/founders",
    homepageUrl: "https://tldr.tech/founders",
  },
  design: {
    digestFeedUrl: "https://tldr.tech/api/rss/design",
    homepageUrl: "https://tldr.tech/design",
  },
  fintech: {
    digestFeedUrl: "https://tldr.tech/api/rss/fintech",
    homepageUrl: "https://tldr.tech/fintech",
  },
  it: {
    digestFeedUrl: "https://tldr.tech/api/rss/it",
    homepageUrl: "https://tldr.tech/it",
  },
  crypto: {
    digestFeedUrl: "https://tldr.tech/api/rss/crypto",
    homepageUrl: "https://tldr.tech/crypto",
  },
  marketing: {
    digestFeedUrl: "https://tldr.tech/api/rss/marketing",
    homepageUrl: "https://tldr.tech/marketing",
  },
};

export function isTldrFeedUrl(feedUrl: string) {
  return resolveTldrFeedKey(feedUrl) !== null;
}

export async function fetchTldrFeed(
  feedUrl: string,
  sourceName: string,
  requestFeed: RequestFeed,
): Promise<FeedArticle[]> {
  const feedKey = resolveTldrFeedKey(feedUrl);

  if (!feedKey) {
    throw new Error(`Unsupported TLDR feed URL: ${feedUrl}`);
  }

  const { digestFeedUrl } = TLDR_DISCOVERY_FEEDS[feedKey];
  const feedResponse = await requestFeed(
    digestFeedUrl,
    {
      headers: {
        "User-Agent": "Daily-Intelligence-Aggregator/1.0",
      },
    },
    sourceName,
  );

  const xml = await feedResponse.text();
  const parsedFeed = await parser.parseString(xml);
  return ingestTldrCandidates(parsedFeed.items ?? [], sourceName, requestFeed, feedKey);
}

export async function ingestTldrCandidates(
  digestItems: Array<Parser.Item>,
  sourceName: string,
  requestFeed: RequestFeed,
  feedKey: TldrFeedKey,
): Promise<FeedArticle[]> {
  const maxItemsPerRun = getPositiveInteger(env.tldrMaxItemsPerRun, DEFAULT_TLDR_MAX_ITEMS_PER_RUN);
  const lookbackDays = getPositiveInteger(env.tldrLookbackDays, DEFAULT_TLDR_LOOKBACK_DAYS);
  const cutoffMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const ingestionTimestamp = new Date().toISOString();
  const candidates: FeedArticle[] = [];
  const seenNormalizedUrls = new Set<string>();

  const recentDigestItems = digestItems.filter((item) => {
    const publishedAt = Date.parse(item.isoDate ?? item.pubDate ?? "");
    return Number.isFinite(publishedAt) && publishedAt >= cutoffMs;
  });

  for (const item of recentDigestItems) {
    if (candidates.length >= maxItemsPerRun) {
      break;
    }

    const digestUrl = item.link?.trim();
    if (!digestUrl) {
      continue;
    }

    try {
      const digestResponse = await requestFeed(
        digestUrl,
        {
          headers: {
            "User-Agent": "Daily-Intelligence-Aggregator/1.0",
          },
        },
        sourceName,
      );
      const digestHtml = await digestResponse.text();
      const links = extractLinksFromDigest(digestHtml);

      for (const link of links) {
        if (seenNormalizedUrls.has(link.normalizedUrl)) {
          continue;
        }

        seenNormalizedUrls.add(link.normalizedUrl);
        candidates.push(
          mapToCandidate({
            link,
            digestUrl,
            publishedAt: item.isoDate ?? item.pubDate ?? ingestionTimestamp,
            ingestionTimestamp,
            feedKey,
          }),
        );

        if (candidates.length >= maxItemsPerRun) {
          break;
        }
      }
    } catch {
      continue;
    }
  }

  return candidates;
}

// MIT attribution: this keeps the same high-level extraction shape as Bullrich/tldr-rss
// (digest RSS -> digest HTML -> linked headlines) while using Boot Up's own pipeline contracts.
export function extractLinksFromDigest(digestHtml: string): TldrDigestLink[] {
  const seenNormalizedUrls = new Set<string>();
  const links: TldrDigestLink[] = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of digestHtml.matchAll(anchorPattern)) {
    const [, attributes, body] = match;
    const title = extractFirstHeadingText(body);
    const href = extractHref(attributes);

    if (!title || !href || shouldIgnoreTldrLink(href, title)) {
      continue;
    }

    const normalizedUrl = normalizeUrl(href);
    if (!normalizedUrl || seenNormalizedUrls.has(normalizedUrl)) {
      continue;
    }

    const sourceDomain = getSourceDomain(href);
    if (!sourceDomain) {
      continue;
    }

    seenNormalizedUrls.add(normalizedUrl);
    links.push({
      title,
      originalUrl: href,
      normalizedUrl,
      sourceDomain,
    });
  }

  return links;
}

function extractHref(attributes: string) {
  const hrefMatch = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const rawHref = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "";
  return decodeHtmlEntities(rawHref.trim());
}

function extractFirstHeadingText(html: string) {
  const headingMatch = html.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
  if (!headingMatch) {
    return "";
  }

  return decodeHtmlEntities(stripHtmlTags(headingMatch[1])).replace(/\s+/g, " ").trim();
}

function stripHtmlTags(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
  };

  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    const normalizedCode = code.toLowerCase();

    if (normalizedCode.startsWith("#x")) {
      const parsed = Number.parseInt(normalizedCode.slice(2), 16);
      return isValidCodePoint(parsed) ? String.fromCodePoint(parsed) : entity;
    }

    if (normalizedCode.startsWith("#")) {
      const parsed = Number.parseInt(normalizedCode.slice(1), 10);
      return isValidCodePoint(parsed) ? String.fromCodePoint(parsed) : entity;
    }

    return namedEntities[normalizedCode] ?? entity;
  });
}

function isValidCodePoint(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff;
}

export function normalizeUrl(url: string) {
  try {
    const normalized = new URL(normalizePipelineUrl(url));
    normalized.hostname = normalized.hostname.replace(/^www\./, "").toLowerCase();

    [
      "utm_id",
      "utm_name",
      "utm_geo",
      "utm_reader",
      "utm_topic",
      "utm_channel",
      "utm_brand",
      "utm_social",
      "utm_social-type",
      "ocid",
      "ref",
      "ref_src",
      "feature",
      "trk",
      "tracking_id",
    ].forEach((param) => normalized.searchParams.delete(param));

    return normalized.toString();
  } catch {
    return "";
  }
}

export function mapToCandidate(input: {
  link: TldrDigestLink;
  digestUrl: string;
  publishedAt: string;
  ingestionTimestamp: string;
  feedKey: TldrFeedKey;
}): FeedArticle {
  const discoveryMetadata: TldrDiscoveryMetadata = {
    discoverySource: "tldr",
    tldrCategory: input.feedKey,
    originalUrl: input.link.originalUrl,
    normalizedUrl: input.link.normalizedUrl,
    sourceDomain: input.link.sourceDomain,
    tldrDigestUrl: input.digestUrl,
    ingestionTimestamp: input.ingestionTimestamp,
  };

  return {
    title: input.link.title,
    url: input.link.originalUrl,
    summaryText: "",
    contentText: "",
    sourceName: input.link.sourceDomain,
    publishedAt: input.publishedAt,
    discoveryMetadata,
    stableId: stableId("tldr", input.link.normalizedUrl, input.publishedAt),
  };
}

function resolveTldrFeedKey(feedUrl: string): TldrFeedKey | null {
  const normalizedFeedUrl = feedUrl.trim().toLowerCase();
  for (const feedKey of TLDR_FEED_KEYS) {
    if (normalizedFeedUrl === `https://tldr.tech/api/rss/${feedKey}`) {
      return feedKey;
    }
  }

  if (normalizedFeedUrl === "https://tldr.tech/rss") {
    return "tech";
  }

  if (normalizedFeedUrl === "https://tldr.tech/ai/rss") {
    return "ai";
  }

  return null;
}

function shouldIgnoreTldrLink(url: string, title: string) {
  if (/\(sponsor\)/i.test(title)) {
    return true;
  }

  if (/unsubscribe|preferences|privacy/i.test(url)) {
    return true;
  }

  const host = getSourceDomain(url);
  if (!host) {
    return true;
  }

  if (TLDR_INTERNAL_HOSTS.has(host)) {
    return true;
  }

  if (host === "jobs.ashbyhq.com" && /tldr\.tech/i.test(url)) {
    return true;
  }

  return false;
}

function getSourceDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function getPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
