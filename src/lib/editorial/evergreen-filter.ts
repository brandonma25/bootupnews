/**
 * Track 2 P7 — selection-side evergreen/explainer filter.
 *
 * Background: PR #296 / Track 2 P4 kills cross-date REPEAT (the same evergreen
 * article being staged on day N+1 after appearing on day N). But the DEBUT
 * still happens — a "how does inflation work" explainer republished today
 * still wins its slot on its first appearance. P7 catches the debut by
 * filtering evergreen/explainer content *before* scoring, regardless of
 * whether the URL was seen before.
 *
 * The filter is CONFIG-DRIVEN — no hardcoded patterns in this file. The
 * defaults exported below are a starting point only; production picks them
 * up via env var EVERGREEN_FILTER_CONFIG_JSON (parsed JSON). This makes the
 * filter tunable without code changes when patterns shift.
 *
 * Signals:
 *
 *   1. Title patterns (regex denylist, hard reject).
 *      "explainer", "what is", "how X works", "the ultimate guide", "year in
 *      review", "most read", "countdown", etc. These titles indicate evergreen
 *      content even when the publication is reputable.
 *
 *   2. Source denylist (hard reject).
 *      Per-feed reputation list. Sources that exclusively publish
 *      evergreens/explainers get filtered upstream of the ranker.
 *
 *   3. URL date-path drift (soft penalty, ranker-side).
 *      If the URL embeds a date (e.g. /2024/03/15/...) older than the briefing
 *      date by more than `urlDatePathMaxAgeDays`, apply a score penalty.
 *      A penalty rather than a hard reject because some legitimately old news
 *      (anniversaries, retrospectives) is editorially useful.
 *
 * Output contract (mirrors PR P4's `candidatesFiltered*` counter pattern):
 *
 *   - `passed`: candidates that survived the filter (with penalty applied to
 *     baseScore where date-path drift triggered).
 *   - `rejected`: candidates removed (title or source match). Surfaced in
 *     summary as `candidatesFilteredEvergreen: number` for observability.
 *   - `penaltyAppliedCount`: candidates whose baseScore was reduced.
 *
 * Sentry/Notion side-effects: NONE. This module is pure — observability lives
 * with the caller (runner.ts) where the counter is logged + written to summary.
 */

import type { MergedCandidate } from "@/lib/editorial-staging/dedup";

export type EvergreenFilterConfig = {
  /**
   * Title regex patterns (source strings — compiled with `i` flag). A
   * candidate whose headline matches ANY pattern is hard-rejected.
   */
  titlePatterns: string[];
  /**
   * Source denylist — exact case-insensitive match against candidate.source.
   * Surfaced both for source_name (e.g. "Verge") and source_domain
   * (e.g. "theverge.com") because the upstream feed can carry either.
   */
  sourceDenylist: string[];
  /**
   * Evergreen-prone FEED patterns — case-insensitive SUBSTRING match against
   * the candidate URL (host+path). The PRIMARY evergreen signal: some feeds
   * publish almost exclusively non-time-sensitive research/explainers, so a
   * URL under one of these prefixes is flagged evergreen regardless of its
   * title. Seeded with the three feeds that produced all eight quantified
   * recurring evergreens (SF Fed research blog, FRED Blog, NY Fed Liberty
   * Street Economics). Tunable via the env-var override.
   */
  evergreenProneFeedUrlPatterns: string[];
  /**
   * Maximum age (days) of a date embedded in the URL path before the date-
   * path-drift penalty kicks in. Calibrated for "today minus N days" — a 14-
   * day window covers weekly newsletters and Sunday-edition recaps without
   * penalizing them.
   */
  urlDatePathMaxAgeDays: number;
  /**
   * Score penalty applied to baseScore when URL date-path drift triggers.
   * Negative number subtracted from baseScore. Not a hard reject — leaves
   * room for editorially-warranted retrospectives.
   */
  urlDatePathPenalty: number;
};

/**
 * Confirmed evergreen-prone feeds (host+path prefixes). These three feeds
 * produced ALL EIGHT quantified recurring evergreens in production
 * (signal_posts 2026-04..06): SF Fed research blog, FRED Blog, and NY Fed
 * Liberty Street Economics. Content under these prefixes is non-time-sensitive
 * research/explainer material and is flagged evergreen by SOURCE — the only
 * signal that catches title-clean offenders like "The AI Investing Landscape".
 * Exported so it is auditable + reusable; tunable via the env-var override.
 */
export const EVERGREEN_PRONE_FEEDS = [
  "frbsf.org/research-and-insights/blog/sf-fed-blog",
  "fredblog.stlouisfed.org",
  "libertystreeteconomics.newyorkfed.org",
];

/**
 * Built-in defaults. Used when env var EVERGREEN_FILTER_CONFIG_JSON is
 * unset/invalid. Reflect the patterns the editor flagged manually in the
 * 2026-06-01..06-03 review window — kept short enough to audit, broad enough
 * to catch the common-case evergreens.
 *
 * Production overrides this via env var; the defaults are starting points.
 * NOTE: per-field fallback in resolveEvergreenFilterConfig means a prod
 * override of `titlePatterns` does NOT drop `evergreenProneFeedUrlPatterns`
 * (and vice-versa) — the feed (PRIMARY) signal stays active even if an old
 * env override only customised the title list.
 */
export const DEFAULT_EVERGREEN_FILTER_CONFIG: EvergreenFilterConfig = {
  titlePatterns: [
    // "What is X" / "What are X"
    "^\\s*what\\s+(?:is|are|was|were)\\b",
    // "How are/is/does X measured/work…" — CLOSED GAP: added are|is so
    // "How are benchmark borrowing costs measured?" is now caught (the old
    // pattern only listed does|do|did|to|the).
    "^\\s*how\\s+(?:are|is|do|does|did|to|the)\\b",
    // "Why exclude/do/does/is/are …" explainer prefix — CLOSED GAP: catches
    // "Why exclude food and energy from inflation measures?".
    "^\\s*why\\s+(?:exclude|do|does|is|are)\\b",
    // "Explained" / "Explainer"
    "\\bexplain(?:ed|er)\\b",
    // "Year in review" / "Decade in review"
    "\\b(?:year|decade|month)\\s+in\\s+review\\b",
    // "Most read" / "Most popular" (editorial leaderboards)
    "\\bmost\\s+(?:read|popular|viewed)\\b",
    // "Countdown" / "Top 10 of all time"
    "\\bcountdown\\b",
    "\\btop\\s+\\d+\\b.*\\b(?:of\\s+all\\s+time|ever|to\\s+know)\\b",
    // "The ultimate guide" / "A beginner's guide"
    "\\b(?:the\\s+ultimate|a\\s+beginner['s]+|complete)\\s+guide\\b",
    // "Everything you need to know" — classic evergreen tell
    "\\beverything\\s+you\\s+need\\s+to\\s+know\\b",
  ],
  sourceDenylist: [
    // Intentionally empty by default. Operator adds entries via env-var
    // override once a per-feed reputation pattern is established.
  ],
  evergreenProneFeedUrlPatterns: EVERGREEN_PRONE_FEEDS,
  urlDatePathMaxAgeDays: 14,
  urlDatePathPenalty: 30,
};

/**
 * Resolve config: env var override wins; falls back to built-in defaults.
 * Invalid JSON or schema mismatch falls back silently (with a console.warn)
 * — we never want a misconfigured env var to break ingestion.
 */
export function resolveEvergreenFilterConfig(
  env: NodeJS.ProcessEnv = process.env,
): EvergreenFilterConfig {
  const raw = env.EVERGREEN_FILTER_CONFIG_JSON?.trim();
  if (!raw) return DEFAULT_EVERGREEN_FILTER_CONFIG;

  try {
    const parsed = JSON.parse(raw) as Partial<EvergreenFilterConfig>;
    return {
      titlePatterns: Array.isArray(parsed.titlePatterns)
        ? parsed.titlePatterns.filter((s): s is string => typeof s === "string")
        : DEFAULT_EVERGREEN_FILTER_CONFIG.titlePatterns,
      sourceDenylist: Array.isArray(parsed.sourceDenylist)
        ? parsed.sourceDenylist.filter((s): s is string => typeof s === "string")
        : DEFAULT_EVERGREEN_FILTER_CONFIG.sourceDenylist,
      evergreenProneFeedUrlPatterns: Array.isArray(parsed.evergreenProneFeedUrlPatterns)
        ? parsed.evergreenProneFeedUrlPatterns.filter((s): s is string => typeof s === "string")
        : DEFAULT_EVERGREEN_FILTER_CONFIG.evergreenProneFeedUrlPatterns,
      urlDatePathMaxAgeDays:
        typeof parsed.urlDatePathMaxAgeDays === "number" && parsed.urlDatePathMaxAgeDays > 0
          ? parsed.urlDatePathMaxAgeDays
          : DEFAULT_EVERGREEN_FILTER_CONFIG.urlDatePathMaxAgeDays,
      urlDatePathPenalty:
        typeof parsed.urlDatePathPenalty === "number" && parsed.urlDatePathPenalty >= 0
          ? parsed.urlDatePathPenalty
          : DEFAULT_EVERGREEN_FILTER_CONFIG.urlDatePathPenalty,
    };
  } catch {
    // Silently fall back; runner.ts logs the env-var-read attempt separately.
    return DEFAULT_EVERGREEN_FILTER_CONFIG;
  }
}

/**
 * Compile string patterns to RegExp objects. Invalid patterns are dropped
 * (we never throw — bad regex in env var must not break ingestion).
 */
function compilePatterns(patterns: string[]): RegExp[] {
  const compiled: RegExp[] = [];
  for (const pattern of patterns) {
    try {
      compiled.push(new RegExp(pattern, "i"));
    } catch {
      // Drop the bad pattern. Caller logs nothing — config is operator-owned.
    }
  }
  return compiled;
}

/**
 * Extract a YYYY-MM-DD from a URL path, if present. Matches the common date
 * shapes embedded in article paths:
 *
 *   /2024/03/15/...     (Politico, Reuters, NYT)
 *   /2024-03-15/...     (some Bloomberg endpoints)
 *   /article/2024/03/15 (Axios variants)
 *
 * Returns null if no date is embedded. We intentionally accept only 4-digit
 * years (1990-2099) to avoid matching IDs.
 */
export function extractDateFromUrl(url: string): { year: number; month: number; day: number } | null {
  try {
    const path = new URL(url).pathname;
    // Try /YYYY/MM/DD/ or /YYYY-MM-DD
    const m = path.match(/(?:^|\/)(19\d{2}|20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])(?:[/-]|$)/);
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  } catch {
    return null;
  }
}

/**
 * Calendar-day age of a URL-embedded date relative to a YYYY-MM-DD
 * briefingDate. Returns `briefingDate - urlDate` in whole days — positive
 * when urlDate is older than briefingDate, zero when same, negative when
 * urlDate is in the future. Returns null if briefingDate fails to parse.
 */
function calendarDaysOlder(
  urlDate: { year: number; month: number; day: number },
  briefingDate: string,
): number | null {
  const [by, bm, bd] = briefingDate.split("-").map(Number);
  if (!by || !bm || !bd) return null;
  const urlMs = Date.UTC(urlDate.year, urlDate.month - 1, urlDate.day);
  const briefingMs = Date.UTC(by, bm - 1, bd);
  return Math.round((briefingMs - urlMs) / (24 * 60 * 60 * 1000));
}

/**
 * Which signal flagged a candidate as evergreen:
 *   - "feed"   — URL matched an evergreen-prone feed prefix (PRIMARY signal).
 *   - "source" — source name matched the source denylist.
 *   - "title"  — headline matched a title regex pattern.
 */
export type EvergreenSignal = "feed" | "source" | "title";

/**
 * Generic, shape-agnostic evergreen classifier — the SINGLE SOURCE OF TRUTH
 * for "is this candidate evergreen?". Used by BOTH the briefing-selection path
 * (data.ts, on BriefingItem) and the editorial-staging backstop (runner.ts,
 * via applyEvergreenFilter on MergedCandidate). Signal precedence: feed →
 * source → title (the order they are most reliable). Pure; no I/O.
 */
export function classifyEvergreen(
  input: { title?: string | null; source?: string | null; url?: string | null },
  config: EvergreenFilterConfig,
): { isEvergreen: boolean; signal: EvergreenSignal | null } {
  // 1. PRIMARY — evergreen-prone feed (case-insensitive URL substring).
  const urlLower = (input.url || "").toLowerCase();
  if (urlLower) {
    for (const feed of config.evergreenProneFeedUrlPatterns) {
      const needle = feed.trim().toLowerCase();
      if (needle && urlLower.includes(needle)) {
        return { isEvergreen: true, signal: "feed" };
      }
    }
  }

  // 2. Source denylist (case-insensitive exact match).
  const sourceLower = (input.source || "").trim().toLowerCase();
  if (sourceLower) {
    for (const denied of config.sourceDenylist) {
      if (denied.trim().toLowerCase() === sourceLower) {
        return { isEvergreen: true, signal: "source" };
      }
    }
  }

  // 3. Title regex denylist.
  const headline = input.title || "";
  if (headline) {
    for (const regex of compilePatterns(config.titlePatterns)) {
      if (regex.test(headline)) {
        return { isEvergreen: true, signal: "title" };
      }
    }
  }

  return { isEvergreen: false, signal: null };
}

export type EvergreenFilterResult = {
  passed: MergedCandidate[];
  rejected: Array<{ candidate: MergedCandidate; reason: EvergreenSignal }>;
  /**
   * Mirrors PR #296 / P4's `candidatesFilteredCrossDateDedup` counter.
   * Equals `rejected.length`, but surfaced separately so the runner.ts
   * summary type can hold it as a top-level field.
   */
  candidatesFilteredEvergreen: number;
  /**
   * Count of `passed` candidates whose baseScore was reduced by the URL
   * date-path drift penalty. Visible in the summary so we can spot when
   * the soft penalty is doing the work vs. the hard filter.
   */
  candidatesPenalizedEvergreen: number;
};

/**
 * Apply evergreen/explainer filter to merged candidates.
 *
 * Order:
 *   1. Hard reject on source denylist (case-insensitive exact match).
 *   2. Hard reject on title regex denylist.
 *   3. Soft penalty on URL date-path drift (URL embeds a date older than
 *      `briefingDate` by > `urlDatePathMaxAgeDays`).
 *
 * Pure function. No I/O, no Sentry calls — runner.ts owns observability.
 */
export function applyEvergreenFilter(
  candidates: MergedCandidate[],
  options: {
    config: EvergreenFilterConfig;
    briefingDate: string; // YYYY-MM-DD
  },
): EvergreenFilterResult {
  const { config, briefingDate } = options;
  const passed: MergedCandidate[] = [];
  const rejected: EvergreenFilterResult["rejected"] = [];
  let penalized = 0;

  for (const candidate of candidates) {
    // Hard reject via the shared classifier (precedence: feed → source → title).
    const verdict = classifyEvergreen(
      { title: candidate.headline, source: candidate.source, url: candidate.url },
      config,
    );
    if (verdict.isEvergreen && verdict.signal) {
      rejected.push({ candidate, reason: verdict.signal });
      continue;
    }

    // Soft penalty: URL date-path drift. Subtract `urlDatePathPenalty`
    // from baseScore when the URL embeds a date older than
    // `urlDatePathMaxAgeDays` calendar days. Not a hard reject because
    // some legitimately old news (anniversaries, retrospectives) is
    // editorially useful — the penalty just lowers their odds of beating
    // a fresh story in scoreAndSelect.
    let baseScore = candidate.baseScore;
    const urlDate = extractDateFromUrl(candidate.url || "");
    if (urlDate) {
      const age = calendarDaysOlder(urlDate, briefingDate);
      if (age !== null && age > config.urlDatePathMaxAgeDays) {
        baseScore = Math.max(0, baseScore - config.urlDatePathPenalty);
        penalized += 1;
      }
    }

    passed.push({ ...candidate, baseScore });
  }

  return {
    passed,
    rejected,
    candidatesFilteredEvergreen: rejected.length,
    candidatesPenalizedEvergreen: penalized,
  };
}
