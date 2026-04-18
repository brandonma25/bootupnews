import type { Source } from "@/lib/types";
import {
  getDefaultDonorFeeds,
  getDonorRegistrySnapshot,
  getIngestionAdapter,
  type DonorFeed,
} from "@/adapters/donors";
import type { RawItem } from "@/lib/models/raw-item";
import { logPipelineEvent } from "@/lib/observability/logger";
import { fetchFeedArticles } from "@/lib/rss";
import { cleanText, stableId } from "@/lib/pipeline/shared/text";

import { seedRawItems } from "./seed-items";

type IngestionFailure = {
  source: string;
  feedUrl: string;
  error: string;
};

type IngestionResult = {
  items: RawItem[];
  failures: IngestionFailure[];
  usedSeedFallback: boolean;
  feeds: DonorFeed[];
};

function feedsFromSources(sources?: Source[]): DonorFeed[] {
  if (!sources?.length) {
    return getDefaultDonorFeeds();
  }

  return sources
    .filter((source) => source.status === "active")
    .slice(0, 5)
    .map((source) => ({
      donor: "openclaw",
      source: source.name,
      feedUrl: source.feedUrl,
      homepageUrl: source.homepageUrl ?? source.feedUrl,
      topic: source.topicName === "Finance" ? "Finance" : source.topicName === "World" ? "World" : "Tech",
      credibility: source.topicName === "Finance" ? 80 : 76,
      reliability: source.topicName === "Finance" ? 0.8 : 0.76,
      sourceClass: source.topicName === "Finance" ? "business_press" : "specialist_press",
    }));
}

async function fetchFeedWithStageRetry(feed: DonorFeed) {
  const adapter = getIngestionAdapter(feed.donor);

  if (!adapter) {
    throw new Error(`No ingestion adapter registered for donor ${feed.donor}`);
  }

  const items = await adapter.fetchItems([feed], {
    fetchFeed: fetchFeedArticles,
    timeoutMs: 4_500,
    retryCount: 1,
  });

  return items.map((entry) => entry.article);
}

export async function ingestRawItems(options: { sources?: Source[] } = {}): Promise<IngestionResult> {
  const feeds = feedsFromSources(options.sources);
  const donorSnapshot = getDonorRegistrySnapshot();
  const failures: IngestionFailure[] = [];

  logPipelineEvent("info", "Ingestion adapters resolved", {
    donor_registry: donorSnapshot,
    active_feed_sources: feeds.map((feed) => ({
      donor: feed.donor,
      source: feed.source,
      sourceClass: feed.sourceClass,
      topic: feed.topic,
    })),
  });

  const batches = await Promise.all(
    feeds.map(async (feed) => {
      try {
        const articles = await fetchFeedWithStageRetry(feed);
        return articles.slice(0, 6).map<RawItem>((article) => ({
          id: stableId(feed.source, article.url, article.publishedAt),
          source: article.sourceName || feed.source,
          title: cleanText(article.title),
          url: article.url,
          published_at: article.publishedAt,
          raw_content: cleanText(article.contentText ?? article.summaryText),
        }));
      } catch (error) {
        const failure = {
          source: feed.source,
          feedUrl: feed.feedUrl,
          error: error instanceof Error ? error.message : String(error),
        };
        failures.push(failure);
        logPipelineEvent("warn", "Feed ingestion failed", failure);
        return [];
      }
    }),
  );

  const items = batches.flat();
  if (items.length > 0) {
    return {
      items,
      failures,
      usedSeedFallback: false,
      feeds,
    };
  }

  logPipelineEvent("warn", "All live feed requests failed, using deterministic seed fallback", {
    failureCount: failures.length,
  });

  return {
    items: seedRawItems,
    failures,
    usedSeedFallback: true,
    feeds,
  };
}
