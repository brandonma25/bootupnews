/**
 * Track 2 P4 (rebuilt) — cross-date URL recurrence dedup for the signal_posts
 * write path.
 *
 * Problem: the daily-briefing selection re-stages the SAME canonical URL on
 * many briefing dates (signal_posts carried e.g. 21 copies of one SF Fed
 * "Economic Letter Countdown" across 21 dates). The original same-day URL check
 * in persistSignalPostCandidates only deduped WITHIN a single briefing_date, so
 * cross-date recurrence was never caught.
 *
 * This module is the GENERAL catch: skip a candidate whose normalized URL has
 * already appeared in signal_posts on a prior briefing_date OLDER than a grace
 * window, within a lookback window.
 *
 * ── Recurrence math (load-bearing — verified against real "Local Police" data) ──
 * MAX_CONSECUTIVE_DAYS is the most days a single URL may appear before dedup kicks
 * in. A story can run on days 1..MAX_CONSECUTIVE_DAYS; on day MAX_CONSECUTIVE_DAYS+1
 * (or any reappearance MAX_CONSECUTIVE_DAYS+ days later) it is skipped. This
 * protects genuine multi-day developing news — which, in the real data, REUSES
 * the identical URL across consecutive days (e.g. heatmap.news/am/china-uk-nuclear
 * on 06-02 AND 06-03) — while still killing sustained/gapped evergreen recurrence.
 *
 * Concretely, a candidate is skipped iff its URL appears on some prior
 * briefing_date `d` with `MAX_CONSECUTIVE_DAYS <= (briefingDate - d) <= LOOKBACK_DAYS`,
 * i.e. `d` in the window `[briefingDate - LOOKBACK_DAYS, briefingDate - MAX_CONSECUTIVE_DAYS]`.
 *
 * Worked example with MAX_CONSECUTIVE_DAYS=3 (URL "alabama-nebius-data-center-police"
 * staged 05-30, 05-31, 06-01):
 *   - day 06-01 (3rd consecutive): window = [05-02, 05-29]. Priors 05-30/05-31
 *     are NOT in the window (only 1–2 days old) → KEPT. ✓
 *   - day 06-02 (hypothetical 4th): window = [05-03, 05-30]. Prior 05-30 (3 days
 *     old) IS in the window → SKIPPED. ✓
 * (Named MAX_CONSECUTIVE_DAYS=3 rather than a grace-of-2 so the "up to 3 days"
 * semantics are self-evident at the call site — the window simply ends at
 * today - MAX_CONSECUTIVE_DAYS.)
 *
 * Dedup is on the NORMALIZED exact URL — NEVER by title or topic, so a genuine
 * new development (a different article = a different URL) is never suppressed.
 * The production URLs are clean canonical URLs (verified — no tracking params),
 * so normalization is defensive belt-and-suspenders, not load-bearing.
 *
 * Pure module: no I/O. The caller (persistSignalPostCandidates) runs the
 * windowed signal_posts query and owns the observability logging.
 */

/**
 * Max consecutive days a single URL may appear before cross-date dedup kicks in.
 * A story can run on days 1..MAX_CONSECUTIVE_DAYS; on day MAX_CONSECUTIVE_DAYS+1
 * (or any gapped reappearance ≥ MAX_CONSECUTIVE_DAYS days later) it is skipped.
 * Set to 3 so genuine multi-day developing news survives (real developing stories
 * reuse the identical URL across consecutive days).
 */
export const MAX_CONSECUTIVE_DAYS = 3;
/** How far back to look for a recurring URL. */
export const CROSS_DATE_LOOKBACK_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Query-param name patterns that are tracking noise and must be stripped before
 * comparison. Conservative + explicit — only well-known trackers, never content
 * params (a real article id like `?p=123` is preserved so two distinct articles
 * never collide).
 */
const TRACKING_PARAM_PATTERNS: RegExp[] = [
  /^utm_/i, // utm_source, utm_medium, utm_campaign, …
  /^fbclid$/i,
  /^gclid$/i,
  /^mc_(cid|eid)$/i, // Mailchimp
  /^ref$/i,
  /^ref_src$/i,
  /^source$/i,
];

/**
 * Normalize a URL for cross-date equality: lowercase host, drop `www.`, strip
 * the fragment, strip tracking query params, drop a trailing slash. Returns a
 * lowercased canonical string. Falls back to a best-effort string cleanup if
 * the URL fails to parse (never throws).
 */
export function normalizeUrlForDedup(rawUrl: string | null | undefined): string {
  const input = (rawUrl ?? "").trim();
  if (!input) return "";

  try {
    const u = new URL(input);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");

    const kept = new URLSearchParams();
    for (const [key, value] of u.searchParams) {
      if (!TRACKING_PARAM_PATTERNS.some((re) => re.test(key))) {
        kept.append(key, value);
      }
    }
    const search = kept.toString();
    const path = u.pathname.replace(/\/+$/, ""); // drop trailing slash(es)
    const out = `${u.protocol}//${u.host}${path}${search ? `?${search}` : ""}`;
    return out.toLowerCase();
  } catch {
    // Best-effort fallback: strip fragment + query + trailing slash.
    return input
      .toLowerCase()
      .replace(/#.*$/, "")
      .replace(/\?.*$/, "")
      .replace(/\/+$/, "");
  }
}

/**
 * The prior-briefing-date window to check for recurrence. Returns `null` when
 * `briefingDate` is unparseable or when the window is empty (a misconfig where
 * MAX_CONSECUTIVE_DAYS > LOOKBACK_DAYS).
 */
export function computeCrossDateWindow(
  briefingDate: string,
  opts: { maxConsecutiveDays?: number; lookbackDays?: number } = {},
): { startDate: string; endDate: string } | null {
  const maxConsecutiveDays = opts.maxConsecutiveDays ?? MAX_CONSECUTIVE_DAYS;
  const lookbackDays = opts.lookbackDays ?? CROSS_DATE_LOOKBACK_DAYS;

  const baseMs = Date.parse(`${briefingDate}T00:00:00Z`);
  if (Number.isNaN(baseMs)) return null;

  const startDate = new Date(baseMs - lookbackDays * MS_PER_DAY).toISOString().slice(0, 10);
  // Window ends at today - MAX_CONSECUTIVE_DAYS: the most-recent (MAX_CONSECUTIVE_DAYS - 1)
  // days plus today are NOT treated as recurrence, so a story may run up to
  // MAX_CONSECUTIVE_DAYS consecutive days; only an appearance MAX_CONSECUTIVE_DAYS+
  // days ago triggers a skip.
  const endDate = new Date(baseMs - maxConsecutiveDays * MS_PER_DAY).toISOString().slice(0, 10);

  if (endDate < startDate) return null;
  return { startDate, endDate };
}

export type CrossDateRecurrenceSkip<T> = {
  candidate: T;
  normalizedUrl: string;
  matchedPriorBriefingDate: string;
};

export type CrossDateRecurrenceResult<T> = {
  kept: T[];
  skipped: Array<CrossDateRecurrenceSkip<T>>;
};

/**
 * Partition candidates against the set of URLs already staged within the
 * recurrence window. `priorRows` MUST already be filtered by the caller to the
 * window returned by `computeCrossDateWindow` (the grace + lookback bounds live
 * in the SQL query). A candidate whose normalized URL matches a prior row is
 * skipped; everything else is kept.
 */
export function partitionByCrossDateRecurrence<T extends { sourceUrl?: string | null }>(
  candidates: T[],
  priorRows: Array<{ source_url: string | null; briefing_date: string | null }>,
): CrossDateRecurrenceResult<T> {
  // normalizedUrl -> most recent matching prior briefing_date (for logging).
  const seen = new Map<string, string>();
  for (const row of priorRows) {
    const normalized = normalizeUrlForDedup(row.source_url);
    if (!normalized) continue;
    const priorDate = row.briefing_date ?? "";
    const existing = seen.get(normalized);
    if (existing === undefined || priorDate > existing) {
      seen.set(normalized, priorDate);
    }
  }

  const kept: T[] = [];
  const skipped: Array<CrossDateRecurrenceSkip<T>> = [];

  for (const candidate of candidates) {
    const normalized = normalizeUrlForDedup(candidate.sourceUrl);
    const matchedPriorBriefingDate = normalized ? seen.get(normalized) : undefined;
    if (normalized && matchedPriorBriefingDate !== undefined) {
      skipped.push({ candidate, normalizedUrl: normalized, matchedPriorBriefingDate });
    } else {
      kept.push(candidate);
    }
  }

  return { kept, skipped };
}
