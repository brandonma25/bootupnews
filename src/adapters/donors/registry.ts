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
  ConnectionEvidenceInput,
  ConnectionLayerPacket,
  ConnectionSupport,
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
import type { StoryCluster } from "@/lib/models/signal-cluster";
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
    sourceRole: feed.sourceRole,
    publicEligible: feed.publicEligible,
    suppliedByManifest: feed.suppliedByManifest,
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
            feedId: source.id,
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

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildConnectionFallback(input: ConnectionEvidenceInput): ConnectionLayerPacket {
  return {
    what_led_to_this: "Too early to say with confidence what set this up beyond the immediate report.",
    what_it_connects_to:
      input.signalRole === "watch"
        ? "For now, it reads as a narrow update rather than a broader system signal."
        : "The current reporting suggests some broader relevance, but the system-level link is still tentative.",
    connection_confidence: "low",
    connection_mode: "fallback",
    connection_evidence_summary:
      "Connection output stayed conservative because source support or system-level evidence was limited.",
    connection_unknowns: [
      "The reporting does not yet show a clear prior trigger.",
      "It is still unclear how far the effects extend beyond the immediate story.",
    ],
  };
}

function buildConnectionCorpus(input: ConnectionEvidenceInput) {
  return [
    input.title,
    input.summary,
    input.topicName,
    input.eventType,
    ...input.affectedMarkets,
    ...input.topics,
    ...input.entities,
    ...input.keywords,
  ]
    .join(" ")
    .toLowerCase();
}

function includesAny(corpus: string, terms: string[]) {
  return terms.some((term) => corpus.includes(term));
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

const afterMarketAgentConnectionSupport: ConnectionSupport = {
  describeCapabilities() {
    return {
      provider: "after_market_agent",
      bounded: true,
      deterministic_first: true,
      supportedFields: [
        "what_led_to_this",
        "what_it_connects_to",
        "connection_confidence",
        "connection_mode",
        "connection_evidence_summary",
        "connection_unknowns",
      ],
    };
  },
  buildConnectionLayer(input) {
    const corpus = buildConnectionCorpus(input);
    const structuralImpact = input.rankingFeatures?.structural_impact ?? 0;
    const downstreamConsequence = input.rankingFeatures?.downstream_consequence ?? 0;
    const crossDomainRelevance = input.rankingFeatures?.cross_domain_relevance ?? 0;
    const actionability = input.rankingFeatures?.actionability_or_decision_value ?? 0;
    const persistence = input.rankingFeatures?.persistence_or_endurance ?? 0;
    const weakEvidence =
      input.signalRole === "watch"
      || input.sourceCount <= 1
      || input.confidenceScore < 42
      || input.signalStrength === "weak";

    if (weakEvidence) {
      return {
        packet: buildConnectionFallback(input),
        debugNotes: [
          "Connection layer declined stronger inference because the signal was thin or weakly confirmed.",
        ],
        status: "fallback",
      };
    }

    let ledTo = "This appears tied to earlier pressure that had already been building around the same topic.";
    let connectsTo = "It connects to broader operating conditions beyond the immediate headline.";
    const evidenceSummaryParts: string[] = [];
    const unknowns: string[] = [];

    if (includesAny(corpus, ["fed", "federal reserve", "inflation", "rates", "central bank", "treasury", "yield"])) {
      ledTo = "This appears to follow earlier inflation, rate, and central-bank pressure that was already reshaping expectations.";
      connectsTo = "It connects to borrowing costs, market pricing, and corporate demand assumptions.";
      evidenceSummaryParts.push("macro and central-bank terms");
    } else if (includesAny(corpus, ["tariff", "trade", "export", "sanction", "strait", "hormuz", "military", "missile", "security", "border"])) {
      ledTo = "This appears to follow earlier trade friction, policy tightening, or geopolitical pressure rather than a one-off update.";
      connectsTo = "It connects to supply chains, policy risk, cross-border pricing, and security exposure.";
      evidenceSummaryParts.push("trade or geopolitical terms");
    } else if (includesAny(corpus, ["ai", "chip", "semiconductor", "cloud", "data center", "platform", "compute"])) {
      ledTo = "This appears tied to earlier AI demand, compute-capacity pressure, and platform competition.";
      connectsTo = "It connects to cloud spending, semiconductor capacity, enterprise deployment, and platform power.";
      evidenceSummaryParts.push("AI, platform, or infrastructure terms");
    } else if (includesAny(corpus, ["regulation", "policy", "regulatory", "congress", "sec", "doj", "white house", "executive order"])) {
      ledTo = "This appears to follow earlier regulatory or policy scrutiny that was already building.";
      connectsTo = "It connects to compliance costs, market structure, and business planning decisions.";
      evidenceSummaryParts.push("policy or regulatory terms");
    } else if (includesAny(corpus, ["earnings", "guidance", "layoff", "acquisition", "merger", "funding", "revenue"])) {
      ledTo = "This appears to follow earlier growth, capital-allocation, or competitive pressure inside the sector.";
      connectsTo = "It connects to hiring, pricing, investment, and broader sector sentiment.";
      evidenceSummaryParts.push("corporate pressure terms");
    } else if (input.affectedMarkets.length >= 2 || input.topics.length >= 2) {
      ledTo = "This appears to follow a broader shift that had already been showing up across adjacent coverage.";
      connectsTo = `It connects to ${[...input.affectedMarkets, ...input.topics].slice(0, 3).join(", ")} rather than a single narrow beat.`;
      evidenceSummaryParts.push("cross-topic spillover");
    } else {
      unknowns.push("The reporting shows a plausible connection pattern, but not a single clear prior trigger.");
    }

    if (structuralImpact >= 72 || downstreamConsequence >= 68) {
      evidenceSummaryParts.push("high structural-impact signals");
    }

    if (crossDomainRelevance >= 62) {
      evidenceSummaryParts.push("cross-domain relevance");
    }

    if (actionability >= 64 || persistence >= 66) {
      evidenceSummaryParts.push("decision-useful persistence");
    }

    const connectionConfidence: ConnectionLayerPacket["connection_confidence"] =
      input.sourceCount >= 3 && input.confidenceScore >= 68 && structuralImpact >= 68
        ? "high"
        : input.sourceCount >= 2 && input.confidenceScore >= 50
          ? "medium"
          : "low";

    if (connectionConfidence === "low") {
      unknowns.push("The broader connection is still tentative and could narrow as reporting develops.");
    }

    return {
      packet: {
        what_led_to_this: ledTo,
        what_it_connects_to: connectsTo,
        connection_confidence: connectionConfidence,
        connection_mode: "deterministic",
        connection_evidence_summary: `Built from ${evidenceSummaryParts.join(", ") || "current topic and ranking evidence"}, ${input.sourceCount} source${input.sourceCount === 1 ? "" : "s"}, and ${input.signalRole} signal classification.`,
        connection_unknowns: unknowns,
      },
      debugNotes: [
        `Connection layer used ${evidenceSummaryParts.join(", ") || "generic evidence"} from the current signal.`,
      ],
      status: "available",
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

      const importanceComposite = average([
        entry.features.structural_impact,
        entry.features.downstream_consequence,
        entry.features.actor_significance,
        entry.features.cross_domain_relevance,
        entry.features.actionability_or_decision_value,
        entry.features.persistence_or_endurance,
      ]);

      let scoreDelta = entry.baseScore > 82 ? -4.5 : -6;

      if (
        importanceComposite >= 84
        || (entry.features.structural_impact >= 78 && entry.features.downstream_consequence >= 58)
      ) {
        scoreDelta = -1.5;
      } else if (
        importanceComposite >= 70
        || (entry.features.structural_impact >= 70 && entry.features.cross_domain_relevance >= 60)
        || (entry.features.structural_impact >= 76 && entry.features.persistence_or_endurance >= 68)
      ) {
        scoreDelta = Math.max(scoreDelta, -3);
      }

      return {
        cluster_id: entry.cluster.cluster_id,
        action: "penalize",
        scoreDelta,
        reason:
          importanceComposite >= 70 || entry.features.structural_impact >= 70
            ? "Penalized lightly because a higher-ranked cluster already covers a similar event family, but the event remains important."
            : "Penalized because a higher-ranked cluster already covers a similar event family.",
        relatedClusterId: collision.clusterId,
      } satisfies DiversityAdjustment;
    });
  },
};

function createRankingFeatureProvider(feeds: DonorFeed[], donor: DonorId): RankingFeatureProvider {
  const knownSources = feeds.map(normalizeFeedMetadata);
  const sourceIndex = new Map(knownSources.map((source) => [source.source.toLowerCase(), source]));

  function scoreKeywordPresence(corpus: string, keywords: string[], base = 20, hitWeight = 14, max = 100) {
    const hits = keywords.filter((keyword) => corpus.includes(keyword)).length;
    return Math.min(max, base + hits * hitWeight);
  }

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
          "structural_impact",
          "downstream_consequence",
          "actor_significance",
          "cross_domain_relevance",
          "actionability_or_decision_value",
          "persistence_or_endurance",
        ] satisfies Array<keyof RankingFeatureSet>,
        trustSignals: ["source metadata", "trust tier", "source diversity", "system-level actor and impact heuristics"],
      };
    },
    getKnownSources() {
      return knownSources;
    },
    mapClusterToRankingFeatures(cluster: StoryCluster) {
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
      const corpus = `${cluster.representative_article.title} ${cluster.representative_article.content} ${cluster.topic_keywords.join(" ")}`.toLowerCase();
      const actors = [
        ...cluster.representative_article.entities,
        ...cluster.articles.flatMap((article) => article.entities),
      ].map((entry) => entry.toLowerCase());
      const actorHits = actors.filter((actor) =>
        /(federal reserve|ecb|bank of japan|china|u\.s\.|united states|european union|apple|microsoft|google|amazon|openai|nvidia|tesla|congress|white house|sec|doj|opec|taiwan)/.test(actor),
      ).length;
      const structuralImpact = scoreKeywordPresence(
        corpus,
        [
          "policy",
          "regulation",
          "tariff",
          "export",
          "trade",
          "sanction",
          "infrastructure",
          "supply chain",
          "platform",
          "central bank",
          "interest rate",
          "military",
          "security",
          "geopolit",
        ],
        18,
        12,
      );
      const downstreamConsequence = scoreKeywordPresence(
        corpus,
        ["pricing", "repric", "guidance", "outlook", "forecast", "supply chain", "capital", "procurement", "compliance", "rollout", "export", "trade", "chip", "semiconductor"],
        16,
        11,
      );
      const actorSignificance = Math.min(100, 24 + actorHits * 16 + (matches.some((entry) => entry.trustTier === "tier_1") ? 10 : 0));
      const crossDomainRelevance = scoreKeywordPresence(
        corpus,
        ["market", "policy", "enterprise", "consumer", "developer", "government", "bank", "cloud", "trade", "security", "chip", "supply chain"],
        18,
        9,
      );
      const actionability = scoreKeywordPresence(
        corpus,
        ["review", "restrict", "control", "raise", "cut", "delay", "approve", "launch", "guidance", "forecast", "hearing", "tariff", "export"],
        24,
        8,
      );
      const persistence = scoreKeywordPresence(
        corpus,
        ["roadmap", "policy", "regulation", "supply chain", "infrastructure", "guidance", "investment", "capacity", "platform", "trade", "export", "security"],
        20,
        10,
      );

      return {
        source_credibility: matches.length
          ? Number((matches.reduce((sum, entry) => sum + entry.credibility, 0) / matches.length).toFixed(2))
          : undefined,
        trust_tier: Number(trustTier.toFixed(2)),
        source_confirmation: Number(sourceConfirmation.toFixed(2)),
        representative_quality: Number(representativeQuality.toFixed(2)),
        reinforcement: Number(reinforcement.toFixed(2)),
        structural_impact: Number(structuralImpact.toFixed(2)),
        downstream_consequence: Number(downstreamConsequence.toFixed(2)),
        actor_significance: Number(actorSignificance.toFixed(2)),
        cross_domain_relevance: Number(crossDomainRelevance.toFixed(2)),
        actionability_or_decision_value: Number(actionability.toFixed(2)),
        persistence_or_endurance: Number(persistence.toFixed(2)),
      };
    },
  };
}

const horizonEnrichmentSupport: EnrichmentSupport = {
  enabled: true,
  describeCapabilities() {
    return {
      provider: "horizon",
      bounded: true,
      schema_safe: true,
      output_fields: ["why_it_matters", "what_to_watch", "unknowns", "connection_layer"],
    };
  },
  prepareEnrichmentPacket(input) {
    return {
      cluster_id: input.cluster.cluster_id,
      title: input.cluster.representative_article.title,
      summary: input.cluster.representative_article.content.slice(0, 220),
      what_to_watch: input.deterministicExplanation.what_to_watch,
      why_it_matters: input.deterministicExplanation.why_it_matters,
      connection_layer: input.deterministicExplanation.connection_layer,
      source_count: input.cluster.cluster_size,
      material_ranking_features: input.rankingDebug.active_features.slice(0, 6),
      unknowns: input.deterministicExplanation.unknowns,
    };
  },
  getStructuredEnrichment() {
    return {
      provider: "horizon",
      status: "skipped",
      notes: [
        "Horizon enrichment boundary is active in schema-safe mode, but execution is intentionally skipped in this repo so deterministic explanation remains the runtime truth source.",
      ],
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
    connectionSupport: afterMarketAgentConnectionSupport,
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

export const DEFAULT_DONOR_FEED_IDS = [
  "openclaw-the-verge",
  "openclaw-ars-technica",
  "horizon-reuters-world",
  "horizon-reuters-business",
] as const;

export const PROBATIONARY_RUNTIME_FEED_IDS = [
  "mit-technology-review",
] as const;

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
    connectionCapabilities: entry.connectionSupport?.describeCapabilities(),
    rankingFeatureSupport: entry.rankingFeatureProvider?.describeFeatureSupport(),
    diversitySupportAvailable: entry.diversitySupport?.available ?? false,
    enrichmentCapabilities: entry.enrichmentSupport?.describeCapabilities(),
  }));
}

export function getDonorModule(donor: DonorId) {
  return donorRegistry.find((entry) => entry.donor === donor);
}

export function getDefaultDonorFeeds(): DonorFeed[] {
  const activeDefaultFeeds = new Map(
    donorRegistry
      .filter((entry) => entry.contractStates.ingestion === "active")
      .flatMap((entry) => entry.feeds)
      .filter((source) => source.status === "active" && source.availability === "default")
      .map((source) => [source.id, source]),
  );

  return DEFAULT_DONOR_FEED_IDS.map((sourceId) => {
    const source = activeDefaultFeeds.get(sourceId);

    if (!source) {
      throw new Error(`Default donor feed ${sourceId} is not active in the donor registry`);
    }

    return source;
  });
}

export function getProbationaryRuntimeFeeds(): DonorFeed[] {
  const activeProbationaryFeeds = new Map(
    donorRegistry
      .filter((entry) => entry.contractStates.ingestion === "active")
      .flatMap((entry) => entry.feeds)
      .filter((source) => source.status === "active" && source.availability === "probationary")
      .map((source) => [source.id, source]),
  );

  return PROBATIONARY_RUNTIME_FEED_IDS.map((sourceId) => {
    const source = activeProbationaryFeeds.get(sourceId);

    if (!source) {
      throw new Error(`Probationary runtime feed ${sourceId} is not active in the donor registry`);
    }

    return source;
  });
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

export function getConnectionSupports() {
  return donorRegistry
    .filter((entry) => entry.contractStates.connection === "active" && entry.connectionSupport)
    .map((entry) => ({
      donor: entry.donor,
      support: entry.connectionSupport as ConnectionSupport,
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
