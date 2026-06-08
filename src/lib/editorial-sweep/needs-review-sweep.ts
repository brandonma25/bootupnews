import { captureMessageSafe, flushSafe } from "@/lib/sentry-config";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { errorContext, logServerEvent } from "@/lib/observability";
import { writePipelineLogEntry } from "@/lib/observability/pipeline-log";

/**
 * needs_review TTL exit-discipline sweep (P8 precondition).
 *
 * PROBLEM. The cockpit review backlog is the set of signal_posts rows carrying
 * `editorial_decision = 'pending_review'`. Raw candidates that the editor never
 * acts on accumulate there indefinitely, so the count stops meaning "items that
 * still need a decision". A one-time manual purge ran 2026-06-04 (114 aged rows
 * → editorial_decision='rejected'); this module is the systematic version.
 *
 * LEVER (verified against the cockpit code, 2026-06-04). Disposition lives on
 * `editorial_decision`, NOT `editorial_status`. The composer gates candidate
 * actionability with `!isBlockingDecision(editorialDecision)`, and
 * `removed_from_slate` is a blocking decision in both the server
 * (`isBlockingEditorialDecision`) and all client mirrors. So flipping
 * `editorial_decision` to a terminal disposition both (a) drops the row from the
 * composer's eligible set and (b) removes it from the pending_review count a
 * future P8 nudge will read. We therefore NEVER touch `editorial_status`; the
 * terminal vocabulary already exists on `editorial_decision` and no migration is
 * needed.
 *
 * BEHAVIOUR.
 *   - AUTO-DISPOSE: pending_review AND briefing_date < cutoff AND all three
 *     edited_* layers empty → set editorial_decision = <disposition>
 *     (default 'removed_from_slate' — honest: aged out, not a quality reject),
 *     decision_note, reviewed_at. editorial_status is left untouched.
 *   - FLAG-ONLY (no mutation in v1): pending_review AND aged AND at least one
 *     edited_* layer non-empty (drafted but never published). Reported for a
 *     human decision; a later v2 may auto-'held' these on a longer TTL.
 *   - Never touches published/approved/is_live rows — asserted explicitly in
 *     the WHERE even though the pending_review filter already implies it.
 *
 * SAFETY.
 *   - DRY_RUN (default true on first deploy): compute + log, no mutation.
 *   - MAX cap (default 200): if the auto-dispose set exceeds it, ABORT without
 *     mutating and emit an error-level Sentry alert. Steady-state volume is
 *     ~5–8/day; a large set must be a human decision (as the 114 purge was).
 *   - Idempotent by construction: disposed rows leave pending_review, so a
 *     re-run's SELECT no longer returns them. The mutation is ONE parameterised
 *     UPDATE over an id list with the guard predicates re-asserted; no loop.
 *
 * This module never throws. Every failure path returns a summary with an
 * `error` string and is Sentry-captured, so the caller (the daily cron's first
 * step) can run it fully decoupled from the fetch legs' success.
 */

type ServiceRoleClient = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

const PENDING_REVIEW = "pending_review";

/**
 * Terminal dispositions the sweep is allowed to write. All are blocking
 * decisions (drop the row from the cockpit). Guards against a misconfigured
 * env var writing a non-terminal value (which would leave the row in the
 * queue) or an out-of-CHECK value (which would throw a constraint violation).
 */
const ALLOWED_DISPOSITIONS = ["removed_from_slate", "rejected", "held"] as const;
type AllowedDisposition = (typeof ALLOWED_DISPOSITIONS)[number];

/** Statuses that must never be swept, re-asserted in the query WHERE. */
const PROTECTED_STATUSES = ["published", "approved"] as const;

/** Generous hard ceiling on the candidate SELECT. The table holds a few
 * hundred rows total; the real bound is the MAX cap below. */
const SWEEP_SELECT_LIMIT = 5000;

export const NEEDS_REVIEW_SWEEP_DEFAULTS = {
  ttlDays: 7,
  disposition: "removed_from_slate" as AllowedDisposition,
  max: 200,
  dryRun: true,
} as const;

export type NeedsReviewSweepConfig = {
  ttlDays: number;
  disposition: AllowedDisposition;
  max: number;
  dryRun: boolean;
};

export type NeedsReviewSweepSummary = {
  // --- the seven structured-summary keys (spec contract) ---
  cutoffDate: string;
  ttlDays: number;
  dryRun: boolean;
  /** Size of the auto-dispose set (aged + never drafted). In dry-run this is
   * the would-dispose count; in a live non-capped run it equals the rows
   * actually mutated; when capped it is the over-cap size (nothing mutated). */
  disposedCount: number;
  flaggedCount: number;
  disposition: AllowedDisposition;
  capped: boolean;
  // --- honest extras ---
  /** Whether an UPDATE actually executed this run. */
  mutated: boolean;
  /** id + briefing_date of flagged (drafted-but-aged) rows, for the report. */
  flaggedSamples: Array<{ id: string; briefingDate: string }>;
  /** Set when the sweep could not complete (client/DB error). */
  error?: string;
};

function parseBoolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const v = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(v)) return true;
  if (["false", "0", "no", "off"].includes(v)) return false;
  return fallback;
}

function parsePositiveIntEnv(value: string | undefined, fallback: number): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function resolveDisposition(value: string | undefined): AllowedDisposition {
  const v = value?.trim();
  if (v && (ALLOWED_DISPOSITIONS as readonly string[]).includes(v)) {
    return v as AllowedDisposition;
  }
  return NEEDS_REVIEW_SWEEP_DEFAULTS.disposition;
}

export function resolveNeedsReviewSweepConfig(
  env: NodeJS.ProcessEnv = process.env,
): NeedsReviewSweepConfig {
  return {
    ttlDays: parsePositiveIntEnv(env.NEEDS_REVIEW_TTL_DAYS, NEEDS_REVIEW_SWEEP_DEFAULTS.ttlDays),
    disposition: resolveDisposition(env.NEEDS_REVIEW_SWEEP_DISPOSITION),
    max: parsePositiveIntEnv(env.NEEDS_REVIEW_SWEEP_MAX, NEEDS_REVIEW_SWEEP_DEFAULTS.max),
    dryRun: parseBoolEnv(env.NEEDS_REVIEW_SWEEP_DRY_RUN, NEEDS_REVIEW_SWEEP_DEFAULTS.dryRun),
  };
}

/** Taipei calendar date for `now` (YYYY-MM-DD). Staleness is measured on
 * briefing_date, which is a Taipei editorial-day date, so the cutoff must be
 * computed in the same calendar to avoid an off-by-one near the UTC boundary. */
function taipeiDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** `taipeiToday - days`, as YYYY-MM-DD. The sweep targets briefing_date < this. */
function cutoffDateFor(now: Date, days: number): string {
  const [y, m, d] = taipeiDate(now).split("-").map(Number);
  const cutoffMs = Date.UTC(y, m - 1, d) - days * 24 * 60 * 60 * 1000;
  const c = new Date(cutoffMs);
  const cy = c.getUTCFullYear();
  const cm = String(c.getUTCMonth() + 1).padStart(2, "0");
  const cd = String(c.getUTCDate()).padStart(2, "0");
  return `${cy}-${cm}-${cd}`;
}

/** A row counts as drafted if ANY edited layer has non-whitespace content. */
function hasContent(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

type SweepRow = {
  id: string;
  briefing_date: string;
  editorial_status: string | null;
  is_live: boolean | null;
  edited_why_it_matters: string | null;
  edited_what_led_to_it: string | null;
  edited_what_it_connects_to: string | null;
};

function isDrafted(row: SweepRow): boolean {
  return (
    hasContent(row.edited_why_it_matters) ||
    hasContent(row.edited_what_led_to_it) ||
    hasContent(row.edited_what_it_connects_to)
  );
}

/** Snake-case structured summary for the log line (spec's seven keys). */
function toLogSummary(s: NeedsReviewSweepSummary) {
  return {
    cutoff_date: s.cutoffDate,
    ttl_days: s.ttlDays,
    dry_run: s.dryRun,
    disposed_count: s.disposedCount,
    flagged_count: s.flaggedCount,
    disposition: s.disposition,
    capped: s.capped,
    mutated: s.mutated,
  };
}

export async function runNeedsReviewSweep(options: {
  client?: ServiceRoleClient | null;
  env?: NodeJS.ProcessEnv;
  now?: Date;
} = {}): Promise<NeedsReviewSweepSummary> {
  const now = options.now ?? new Date();
  const env = options.env ?? process.env;
  const config = resolveNeedsReviewSweepConfig(env);
  const cutoffDate = cutoffDateFor(now, config.ttlDays);
  const runDate = taipeiDate(now);

  const base: NeedsReviewSweepSummary = {
    cutoffDate,
    ttlDays: config.ttlDays,
    dryRun: config.dryRun,
    disposedCount: 0,
    flaggedCount: 0,
    disposition: config.disposition,
    capped: false,
    mutated: false,
    flaggedSamples: [],
  };

  const client = options.client ?? createSupabaseServiceRoleClient();
  if (!client) {
    const summary: NeedsReviewSweepSummary = {
      ...base,
      error: "Supabase service role client is not configured.",
    };
    logServerEvent("error", "needs_review sweep skipped: no service-role client", toLogSummary(summary));
    captureMessageSafe("needs_review sweep could not run: service-role client unavailable.", {
      level: "error",
      tags: { failure_type: "needs_review_sweep_no_client" },
    });
    await flushSafe(2_000).catch(() => { /* best-effort */ });
    return summary;
  }

  // --- Read the aged pending_review set, with the protective guards made
  //     explicit even though pending_review already implies them. ---
  let rows: SweepRow[];
  try {
    const result = await client
      .from("signal_posts")
      .select(
        "id, briefing_date, editorial_status, is_live, edited_why_it_matters, edited_what_led_to_it, edited_what_it_connects_to",
      )
      .eq("editorial_decision", PENDING_REVIEW)
      .lt("briefing_date", cutoffDate)
      .eq("is_live", false)
      .not("editorial_status", "in", `(${PROTECTED_STATUSES.join(",")})`)
      .limit(SWEEP_SELECT_LIMIT);

    if (result.error) {
      const summary: NeedsReviewSweepSummary = { ...base, error: result.error.message };
      logServerEvent("error", "needs_review sweep read failed", {
        ...toLogSummary(summary),
        ...errorContext(result.error),
      });
      captureMessageSafe("needs_review sweep read failed.", {
        level: "error",
        tags: { failure_type: "needs_review_sweep_read_failed" },
        extra: { reason: result.error.message },
      });
      await flushSafe(2_000).catch(() => { /* best-effort */ });
      return summary;
    }

    rows = (result.data ?? []) as SweepRow[];
  } catch (error) {
    const summary: NeedsReviewSweepSummary = {
      ...base,
      error: error instanceof Error ? error.message : String(error),
    };
    logServerEvent("error", "needs_review sweep read threw", {
      ...toLogSummary(summary),
      ...errorContext(error),
    });
    captureMessageSafe("needs_review sweep read threw.", {
      level: "error",
      tags: { failure_type: "needs_review_sweep_read_threw" },
    });
    await flushSafe(2_000).catch(() => { /* best-effort */ });
    return summary;
  }

  const disposeRows = rows.filter((row) => !isDrafted(row));
  const flaggedRows = rows.filter((row) => isDrafted(row));
  const flaggedSamples = flaggedRows.map((row) => ({ id: row.id, briefingDate: row.briefing_date }));
  const capped = disposeRows.length > config.max;

  // --- Cap exceeded: abort without mutating, error-level alert. ---
  if (capped) {
    const summary: NeedsReviewSweepSummary = {
      ...base,
      disposedCount: disposeRows.length,
      flaggedCount: flaggedRows.length,
      flaggedSamples,
      capped: true,
      mutated: false,
    };
    logServerEvent("error", "needs_review sweep ABORTED: dispose set exceeds cap", {
      ...toLogSummary(summary),
      max: config.max,
    });
    captureMessageSafe(
      `needs_review sweep aborted: ${disposeRows.length} aged-never-drafted rows exceed cap ${config.max}. ` +
        "A purge this large must be a human decision.",
      {
        level: "error",
        tags: { failure_type: "needs_review_sweep_cap_exceeded" },
        extra: { disposeSetSize: disposeRows.length, cap: config.max, cutoffDate },
      },
    );
    await flushSafe(2_000).catch(() => { /* best-effort */ });
    await writeSweepPipelineLog(summary, runDate, config);
    return summary;
  }

  // --- Mutate (single parameterised UPDATE) unless dry-run or empty set. ---
  let mutated = false;
  let mutatedCount = disposeRows.length;
  if (!config.dryRun && disposeRows.length > 0) {
    const disposeIds = disposeRows.map((row) => row.id);
    const decisionNote = `Auto-swept ${runDate}: aged out after ${config.ttlDays}d in pending_review (never drafted).`;
    try {
      const updateResult = await client
        .from("signal_posts")
        .update({
          editorial_decision: config.disposition,
          decision_note: decisionNote,
          reviewed_at: now.toISOString(),
        })
        .in("id", disposeIds)
        // Re-assert the guards so a row that concurrently left pending_review,
        // went live, or was published since the SELECT is never clobbered.
        .eq("editorial_decision", PENDING_REVIEW)
        .eq("is_live", false)
        .not("editorial_status", "in", `(${PROTECTED_STATUSES.join(",")})`)
        .select("id");

      if (updateResult.error) {
        const summary: NeedsReviewSweepSummary = {
          ...base,
          disposedCount: disposeRows.length,
          flaggedCount: flaggedRows.length,
          flaggedSamples,
          mutated: false,
          error: updateResult.error.message,
        };
        logServerEvent("error", "needs_review sweep update failed", {
          ...toLogSummary(summary),
          ...errorContext(updateResult.error),
        });
        captureMessageSafe("needs_review sweep update failed.", {
          level: "error",
          tags: { failure_type: "needs_review_sweep_update_failed" },
          extra: { reason: updateResult.error.message },
        });
        await flushSafe(2_000).catch(() => { /* best-effort */ });
        await writeSweepPipelineLog(summary, runDate, config);
        return summary;
      }

      mutated = true;
      mutatedCount = (updateResult.data ?? []).length;
      if (mutatedCount !== disposeIds.length) {
        // Concurrent change between SELECT and UPDATE — guards excluded some.
        logServerEvent("warn", "needs_review sweep mutated fewer rows than targeted", {
          targeted: disposeIds.length,
          mutated: mutatedCount,
          cutoffDate,
        });
      }
    } catch (error) {
      const summary: NeedsReviewSweepSummary = {
        ...base,
        disposedCount: disposeRows.length,
        flaggedCount: flaggedRows.length,
        flaggedSamples,
        mutated: false,
        error: error instanceof Error ? error.message : String(error),
      };
      logServerEvent("error", "needs_review sweep update threw", {
        ...toLogSummary(summary),
        ...errorContext(error),
      });
      captureMessageSafe("needs_review sweep update threw.", {
        level: "error",
        tags: { failure_type: "needs_review_sweep_update_threw" },
      });
      await flushSafe(2_000).catch(() => { /* best-effort */ });
      await writeSweepPipelineLog(summary, runDate, config);
      return summary;
    }
  }

  const summary: NeedsReviewSweepSummary = {
    ...base,
    disposedCount: config.dryRun ? disposeRows.length : mutatedCount,
    flaggedCount: flaggedRows.length,
    flaggedSamples,
    capped: false,
    mutated,
  };

  logServerEvent(flaggedRows.length > 0 ? "warn" : "info", "needs_review sweep completed", {
    ...toLogSummary(summary),
    flaggedSamples: flaggedSamples.slice(0, 10),
  });
  await writeSweepPipelineLog(summary, runDate, config);
  return summary;
}

/**
 * Best-effort Pipeline Log write mirroring the P2/P3 dark-log pattern. If the
 * writer is down (Notion API failure / threw), Sentry-capture that failure —
 * but never when it's simply unconfigured (preview/test environments).
 */
async function writeSweepPipelineLog(
  summary: NeedsReviewSweepSummary,
  runDate: string,
  config: NeedsReviewSweepConfig,
): Promise<void> {
  const status = summary.error || summary.capped
    ? "fail"
    : summary.flaggedCount > 0
      ? "warn"
      : "ok";

  const message =
    `needs_review sweep ${summary.dryRun ? "(dry-run) " : ""}` +
    `cutoff=${summary.cutoffDate} ttl=${summary.ttlDays}d ` +
    `disposed=${summary.disposedCount} flagged=${summary.flaggedCount} ` +
    `disposition=${summary.disposition}` +
    `${summary.capped ? ` CAPPED(>${config.max})` : ""}` +
    `${summary.mutated ? " [mutated]" : " [no mutation]"}` +
    `${summary.error ? ` ERROR: ${summary.error}` : ""}`;

  let result: Awaited<ReturnType<typeof writePipelineLogEntry>>;
  try {
    result = await writePipelineLogEntry({
      runType: "needs_review_sweep",
      status,
      rowCount: summary.disposedCount,
      message,
      briefingDate: runDate,
      sourceHealth: toLogSummary(summary),
    });
  } catch (error) {
    // writePipelineLogEntry is documented never to throw; guard anyway.
    logServerEvent("warn", "needs_review sweep pipeline-log write threw", errorContext(error));
    captureMessageSafe("needs_review sweep pipeline-log writer threw.", {
      level: "warning",
      tags: { failure_type: "needs_review_sweep_pipeline_log_threw" },
    });
    return;
  }

  if (!result.written && !/not configured/i.test(result.reason)) {
    // The writer is down (Notion API failure), not merely unconfigured.
    logServerEvent("warn", "needs_review sweep pipeline-log write failed", { reason: result.reason });
    captureMessageSafe("needs_review sweep pipeline-log write failed (writer down).", {
      level: "warning",
      tags: { failure_type: "needs_review_sweep_pipeline_log_failed" },
      extra: { reason: result.reason },
    });
  }
}
