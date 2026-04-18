import { afterMarketAgentDefinition } from "@/adapters/donors/after_market_agent";
import { fnsDefinition } from "@/adapters/donors/fns";
import { horizonDefinition } from "@/adapters/donors/horizon";
import { openclawDefinition } from "@/adapters/donors/openclaw";
import type {
  DonorFeed,
  DonorId,
  DonorModule,
} from "@/adapters/donors/types";
import type {
  CanonicalSourceMetadata,
  ClusteringSupport,
  EnrichmentSupport,
  IngestionAdapter,
  RankingFeatureProvider,
} from "@/lib/integration/subsystem-contracts";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import type { NormalizedArticle } from "@/lib/models/normalized-article";

function normalizeFeedMetadata(feed: DonorFeed): CanonicalSourceMetadata {
  return {
    donor: feed.donor,
    source: feed.source,
    homepageUrl: feed.homepageUrl,
    topic: feed.topic,
    credibility: feed.credibility,
    reliability: feed.reliability,
    sourceClass: feed.sourceClass,
  };
}

function createRssIngestionAdapter(donor: DonorId): IngestionAdapter<DonorFeed> {
  return {
    normalizeSourceMetadata(feed) {
      return normalizeFeedMetadata(feed);
    },
    async fetchItems(feeds, context) {
      const batches = await Promise.all(
        feeds.map(async (feed) => {
          const articles = await context.fetchFeed(feed.feedUrl, feed.source, {
            timeoutMs: context.timeoutMs,
            retryCount: context.retryCount,
          });

          return articles.map((article) => ({
            donor,
            feedUrl: feed.feedUrl,
            sourceMetadata: normalizeFeedMetadata(feed),
            article,
          }));
        }),
      );

      return batches.flat();
    },
  };
}

function buildFingerprint(article: NormalizedArticle) {
  return [
    ...article.normalized_entities.slice(0, 2),
    ...article.keywords.slice(0, 4),
    ...article.title_tokens.slice(0, 4),
  ];
}

const afterMarketAgentClusteringSupport: ClusteringSupport = {
  describeSimilarityStrategy() {
    return [
      "weighted title, keyword, entity, content, and time-proximity comparison",
      "anti-merge guardrails before any cluster union",
      "representative article chosen by centrality plus recency tie-breaks",
    ];
  },
  buildCandidateFingerprint(article) {
    return [...new Set(buildFingerprint(article))];
  },
  describeRepresentativeStrategy(cluster) {
    const representative = cluster.representative_article;
    return `Prefer the article that best overlaps with other cluster members, then break ties by recency (${representative.id}).`;
  },
};

function createRankingFeatureProvider(feeds: DonorFeed[], donor: DonorId): RankingFeatureProvider {
  const knownSources = feeds.map(normalizeFeedMetadata);
  const sourceIndex = new Map(knownSources.map((source) => [source.source.toLowerCase(), source]));

  return {
    getKnownSources() {
      return knownSources;
    },
    mapClusterFeatures(cluster: SignalCluster) {
      const matches = cluster.articles
        .map((article) => sourceIndex.get(article.source.toLowerCase()))
        .filter((entry): entry is CanonicalSourceMetadata => Boolean(entry));

      return {
        credibilityWeights: matches.map((entry) => entry.credibility),
        sourceClasses: [...new Set(matches.map((entry) => entry.sourceClass))],
        notes: matches.length
          ? [
              `${donor} matched ${matches.length} canonical source metadata entries.`,
              `Source classes: ${[...new Set(matches.map((entry) => entry.sourceClass))].join(", ")}`,
            ]
          : [`${donor} found no canonical source metadata matches for this cluster.`],
      };
    },
  };
}

const horizonEnrichmentSupport: EnrichmentSupport = {
  enabled: false,
  prepareEnrichmentPacket(cluster) {
    return {
      clusterId: cluster.cluster_id,
      title: cluster.representative_article.title,
      summary: cluster.representative_article.content.slice(0, 220),
      sourceCount: cluster.cluster_size,
    };
  },
};

const donorRegistry: DonorModule[] = [
  {
    ...openclawDefinition,
    ingestionAdapter: createRssIngestionAdapter("openclaw"),
  },
  {
    ...afterMarketAgentDefinition,
    ingestionAdapter: createRssIngestionAdapter("after_market_agent"),
    clusteringSupport: afterMarketAgentClusteringSupport,
  },
  {
    ...fnsDefinition,
    ingestionAdapter: createRssIngestionAdapter("fns"),
    rankingFeatureProvider: createRankingFeatureProvider(fnsDefinition.feeds, "fns"),
  },
  {
    ...horizonDefinition,
    ingestionAdapter: createRssIngestionAdapter("horizon"),
    enrichmentSupport: horizonEnrichmentSupport,
  },
];

export function getDonorRegistry() {
  return donorRegistry;
}

export function getDonorRegistrySnapshot() {
  return donorRegistry.map((entry) => ({
    donor: entry.donor,
    displayName: entry.displayName,
    summary: entry.summary,
    transformationBoundary: entry.transformationBoundary,
    contractStates: entry.contractStates,
    feedCount: entry.feeds.length,
  }));
}

export function getDonorModule(donor: DonorId) {
  return donorRegistry.find((entry) => entry.donor === donor);
}

export function getDefaultDonorFeeds(): DonorFeed[] {
  return donorRegistry
    .filter((entry) => entry.contractStates.ingestion === "active")
    .flatMap((entry) => entry.feeds)
    .slice(0, 5);
}

export function getIngestionAdapter(donor: DonorId) {
  return getDonorModule(donor)?.ingestionAdapter;
}

export function getClusteringSupportAdapters() {
  return donorRegistry
    .filter((entry) => entry.contractStates.clustering === "active" && entry.clusteringSupport)
    .map((entry) => ({
      donor: entry.donor,
      support: entry.clusteringSupport as ClusteringSupport,
    }));
}

export function getRankingFeatureProviders() {
  return donorRegistry
    .filter((entry) => entry.contractStates.ranking === "active" && entry.rankingFeatureProvider)
    .map((entry) => ({
      donor: entry.donor,
      provider: entry.rankingFeatureProvider as RankingFeatureProvider,
    }));
}

export function getEnrichmentSupports() {
  return donorRegistry
    .filter((entry) => entry.enrichmentSupport)
    .map((entry) => ({
      donor: entry.donor,
      support: entry.enrichmentSupport as EnrichmentSupport,
    }));
}

export function getCanonicalSourceMetadata() {
  return donorRegistry.flatMap((entry) =>
    entry.feeds.map((feed) => entry.ingestionAdapter.normalizeSourceMetadata(feed)),
  );
}
