import { clsx, type ClassValue } from "clsx";
import { format, isToday, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBriefingDate(value: string) {
  const date = parseISO(value);
  return isToday(date) ? `Today • ${format(date, "EEEE, MMMM d")}` : format(date, "EEEE, MMMM d, yyyy");
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
