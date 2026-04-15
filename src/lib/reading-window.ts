import type { BriefingItem, ReadingWindowIntensity, ReadingWindowMetrics } from "@/lib/types";

const WORDS_PER_MINUTE = 140;
const DEFAULT_READING_TIME_MINUTES = 4;
const LIGHT_DAY_MAX_MINUTES = 9;
const NORMAL_DAY_MAX_MINUTES = 25;

export function calculateReadingTime(item: Pick<
  BriefingItem,
  "title" | "whatHappened" | "keyPoints" | "whyItMatters" | "estimatedMinutes"
>) {
  const content = [item.title, item.whatHappened, ...(item.keyPoints ?? []), item.whyItMatters]
    .filter(Boolean)
    .join(" ");
  const wordCount = countWords(content);

  if (wordCount > 0) {
    return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
  }

  return Math.max(1, Math.round(item.estimatedMinutes ?? DEFAULT_READING_TIME_MINUTES));
}

export function calculateReadingWindow(
  items: BriefingItem[],
  previousTotalMinutes: number | null = null,
): ReadingWindowMetrics {
  const totalMinutes = items.reduce((sum, item) => sum + calculateReadingTime(item), 0);
  const completedMinutes = items
    .filter((item) => item.read)
    .reduce((sum, item) => sum + calculateReadingTime(item), 0);
  const remainingMinutes = Math.max(0, totalMinutes - completedMinutes);
  const progressRatio = totalMinutes === 0 ? 0 : completedMinutes / totalMinutes;

  return {
    totalMinutes,
    completedMinutes,
    remainingMinutes,
    progressRatio,
    progressLabel: `${completedMinutes} / ${totalMinutes} min completed`,
    deltaVsYesterday:
      previousTotalMinutes === null ? null : totalMinutes - previousTotalMinutes,
    intensity: interpretReadingWindow(totalMinutes),
  };
}

export function interpretReadingWindow(totalMinutes: number): ReadingWindowIntensity {
  if (totalMinutes <= LIGHT_DAY_MAX_MINUTES) {
    return "Light";
  }

  if (totalMinutes <= NORMAL_DAY_MAX_MINUTES) {
    return "Normal";
  }

  return "Heavy";
}

export function formatReadingWindow(totalMinutes: number) {
  return `${totalMinutes} min`;
}

export function formatReadingDelta(deltaVsYesterday: number | null) {
  if (deltaVsYesterday === null) {
    return "First tracked day";
  }

  if (deltaVsYesterday === 0) {
    return "No change vs yesterday";
  }

  return `${deltaVsYesterday > 0 ? "+" : ""}${deltaVsYesterday} min vs yesterday`;
}

export function parseReadingWindowMinutes(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/-?\d+/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function countWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
