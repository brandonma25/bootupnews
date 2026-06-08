/**
 * Article full-text extraction — pure, dependency-light helpers (no DB, no env).
 *
 * The decoupled extraction cron uses these to fetch an article body and decide
 * whether the freshly-extracted text would flip a candidate to coreSupported.
 * Kept pure so the bounded/budgeted control flow (runWithDeadline) and the
 * coreSupported-transition metric are unit-testable without a database.
 *
 * No new dependencies: HTML → text uses the existing stripHtml() + a small
 * server-side main-content heuristic (prefer <article>, else <p> join). It does
 * NOT need to be perfect — it only has to supply enough real body text for the
 * EXISTING source-accessibility thresholds (≥1200 full / ≥500 partial) to admit
 * genuine news. Downstream importance/specificity gates re-judge quality.
 */
import type { FeedArticle } from "@/lib/rss";
import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { SourceDefinition } from "@/lib/integration/subsystem-contracts";
import {
  buildArticleSourceAccessibility,
  evaluateSourceAccessibilitySupport,
} from "@/lib/source-accessibility";
import { stripHtml } from "@/lib/utils";

/** Real-browser UA + html Accept — mirrors the RSS fetch UA so bot-walls behave
 * the same. (Article pages want text/html, not the RSS xml Accept set.) */
export const ARTICLE_FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BootUpNews/1.0 " +
    "(+https://bootupnews.com)",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// Strip non-article chrome before extracting. Paired open/close tags only.
const CHROME_BLOCK_RE =
  /<(script|style|noscript|nav|header|footer|aside|form|svg|figure|iframe|template)\b[^>]*>[\s\S]*?<\/\1>/gi;
const ARTICLE_RE = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
const PARAGRAPH_RE = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
const MIN_PARAGRAPH_LEN = 40;
const MIN_ARTICLE_REGION_LEN = 400;

function longestMatch(html: string, re: RegExp): string | null {
  let best: string | null = null;
  for (const match of html.matchAll(re)) {
    const body = match[1] ?? "";
    if (!best || body.length > best.length) best = body;
  }
  return best;
}

/**
 * Extract the main article text from a raw HTML document. Conservative: removes
 * script/style/nav/header/footer/aside chrome, prefers a substantial <article>
 * region, then joins the meaningful <p> blocks (falling back to a full strip).
 */
export function extractMainText(html: string): string {
  if (!html) return "";
  const dechromed = html.replace(CHROME_BLOCK_RE, " ");

  const articleRegion = longestMatch(dechromed, ARTICLE_RE);
  const region =
    articleRegion && stripHtml(articleRegion).length >= MIN_ARTICLE_REGION_LEN
      ? articleRegion
      : dechromed;

  const paragraphs: string[] = [];
  for (const match of region.matchAll(PARAGRAPH_RE)) {
    const text = stripHtml(match[1] ?? "").trim();
    if (text.length >= MIN_PARAGRAPH_LEN) paragraphs.push(text);
  }

  const joined = paragraphs.length > 0 ? paragraphs.join("\n\n") : stripHtml(region);
  return joined.replace(/[ \t ]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export type FetchExtractResult =
  | { ok: true; text: string; finalUrl: string }
  | { ok: false; reason: "timeout" | "failed" };

/**
 * Fetch one article URL (real UA, follow redirects) under a per-fetch timeout
 * enforced by AbortSignal.timeout, and return its extracted main text. Never
 * throws — a network error / non-2xx / non-html / empty body resolves to a
 * structured failure so the caller can record a terminal extraction_status.
 */
export async function fetchAndExtractBody(
  url: string,
  perFetchTimeoutMs: number,
): Promise<FetchExtractResult> {
  try {
    const response = await fetch(url, {
      headers: ARTICLE_FETCH_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(perFetchTimeoutMs),
    });
    if (!response.ok) return { ok: false, reason: "failed" };
    const contentType = response.headers.get("content-type") ?? "";
    if (!/html|xml|text\//i.test(contentType)) return { ok: false, reason: "failed" };

    const html = await response.text();
    const text = extractMainText(html);
    if (!text) return { ok: false, reason: "failed" };
    return { ok: true, text, finalUrl: response.url || url };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const reason = name === "TimeoutError" || name === "AbortError" ? "timeout" : "failed";
    return { ok: false, reason };
  }
}

export type DeadlineOutcome<T, R> = {
  results: Array<{ item: T; value: R }>;
  processed: T[];
  /** Items never started OR still in flight when the wall-clock cap fired. */
  unprocessed: T[];
  timedOut: boolean;
  elapsedMs: number;
};

/**
 * Run `worker` over `items` with a concurrency cap AND an absolute wall-clock
 * deadline enforced by Promise.race against a timer — NOT by trusting each
 * worker to be fast. When the deadline fires we stop dispatching and return
 * immediately with whatever finished; the caller persists those and marks the
 * rest as timed out. `worker` must resolve (never throw); a throw is swallowed
 * and the item counts as unprocessed.
 */
export async function runWithDeadline<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  opts: { budgetMs: number; concurrency: number; now?: () => number },
): Promise<DeadlineOutcome<T, R>> {
  const now = opts.now ?? (() => Date.now());
  const start = now();
  const results: Array<{ item: T; value: R }> = [];
  const processed = new Set<T>();
  const queue = items.slice();
  let deadlineHit = false;

  const deadline = new Promise<void>((resolve) => {
    setTimeout(() => {
      deadlineHit = true;
      resolve();
    }, opts.budgetMs);
  });

  const pool = new Promise<void>((resolvePool) => {
    let active = 0;
    const pump = () => {
      if (queue.length === 0 && active === 0) {
        resolvePool();
        return;
      }
      while (!deadlineHit && active < opts.concurrency && queue.length > 0) {
        const item = queue.shift() as T;
        active += 1;
        Promise.resolve(worker(item))
          .then((value) => {
            results.push({ item, value });
            processed.add(item);
          })
          .catch(() => {
            /* worker contract: resolve, don't throw — swallow to avoid pool stall */
          })
          .finally(() => {
            active -= 1;
            pump();
          });
      }
      if (deadlineHit && active === 0) resolvePool();
    };
    pump();
  });

  await Promise.race([pool, deadline]);
  const unprocessed = items.filter((item) => !processed.has(item));
  return { results, processed: [...processed], unprocessed, timedOut: deadlineHit, elapsedMs: now() - start };
}

/**
 * Reuse the PRODUCTION source-accessibility evaluator to decide coreSupported
 * for a single candidate given a body text — no threshold is re-implemented
 * here. Used to compute the before/after transition metric (the key prod
 * measurement: how many candidates flip false→true after extraction).
 */
export function isCoreSupportedWith(input: {
  title: string;
  url: string;
  sourceName: string;
  sourceClass: string | null;
  sourceTier: string | null;
  summaryText: string;
  contentText: string;
}): boolean {
  const feedArticle = {
    title: input.title,
    url: input.url,
    summaryText: input.summaryText,
    contentText: input.contentText,
    extractionMethod: input.contentText ? "readability" : "rss_summary",
  } as unknown as FeedArticle;

  const sourceDefinition = {
    source: input.sourceName,
    sourceClass: input.sourceClass ?? undefined,
    trustTier: input.sourceTier ?? undefined,
    publicEligible: true,
    suppliedByManifest: false,
    homepageUrl: input.url,
    fetch: { feedUrl: input.url },
  } as unknown as SourceDefinition;

  const diagnostics = buildArticleSourceAccessibility(feedArticle, sourceDefinition);
  const article = {
    source: input.sourceName,
    source_metadata: { sourceId: input.url },
    source_accessibility: diagnostics,
  } as unknown as NormalizedArticle;

  return evaluateSourceAccessibilitySupport([article]).coreSupported;
}
