import Parser from "rss-parser";

import { stripHtml } from "@/lib/utils";

export type FeedArticle = {
  title: string;
  url: string;
  summaryText: string;
  sourceName: string;
  publishedAt: string;
};

const parser = new Parser();

export async function fetchFeedArticles(feedUrl: string, sourceName: string) {
  const response = await fetch(feedUrl, {
    next: { revalidate: 0 },
    headers: {
      "User-Agent": "Daily-Intelligence-Aggregator/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed for ${sourceName}`);
  }

  const xml = await response.text();
  const feed = await parser.parseString(xml);

  return (feed.items ?? []).slice(0, 15).map<FeedArticle>((item, index) => ({
    title: item.title?.trim() || `Untitled article ${index + 1}`,
    url: item.link?.trim() || feedUrl,
    summaryText: stripHtml(
      item.contentSnippet ?? item.content ?? item.summary ?? item.title ?? "",
    ),
    sourceName,
    publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
  }));
}

export function clusterArticles(
  articles: FeedArticle[],
): Array<{ representative: FeedArticle; sources: FeedArticle[] }> {
  const clusters: Array<{ representative: FeedArticle; sources: FeedArticle[] }> = [];

  for (const article of articles) {
    const normalized = normalize(article.title);
    const match = clusters.find((cluster) => similarity(normalized, normalize(cluster.representative.title)) >= 0.55);

    if (match) {
      match.sources.push(article);
    } else {
      clusters.push({ representative: article, sources: [article] });
    }
  }

  return clusters;
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
