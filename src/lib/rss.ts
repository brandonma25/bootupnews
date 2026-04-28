import Parser from "rss-parser";

import { env } from "@/lib/env";
import {
  captureRssFailure,
  classifyRssFailure,
  createRssError,
  recordRssFetchSuccess,
  withRssSpan,
  type RssFailureType,
  type RssPhase,
} from "@/lib/observability/rss";
import { getUrlHost } from "@/lib/sentry-config";
import type { SourceExtractionMethod } from "@/lib/source-accessibility-types";
import { fetchTldrFeed, isTldrFeedUrl, type TldrDiscoveryMetadata } from "@/lib/tldr";
import { stripHtml } from "@/lib/utils";

export type FeedArticle = {
  title: string;
  url: string;
  summaryText: string;
  contentText?: string;
  sourceName: string;
  publishedAt: string;
  stableId?: string;
  discoveryMetadata?: TldrDiscoveryMetadata;
  extractionMethod?: SourceExtractionMethod;
};

const parser = new Parser();
const DEFAULT_FEED_TIMEOUT_MS = 4_500;
const DEFAULT_FEED_RETRY_COUNT = 2;

type FeedRequestOptions = {
  timeoutMs?: number;
  retryCount?: number;
  headers?: HeadersInit;
  feedId?: string;
};

export async function fetchFeedArticles(
  feedUrl: string,
  sourceName: string,
  requestOptions: FeedRequestOptions = {},
) {
  return withRssSpan(
    "rss.fetch",
    "fetch",
    {
      "rss.feed_host": getUrlHost(feedUrl),
      "rss.feed_name": sourceName,
    },
    async () => {
      try {
        const articles = await fetchFeedArticlesUnchecked(feedUrl, sourceName, requestOptions);

        if (articles.length === 0) {
          throw createRssError(`Feed returned zero articles for ${sourceName}`, {
            failureType: "rss_parse_empty_feed",
            phase: "parse",
            feedUrl,
            feedName: sourceName,
            feedId: requestOptions.feedId,
            parser: "rss-parser",
          });
        }

        recordRssFetchSuccess({ feedUrl, feedName: sourceName, feedId: requestOptions.feedId });
        return articles;
      } catch (error) {
        captureRssFailure(error, {
          failureType: classifyRssFailure(error),
          phase: error instanceof Error && error.name === "RssError" && "phase" in error
            ? error.phase as RssPhase
            : "fetch",
          feedUrl,
          feedName: sourceName,
          feedId: requestOptions.feedId,
          retryCount: requestOptions.retryCount,
          timeoutMs: requestOptions.timeoutMs,
          parser: "rss-parser",
        });
        throw error;
      }
    },
  );
}

async function fetchFeedArticlesUnchecked(
  feedUrl: string,
  sourceName: string,
  requestOptions: FeedRequestOptions = {},
) {
  if (isTldrFeedUrl(feedUrl)) {
    return fetchTldrFeed(feedUrl, sourceName, requestFeed);
  }

  if (feedUrl.startsWith("thenewsapi://")) {
    return fetchApiArticles(feedUrl, sourceName, requestOptions);
  }

  if (feedUrl.startsWith("newsapi://")) {
    return fetchLegacyNewsApiArticles(feedUrl, sourceName, requestOptions);
  }

  const response = await requestFeed(feedUrl, {
    ...requestOptions,
    headers: {
      "User-Agent": "Daily-Intelligence-Aggregator/1.0",
      ...requestOptions.headers,
    },
  }, sourceName);

  assertRssContentType(response, feedUrl, sourceName);

  const xml = await response.text();

  if (!xml.trim()) {
    throw createRssError(`Feed returned an empty response for ${sourceName}`, {
      failureType: "rss_fetch_empty_response",
      phase: "fetch",
      feedUrl,
      feedName: sourceName,
      feedId: requestOptions.feedId,
    });
  }

  let feed;

  try {
    feed = await withRssSpan(
      "rss.parse",
      "parse",
      {
        "rss.feed_host": getUrlHost(feedUrl),
        "rss.feed_name": sourceName,
      },
      () => parser.parseString(xml),
    );
  } catch (error) {
    throw createRssError(
      `Feed parsing failed for ${sourceName}: ${error instanceof Error ? error.message : String(error)}`,
      {
        failureType: "rss_parse_invalid_xml",
        phase: "parse",
        feedUrl,
        feedName: sourceName,
        feedId: requestOptions.feedId,
        parser: "rss-parser",
      },
    );
  }

  const items = feed.items ?? [];

  if (!Array.isArray(items)) {
    throw createRssError(`Feed parsing failed for ${sourceName}: invalid feed item structure`, {
      failureType: "rss_parse_invalid_feed",
      phase: "parse",
      feedUrl,
      feedName: sourceName,
      feedId: requestOptions.feedId,
      parser: "rss-parser",
    });
  }

  if (items.length === 0) {
    throw createRssError(`Feed parsing failed for ${sourceName}: empty feed`, {
      failureType: "rss_parse_empty_feed",
      phase: "parse",
      feedUrl,
      feedName: sourceName,
      feedId: requestOptions.feedId,
      parser: "rss-parser",
    });
  }

  const selectedItems = items.slice(0, 15);

  if (selectedItems.every((item) => !item.title?.trim() && !item.link?.trim())) {
    throw createRssError(`Feed parsing failed for ${sourceName}: missing required item fields`, {
      failureType: "rss_parse_missing_required_fields",
      phase: "parse",
      feedUrl,
      feedName: sourceName,
      feedId: requestOptions.feedId,
      parser: "rss-parser",
    });
  }

  return selectedItems.map<FeedArticle>((item, index) => {
    const encodedContent = typeof item["content:encoded"] === "string" ? item["content:encoded"] : "";
    const itemContent = typeof item.content === "string" ? item.content : "";
    const itemSummary = typeof item.summary === "string" ? item.summary : "";
    const itemSnippet = typeof item.contentSnippet === "string" ? item.contentSnippet : "";
    const extractionMethod: SourceExtractionMethod = encodedContent
      ? "rss_content_encoded"
      : itemContent
        ? "rss_content"
        : itemSnippet || itemSummary
          ? "rss_summary"
          : "metadata";

    return {
      title: item.title?.trim() || `Untitled article ${index + 1}`,
      url: item.link?.trim() || feedUrl,
      summaryText: stripHtml(
        itemSnippet || itemContent || itemSummary || item.title || "",
      ),
      contentText: stripHtml(encodedContent || itemContent || ""),
      sourceName,
      publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      extractionMethod,
    };
  });
}

export async function fetchApiArticles(
  feedUrl: string,
  sourceName: string,
  requestOptions: FeedRequestOptions = {},
) {
  if (!env.theNewsApiKey) {
    throw new Error(`TheNewsAPI key is not configured for ${sourceName}`);
  }

  const normalizedUrl = feedUrl.replace("thenewsapi://", "https://");
  const url = new URL(normalizedUrl);
  url.searchParams.set("api_token", env.theNewsApiKey);
  url.searchParams.set("locale", url.searchParams.get("locale") ?? "us");
  url.searchParams.set("language", url.searchParams.get("language") ?? "en");
  url.searchParams.set("limit", url.searchParams.get("limit") ?? "15");

  const response = await requestFeed(url.toString(), {
    ...requestOptions,
    headers: {
      "User-Agent": "Daily-Intelligence-Aggregator/1.0",
      ...requestOptions.headers,
    },
  }, sourceName);

  const payload = await response.json();

  return ((payload.data ?? []) as Array<{
    title?: string;
    url?: string;
    description?: string;
    snippet?: string;
    published_at?: string;
    source?: string;
  }>)
    .slice(0, 15)
    .map((article, index): FeedArticle => ({
      title: article.title?.trim() || `Untitled article ${index + 1}`,
      url: article.url?.trim() || url.toString(),
      summaryText: stripHtml(article.description ?? article.snippet ?? article.title ?? ""),
      contentText: stripHtml(article.snippet ?? article.description ?? ""),
      sourceName: article.source?.trim() || sourceName,
      publishedAt: article.published_at ?? new Date().toISOString(),
      extractionMethod: article.snippet ? "api_snippet" : article.description ? "api_description" : "metadata",
    }));
}

async function fetchLegacyNewsApiArticles(
  feedUrl: string,
  sourceName: string,
  requestOptions: FeedRequestOptions = {},
) {
  if (!env.newsApiKey) {
    throw new Error(`NewsAPI key is not configured for ${sourceName}`);
  }

  const normalizedUrl = feedUrl.replace("newsapi://", "https://");
  const url = new URL(normalizedUrl);
  url.searchParams.set("pageSize", url.searchParams.get("pageSize") ?? "15");
  url.searchParams.set("language", url.searchParams.get("language") ?? "en");

  const response = await requestFeed(url.toString(), {
    ...requestOptions,
    headers: {
      "X-Api-Key": env.newsApiKey,
      "User-Agent": "Daily-Intelligence-Aggregator/1.0",
      ...requestOptions.headers,
    },
  }, sourceName);

  const payload = await response.json();

  return ((payload.articles ?? []) as Array<{
    title?: string;
    url?: string;
    description?: string;
    content?: string;
    publishedAt?: string;
  }>)
    .slice(0, 15)
    .map((article, index): FeedArticle => ({
      title: article.title?.trim() || `Untitled article ${index + 1}`,
      url: article.url?.trim() || url.toString(),
      summaryText: stripHtml(article.description ?? article.content ?? article.title ?? ""),
      contentText: stripHtml(article.content ?? article.description ?? ""),
      sourceName,
      publishedAt: article.publishedAt ?? new Date().toISOString(),
      extractionMethod: article.content ? "api_snippet" : article.description ? "api_description" : "metadata",
    }));
}

export function clusterArticles(
  articles: FeedArticle[],
): Array<{ representative: FeedArticle; sources: FeedArticle[] }> {
  const sortedArticles = [...articles].sort(
    (left, right) =>
      new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
  );
  const clusters: Array<{ representative: FeedArticle; sources: FeedArticle[] }> = [];

  for (const article of sortedArticles) {
    const normalized = normalize(article.title);
    const match = clusters.find(
      (cluster) => similarity(normalized, normalize(cluster.representative.title)) >= 0.55,
    );

    if (match) {
      match.sources.push(article);
    } else {
      clusters.push({ representative: article, sources: [article] });
    }
  }

  return clusters.sort((left, right) => clusterScore(right) - clusterScore(left));
}

function clusterScore(cluster: { representative: FeedArticle; sources: FeedArticle[] }) {
  const freshestPublishedAt = Math.max(
    ...cluster.sources.map((article) => new Date(article.publishedAt).getTime()),
  );

  return freshestPublishedAt + cluster.sources.length * 60 * 60 * 1000;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 8);
}

function similarity(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const overlap = [...leftSet].filter((word) => rightSet.has(word)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : overlap / union;
}

export async function requestFeed(url: string, options: FeedRequestOptions, sourceName: string) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FEED_TIMEOUT_MS;
  const retryCount = options.retryCount ?? DEFAULT_FEED_RETRY_COUNT;
  return fetchWithRetry(
    url,
    {
      next: { revalidate: 900 },
      headers: options.headers,
    },
    {
      timeoutMs,
      retryCount,
      sourceName,
    },
  );
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: {
    timeoutMs: number;
    retryCount: number;
    sourceName: string;
  },
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= options.retryCount; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init, options.timeoutMs);

      if (!response.ok) {
        const error = createRssError(
          `Feed request failed for ${options.sourceName} with status ${response.status}`,
          {
            failureType: classifyHttpStatus(response.status),
            phase: "fetch",
            feedUrl: url,
            feedName: options.sourceName,
            statusCode: response.status,
            retryAttempt: attempt,
            retryCount: options.retryCount,
            timeoutMs: options.timeoutMs,
          },
        );

        if (attempt < options.retryCount && isRetryableStatus(response.status)) {
          lastError = error;
          continue;
        }

        throw attempt > 0 && isRetryableStatus(response.status)
          ? createRetryExhaustedError(url, options, error)
          : error;
      }

      return response;
    } catch (error) {
      const normalized = normalizeFeedRequestError(error, url, options.sourceName, options.timeoutMs);
      lastError = normalized;

      if (attempt < options.retryCount && isRetryableFetchError(error)) {
        continue;
      }

      throw attempt > 0 && isRetryableFetchError(error)
        ? createRetryExhaustedError(url, options, normalized)
        : normalized;
    }
  }

  throw lastError
    ? createRetryExhaustedError(url, options, lastError)
    : createRssError(`Feed request failed for ${options.sourceName}`, {
      failureType: "rss_unknown_error",
      phase: "fetch",
      feedUrl: url,
      feedName: options.sourceName,
      retryCount: options.retryCount,
      timeoutMs: options.timeoutMs,
    });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function isRetryableFetchError(error: unknown) {
  if (error instanceof Error) {
    return error.name === "AbortError" || /fetch failed/i.test(error.message);
  }

  return false;
}

function normalizeFeedRequestError(error: unknown, feedUrl: string, sourceName: string, timeoutMs: number) {
  if (error instanceof Error && error.name === "AbortError") {
    return createRssError(`Feed request timed out for ${sourceName} after ${timeoutMs}ms`, {
      failureType: "rss_fetch_timeout",
      phase: "fetch",
      feedUrl,
      feedName: sourceName,
      timeoutMs,
    });
  }

  if (error instanceof Error && error.name === "RssError") {
    return error;
  }

  if (error instanceof Error) {
    return createRssError(error.message, {
      failureType: classifyRssFailure(error, "rss_fetch_network_error"),
      phase: "fetch",
      feedUrl,
      feedName: sourceName,
      timeoutMs,
    });
  }

  return createRssError(`Feed request failed for ${sourceName}: ${String(error)}`, {
    failureType: "rss_unknown_error",
    phase: "fetch",
    feedUrl,
    feedName: sourceName,
    timeoutMs,
  });
}

function classifyHttpStatus(status: number): RssFailureType {
  if (status === 429) {
    return "rss_fetch_rate_limited";
  }

  if (status >= 400) {
    return "rss_fetch_http_error";
  }

  return "rss_fetch_unexpected_status";
}

function createRetryExhaustedError(
  feedUrl: string,
  options: {
    timeoutMs: number;
    retryCount: number;
    sourceName: string;
  },
  lastError: Error,
) {
  return createRssError(
    `Feed request retry exhausted for ${options.sourceName}: ${lastError.message}`,
    {
      failureType: "rss_retry_exhausted",
      phase: "fetch",
      feedUrl,
      feedName: options.sourceName,
      retryCount: options.retryCount,
      timeoutMs: options.timeoutMs,
    },
  );
}

function assertRssContentType(response: Response, feedUrl: string, sourceName: string) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (
    contentType &&
    !/(xml|rss|atom|text\/plain|text\/html|application\/xhtml)/i.test(contentType)
  ) {
    throw createRssError(`Feed response for ${sourceName} had invalid content type ${contentType}`, {
      failureType: "rss_fetch_invalid_content_type",
      phase: "fetch",
      feedUrl,
      feedName: sourceName,
    });
  }
}
