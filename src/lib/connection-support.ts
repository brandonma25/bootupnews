import { getConnectionSupports } from "@/adapters/donors";
import type {
  ConnectionEvidenceInput,
  ConnectionLayerPacket,
  RankingDebug,
} from "@/lib/integration/subsystem-contracts";
import type { SignalCluster } from "@/lib/models/signal-cluster";
import type { EventIntelligence } from "@/lib/types";

type AssembleConnectionOptions = {
  topicName: string;
  intelligence: EventIntelligence;
  sourceCount: number;
  signalRole: "core" | "context" | "watch";
  rankingDebug?: RankingDebug;
  cluster?: SignalCluster;
};

function buildFallbackConnectionPacket(input: ConnectionEvidenceInput): ConnectionLayerPacket {
  return {
    what_led_to_this: "Too early to say with confidence what set this up beyond the immediate report.",
    what_it_connects_to:
      input.signalRole === "watch"
        ? "For now, it reads as a narrow update rather than a broader system signal."
        : "The current reporting suggests broader relevance, but the system-level link is still tentative.",
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

export function assembleConnectionLayer(options: AssembleConnectionOptions): {
  packet: ConnectionLayerPacket;
  provider: string | null;
  status: "available" | "fallback" | "declined" | "unused";
  evidenceUsed: string[];
  reason: string;
} {
  const input: ConnectionEvidenceInput = {
    title: options.intelligence.title,
    topicName: options.topicName,
    summary: options.intelligence.summary,
    eventType: options.intelligence.eventType,
    affectedMarkets: options.intelligence.affectedMarkets,
    topics: options.intelligence.topics,
    entities: options.intelligence.keyEntities,
    keywords: options.cluster?.topic_keywords ?? [],
    signalStrength: options.intelligence.signalStrength,
    confidenceScore: options.intelligence.confidenceScore,
    sourceCount: options.sourceCount,
    signalRole: options.signalRole,
    rankingFeatures: options.rankingDebug?.features,
  };

  const supports = getConnectionSupports();
  const support = supports[0];

  if (!support) {
    return {
      packet: buildFallbackConnectionPacket(input),
      provider: null,
      status: "unused",
      evidenceUsed: ["No connection-support donor was active."],
      reason: "No donor connection support was available, so canonical fallback text was used.",
    };
  }

  const result = support.support.buildConnectionLayer(input);

  return {
    packet: result.packet,
    provider: support.donor,
    status: result.status,
    evidenceUsed: result.debugNotes,
    reason:
      result.status === "available"
        ? "Deterministic connection support was assembled from current signal evidence."
        : "Connection support stayed conservative because the evidence was too thin for a stronger claim.",
  };
}
