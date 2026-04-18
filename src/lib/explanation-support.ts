import { getEnrichmentSupports } from "@/adapters/donors";
import { assembleConnectionLayer } from "@/lib/connection-support";
import type {
  ExplanationPacket,
  RankingDebug,
  RankingFeatureSet,
  TrustLayerDebug,
} from "@/lib/integration/subsystem-contracts";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import { classifyBriefingSignalRole } from "@/lib/output-sanity";
import type { EventIntelligence } from "@/lib/types";
import { clipSentence } from "@/lib/pipeline/shared/text";

type AssembleExplanationOptions = {
  title: string;
  topicName: string;
  intelligence: EventIntelligence;
  sourceNames: string[];
  sourceCount: number;
  whyItMatters: string;
  rankingExplanation?: string;
  rankingSignals?: string[];
  rankingDebug?: RankingDebug;
  cluster?: SignalCluster;
};

const MATERIAL_FEATURE_LABELS: Array<{
  key: keyof RankingFeatureSet;
  minScore: number;
}> = [
  { key: "structural_impact", minScore: 70 },
  { key: "downstream_consequence", minScore: 68 },
  { key: "actor_significance", minScore: 72 },
  { key: "cross_domain_relevance", minScore: 64 },
  { key: "actionability_or_decision_value", minScore: 62 },
  { key: "persistence_or_endurance", minScore: 66 },
  { key: "source_confirmation", minScore: 40 },
  { key: "source_credibility", minScore: 75 },
  { key: "urgency", minScore: 72 },
];

function getStrongestTrustTier(cluster?: SignalCluster): "tier_1" | "tier_2" | "tier_3" | "unknown" {
  if (!cluster) {
    return "unknown";
  }

  if (cluster.articles.some((article) => article.source_metadata?.trustTier === "tier_1")) {
    return "tier_1";
  }

  if (cluster.articles.some((article) => article.source_metadata?.trustTier === "tier_2")) {
    return "tier_2";
  }

  if (cluster.articles.some((article) => article.source_metadata?.trustTier === "tier_3")) {
    return "tier_3";
  }

  return "unknown";
}

function getMaterialRankingFeatures(rankingDebug?: RankingDebug): Array<keyof RankingFeatureSet> {
  if (!rankingDebug) {
    return [];
  }

  return MATERIAL_FEATURE_LABELS
    .filter((entry) => rankingDebug.features[entry.key] >= entry.minScore)
    .map((entry) => entry.key);
}

function getConfidence(
  sourceCount: number,
  intelligence: EventIntelligence,
  rankingDebug?: RankingDebug,
): ExplanationPacket["confidence"] {
  const trustTimeliness = rankingDebug?.grouped_scores.trust_timeliness ?? 0;
  const confidenceSignal = intelligence.confidenceScore;

  if (sourceCount >= 3 && confidenceSignal >= 70 && trustTimeliness >= 65) {
    return "high";
  }

  if (sourceCount >= 2 && confidenceSignal >= 45) {
    return "medium";
  }

  return "low";
}

function buildWhatToWatch(
  intelligence: EventIntelligence,
  sourceCount: number,
  rankingDebug?: RankingDebug,
) {
  if ((rankingDebug?.features.downstream_consequence ?? 0) >= 72) {
    return `Watch for follow-through across ${intelligence.affectedMarkets[0] ?? intelligence.topics[0] ?? "related sectors"}, especially as new details confirm the downstream impact.`;
  }

  if (sourceCount <= 1) {
    return "Watch for additional source confirmation and for the initial report to develop into a broader multi-source signal.";
  }

  if (intelligence.timeHorizon === "short") {
    return "Watch the next 24 hours for confirmation, official responses, and signs that the story is moving beyond the initial news cycle.";
  }

  return "Watch for whether the development changes policy, market, or product expectations beyond the first wave of coverage.";
}

function buildUnknowns(
  intelligence: EventIntelligence,
  sourceCount: number,
  rankingDebug?: RankingDebug,
) {
  const unknowns: string[] = [];

  if (sourceCount <= 1) {
    unknowns.push("Cross-source confirmation is still limited.");
  }

  if ((rankingDebug?.features.persistence_or_endurance ?? 0) < 55) {
    unknowns.push("It is still unclear whether the development will persist beyond the near-term cycle.");
  }

  if (intelligence.signalStrength === "weak") {
    unknowns.push("The story may remain niche unless follow-on reporting expands the impact.");
  }

  return unknowns;
}

function buildEvidenceUsed(
  intelligence: EventIntelligence,
  sourceCount: number,
  rankingSignals: string[],
  rankingDebug?: RankingDebug,
) {
  const evidence = [
    `${sourceCount} source${sourceCount === 1 ? "" : "s"} covering the event`,
    `${intelligence.signals.articleCount} article${intelligence.signals.articleCount === 1 ? "" : "s"} in the current cluster`,
    `signal strength ${intelligence.signalStrength}`,
    `confidence ${intelligence.confidenceScore}/100`,
  ];

  if (rankingDebug) {
    evidence.push(`event importance ${rankingDebug.grouped_scores.event_importance}`);
    evidence.push(`trust and timeliness ${rankingDebug.grouped_scores.trust_timeliness}`);
  }

  return [...evidence, ...rankingSignals.slice(0, 2)];
}

export function assembleExplanationPacket(
  options: AssembleExplanationOptions,
): {
  packet: ExplanationPacket;
  trustDebug: TrustLayerDebug;
} {
  const materialRankingFeatures = getMaterialRankingFeatures(options.rankingDebug);
  const confidence = getConfidence(options.sourceCount, options.intelligence, options.rankingDebug);
  const rankingReason =
    options.rankingExplanation
    ?? options.rankingDebug?.explanation
    ?? options.rankingSignals?.[0]
    ?? "Ranked using the current deterministic signal and trust model.";
  const unknowns = buildUnknowns(options.intelligence, options.sourceCount, options.rankingDebug);
  const signalRole = classifyBriefingSignalRole({
    importanceScore: options.intelligence.rankingScore,
    importanceLabel:
      options.intelligence.rankingScore >= 80 ? "Critical" : options.intelligence.rankingScore >= 65 ? "High" : "Watch",
    sourceCount: options.sourceCount,
    sources: options.sourceNames.map((sourceName) => ({ title: sourceName, url: "https://example.com" })),
    eventIntelligence: options.intelligence,
  });
  const connection = assembleConnectionLayer({
    topicName: options.topicName,
    intelligence: options.intelligence,
    sourceCount: options.sourceCount,
    signalRole,
    rankingDebug: options.rankingDebug,
    cluster: options.cluster,
  });
  const packet: ExplanationPacket = {
    what_happened: clipSentence(options.intelligence.summary, 220),
    why_it_matters: clipSentence(options.whyItMatters, 220),
    why_this_ranks_here: clipSentence(
      signalRole === "core"
        ? rankingReason.replace(/^Ranked /, "Classified as a top signal and ranked ")
        : signalRole === "context"
          ? rankingReason.replace(/^Ranked /, "Classified as a context signal and ranked ")
          : rankingReason,
      200,
    ),
    what_to_watch: clipSentence(buildWhatToWatch(options.intelligence, options.sourceCount, options.rankingDebug), 200),
    connection_layer: {
      ...connection.packet,
      what_led_to_this: clipSentence(connection.packet.what_led_to_this, 200),
      what_it_connects_to: clipSentence(connection.packet.what_it_connects_to, 200),
      connection_evidence_summary: clipSentence(connection.packet.connection_evidence_summary, 180),
    },
    signal_role: signalRole,
    confidence,
    unknowns,
    citation_support_summary: {
      source_count: options.sourceCount,
      source_names: [...new Set(options.sourceNames)].slice(0, 5),
      corroboration: options.sourceCount > 1 ? "multi_source" : "single_source",
      strongest_trust_tier: getStrongestTrustTier(options.cluster),
    },
    explanation_mode: options.rankingDebug ? "deterministic" : "fallback",
  };

  const supports = getEnrichmentSupports();
  const horizon = supports.find((entry) => entry.donor === "horizon") ?? supports[0];
  let trustDebug: TrustLayerDebug = {
    evidence_used: buildEvidenceUsed(
      options.intelligence,
      options.sourceCount,
      options.rankingSignals ?? [],
      options.rankingDebug,
    ),
    material_ranking_features: materialRankingFeatures,
    explanation_mode: packet.explanation_mode,
    connection: {
      provider: connection.provider,
      status: connection.status,
      mode: packet.connection_layer?.connection_mode ?? "fallback",
      reason: connection.reason,
      evidence_used: connection.evidenceUsed,
    },
    confidence_notes: [
      `Explanation confidence is ${confidence}.`,
      `Source support is ${packet.citation_support_summary.corroboration === "multi_source" ? "multi-source" : "single-source"}.`,
    ],
    uncertainty_notes: unknowns,
    deterministic_path_reason: options.rankingDebug
      ? "Canonical ranking debug was available, so explanation text was assembled directly from cluster and scoring evidence."
      : "Ranking debug was not available, so explanation used deterministic event intelligence fallback inputs.",
    enrichment: {
      provider: horizon?.donor ?? null,
      status: horizon ? "skipped" : "unused",
      reason: horizon
        ? "Optional Horizon enrichment boundary was prepared but not executed because deterministic output remains the default runtime path."
        : "No enrichment provider was available.",
    },
  };

  if (horizon && options.cluster && options.rankingDebug) {
    const request = horizon.support.prepareEnrichmentPacket({
      cluster: options.cluster,
      rankingDebug: options.rankingDebug,
      deterministicExplanation: packet,
    });
    const enrichment = request
      ? horizon.support.getStructuredEnrichment(request)
      : {
          provider: horizon.donor,
          status: "skipped" as const,
          notes: ["No enrichment request could be prepared from the current deterministic inputs."],
        };

    if (enrichment.status === "used" && enrichment.output) {
      const mergedUnknowns = [...new Set([...(enrichment.output.unknowns ?? []), ...packet.unknowns])];
      Object.assign(packet, {
        why_it_matters: enrichment.output.why_it_matters ?? packet.why_it_matters,
        what_to_watch: enrichment.output.what_to_watch ?? packet.what_to_watch,
        connection_layer: enrichment.output.connection_layer
          ? {
              ...packet.connection_layer,
              ...enrichment.output.connection_layer,
              connection_mode: "enriched",
            }
          : packet.connection_layer,
        unknowns: mergedUnknowns,
        explanation_mode: "enriched" as const,
      });
    }

    trustDebug = {
      ...trustDebug,
      explanation_mode: packet.explanation_mode,
      connection: {
        ...trustDebug.connection,
        mode: packet.connection_layer?.connection_mode ?? trustDebug.connection.mode,
      },
      enrichment: {
        provider: enrichment.provider,
        status: enrichment.status,
        reason: enrichment.notes.join(" "),
      },
    };
  }

  return {
    packet,
    trustDebug,
  };
}
