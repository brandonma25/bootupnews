import { createHash } from "crypto";

import type { BriefingItem, EventDisplayState } from "@/lib/types";

type ClassifyEventDisplayStateInput = {
  lastViewedAt?: string | null;
  previousFingerprint?: string | null;
  currentFingerprint: string;
  previousImportanceScore?: number | null;
  currentImportanceScore?: number | null;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
]);

export function createContinuityKey(
  topicId: string,
  titles: string[],
  matchedKeywords: string[],
) {
  const keywordTokens = [...new Set(matchedKeywords.flatMap(tokenizeSignal))].sort();
  const titleTokens = titles.flatMap(tokenizeSignal);
  const rankedTokens = titleTokens.reduce<Map<string, number>>((counts, token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
    return counts;
  }, new Map());

  const fallbackTokens = [...rankedTokens.entries()]
    .sort((left, right) => {
      const scoreDelta = right[1] - left[1];
      if (scoreDelta !== 0) return scoreDelta;
      return left[0].localeCompare(right[0]);
    })
    .map(([token]) => token)
    .filter((token) => !keywordTokens.includes(token));

  const signatureSource =
    keywordTokens.length >= 3
      ? keywordTokens
      : [...keywordTokens, ...fallbackTokens];

  const signature = signatureSource.slice(0, 6).join(":");

  return `${topicId}:${signature || "event"}`;
}

export function createContinuityFingerprint(input: {
  articleSignals: string[];
  importanceScore?: number;
  publishedAt?: string;
  sourceCount: number;
}) {
  return createHash("sha1")
    .update(
      JSON.stringify({
        articleSignals: [...input.articleSignals].sort(),
        importanceScore: Math.round(input.importanceScore ?? 0),
        publishedAt: input.publishedAt ?? null,
        sourceCount: input.sourceCount,
      }),
    )
    .digest("hex");
}

export function classifyEventDisplayState(
  input: ClassifyEventDisplayStateInput,
): EventDisplayState {
  if (!input.lastViewedAt) {
    return "new";
  }

  const previousImportance = input.previousImportanceScore ?? 0;
  const currentImportance = input.currentImportanceScore ?? 0;
  const importanceJump = currentImportance - previousImportance;
  const fingerprintChanged = input.previousFingerprint !== input.currentFingerprint;

  if (importanceJump >= 8) {
    return "escalated";
  }

  if (fingerprintChanged) {
    return "changed";
  }

  return "unchanged";
}

export function summarizeSessionStates(items: BriefingItem[]) {
  return items.reduce(
    (summary, item) => {
      if (item.read) {
        summary.reviewedCount += 1;
      }

      if (item.displayState === "new") {
        summary.newCount += 1;
      } else if (item.displayState === "changed") {
        summary.changedCount += 1;
      } else if (item.displayState === "escalated") {
        summary.escalatedCount += 1;
      }

      return summary;
    },
    {
      reviewedCount: 0,
      newCount: 0,
      changedCount: 0,
      escalatedCount: 0,
    },
  );
}

export function getDisplayStateLabel(state?: EventDisplayState) {
  if (state === "new") return "New";
  if (state === "changed") return "Changed";
  if (state === "escalated") return "Escalated";
  return null;
}

export function getDisplayStateTone(state?: EventDisplayState) {
  if (state === "new") return "text-[var(--accent)]";
  if (state === "changed") return "text-[#7A4E1D]";
  if (state === "escalated") return "text-[#9C2F2F]";
  return "text-[var(--muted)]";
}

function tokenizeSignal(value: string) {
  return normalizeSignal(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function normalizeSignal(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
