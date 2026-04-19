import {
  getCanonicalSourceMetadata,
  getDiversitySupports,
  getRankingFeatureProviders,
} from "@/adapters/donors";
import type {
  DiversityAdjustment,
  RankingDebug,
  RankingFeatureSet,
} from "@/lib/integration/subsystem-contracts";
import type { RankedSignal } from "@/lib/models/ranked-signal";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import type { ClusterScoreLog } from "@/lib/observability/pipeline-run";
import { clipSentence, tokenize } from "@/lib/pipeline/shared/text";

export type RankedClusterResult = {
  ranked: RankedSignal;
  cluster: SignalCluster;
  scoringLog: ClusterScoreLog;
};

const FEATURE_WEIGHTS = {
  credibility: 0.3,
  novelty: 0.25,
  urgency: 0.25,
  reinforcement: 0.2,
} as const;

const GROUP_WEIGHTS = {
  trust_timeliness: 0.34,
  event_importance: 0.42,
  support_and_novelty: 0.24,
} as const;

const ACTIVE_RANKING_FEATURES: Array<keyof RankingFeatureSet> = [
  "source_credibility",
  "trust_tier",
  "source_confirmation",
  "recency",
  "urgency",
  "novelty",
  "reinforcement",
  "representative_quality",
  "structural_impact",
  "downstream_consequence",
  "actor_significance",
  "cross_domain_relevance",
  "actionability_or_decision_value",
  "persistence_or_endurance",
];

const SOURCE_CREDIBILITY: Record<string, number> = {
  "associated press": 88,
  "ars technica": 81,
  marketwatch: 78,
  "reuters business": 90,
  "reuters world": 90,
  "the verge": 74,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getSourceCredibilityMap() {
  const donorSourceEntries = getCanonicalSourceMetadata().map((source) => [source.source.toLowerCase(), source.credibility]);
  return {
    ...SOURCE_CREDIBILITY,
    ...Object.fromEntries(donorSourceEntries),
  };
}

function getBaseCredibilitySignals(cluster: SignalCluster) {
  const sourceCredibilityMap = getSourceCredibilityMap();

  return cluster.articles.map((article) => {
    if (article.source_metadata) {
      const reliabilityWeight = article.source_metadata.reliability * 100;
      return Number(((article.source_metadata.credibility + reliabilityWeight) / 2).toFixed(2));
    }

    return sourceCredibilityMap[article.source.toLowerCase()] ?? 68;
  });
}

function getNoveltyScore(cluster: SignalCluster, allClusters: SignalCluster[]) {
  const globalKeywordFrequency = new Map<string, number>();

  allClusters.forEach((entry) => {
    entry.topic_keywords.forEach((keyword) => {
      globalKeywordFrequency.set(keyword, (globalKeywordFrequency.get(keyword) ?? 0) + 1);
    });
  });

  const scarceKeywords = cluster.topic_keywords.filter((keyword) => (globalKeywordFrequency.get(keyword) ?? 0) === 1).length;
  return clamp(45 + scarceKeywords * 9 + cluster.topic_keywords.length * 2, 0, 100);
}

function getUrgencyScore(cluster: SignalCluster) {
  const freshestMs = new Date(cluster.representative_article.published_at).getTime();
  const ageHours = Math.max(0, (Date.now() - freshestMs) / (1000 * 60 * 60));
  const urgencyTokens = tokenize(
    `${cluster.representative_article.title} ${clipSentence(cluster.representative_article.content, 180)}`,
  );
  const urgencyKeywordHits = urgencyTokens.filter((token) =>
    ["breaks", "cut", "cuts", "crisis", "emergency", "outage", "restrict", "review", "tariff"].includes(token),
  ).length;

  return clamp(92 - ageHours * 6 + urgencyKeywordHits * 4, 12, 100);
}

function getFallbackFeatureSet(cluster: SignalCluster, allClusters: SignalCluster[]): RankingFeatureSet {
  const baseCredibility = average(getBaseCredibilitySignals(cluster));
  const sourceConfirmation = clamp(new Set(cluster.articles.map((article) => article.source)).size * 24, 0, 100);
  const trustTier = average(
    cluster.articles.map((article) => {
      if (!article.source_metadata) return 68;
      if (article.source_metadata.trustTier === "tier_1") return 92;
      if (article.source_metadata.trustTier === "tier_2") return 78;
      return 64;
    }),
  );
  const urgency = getUrgencyScore(cluster);
  const novelty = getNoveltyScore(cluster, allClusters);
  const reinforcement = clamp(30 + cluster.cluster_size * 18 + new Set(cluster.articles.map((article) => article.source)).size * 12, 0, 100);
  const representativeQuality = clamp(
    56 + cluster.representative_article.keywords.length * 4 + cluster.representative_article.entities.length * 5,
    0,
    100,
  );

  return {
    source_credibility: Number(baseCredibility.toFixed(2)),
    trust_tier: Number(trustTier.toFixed(2)),
    source_confirmation: Number(sourceConfirmation.toFixed(2)),
    recency: Number(urgency.toFixed(2)),
    urgency: Number(urgency.toFixed(2)),
    novelty: Number(novelty.toFixed(2)),
    reinforcement: Number(reinforcement.toFixed(2)),
    cluster_size: cluster.cluster_size,
    representative_quality: Number(representativeQuality.toFixed(2)),
    structural_impact: 42,
    downstream_consequence: 40,
    actor_significance: 38,
    cross_domain_relevance: 36,
    actionability_or_decision_value: 46,
    persistence_or_endurance: 42,
  };
}

function buildRankingFeatureSet(cluster: SignalCluster, allClusters: SignalCluster[]) {
  const baseFeatures = getFallbackFeatureSet(cluster, allClusters);
  const providers = getRankingFeatureProviders();
  const provider = providers[0];
  const donorFeatures = provider?.provider.mapClusterToRankingFeatures(cluster, allClusters) ?? {};
  const features: RankingFeatureSet = {
    ...baseFeatures,
    ...Object.fromEntries(
      Object.entries(donorFeatures).filter(([, value]) => value !== undefined),
    ),
  } as RankingFeatureSet;

  return {
    provider: provider?.donor ?? "canonical",
    features,
    notes: provider
      ? [
          `Ranking provider ${provider.donor} mapped canonical ranking features.`,
          `Supported features: ${provider.provider.describeFeatureSupport().supportedFeatures.join(", ")}`,
        ]
      : ["No donor ranking provider was active; canonical fallback features were used."],
  };
}

function buildScoreBreakdown(features: RankingFeatureSet) {
  const credibility = Number(((features.source_credibility * 0.7) + (features.trust_tier * 0.3)).toFixed(2));
  const novelty = Number(features.novelty.toFixed(2));
  const urgency = Number(((features.urgency * 0.75) + (features.recency * 0.25)).toFixed(2));
  const reinforcement = Number(
    ((features.reinforcement * 0.55) + (features.source_confirmation * 0.25) + (features.representative_quality * 0.2)).toFixed(2),
  );

  return {
    credibility,
    novelty,
    urgency,
    reinforcement,
  };
}

function buildGroupedScores(features: RankingFeatureSet) {
  const trustTimeliness = Number(
    (
      features.source_credibility * 0.25 +
      features.trust_tier * 0.2 +
      features.source_confirmation * 0.15 +
      features.recency * 0.15 +
      features.urgency * 0.25
    ).toFixed(2),
  );
  const eventImportance = Number(
    (
      features.structural_impact * 0.24 +
      features.downstream_consequence * 0.2 +
      features.actor_significance * 0.18 +
      features.cross_domain_relevance * 0.14 +
      features.actionability_or_decision_value * 0.14 +
      features.persistence_or_endurance * 0.1
    ).toFixed(2),
  );
  const supportAndNovelty = Number(
    (
      features.novelty * 0.35 +
      features.reinforcement * 0.3 +
      features.source_confirmation * 0.15 +
      features.representative_quality * 0.2
    ).toFixed(2),
  );

  return {
    trust_timeliness: trustTimeliness,
    event_importance: eventImportance,
    support_and_novelty: supportAndNovelty,
  };
}

function buildBaseScore(scoreBreakdown: RankedSignal["score_breakdown"]) {
  return Number(
    (
      FEATURE_WEIGHTS.credibility * scoreBreakdown.credibility +
      FEATURE_WEIGHTS.novelty * scoreBreakdown.novelty +
      FEATURE_WEIGHTS.urgency * scoreBreakdown.urgency +
      FEATURE_WEIGHTS.reinforcement * scoreBreakdown.reinforcement
    ).toFixed(2),
  );
}

function getImportanceComposite(features: RankingFeatureSet) {
  return Number(
    average([
      features.structural_impact,
      features.downstream_consequence,
      features.actor_significance,
      features.cross_domain_relevance,
      features.actionability_or_decision_value,
      features.persistence_or_endurance,
    ]).toFixed(2),
  );
}

function buildImportanceAdjustedScore(features: RankingFeatureSet, groupedScores: ReturnType<typeof buildGroupedScores>) {
  const legacyBreakdown = buildScoreBreakdown(features);
  const legacyBaseScore = buildBaseScore(legacyBreakdown);
  const groupedScore = Number(
    (
      groupedScores.trust_timeliness * GROUP_WEIGHTS.trust_timeliness +
      groupedScores.event_importance * GROUP_WEIGHTS.event_importance +
      groupedScores.support_and_novelty * GROUP_WEIGHTS.support_and_novelty
    ).toFixed(2),
  );

  const importanceComposite = getImportanceComposite(features);
  const blendedScore = Number(((legacyBaseScore * 0.38) + (groupedScore * 0.62)).toFixed(2));
  let adjustment = 0;

  if (groupedScores.event_importance >= 78) {
    adjustment += Math.min(7, Number(((groupedScores.event_importance - 78) * 0.22).toFixed(2)));
  }

  if (features.urgency >= 78 && groupedScores.event_importance <= 45) {
    adjustment -= 3.5;
  }

  if (features.novelty >= 75 && groupedScores.event_importance <= 42) {
    adjustment -= 2;
  }

  if (groupedScores.event_importance >= 82 && features.source_confirmation >= 40) {
    adjustment += 2.5;
  }

  if (features.structural_impact >= 82 && features.downstream_consequence >= 76) {
    adjustment += 2;
  }

  if (importanceComposite >= 74 && groupedScores.trust_timeliness >= 64) {
    adjustment += 1.5;
  }

  if (features.actionability_or_decision_value <= 40 && groupedScores.event_importance <= 46) {
    adjustment -= 1.5;
  }

  return {
    legacyBaseScore,
    groupedScore,
    importanceComposite,
    blendedScore,
    adjustedScore: Number((blendedScore + adjustment).toFixed(2)),
    adjustment,
  };
}

function buildRankingExplanation(
  features: RankingFeatureSet,
  groupedScores: ReturnType<typeof buildGroupedScores>,
  diversityAdjustment: DiversityAdjustment,
) {
  if (diversityAdjustment.action === "penalize") {
    if (
      groupedScores.event_importance >= 78
      || diversityAdjustment.reason.toLowerCase().includes("remains important")
    ) {
      return "Ranked slightly lower because it overlaps with a higher-ranked cluster, but it stayed visible due to strong system-level importance.";
    }

    return "Ranked lower because it overlaps with a higher-ranked cluster and carries weaker distinct importance.";
  }

  if (groupedScores.event_importance >= 78 && groupedScores.trust_timeliness >= 68 && features.source_confirmation >= 40) {
    return "Ranked high due to strong structural importance, meaningful downstream consequence, and multiple confirmations.";
  }

  if (groupedScores.event_importance >= 75) {
    return "Ranked high because the event has unusually high system-level implications despite only moderate recency.";
  }

  if (features.urgency >= 78 && groupedScores.event_importance <= 45) {
    return "Ranked lower because it is fresh and credible, but the broader decision impact appears limited.";
  }

  if (groupedScores.support_and_novelty >= 70 && groupedScores.event_importance < 50) {
    return "Ranked lower because it is well-covered and fresh, but its broader consequences appear limited.";
  }

  return "Ranked based on a balanced mix of trust, timeliness, support, and event importance.";
}

function getDiversityAdjustments(
  rankedEntries: Array<{
    cluster: SignalCluster;
    features: RankingFeatureSet;
    baseScore: number;
  }>,
) {
  const provider = getDiversitySupports()[0];

  if (!provider) {
    return {
      provider: "canonical",
      adjustments: rankedEntries.map((entry) => ({
        cluster_id: entry.cluster.cluster_id,
        action: "none",
        scoreDelta: 0,
        reason: "No diversity provider configured.",
      } satisfies DiversityAdjustment)),
    };
  }

  return {
    provider: provider.donor,
    adjustments: provider.support.evaluateDiversityAdjustment(rankedEntries),
  };
}

export function rankSignalClusters(clusters: SignalCluster[]): RankedClusterResult[] {
  const scored = clusters.map((cluster) => {
    const featureResult = buildRankingFeatureSet(cluster, clusters);
    const scoreBreakdown = buildScoreBreakdown(featureResult.features);
    const groupedScores = buildGroupedScores(featureResult.features);
    const importanceAdjusted = buildImportanceAdjustedScore(featureResult.features, groupedScores);

    return {
      cluster,
      provider: featureResult.provider,
      features: featureResult.features,
      baseScore: importanceAdjusted.adjustedScore,
      rawBaseScore: importanceAdjusted.legacyBaseScore,
      groupedBaseScore: importanceAdjusted.groupedScore,
      blendedBaseScore: importanceAdjusted.blendedScore,
      groupedScores,
      importanceComposite: importanceAdjusted.importanceComposite,
      importanceAdjustment: importanceAdjusted.adjustment,
      scoreBreakdown,
      notes: featureResult.notes,
    };
  });

  const diversity = getDiversityAdjustments(scored);
  const diversityByClusterId = new Map(diversity.adjustments.map((entry) => [entry.cluster_id, entry]));

  return scored
    .map((entry) => {
      const diversityAdjustment = diversityByClusterId.get(entry.cluster.cluster_id) ?? {
        cluster_id: entry.cluster.cluster_id,
        action: "none",
        scoreDelta: 0,
        reason: "No diversity adjustment applied.",
      };
      const finalScore = Number((entry.baseScore + diversityAdjustment.scoreDelta).toFixed(2));
      const rankingDebug: RankingDebug = {
        provider: entry.provider,
        features: entry.features,
        feature_weights: FEATURE_WEIGHTS,
        grouped_scores: entry.groupedScores,
        diversity: diversityAdjustment,
        explanation: buildRankingExplanation(entry.features, entry.groupedScores, diversityAdjustment),
        active_features: ACTIVE_RANKING_FEATURES,
        notes: [
          ...entry.notes,
          `Legacy score ${entry.rawBaseScore.toFixed(2)} blended with grouped score ${entry.groupedBaseScore.toFixed(2)} to ${entry.blendedBaseScore.toFixed(2)}.`,
          `Importance composite ${entry.importanceComposite.toFixed(2)} shifted the score by ${entry.importanceAdjustment.toFixed(2)} before diversity adjustments.`,
          `Post-diversity adjustment ${diversityAdjustment.scoreDelta.toFixed(2)} produced final score ${finalScore.toFixed(2)}.`,
        ],
      };

      return {
        ranked: {
          cluster_id: entry.cluster.cluster_id,
          score: finalScore,
          score_breakdown: entry.scoreBreakdown,
          ranking_debug: rankingDebug,
        },
        cluster: entry.cluster,
        scoringLog: {
          cluster_id: entry.cluster.cluster_id,
          provider: entry.provider,
          credibility: entry.scoreBreakdown.credibility,
          novelty: entry.scoreBreakdown.novelty,
          urgency: entry.scoreBreakdown.urgency,
          reinforcement: entry.scoreBreakdown.reinforcement,
          trust_timeliness: entry.groupedScores.trust_timeliness,
          event_importance: entry.groupedScores.event_importance,
          support_and_novelty: entry.groupedScores.support_and_novelty,
          importance_adjustment: entry.importanceAdjustment,
          cluster_size: entry.cluster.cluster_size,
          final_score: finalScore,
          diversity_action: diversityAdjustment.action,
          diversity_reason: diversityAdjustment.reason,
          ranking_explanation: rankingDebug.explanation,
        },
      };
    })
    .sort((left, right) => {
      const scoreDelta = right.ranked.score - left.ranked.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return right.cluster.cluster_size - left.cluster.cluster_size;
    });
}
