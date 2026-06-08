/**
 * Decoupled article-body extraction stage (the source_accessibility unblock).
 *
 * Selects the top-N importance-ranked, abstract-only, NON-paywalled candidates
 * the main pipeline left blocked at the coreSupported full-text gate, fetches +
 * extracts their bodies under a hard wall-clock cap, and persists
 * extracted_body_text/length/status/attempted_at back to
 * pipeline_article_candidates. The NEXT main run reads extracted_body_text in
 * ingestion (toRawItem) so the existing accessibility classifier admits the
 * genuine news — NO threshold is changed here.
 *
 * Structural safety (this is the whole point):
 *   - Own endpoint / own schedule. Never executes inside, blocks, or shares a
 *     budget with /api/cron/fetch-editorial-inputs. Worst case = it writes
 *     nothing and the main cron reads an empty column, i.e. behaves as today.
 *   - Absolute deadline via runWithDeadline (Promise.race vs a timer), per-fetch
 *     timeout, concurrency cap. All env-overridable named constants below.
 *   - Bounded: never fetches all candidates — capped at the surface-pool size.
 */
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { errorContext, logServerEvent } from "@/lib/observability";
import { resolveSurfacePoolSize } from "@/lib/pipeline/surface-pool";
import {
  SUBSTANTIAL_ABSTRACT_THRESHOLD,
  isLikelyPaywalledArticleSource,
} from "@/lib/source-accessibility";
import { fetchAndExtractBody, isCoreSupportedWith, runWithDeadline } from "./extractor";

const ROUTE = "/api/cron/extract-article-bodies";

/** Hard wall-clock cap for the whole stage. */
export const DEFAULT_EXTRACTION_BUDGET_MS = 12_000;
/** Per-article fetch timeout (AbortSignal.timeout). */
export const DEFAULT_PER_FETCH_TIMEOUT_MS = 2_500;
/** Max concurrent article fetches. */
export const DEFAULT_EXTRACTION_CONCURRENCY = 10;
/** How far back to look for un-extracted candidates from the latest run(s). */
const SELECTION_LOOKBACK_HOURS = 36;
/** Eligibility tiers that mean "evaluated but blocked before core" — the set
 * extraction can rescue. core/context already cleared; null = pre-scoring drop. */
const BLOCKED_TIERS = ["depth_only", "exclude_from_public_candidates"];

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

export type ArticleExtractionRunSummary = {
  candidatesSelected: number;
  fetchesAttempted: number;
  fetchesSucceeded: number;
  fetchesTimedOut: number;
  fetchesFailed: number;
  /** The key metric: candidates that flip coreSupported false→true via extraction. */
  coreSupportedTransitions: number;
  totalStageMs: number;
  budgetMs: number;
  hitDeadline: boolean;
  message: string;
};

type CandidateRow = {
  id: string;
  canonical_url: string | null;
  title: string | null;
  source_name: string | null;
  source_class: string | null;
  source_tier: string | null;
  summary: string | null;
  event_importance: number | null;
  eligibility_tier: string | null;
};

function emptySummary(message: string, budgetMs: number): ArticleExtractionRunSummary {
  return {
    candidatesSelected: 0,
    fetchesAttempted: 0,
    fetchesSucceeded: 0,
    fetchesTimedOut: 0,
    fetchesFailed: 0,
    coreSupportedTransitions: 0,
    totalStageMs: 0,
    budgetMs,
    hitDeadline: false,
    message,
  };
}

/**
 * Run the extraction stage. Best-effort end-to-end: any failure resolves to a
 * summary (never throws), so a broken stage degrades to "no improvement".
 */
export async function runArticleBodyExtraction(
  options: { now?: Date; dryRun?: boolean } = {},
): Promise<ArticleExtractionRunSummary> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const budgetMs = envInt("EXTRACTION_BUDGET_MS", DEFAULT_EXTRACTION_BUDGET_MS);
  const perFetchMs = envInt("PER_FETCH_TIMEOUT_MS", DEFAULT_PER_FETCH_TIMEOUT_MS);
  const concurrency = envInt("EXTRACTION_CONCURRENCY", DEFAULT_EXTRACTION_CONCURRENCY);
  const maxFetches = envInt("EXTRACTION_MAX_FETCHES", resolveSurfacePoolSize());

  const db = createSupabaseServiceRoleClient();
  if (!db) {
    logServerEvent("error", "Article extraction skipped: no service-role client", { route: ROUTE });
    return emptySummary("Supabase service-role client is not configured.", budgetMs);
  }

  // --- Selection (principle C: bounded, top-N importance, abstract-only, non-paywalled) ---
  let rows: CandidateRow[] = [];
  try {
    const cutoffIso = new Date(now.getTime() - SELECTION_LOOKBACK_HOURS * 3_600_000).toISOString();
    const result = await db
      .from("pipeline_article_candidates")
      .select(
        "id, canonical_url, title, source_name, source_class, source_tier, summary, event_importance, eligibility_tier",
      )
      .gte("ingested_at", cutoffIso)
      .is("extraction_status", null)
      .in("eligibility_tier", BLOCKED_TIERS)
      .not("canonical_url", "is", null)
      .order("event_importance", { ascending: false, nullsFirst: false })
      // Over-select so paywall/short-summary/dedupe filtering still yields up to
      // maxFetches genuine targets; the hard cap is applied after filtering.
      .limit(maxFetches * 4);
    if (result.error) throw result.error;
    rows = (result.data ?? []) as CandidateRow[];
  } catch (error) {
    logServerEvent("error", "Article extraction candidate selection failed", {
      route: ROUTE,
      ...errorContext(error),
    });
    return emptySummary("Candidate selection query failed.", budgetMs);
  }

  const seen = new Set<string>();
  const selected: CandidateRow[] = [];
  for (const row of rows) {
    const url = (row.canonical_url ?? "").trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    // Only candidates currently BELOW the abstract-core bar benefit from a body
    // fetch; longer summaries already clear (or fail for non-accessibility reasons).
    if ((row.summary ?? "").length >= SUBSTANTIAL_ABSTRACT_THRESHOLD) continue;
    // Exclude paywalled hosts — their full text can't be grounded (reuse the
    // existing list; do not duplicate).
    if (isLikelyPaywalledArticleSource({ sourceName: row.source_name, url })) continue;
    seen.add(key);
    selected.push(row);
    if (selected.length >= maxFetches) break;
  }

  if (selected.length === 0) {
    logServerEvent("info", "Article extraction: no eligible candidates to fetch", {
      route: ROUTE,
      scanned: rows.length,
      maxFetches,
    });
    return { ...emptySummary("No eligible candidates.", budgetMs), candidatesSelected: 0 };
  }

  let fetchesSucceeded = 0;
  let fetchesTimedOut = 0;
  let fetchesFailed = 0;
  let coreSupportedTransitions = 0;

  const persist = async (id: string, values: Record<string, unknown>) => {
    if (dryRun) return;
    try {
      const result = await db.from("pipeline_article_candidates").update(values).eq("id", id);
      if (result.error) throw result.error;
    } catch (error) {
      logServerEvent("warn", "Article extraction: candidate persist failed (non-blocking)", {
        route: ROUTE,
        candidateId: id,
        ...errorContext(error),
      });
    }
  };

  const worker = async (row: CandidateRow): Promise<void> => {
    const attemptedAt = new Date().toISOString();
    const result = await fetchAndExtractBody(row.canonical_url ?? "", perFetchMs);

    if (!result.ok) {
      if (result.reason === "timeout") fetchesTimedOut += 1;
      else fetchesFailed += 1;
      await persist(row.id, { extraction_status: result.reason, extraction_attempted_at: attemptedAt });
      return;
    }

    const accessibilityInput = {
      title: row.title ?? "",
      url: row.canonical_url ?? "",
      sourceName: row.source_name ?? "",
      sourceClass: row.source_class,
      sourceTier: row.source_tier,
      summaryText: row.summary ?? "",
    };
    // before = how the main pipeline saw it (abstract only, no body);
    // after = with the freshly-extracted body. Count the false→true flips.
    const before = isCoreSupportedWith({ ...accessibilityInput, contentText: "" });
    const after = isCoreSupportedWith({ ...accessibilityInput, contentText: result.text });
    if (!before && after) coreSupportedTransitions += 1;

    fetchesSucceeded += 1;
    await persist(row.id, {
      extracted_body_text: result.text,
      extracted_text_length: result.text.length,
      extraction_status: "success",
      extraction_attempted_at: attemptedAt,
    });
  };

  const outcome = await runWithDeadline(selected, worker, { budgetMs, concurrency });

  // Graceful degrade: anything not finished by the wall-clock cap is recorded as
  // 'timeout' so it isn't re-selected forever and the metric is honest.
  if (outcome.unprocessed.length > 0) {
    fetchesTimedOut += outcome.unprocessed.length;
    if (!dryRun) {
      try {
        await db
          .from("pipeline_article_candidates")
          .update({ extraction_status: "timeout", extraction_attempted_at: new Date().toISOString() })
          .in(
            "id",
            outcome.unprocessed.map((row) => row.id),
          );
      } catch (error) {
        logServerEvent("warn", "Article extraction: timeout-marking failed (non-blocking)", {
          route: ROUTE,
          ...errorContext(error),
        });
      }
    }
  }

  const summary: ArticleExtractionRunSummary = {
    candidatesSelected: selected.length,
    fetchesAttempted: outcome.processed.length,
    fetchesSucceeded,
    fetchesTimedOut,
    fetchesFailed,
    coreSupportedTransitions,
    totalStageMs: outcome.elapsedMs,
    budgetMs,
    hitDeadline: outcome.timedOut,
    message: `Extracted ${fetchesSucceeded}/${selected.length} bodies; ${coreSupportedTransitions} coreSupported transitions.`,
  };

  // Single structured line so one log filter answers "+N genuine items unblocked".
  logServerEvent("info", "article_extraction_metrics", { route: ROUTE, dryRun, ...summary });
  return summary;
}
