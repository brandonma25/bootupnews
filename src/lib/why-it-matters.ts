import { env, isAiConfigured } from "@/lib/env";
import type { EventIntelligence } from "@/lib/types";

export type TrustLayerPresentation = {
  tier: "high" | "medium" | "low";
  heading: string;
  body: string;
  supportingSignals: string[];
};

type GenerateWhyThisMattersOptions = {
  previousOutputs?: string[];
};

type GenerateWhyThisMattersAttemptOptions = {
  avoidPhrases?: string[];
};

export async function generateWhyThisMatters(
  intelligence: EventIntelligence,
  options: GenerateWhyThisMattersOptions = {},
) {
  const previousOutputs = options.previousOutputs ?? [];
  const heuristic = generateWhyThisMattersHeuristically(intelligence);
  const aiDraft = isAiConfigured ? await generateWhyThisMattersWithAi(intelligence) : null;
  let best = formatWhyThisMatters(aiDraft || heuristic, intelligence.signalStrength);

  if (isTooSimilar(best, previousOutputs)) {
    const retryDraft = isAiConfigured
      ? await generateWhyThisMattersWithAi(intelligence, {
        avoidPhrases: previousOutputs.slice(-3),
      })
      : rephraseWhyThisMatters(heuristic, intelligence);

    best = formatWhyThisMatters(retryDraft || heuristic, intelligence.signalStrength);
  }

  return best;
}

export function buildTrustLayerPresentation(
  intelligence: EventIntelligence | undefined,
  fallback: {
    title: string;
    topicName: string;
    whyItMatters?: string;
    sourceCount?: number;
    rankingSignals?: string[];
  },
): TrustLayerPresentation {
  if (!intelligence) {
    return {
      tier: "medium",
      heading: "Why this is here",
      body: fallback.whyItMatters || `Tracked in ${fallback.topicName} because it cleared the current briefing filters.`,
      supportingSignals: fallback.rankingSignals?.slice(0, 2) ?? [],
    };
  }

  const tier = intelligence.confidenceScore >= 72 ? "high" : intelligence.confidenceScore >= 45 ? "medium" : "low";
  const normalized = normalizeIntelligence(intelligence);
  const body = formatWhyThisMatters(
    generateWhyThisMattersHeuristically(normalized),
    normalized.signalStrength,
  );

  if (tier === "high") {
    return {
      tier,
      heading: "Why it matters",
      body,
      supportingSignals: buildSignalChips(intelligence).slice(0, 3),
    };
  }

  if (tier === "medium") {
    return {
      tier,
      heading: "Why it matters",
      body,
      supportingSignals: buildSignalChips(intelligence).slice(0, 3),
    };
  }

  return {
    tier,
    heading: "Why it matters",
    body,
    supportingSignals: buildSignalChips(intelligence).slice(0, 2),
  };
}

function buildSignalChips(intelligence: EventIntelligence) {
  const normalized = normalizeIntelligence(intelligence);

  return [
    normalized.entities[0],
    normalized.eventType,
    intelligence.signals.sourceDiversity > 1
      ? `${intelligence.signals.sourceDiversity} sources`
      : "Early coverage",
    intelligence.signals.articleCount > 1
      ? `${intelligence.signals.articleCount} articles`
      : null,
  ].filter((value): value is string => Boolean(value));
}

export function generateWhyThisMattersHeuristically(intelligence: EventIntelligence) {
  const normalized = normalizeIntelligence(intelligence);
  const entityLabel = normalized.entities[0] ?? normalized.title;
  const marketLabel = normalized.affectedMarkets.slice(0, 2).join(" and ");
  const horizonLabel = getTimeHorizonLabel(normalized.timeHorizon);

  switch (normalized.eventType) {
    case "earnings":
      return `${entityLabel} changes the earnings and guidance baseline investors use to price ${marketLabel}, so near-term expectations can move quickly over the ${horizonLabel}.`;
    case "regulation":
      return `${entityLabel} changes the policy framework around ${marketLabel}, which can alter compliance costs, supply access, or strategic flexibility over the ${horizonLabel}.`;
    case "macro":
      return `${entityLabel} resets the macro backdrop for ${marketLabel}, changing how investors think about rates, demand, and risk over the ${horizonLabel}.`;
    case "m&a":
      return `${entityLabel} matters because consolidation can reprice competitive positioning and capital allocation across ${marketLabel} over the ${horizonLabel}.`;
    case "geopolitical":
      return `${entityLabel} matters because geopolitical shifts can change supply chains, policy risk, and pricing pressure across ${marketLabel} over the ${horizonLabel}.`;
    default:
      return `${entityLabel} matters because ${trimTrailingPeriod(normalized.primaryImpact).charAt(0).toLowerCase()}${trimTrailingPeriod(normalized.primaryImpact).slice(1)} over the ${horizonLabel}.`;
  }
}

async function generateWhyThisMattersWithAi(
  intelligence: EventIntelligence,
  options: GenerateWhyThisMattersAttemptOptions = {},
) {
  try {
    const response = await fetch(`${env.openAiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openAiModel,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are a financial analyst. Return plain text only.",
          },
          {
            role: "user",
            content: [
              `Given:`,
              `- Event type: ${intelligence.eventType}`,
              `- Entities: ${intelligence.entities.join(", ") || "None"}`,
              `- Primary impact: ${intelligence.primaryImpact}`,
              `- Affected markets: ${intelligence.affectedMarkets.join(", ") || "broad markets"}`,
              `- Time horizon: ${intelligence.timeHorizon}`,
              "",
              "Write a 1-2 sentence explanation of why this matters.",
              "",
              "Rules:",
              "- Focus on causality (what changes and why)",
              "- Be specific to this event",
              "- Avoid generic phrases",
              "- Do not repeat the summary",
              ...(options.avoidPhrases?.length
                ? ["- Avoid sounding similar to these prior outputs: " + options.avoidPhrases.join(" | ")]
                : []),
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;
    return typeof content === "string" ? content.trim() : null;
  } catch (error) {
    console.error("Why-this-matters generation failed, falling back to heuristic output.", error);
    return null;
  }
}

function rephraseWhyThisMatters(base: string, intelligence: EventIntelligence) {
  const normalized = normalizeIntelligence(intelligence);
  const entityLabel = normalized.entities[0] ?? normalized.title;
  const marketLabel = normalized.affectedMarkets.slice(0, 2).join(" and ");
  return `${entityLabel} is a live signal for ${marketLabel} because ${trimTrailingPeriod(base).charAt(0).toLowerCase()}${trimTrailingPeriod(base).slice(1)}.`;
}

function formatWhyThisMatters(text: string, signalStrength: EventIntelligence["signalStrength"]) {
  const normalized = ensureSentence(text);
  return `${normalized} (Signal: ${capitalize(signalStrength)})`;
}

function isTooSimilar(candidate: string, previousOutputs: string[]) {
  return previousOutputs.some((previous) => similarityScore(candidate, previous) >= 0.72);
}

function similarityScore(left: string, right: string) {
  const leftWords = new Set(normalizeForSimilarity(left).split(" ").filter(Boolean));
  const rightWords = new Set(normalizeForSimilarity(right).split(" ").filter(Boolean));
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return union === 0 ? 0 : overlap / union;
}

function normalizeForSimilarity(value: string) {
  return value
    .toLowerCase()
    .replace(/\(signal:\s+\w+\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "This matters because it changes the operating backdrop investors are watching.";
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function trimTrailingPeriod(value: string) {
  return value.trim().replace(/[.!?]+$/, "");
}

function getTimeHorizonLabel(horizon: EventIntelligence["timeHorizon"]) {
  switch (horizon) {
    case "short":
      return "next few sessions";
    case "medium":
      return "next few quarters";
    default:
      return "longer term";
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeIntelligence(intelligence: EventIntelligence) {
  const entities = intelligence.entities?.length
    ? intelligence.entities
    : intelligence.keyEntities?.length
      ? intelligence.keyEntities
      : [intelligence.title];
  const primaryTopic = intelligence.topics?.[0] ?? "markets";
  const affectedMarkets = intelligence.affectedMarkets?.length
    ? intelligence.affectedMarkets
    : [primaryTopic];

  return {
    ...intelligence,
    entities,
    eventType: intelligence.eventType || deriveLegacyEventType(intelligence),
    primaryImpact:
      intelligence.primaryImpact ||
      `it can change expectations around ${affectedMarkets[0] ?? primaryTopic}`,
    affectedMarkets,
    timeHorizon: intelligence.timeHorizon || "medium",
    signalStrength: intelligence.signalStrength || "moderate",
  };
}

function deriveLegacyEventType(intelligence: EventIntelligence) {
  const corpus = `${intelligence.title} ${intelligence.summary} ${intelligence.topics?.join(" ") ?? ""}`.toLowerCase();

  if (/earnings|guidance|revenue|profit|quarter/.test(corpus)) return "earnings";
  if (/regulation|regulatory|policy|senate|congress|ban|antitrust/.test(corpus)) return "regulation";
  if (/fed|inflation|rates|treasury|economy|macro/.test(corpus)) return "macro";
  if (/acquisition|merger|buyout|deal|takeover/.test(corpus)) return "m&a";
  if (/sanctions|war|export restrictions|geopolit/.test(corpus)) return "geopolitical";
  return "company-update";
}
