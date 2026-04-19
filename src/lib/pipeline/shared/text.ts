import { createHash } from "crypto";

import { stripHtml } from "@/lib/utils";

const STOP_WORDS = new Set([
  "a",
  "about",
  "across",
  "afterward",
  "again",
  "all",
  "after",
  "also",
  "amid",
  "and",
  "any",
  "are",
  "around",
  "as",
  "at",
  "back",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "but",
  "by",
  "can",
  "could",
  "do",
  "does",
  "during",
  "for",
  "from",
  "had",
  "has",
  "have",
  "here",
  "how",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "just",
  "like",
  "may",
  "might",
  "more",
  "most",
  "new",
  "not",
  "now",
  "of",
  "on",
  "one",
  "only",
  "or",
  "over",
  "our",
  "out",
  "should",
  "so",
  "than",
  "that",
  "the",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "under",
  "up",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "why",
  "will",
  "would",
  "with",
  "you",
  "your",
]);

export const GENERIC_TOPIC_TOKENS = new Set([
  "america",
  "business",
  "companies",
  "company",
  "energy",
  "global",
  "government",
  "market",
  "markets",
  "news",
  "officials",
  "policy",
  "power",
  "rates",
  "review",
  "says",
  "story",
  "support",
  "technology",
  "trade",
  "trump",
  "world",
]);

export function cleanText(value: string | null | undefined) {
  return stripHtml(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/[’']/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeToken(token: string) {
  const normalized = token
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .replace(/[^a-z0-9-]/g, "");

  if (!normalized) {
    return "";
  }

  if (normalized.endsWith("ies") && normalized.length > 4) {
    return `${normalized.slice(0, -3)}y`;
  }

  if (normalized.endsWith("s") && normalized.length > 4 && !normalized.endsWith("ss")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

export function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    const droppedParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    droppedParams.forEach((key) => url.searchParams.delete(key));
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim();
  }
}

export function tokenize(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map(normalizeToken)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}

export function extractKeywords(value: string, limit = 8) {
  const counts = new Map<string, number>();

  tokenize(value).forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

export function normalizeEntity(value: string) {
  return tokenize(value).join(" ");
}

export function extractEntities(value: string, limit = 6) {
  const matches =
    cleanText(value)
      .match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}|[A-Z]{2,})\b/g)
      ?.map((match) => match.trim()) ?? [];

  return [...new Set(matches)].slice(0, limit);
}

export function jaccardSimilarity(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const overlap = [...leftSet].filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : overlap / union;
}

export function overlapSimilarity(left: string[], right: string[]) {
  const leftSet = new Set(left.filter(Boolean));
  const rightSet = new Set(right.filter(Boolean));
  const overlap = [...leftSet].filter((token) => rightSet.has(token)).length;
  const smallestSetSize = Math.min(leftSet.size, rightSet.size);
  return smallestSetSize === 0 ? 0 : overlap / smallestSetSize;
}

export function keywordSpecificity(keywords: string[]) {
  return keywords.filter((keyword) => !GENERIC_TOPIC_TOKENS.has(keyword));
}

export function computeTimeProximityScore(leftTimestamp: number, rightTimestamp: number) {
  const diffHours = Math.abs(leftTimestamp - rightTimestamp) / (1000 * 60 * 60);
  if (diffHours <= 6) return 1;
  if (diffHours <= 18) return 0.85;
  if (diffHours <= 36) return 0.65;
  if (diffHours <= 72) return 0.4;
  if (diffHours <= 120) return 0.2;
  return 0;
}

export function stableId(...parts: string[]) {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}

export function clipSentence(value: string, maxLength = 240) {
  const clean = cleanText(value);
  if (clean.length <= maxLength) {
    return clean;
  }

  const trimmed = clean.slice(0, maxLength);
  return `${trimmed.slice(0, trimmed.lastIndexOf(" "))}...`;
}
