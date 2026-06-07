/**
 * Full-pipeline dry-run harness (Track 2 — end the 24-hour feedback loop).
 *
 * Runs the ENTIRE pipeline — sweep → newsletter → RSS → staging — by calling the
 * EXACT SAME shared body the production cron runs (runEditorialIngestionPipeline),
 * just with dryRun: true. Writes NOTHING to prod, and emits one report: a
 * capability matrix pre-check (PART 0), per-stage timing (PART 2), and
 * feature-validation visibility (PART 3).
 *
 * RUN-ALL-LIKE-PROD: every stage executes, exactly as the 12:00 UTC cron would.
 * The capability matrix is a PRE-CHECK that names which dependencies are present;
 * a missing one surfaces as that stage's real error/degrade (not a tidy skip),
 * so the dry run's control flow is identical to prod's.
 *
 * SCOPE BOUNDARY: a local node process has NO 60s ceiling. A green run here does
 * NOT certify the Vercel timeout is fixed — `certifies60sFit` is always false.
 * "Does it fit in 60s on Vercel" requires a deployed test (the PR-2 trigger).
 */

import { runNeedsReviewSweep } from "@/lib/editorial-sweep/needs-review-sweep";
import {
  runEditorialIngestionPipeline,
  type EditorialPipelineStageName,
} from "@/lib/pipeline/editorial-ingestion-pipeline";
import {
  formatCapabilityMatrix,
  runPreflight,
  type CapabilityMatrix,
  type PreflightDeps,
  type StageName,
} from "@/lib/pipeline/preflight";
import { StageTimer, type StageMs } from "@/lib/pipeline/stage-timing";

export type StageOutcome = "ran" | "degraded" | "error";

type StageBase = { outcome: StageOutcome; note?: string; error?: string };

export type FullDryRunReport = {
  startedAt: string;
  /** Always false: a local run cannot certify the Vercel 60s fit. */
  certifies60sFit: false;
  note: string;
  capabilityMatrix: CapabilityMatrix;
  stageMs: StageMs;
  stages: {
    sweep: StageBase & { disposed?: number; flagged?: number; mutated?: boolean };
    newsletter: StageBase & { itemsProcessed?: number; truncated?: boolean; message?: string };
    rss: StageBase & {
      candidateCount?: number;
      clusterCount?: number;
      degraded?: boolean;
      message?: string;
    };
    staging: StageBase & {
      wouldStage?: number;
      core?: number;
      context?: number;
      evergreenFiltered?: number;
      crossDateWouldSkip?: number;
      detail?: unknown;
      message?: string;
    };
  };
};

const SCOPE_NOTE =
  "Local dry-run: runs the SAME pipeline body as the 12:00 UTC cron (dryRun) with zero prod writes. " +
  "Validates LOGIC + RELATIVE stage timing. Does NOT certify the Vercel 60s fit — that needs a deployed test.";

export type FullDryRunOptions = {
  env?: NodeJS.ProcessEnv;
  now?: Date;
  /** Forwarded to the preflight (injectable probes for tests). */
  preflight?: Omit<PreflightDeps, "env">;
};

/** The matrix pre-check note for a stage (named missing dep), used to explain a failure. */
function predictedNote(matrix: CapabilityMatrix, stage: StageName): string | undefined {
  const cap = matrix.stages.find((s) => s.stage === stage);
  return cap?.willRun === "ready" ? undefined : cap?.skipReason;
}

export async function runFullPipelineDryRun(options: FullDryRunOptions = {}): Promise<FullDryRunReport> {
  const baseEnv = options.env ?? process.env;
  const now = options.now ?? new Date();
  // Force the sweep dry regardless of ambient config — the harness must NEVER mutate.
  const env = { ...baseEnv, NEEDS_REVIEW_SWEEP_DRY_RUN: "true" } as NodeJS.ProcessEnv;

  const timer = new StageTimer();
  const matrix = await runPreflight({ env, ...(options.preflight ?? {}) });

  // ---- sweep ---- (runs first, like prod's executePipelineWork; best-effort)
  let sweep: FullDryRunReport["stages"]["sweep"];
  try {
    const summary = await timer.time("sweep", () => runNeedsReviewSweep({ env, now }));
    sweep = {
      outcome: summary.error ? "error" : "ran",
      disposed: summary.disposedCount,
      flagged: summary.flaggedCount,
      mutated: summary.mutated,
      error: summary.error,
      note: summary.error ? predictedNote(matrix, "sweep") : undefined,
    };
  } catch (error) {
    sweep = {
      outcome: "error",
      error: error instanceof Error ? error.message : String(error),
      note: predictedNote(matrix, "sweep"),
    };
  }

  // ---- newsletter → RSS → staging ---- via the SHARED prod pipeline body, dry.
  // The harness's stage runner times each leg and catches an unexpected throw so
  // one leg's failure never aborts the rest (degrade-like-prod).
  const threw: Partial<Record<EditorialPipelineStageName, string>> = {};
  const runStage = async <T>(name: EditorialPipelineStageName, run: () => Promise<T>): Promise<T> =>
    timer.time(name, async () => {
      try {
        return await run();
      } catch (error) {
        threw[name] = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          timestamp: now.toISOString(),
          summary: { message: `${name} threw: ${threw[name]}` },
        } as unknown as T;
      }
    });

  const { newsletter: nl, rss: rssResult, editorialStaging: st } = await runEditorialIngestionPipeline({
    dryRun: true,
    now,
    runStage,
  });
  // The harness always runs the full stage set, so every result is present.
  // (Stage subsets — used by the decoupled endpoints — can return null per stage.)
  if (!nl || !rssResult || !st) {
    throw new Error("Full dry-run harness expected all stages to run, but a stage result was null.");
  }

  // ---- map newsletter ----
  const nlItems = (nl.summary as { fetchedMessageCount?: number }).fetchedMessageCount ?? 0;
  const newsletter: FullDryRunReport["stages"]["newsletter"] = {
    outcome: threw.newsletter ? "error" : !nl.success ? "error" : nlItems === 0 ? "degraded" : "ran",
    itemsProcessed: nlItems,
    truncated: (nl.summary as { newsletterTruncated?: boolean }).newsletterTruncated,
    message: nl.summary.message,
    error: threw.newsletter,
    note: !nl.success || threw.newsletter ? predictedNote(matrix, "newsletter") : undefined,
  };

  // ---- map RSS ----
  const rssSummary = rssResult.summary as {
    rawItemCount?: number;
    clusterCount?: number;
    degraded?: boolean;
    message?: string;
  };
  const rss: FullDryRunReport["stages"]["rss"] = {
    outcome: threw.rss ? "error" : !rssResult.success ? "error" : rssSummary.degraded ? "degraded" : "ran",
    candidateCount: rssSummary.rawItemCount,
    clusterCount: rssSummary.clusterCount,
    degraded: rssSummary.degraded,
    message: rssSummary.message,
    error: threw.rss,
    note: !rssResult.success || threw.rss ? predictedNote(matrix, "rss") : undefined,
  };

  // ---- map staging ----
  const d = st.summary;
  const staging: FullDryRunReport["stages"]["staging"] = {
    outcome: threw.editorial_staging ? "error" : st.success ? "ran" : "error",
    wouldStage: d.candidateCount,
    core: d.coreCount,
    context: d.contextCount,
    evergreenFiltered: d.candidatesFilteredEvergreen,
    crossDateWouldSkip: d.notionRowsSkippedDuplicateAcrossDates,
    detail: d.dryRunDetail,
    message: d.message,
    error: threw.editorial_staging,
    note: !st.success || threw.editorial_staging ? predictedNote(matrix, "staging") : undefined,
  };

  return {
    startedAt: now.toISOString(),
    certifies60sFit: false,
    note: SCOPE_NOTE,
    capabilityMatrix: matrix,
    stageMs: timer.snapshot(),
    stages: { sweep, newsletter, rss, staging },
  };
}

/** Console-friendly rendering of a full dry-run report. */
export function formatFullDryRunReport(report: FullDryRunReport): string {
  const lines: string[] = [];
  lines.push("=== Full-pipeline dry-run report ===");
  lines.push(report.note);
  lines.push("");
  lines.push("pre-check (capability matrix — names missing deps; stages run anyway, like prod):");
  lines.push(formatCapabilityMatrix(report.capabilityMatrix));
  lines.push("");
  lines.push(`stage_ms: ${Object.entries(report.stageMs).map(([k, v]) => `${k}=${v}`).join(" ")}`);
  lines.push("");
  for (const [name, s] of Object.entries(report.stages)) {
    const extra = Object.entries(s)
      .filter(([k]) => !["outcome", "note", "error", "detail"].includes(k))
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    const reason = s.error ?? s.note ?? "";
    lines.push(`${name.padEnd(11)} ${String(s.outcome).toUpperCase().padEnd(9)} ${reason} ${extra}`.trimEnd());
  }
  return lines.join("\n");
}
