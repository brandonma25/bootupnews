import Parser from "rss-parser";

import { env } from "@/lib/env";
import { stripHtml } from "@/lib/utils";

export type FeedArticle = {
  title: string;
  url: string;
  summaryText: string;
  contentText?: string;
  sourceName: string;
  publishedAt: string;
};

const parser = new Parser();
const DEFAULT_FEED_TIMEOUT_MS = 8_000;
const DEFAULT_FEED_RETRY_COUNT = 1;

type FeedRequestOptions = {
  sourceName: string;
  timeoutMs?: number;
  retryCount?: number;
  headers?: HeadersInit;
};

export async function fetchFeedArticles(feedUrl: string, sourceName: string) {
  if (feedUrl.startsWith("thenewsapi://")) {
    return fetchApiArticles(feedUrl, sourceName);
  }

  if (feedUrl.startsWith("newsapi://")) {
    return fetchLegacyNewsApiArticles(feedUrl, sourceName);
  }

  const response = await requestFeed(feedUrl, {
    sourceName,
    headers: {
      "User-Agent": "Daily-Intelligence-Aggregator/1.0",
    },
  });

  const xml = await response.text();
  let feed;

  try {
    feed = await parser.parseString(xml);
  } catch (error) {
    throw new Error(
      `Feed parsing failed for ${sourceName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return (feed.items ?? []).slice(0, 15).map<FeedArticle>((item, index) => ({
    title: item.title?.trim() || `Untitled article ${index + 1}`,
    url: item.link?.trim() || feedUrl,
    summaryText: stripHtml(
      item.contentSnippet ?? item.content ?? item.summary ?? item.title ?? "",
    ),
    contentText: stripHtml(item.content ?? item["content:encoded"] ?? ""),
    sourceName,
    publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
  }));
}

export async function fetchApiArticles(feedUrl: string, sourceName: string) {
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
    sourceName,
    headers: {
      "User-Agent": "Daily-Intelligence-Aggregator/1.0",
    },
  });

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
    }));
}

async function fetchLegacyNewsApiArticles(feedUrl: string, sourceName: string) {
  if (!env.newsApiKey) {
    throw new Error(`NewsAPI key is not configured for ${sourceName}`);
  }

  const normalizedUrl = feedUrl.replace("newsapi://", "https://");
  const url = new URL(normalizedUrl);
  url.searchParams.set("pageSize", url.searchParams.get("pageSize") ?? "15");
  url.searchParams.set("language", url.searchParams.get("language") ?? "en");

  const response = await requestFeed(url.toString(), {
    sourceName,
    headers: {
      "X-Api-Key": env.newsApiKey,
      "User-Agent": "Daily-Intelligence-Aggregator/1.0",
    },
  });

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

async function requestFeed(url: string, options: FeedRequestOptions) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FEED_TIMEOUT_MS;
  const retryCount = options.retryCount ?? DEFAULT_FEED_RETRY_COUNT;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          next: { revalidate: 900 },
          headers: options.headers,
        },
        timeoutMs,
      );

      if (!response.ok) {
        const error = new Error(
          `Feed request failed for ${options.sourceName} with status ${response.status}`,
        );

        if (attempt < retryCount && isRetryableStatus(response.status)) {
          lastError = error;
          continue;
        }

        throw error;
      }

      return response;
    } catch (error) {
      const normalized = normalizeFeedRequestError(error, options.sourceName, timeoutMs);
      lastError = normalized;

      if (attempt < retryCount && isRetryableFetchError(error)) {
        continue;
      }

      throw normalized;
    }
  }

  throw lastError ?? new Error(`Feed request failed for ${options.sourceName}`);
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

function normalizeFeedRequestError(error: unknown, sourceName: string, timeoutMs: number) {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error(`Feed request timed out for ${sourceName} after ${timeoutMs}ms`);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(`Feed request failed for ${sourceName}: ${String(error)}`);
}
