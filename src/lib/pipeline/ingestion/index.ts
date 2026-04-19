import type { Source } from "@/lib/types";
import {
  getActiveSourceRegistry,
  getDefaultDonorFeeds,
  getIngestionAdapter,
  getProbationaryRuntimeFeeds,
  type DonorFeed,
} from "@/adapters/donors";
import type { SourceDefinition } from "@/lib/integration/subsystem-contracts";
import type { RawItem } from "@/lib/models/raw-item";
import { logPipelineEvent } from "@/lib/observability/logger";
import {
  buildRuntimeSourceResolutionSnapshot,
  type RuntimeSourceResolutionSnapshot,
} from "@/lib/observability/pipeline-run";
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
  sources: SourceDefinition[];
  source_resolution: RuntimeSourceResolutionSnapshot;
  source_contributions: Array<{
    source_id: string;
    source: string;
    donor: string;
    source_class: string;
    trust_tier: string;
    item_count: number;
  }>;
};

function buildCustomSourceDefinition(source: Source): SourceDefinition {
  return {
    sourceId: `custom-${source.id}`,
    donor: "openclaw",
    source: source.name,
    homepageUrl: source.homepageUrl ?? source.feedUrl,
    topic: source.topicName === "Finance" ? "Finance" : source.topicName === "World" ? "World" : "Tech",
    credibility: source.topicName === "Finance" ? 80 : 76,
    reliability: source.topicName === "Finance" ? 0.8 : 0.76,
    sourceClass: source.topicName === "Finance" ? "business_press" : "specialist_press",
    trustTier: source.topicName === "Finance" ? "tier_2" : "tier_2",
    provenance: "specialist_analysis",
    status: source.status === "active" ? "active" : "inactive",
    availability: "custom",
    fetch: {
      feedUrl: source.feedUrl,
      timeoutMs: 4500,
      retryCount: 1,
      maxItems: 6,
    },
    adapterOwner: "openclaw",
  };
}

function resolveIngestionSources(sources?: Source[]): SourceDefinition[] {
  if (!sources?.length) {
    const sourceRegistryById = new Map(getActiveSourceRegistry().map((source) => [source.sourceId, source]));

    return [
      ...getDefaultDonorFeeds().map((feed) => {
        const source = sourceRegistryById.get(feed.id);

        if (!source) {
          throw new Error(`Default donor feed ${feed.id} is not present in the active source registry`);
        }

        return source;
      }),
      ...getProbationaryRuntimeFeeds().map((feed) => {
        const source = sourceRegistryById.get(feed.id);

        if (!source) {
          throw new Error(`Probationary runtime feed ${feed.id} is not present in the active source registry`);
        }

        return source;
      }),
    ];
  }

  return sources
    .filter((source) => source.status === "active")
    .slice(0, 5)
    .map(buildCustomSourceDefinition);
}

async function fetchSourceWithAdapter(source: SourceDefinition) {
  const adapter = getIngestionAdapter(source.donor as DonorFeed["donor"]);

  if (!adapter) {
    throw new Error(`No ingestion adapter registered for donor ${source.donor}`);
  }

  const items = await adapter.fetchItems([{
    id: source.sourceId,
    donor: source.donor as DonorFeed["donor"],
    source: source.source,
    homepageUrl: source.homepageUrl,
    topic: source.topic,
    credibility: source.credibility,
    reliability: source.reliability,
    sourceClass: source.sourceClass,
    trustTier: source.trustTier,
    provenance: source.provenance,
    status: source.status,
    availability: source.availability,
    fetch: source.fetch,
  }], {
    fetchFeed: fetchFeedArticles,
    timeoutMs: source.fetch.timeoutMs ?? 4_500,
    retryCount: source.fetch.retryCount ?? 1,
  });

  return items;
}

function toRawItem(entry: Awaited<ReturnType<typeof fetchSourceWithAdapter>>[number]): RawItem {
  return {
    id: stableId(entry.sourceDefinition.source, entry.article.url, entry.article.publishedAt),
    source: entry.article.sourceName || entry.sourceDefinition.source,
    title: cleanText(entry.article.title),
    url: entry.article.url,
    published_at: entry.article.publishedAt,
    raw_content: cleanText(entry.article.contentText ?? entry.article.summaryText),
    source_metadata: entry.sourceMetadata,
  };
}

export async function ingestRawItems(options: { sources?: Source[] } = {}): Promise<IngestionResult> {
  const sources = resolveIngestionSources(options.sources);
  const sourceResolution = buildRuntimeSourceResolutionSnapshot({
    resolutionMode: options.sources?.length ? "supplied_sources" : "no_argument_runtime",
    resolvedSources: sources,
  });
  const failures: IngestionFailure[] = [];

  logPipelineEvent("info", "Runtime source resolution snapshot", sourceResolution);

  const batches = await Promise.all(
    sources.map(async (source) => {
      try {
        const items = await fetchSourceWithAdapter(source);
        const maxItems = source.fetch.maxItems ?? 6;
        return items.slice(0, maxItems).map(toRawItem);
      } catch (error) {
        const failure = {
          source: source.source,
          feedUrl: source.fetch.feedUrl,
          error: error instanceof Error ? error.message : String(error),
        };
        failures.push(failure);
        logPipelineEvent("warn", "Feed ingestion failed", failure);
        return [];
      }
    }),
  );

  const items = batches.flat();
  const sourceContributions = sources.map((source) => ({
    source_id: source.sourceId,
    source: source.source,
    donor: source.donor,
    source_class: source.sourceClass,
    trust_tier: source.trustTier,
    item_count: items.filter((item) => item.source_metadata?.sourceId === source.sourceId).length,
  }));

  logPipelineEvent("info", "Ingestion source contribution summary", {
    source_contributions: sourceContributions,
    used_seed_fallback: items.length === 0,
  });

  if (items.length > 0) {
    return {
      items,
      failures,
      usedSeedFallback: false,
      sources,
      source_resolution: sourceResolution,
      source_contributions: sourceContributions,
    };
  }

  logPipelineEvent("warn", "All live feed requests failed, using deterministic seed fallback", {
    failureCount: failures.length,
  });

  return {
    items: seedRawItems,
    failures,
    usedSeedFallback: true,
    sources,
    source_resolution: sourceResolution,
    source_contributions: sourceContributions,
  };
}
