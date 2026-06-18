import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBriefingDate(value: string, now = new Date()) {
  const date = parseISO(value);
  // Compare "today" in Taipei (the zone briefing_date is keyed to), not server-local
  // — otherwise a Taipei date-key reads as not-today for the 16:00–24:00 UTC window.
  const isTaipeiToday = getBriefingDateKey(value) === getTaipeiDateKey(now);
  return isTaipeiToday ? `Today • ${format(date, "EEEE, MMMM d")}` : format(date, "EEEE, MMMM d, yyyy");
}

export function formatHomeBriefingDateLabel(value: string, now = new Date()) {
  const date = parseISO(value);
  // briefing_date is keyed to the Taipei calendar day; "Today" must compare in
  // the same zone or a fresh slate reads as yesterday for the 16:00–24:00 UTC window.
  const todayKey = getTaipeiDateKey(now);
  const briefingDateKey = getBriefingDateKey(value);

  if (briefingDateKey === todayKey) {
    return `Today • ${format(date, "EEEE, MMMM d")}`;
  }

  return format(date, "EEEE, MMMM d, yyyy");
}

export function getBriefingDateKey(value: string) {
  return value.trim().slice(0, 10);
}

/** The Taipei calendar date (YYYY-MM-DD) — the zone briefing_date is keyed to. */
export function getTaipeiDateKey(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isValidBriefingDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

export function stripHtml(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function firstSentence(value: string, fallback: string) {
  const clean = stripHtml(value);
  const [sentence] = clean.split(/(?<=[.!?])\s+/);
  return sentence?.trim() || fallback;
}

export function minutesToLabel(minutes: number) {
  return `${minutes} min`;
}
