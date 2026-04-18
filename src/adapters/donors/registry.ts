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
  ClusterCandidate,
  ClusteringSupport,
  DiversitySupport,
  DiversityAdjustment,
  EnrichmentSupport,
  IngestionAdapter,
  MergeDecisionSupport,
  RankingFeatureSet,
  RankingFeatureProvider,
  RepresentativeSelectionSupport,
  SimilaritySignals,
  SourceDefinition,
} from "@/lib/integration/subsystem-contracts";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import type { NormalizedArticle } from "@/lib/models/normalized-article";
import {
  computeTimeProximityScore,
  extractKeywords,
  jaccardSimilarity,
  keywordSpecificity,
  normalizeEntity,
  overlapSimilarity,
  tokenize,
} from "@/lib/pipeline/shared/text";

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

function compareTokenSets(left: string[], right: string[]) {
  return Math.max(jaccardSimilarity(left, right), overlapSimilarity(left, right));
}

function countOverlap(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((token) => rightSet.has(token)).length;
}

function buildClusterCandidate(article: NormalizedArticle): ClusterCandidate {
  const titleTokens = article.title_tokens.length ? article.title_tokens : tokenize(article.title);
  const contentTokens = article.content_tokens.length ? article.content_tokens : tokenize(article.content);
  const keywords = article.keywords.length
    ? article.keywords
    : extractKeywords(`${article.title} ${article.content}`, 10);
  const specificKeywords = keywordSpecificity(keywords);
  const normalizedEntities = article.normalized_entities.length
    ? article.normalized_entities
    : article.entities.map(normalizeEntity).filter(Boolean);
  const entityTokens = normalizedEntities.flatMap((entity) => entity.split(/\s+/));
  const eventTerms = specificKeywords.filter((keyword) => !entityTokens.includes(keyword)).slice(0, 6);

  return {
    article,
    title_tokens: titleTokens,
    content_tokens: contentTokens,
    keywords,
    specific_keywords: specificKeywords,
    normalized_entities: normalizedEntities,
    event_terms: eventTerms,
    published_at_ms: new Date(article.published_at).getTime(),
  };
}

function buildClusterKeywords(candidates: ClusterCandidate[]) {
  return extractKeywords(
    candidates
      .map((candidate) => `${candidate.article.title} ${candidate.article.content}`)
      .join(" "),
    10,
  );
}

function buildClusterEntities(candidates: ClusterCandidate[]) {
  return [...new Set(candidates.flatMap((candidate) => candidate.normalized_entities))];
}

function buildClusterEventTerms(candidates: ClusterCandidate[]) {
  return [...new Set(candidates.flatMap((candidate) => candidate.event_terms))];
}

function buildClusterContentTokens(candidates: ClusterCandidate[]) {
  return [...new Set(candidates.flatMap((candidate) => candidate.content_tokens).slice(0, 40))];
}

function getRepresentativeSupport(candidates: ClusterCandidate[]): RepresentativeSelectionSupport {
  const newestTimestamp = Math.max(...candidates.map((candidate) => candidate.published_at_ms));
  const scores = candidates
    .map((candidate) => {
      const averageSimilarity =
        candidates.length === 1
          ? 1
          : candidates
              .filter((entry) => entry.article.id !== candidate.article.id)
              .reduce((sum, entry) => {
                const titleSimilarity = jaccardSimilarity(candidate.title_tokens, entry.title_tokens);
                const keywordSimilarity = jaccardSimilarity(candidate.keywords, entry.keywords);
                const entitySimilarity = jaccardSimilarity(candidate.normalized_entities, entry.normalized_entities);

                return sum + 0.45 * titleSimilarity + 0.35 * keywordSimilarity + 0.2 * entitySimilarity;
              }, 0) / Math.max(1, candidates.length - 1);

      const recencyScore =
        newestTimestamp === candidate.published_at_ms
          ? 1
          : computeTimeProximityScore(candidate.published_at_ms, newestTimestamp);
      const specificityBonus = Math.min(1, candidate.specific_keywords.length / 6);
      const score = Number((0.6 * averageSimilarity + 0.25 * specificityBonus + 0.15 * recencyScore).toFixed(3));

      return {
        article_id: candidate.article.id,
        score,
        reasons: [
          `avg similarity ${averageSimilarity.toFixed(2)}`,
          `specific keywords ${candidate.specific_keywords.length}`,
          `recency ${recencyScore.toFixed(2)}`,
        ],
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.article_id.localeCompare(right.article_id);
    });

  const representativeArticle = candidates.find((candidate) => candidate.article.id === scores[0]?.article_id)?.article
    ?? candidates[0]?.article;

  return {
    representativeArticle,
    scores,
    reason:
      scores[0]
        ? `Selected article ${scores[0].article_id} with score ${scores[0].score.toFixed(2)} (${scores[0].reasons.join(", ")}).`
        : "Selected the only article in the cluster.",
  };
}

function computeSimilaritySignals(candidate: ClusterCandidate, clusterCandidates: ClusterCandidate[]): SimilaritySignals {
  const clusterKeywords = buildClusterKeywords(clusterCandidates);
  const clusterSpecificKeywords = keywordSpecificity(clusterKeywords);
  const clusterEntities = buildClusterEntities(clusterCandidates);
  const clusterContentTokens = buildClusterContentTokens(clusterCandidates);
  const representative = getRepresentativeSupport(clusterCandidates).representativeArticle;
  const representativeCandidate = buildClusterCandidate(representative);
  const titleOverlap = compareTokenSets(candidate.title_tokens, representativeCandidate.title_tokens);
  const keywordOverlap = Math.max(
    compareTokenSets(candidate.keywords, clusterKeywords),
    compareTokenSets(candidate.specific_keywords, clusterSpecificKeywords),
  );
  const entityOverlap = compareTokenSets(candidate.normalized_entities, clusterEntities);
  const contentSimilarity = compareTokenSets(
    candidate.content_tokens.slice(0, 30),
    clusterContentTokens.slice(0, 30),
  );
  const timeProximity = computeTimeProximityScore(candidate.published_at_ms, representativeCandidate.published_at_ms);
  const sourceBreadth = Math.min(1, new Set(clusterCandidates.map((entry) => entry.article.source)).size / 4);
  const weightedScore = Number(
    (
      0.31 * titleOverlap +
      0.25 * keywordOverlap +
      0.15 * entityOverlap +
      0.14 * contentSimilarity +
      0.1 * timeProximity +
      0.05 * sourceBreadth
    ).toFixed(3),
  );

  return {
    title_overlap: Number(titleOverlap.toFixed(3)),
    keyword_overlap: Number(keywordOverlap.toFixed(3)),
    entity_overlap: Number(entityOverlap.toFixed(3)),
    content_similarity: Number(contentSimilarity.toFixed(3)),
    time_proximity: Number(timeProximity.toFixed(3)),
    source_confirmation: Number(sourceBreadth.toFixed(3)),
    weighted_score: weightedScore,
  };
}

function supportMergeDecision(candidate: ClusterCandidate, clusterCandidates: ClusterCandidate[]): MergeDecisionSupport {
  const similaritySignals = computeSimilaritySignals(candidate, clusterCandidates);
  const representative = getRepresentativeSupport(clusterCandidates).representativeArticle;
  const clusterKeywords = buildClusterKeywords(clusterCandidates);
  const clusterSpecificKeywords = keywordSpecificity(clusterKeywords);
  const clusterEntities = buildClusterEntities(clusterCandidates);
  const sharedSpecificKeywords = countOverlap(candidate.specific_keywords, clusterSpecificKeywords);
  const sharedEntities = countOverlap(candidate.normalized_entities, clusterEntities);
  const sharedEventTerms = countOverlap(candidate.event_terms, buildClusterEventTerms(clusterCandidates));
  const reasons: string[] = [];

  if (similaritySignals.weighted_score < 0.32) {
    reasons.push("weighted similarity below 0.32");
  }

  if (similaritySignals.title_overlap < 0.18 && similaritySignals.keyword_overlap < 0.28) {
    reasons.push("title and keyword overlap are both weak");
  }

  if (
    clusterEntities.length > 0 &&
    candidate.normalized_entities.length > 0 &&
    sharedEntities === 0 &&
    sharedSpecificKeywords < 2 &&
    similaritySignals.title_overlap < 0.52
  ) {
    reasons.push("entity mismatch against existing cluster");
  }

  if (sharedSpecificKeywords === 0 && similaritySignals.title_overlap < 0.58 && similaritySignals.content_similarity < 0.35) {
    reasons.push("overlap is too generic and not event-specific");
  }

  if (sharedEntities > 0 && sharedEventTerms === 0 && similaritySignals.keyword_overlap < 0.45 && similaritySignals.title_overlap < 0.62) {
    reasons.push("same entity but different event signature");
  }

  if (similaritySignals.time_proximity < 0.2 && similaritySignals.title_overlap < 0.65 && similaritySignals.keyword_overlap < 0.5) {
    reasons.push("stories are too far apart in time for a confident merge");
  }

  return {
    canMerge: reasons.length === 0,
    reasons: reasons.length
      ? reasons
      : [
          `weighted similarity ${similaritySignals.weighted_score.toFixed(2)}`,
          `specific keyword overlap ${sharedSpecificKeywords}`,
          `entity overlap ${sharedEntities}`,
        ],
    similaritySignals,
    representativeArticleId: representative.id,
  };
}

const afterMarketAgentClusteringSupport: ClusteringSupport = {
  prepareClusterCandidates(articles) {
    return articles.map(buildClusterCandidate);
  },
  buildCandidateFingerprint(candidate) {
    return [...new Set(buildFingerprint(candidate.article))];
  },
  computeSimilaritySignals(candidate, clusterCandidates) {
    return computeSimilaritySignals(candidate, clusterCandidates);
  },
  supportMergeDecision(candidate, clusterCandidates) {
    return supportMergeDecision(candidate, clusterCandidates);
  },
  selectRepresentativeArticle(clusterCandidates) {
    return getRepresentativeSupport(clusterCandidates);
  },
  describeCapabilities() {
    return {
      provider: "after_market_agent",
      similaritySignals: [
        "title_overlap",
        "keyword_overlap",
        "entity_overlap",
        "content_similarity",
        "time_proximity",
        "source_confirmation",
        "weighted_score",
      ],
      representativeSelection:
        "centrality-weighted representative selection with recency and specificity tie-breaks",
      diversitySupportAvailable: true,
    };
  },
};

const fnsDiversitySupport: DiversitySupport = {
  available: true,
  describeRole() {
    return "Active post-cluster diversity support can penalize overcrowded near-duplicate ranked outputs after canonical scoring.";
  },
  evaluateDiversityAdjustment(rankedClusters) {
    const seenFingerprints: Array<{ clusterId: string; fingerprint: Set<string> }> = [];

    return rankedClusters.map((entry) => {
      const fingerprint = new Set([
        ...entry.cluster.topic_keywords.slice(0, 4),
        ...entry.cluster.representative_article.normalized_entities.slice(0, 2),
      ]);

      const collision = seenFingerprints.find((seen) => {
        const overlap = [...fingerprint].filter((token) => seen.fingerprint.has(token)).length;
        const union = new Set([...fingerprint, ...seen.fingerprint]).size || 1;
        return overlap / union >= 0.45;
      });

      seenFingerprints.push({ clusterId: entry.cluster.cluster_id, fingerprint });

      if (!collision) {
        return {
          cluster_id: entry.cluster.cluster_id,
          action: "none",
          scoreDelta: 0,
          reason: "No diversity penalty applied.",
        } satisfies DiversityAdjustment;
      }

      return {
        cluster_id: entry.cluster.cluster_id,
        action: "penalize",
        scoreDelta: entry.baseScore > 82 ? -4.5 : -6,
        reason: "Penalized because a higher-ranked cluster already covers a similar event family.",
        relatedClusterId: collision.clusterId,
      } satisfies DiversityAdjustment;
    });
  },
};

function createRankingFeatureProvider(feeds: DonorFeed[], donor: DonorId): RankingFeatureProvider {
  const knownSources = feeds.map(normalizeFeedMetadata);
  const sourceIndex = new Map(knownSources.map((source) => [source.source.toLowerCase(), source]));

  return {
    describeFeatureSupport() {
      return {
        provider: donor,
        supportedFeatures: [
          "source_credibility",
          "trust_tier",
          "source_confirmation",
          "representative_quality",
          "reinforcement",
        ] satisfies Array<keyof RankingFeatureSet>,
        trustSignals: ["source metadata", "trust tier", "source diversity"],
      };
    },
    getKnownSources() {
      return knownSources;
    },
    mapClusterToRankingFeatures(cluster: SignalCluster) {
      const matches = cluster.articles
        .map((article) => sourceIndex.get(article.source.toLowerCase()))
        .filter((entry): entry is CanonicalSourceMetadata => Boolean(entry));
      const trustTier =
        matches.length === 0
          ? 68
          : matches.reduce((sum, entry) => {
              if (entry.trustTier === "tier_1") return sum + 92;
              if (entry.trustTier === "tier_2") return sum + 78;
              return sum + 64;
            }, 0) / matches.length;
      const sourceConfirmation = Math.min(100, new Set(cluster.articles.map((article) => article.source)).size * 24);
      const representativeQuality = Math.min(
        100,
        58 + cluster.representative_article.keywords.length * 4 + cluster.representative_article.entities.length * 5,
      );
      const reinforcement = Math.min(
        100,
        32 + cluster.cluster_size * 18 + new Set(cluster.articles.map((article) => article.source)).size * 10,
      );

      return {
        source_credibility: matches.length
          ? Number((matches.reduce((sum, entry) => sum + entry.credibility, 0) / matches.length).toFixed(2))
          : undefined,
        trust_tier: Number(trustTier.toFixed(2)),
        source_confirmation: Number(sourceConfirmation.toFixed(2)),
        representative_quality: Number(representativeQuality.toFixed(2)),
        reinforcement: Number(reinforcement.toFixed(2)),
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
    diversitySupport: fnsDiversitySupport,
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
    clusteringCapabilities: entry.clusteringSupport?.describeCapabilities(),
    rankingFeatureSupport: entry.rankingFeatureProvider?.describeFeatureSupport(),
    diversitySupportAvailable: entry.diversitySupport?.available ?? false,
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

export function getDiversitySupports() {
  return donorRegistry
    .filter((entry) => entry.diversitySupport)
    .map((entry) => ({
      donor: entry.donor,
      support: entry.diversitySupport as DiversitySupport,
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
