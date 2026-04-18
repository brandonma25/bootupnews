import { afterMarketAgentDefinition } from "@/adapters/donors/after_market_agent";
import { fnsDefinition } from "@/adapters/donors/fns";
import { horizonDefinition } from "@/adapters/donors/horizon";
import { openclawDefinition } from "@/adapters/donors/openclaw";
import type {
  DonorFeed,
  DonorId,
  DonorModule,
  SourceRegistryEntry,
} from "@/adapters/donors/types";
import type {
  CanonicalSourceMetadata,
  ClusteringSupport,
  EnrichmentSupport,
  IngestionAdapter,
  RankingFeatureProvider,
  SourceDefinition,
} from "@/lib/integration/subsystem-contracts";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import type { NormalizedArticle } from "@/lib/models/normalized-article";

function normalizeFeedMetadata(feed: DonorFeed): CanonicalSourceMetadata {
  return {
    sourceId: feed.id,
    donor: feed.donor,
    source: feed.source,
    homepageUrl: feed.homepageUrl,
    topic: feed.topic,
    credibility: feed.credibility,
    reliability: feed.reliability,
    sourceClass: feed.sourceClass,
    trustTier: feed.trustTier,
    provenance: feed.provenance,
    status: feed.status,
    availability: feed.availability,
  };
}

function buildSourceDefinition(feed: DonorFeed): SourceDefinition {
  return {
    ...normalizeFeedMetadata(feed),
    fetch: feed.fetch,
    adapterOwner: feed.donor,
  };
}

function createRssIngestionAdapter(donor: DonorId): IngestionAdapter<DonorFeed> {
  return {
    describeCapabilities() {
      return {
        supportedSourceClasses: donor === "horizon"
          ? ["global_wire", "business_press", "general_newswire"]
          : donor === "openclaw"
            ? ["specialist_press", "business_press"]
            : ["general_newswire", "business_press", "global_wire", "specialist_press"],
        supportsRetry: true,
        supportsSourceContext: donor === "horizon" || donor === "openclaw",
      };
    },
    normalizeSourceMetadata(source) {
      return normalizeFeedMetadata(source);
    },
    async fetchItems(sources, context) {
      const batches = await Promise.all(
        sources.map(async (source) => {
          const articles = await context.fetchFeed(source.fetch.feedUrl, source.source, {
            timeoutMs: source.fetch.timeoutMs ?? context.timeoutMs,
            retryCount: source.fetch.retryCount ?? context.retryCount,
          });

          return articles.map((article) => ({
            donor,
            sourceId: source.id,
            sourceDefinition: buildSourceDefinition(source),
            sourceMetadata: normalizeFeedMetadata(source),
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
    ingestionCapabilities: entry.ingestionAdapter.describeCapabilities(),
  }));
}

export function getDonorModule(donor: DonorId) {
  return donorRegistry.find((entry) => entry.donor === donor);
}

export function getDefaultDonorFeeds(): DonorFeed[] {
  return donorRegistry
    .filter((entry) => entry.contractStates.ingestion === "active")
    .flatMap((entry) => entry.feeds)
    .filter((source) => source.status === "active" && source.availability !== "custom")
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

export function getSourceRegistry(): SourceRegistryEntry[] {
  return donorRegistry.flatMap((entry) => entry.feeds.map(buildSourceDefinition));
}

export function getActiveSourceRegistry(): SourceRegistryEntry[] {
  return getSourceRegistry().filter((source) => source.status === "active");
}

export function getSourceRegistrySnapshot() {
  return getSourceRegistry().map((source) => ({
    sourceId: source.sourceId,
    source: source.source,
    donor: source.donor,
    adapterOwner: source.adapterOwner,
    sourceClass: source.sourceClass,
    trustTier: source.trustTier,
    provenance: source.provenance,
    status: source.status,
    availability: source.availability,
    feedUrl: source.fetch.feedUrl,
  }));
}

export function getSourceDefinition(sourceId: string) {
  return getSourceRegistry().find((source) => source.sourceId === sourceId);
}
