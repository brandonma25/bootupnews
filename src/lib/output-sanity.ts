import type { BriefingItem } from "@/lib/types";

export type SignalRole = "core" | "context" | "watch";

export function classifyBriefingSignalRole(
  item: Pick<
    BriefingItem,
    | "importanceScore"
    | "importanceLabel"
    | "sourceCount"
    | "sources"
    | "eventIntelligence"
    | "explanationPacket"
  >,
): SignalRole {
  const sourceCount = item.sourceCount ?? item.sources.length;
  const confidence =
    item.explanationPacket?.confidence
    ?? (((item.eventIntelligence?.confidenceScore ?? 0) >= 70)
      ? "high"
      : ((item.eventIntelligence?.confidenceScore ?? 0) >= 45)
        ? "medium"
        : "low");
  const score = item.importanceScore ?? item.eventIntelligence?.rankingScore ?? 0;
  const isHighSignal = item.eventIntelligence?.isHighSignal ?? score >= 45;
  const crossDomainReach =
    ((item.eventIntelligence?.affectedMarkets?.length ?? 0) >= 2)
    || ((item.eventIntelligence?.topics?.length ?? 0) >= 2);

  if (!isHighSignal || sourceCount < 2) {
    return "watch";
  }

  if (
    item.importanceLabel === "Critical"
    || score >= 84
    || (score >= 76 && crossDomainReach && confidence !== "low")
  ) {
    return "core";
  }

  return "context";
}
