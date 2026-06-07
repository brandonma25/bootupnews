/**
 * Newsletter chrome reject-filter (Layer 2 — mechanism-agnostic, runs on the
 * parsed story list before anything is written/staged).
 *
 * The heuristic parser (Layer 1) tries to not emit chrome in the first place;
 * this is the defense-in-depth gate that REJECTS any candidate whose title/body
 * is structurally not a story. Every rejection is returned with a reason so the
 * caller can log counts — never a silent drop.
 *
 * Reproduction this closes (real signal_posts staged 2026-06-06, all newsletter
 * chrome): bare angle-bracket links as titles, "Follow Us" / "READ IN APP" /
 * "View this post on the web at" footer CTAs, a CAN-SPAM postal address, a
 * substack.com/redirect tracking URL, and a bloom.bg-sourced teaser fragment.
 */

export type ChromeRejectionReason =
  | "bare_url_title"
  | "boilerplate_phrase"
  | "postal_address"
  | "tracking_or_shortener_domain"
  | "below_min_prose";

export type ChromeRejection = {
  headline: string;
  reason: ChromeRejectionReason;
  detail: string;
};

export type ChromeCandidate = {
  headline: string;
  snippet: string;
  sourceUrl: string | null;
  sourceDomain: string | null;
};

/** A real story headline has at least this many alphabetic words. */
const MIN_PROSE_WORDS = 3;

/**
 * Boilerplate footer/nav/social/app-promo/legal phrases. Matched as a
 * case-insensitive substring of the headline. NOTE: kept distinct from the
 * parser's NOISE_PATTERN so the rejection is observable here (counted + logged)
 * rather than silently dropped during block-splitting.
 */
const BOILERPLATE_PHRASES = [
  "follow us",
  "read in app",
  "view this post on the web",
  "view in browser",
  "view this email",
  "view online",
  "open in app",
  "get the newsletter",
  "get the app",
  "download the app",
  "add us to your address book",
  "unsubscribe",
  "manage preferences",
  "manage your subscription",
  "update your preferences",
  "email preferences",
  "you are receiving this",
  "you're receiving this",
  "was this email forwarded",
  "all rights reserved",
  "privacy policy",
  "terms of service",
] as const;

/**
 * Tracking / redirect / link-shortener / subscription-management markers in the
 * SOURCE url. Substring match (host or path). These wrap or manage rather than
 * link to a story.
 */
const TRACKING_URL_MARKERS = [
  "bloom.bg", // Bloomberg share shortener
  "everestengagement.com", // 1440 / Everest email tracker
  "substackcdn.com", // Substack CDN redirector
  "/redirect", // substack.com/redirect/<token>, generic wrappers
  "/app-link", // substack.com/app-link/post?…
  "/account/newsletters", // bloomberg.com subscription management
  "newsletter_unsub", // unsubscribe query marker
] as const;

/**
 * US postal / CAN-SPAM footer: a state abbreviation + 5-digit ZIP, preceded
 * somewhere by a street number. Catches "… Chicago, IL 60654" and
 * "731 Lexington, New York, NY, 10022".
 */
const ZIP_STATE_PATTERN = /\b[A-Z]{2},?\s+\d{5}(?:-\d{4})?\b/;
const STREET_NUMBER_PATTERN = /\b\d{1,6}\s+[A-Za-z]/;

function stripLinks(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ") // angle-bracket links/markup
    .replace(/https?:\/\/[^\s)<>"'\]]+/gi, " ") // bare URLs
    .replace(/\(\s*\)/g, " ");
}

/** True when, after removing all URLs/links/markup/punctuation, almost nothing real remains. */
export function isBareUrlTitle(headline: string): boolean {
  const remainder = stripLinks(headline)
    .replace(/[()[\]<>|·•@.,;:!?+_/\\=&%$#*~^`"'’“”\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return remainder.length < 4;
}

/** Count alphabetic words, ignoring URLs/links. */
export function proseWordCount(value: string): number {
  const text = stripLinks(value);
  return (text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length;
}

function looksLikePostalAddress(headline: string): boolean {
  return ZIP_STATE_PATTERN.test(headline) && STREET_NUMBER_PATTERN.test(headline);
}

/**
 * Classify a parsed candidate as a real story or chrome. Returns the rejection
 * reason when it is chrome, so the caller can roll up counts for observability.
 */
export function classifyNewsletterChrome(candidate: ChromeCandidate):
  | { rejected: false }
  | { rejected: true; reason: ChromeRejectionReason; detail: string } {
  const headline = candidate.headline.trim();
  const lower = headline.toLowerCase();

  if (isBareUrlTitle(headline)) {
    return { rejected: true, reason: "bare_url_title", detail: headline.slice(0, 80) };
  }

  for (const phrase of BOILERPLATE_PHRASES) {
    if (lower.includes(phrase)) {
      return { rejected: true, reason: "boilerplate_phrase", detail: phrase };
    }
  }

  if (looksLikePostalAddress(headline)) {
    return { rejected: true, reason: "postal_address", detail: headline.slice(0, 80) };
  }

  const url = (candidate.sourceUrl ?? "").toLowerCase();
  if (url) {
    for (const marker of TRACKING_URL_MARKERS) {
      if (url.includes(marker)) {
        return { rejected: true, reason: "tracking_or_shortener_domain", detail: marker };
      }
    }
  }

  if (proseWordCount(headline) < MIN_PROSE_WORDS) {
    return { rejected: true, reason: "below_min_prose", detail: `words=${proseWordCount(headline)}` };
  }

  return { rejected: false };
}

/** Roll up rejections for a single log line (count + per-reason breakdown). */
export function summarizeChromeRejections(rejections: ChromeRejection[]): {
  count: number;
  byReason: Record<ChromeRejectionReason, number>;
} {
  const byReason: Record<ChromeRejectionReason, number> = {
    bare_url_title: 0,
    boilerplate_phrase: 0,
    postal_address: 0,
    tracking_or_shortener_domain: 0,
    below_min_prose: 0,
  };
  for (const rejection of rejections) {
    byReason[rejection.reason] += 1;
  }
  return { count: rejections.length, byReason };
}
