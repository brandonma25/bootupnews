/**
 * Full-pipeline dry-run harness (Track 2 — end the 24-hour feedback loop).
 *
 * Runs the ENTIRE pipeline — preflight → sweep → newsletter → RSS → staging —
 * by calling the SAME production functions in dry mode, writing NOTHING to prod,
 * and emitting one report: a capability matrix (PART 0), per-stage timing
 * (PART 2), and feature-validation visibility (PART 3). Validates LOGIC +
 * RELATIVE stage timing in <1 min instead of waiting ~24h for the cron tick.
 *
 * SCOPE BOUNDARY: a local node process has NO 60s ceiling. A green run here does
 * NOT certify the Vercel timeout is fixed — `report.certifies60sFit` is always
 * false. "Does it fit in 60s on Vercel" requires a deployed test.
 *
 * Every stage is forced dry: the sweep gets NEEDS_REVIEW_SWEEP_DRY_RUN=true,
 * newsletter/staging get { dryRun: true }, RSS runs PIPELINE_RUN_MODE=dry_run.
 * No signal_posts writes, no Notion writes, no email, no sweep mutation.
 */

import { runNeedsReviewSweep } from "@/lib/editorial-sweep/needs-review-sweep";
import { runEditorialStaging } from "@/lib/editorial-staging/runner";
import { runNewsletterIngestion } from "@/lib/newsletter-ingestion/runner";
import { resolveControlledPipelineConfig } from "@/lib/pipeline/controlled-execution";
import { runControlledPipeline } from "@/lib/pipeline/controlled-runner";
import {
  formatCapabilityMatrix,
  runPreflight,
  type CapabilityMatrix,
  type PreflightDeps,
  type StageName,
} from "@/lib/pipeline/preflight";
import { StageTimer, type StageMs } from "@/lib/pipeline/stage-timing";

export type StageOutcome = "ran" | "skipped" | "degraded" | "error";

type StageBase = { outcome: StageOutcome; skipReason?: string; error?: string };

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
      insufficientReason?: string | null;
    };
    staging: StageBase & {
      wouldStage?: number;
      core?: number;
      context?: number;
      evergreenFiltered?: number;
      crossDateWouldSkip?: number;
      detail?: unknown;
      p4DedupNote?: string;
    };
  };
};

const SCOPE_NOTE =
  "Local dry-run: validates pipeline LOGIC + RELATIVE stage timing with zero prod writes. " +
  "Does NOT certify the Vercel 60s fit — that requires a deployed (preview/prod) test.";

export type FullDryRunOptions = {
  env?: NodeJS.ProcessEnv;
  now?: Date;
  /** Forwarded to the preflight (injectable probes for tests). */
  preflight?: Omit<PreflightDeps, "env">;
};

export async function runFullPipelineDryRun(options: FullDryRunOptions = {}): Promise<FullDryRunReport> {
  const baseEnv = options.env ?? process.env;
  const now = options.now ?? new Date();
  // Force the sweep dry regardless of ambient config — the harness must NEVER mutate.
  const env = { ...baseEnv, NEEDS_REVIEW_SWEEP_DRY_RUN: "true" } as NodeJS.ProcessEnv;

  const timer = new StageTimer();
  const matrix = await runPreflight({ env, ...(options.preflight ?? {}) });
  const cap = (s: StageName) => matrix.stages.find((x) => x.stage === s);

  // ---- sweep ----
  let sweep: FullDryRunReport["stages"]["sweep"];
  if (cap("sweep")?.willRun === "ready") {
    const summary = await timer.time("sweep", () => runNeedsReviewSweep({ env, now }));
    sweep = {
      outcome: summary.error ? "error" : "ran",
      disposed: summary.disposedCount,
      flagged: summary.flaggedCount,
      mutated: summary.mutated,
      error: summary.error,
    };
  } else {
    timer.markSkipped("sweep");
    sweep = { outcome: "skipped", skipReason: cap("sweep")?.skipReason };
  }

  // ---- newsletter ----
  let newsletter: FullDryRunReport["stages"]["newsletter"];
  if (cap("newsletter")?.willRun === "ready") {
    const result = await timer.time("newsletter", () => runNewsletterIngestion({ dryRun: true, now }));
    const items = (result.summary as { fetchedMessageCount?: number }).fetchedMessageCount ?? 0;
    newsletter = {
      outcome: !result.success ? "error" : items === 0 ? "degraded" : "ran",
      itemsProcessed: items,
      // `truncated` is produced by the time-box from the timeout bundle; surface
      // it if present, otherwise undefined (not yet built).
      truncated: (result.summary as { newsletterTruncated?: boolean }).newsletterTruncated,
      message: result.summary.message,
    };
  } else {
    timer.markSkipped("newsletter");
    newsletter = { outcome: "skipped", skipReason: cap("newsletter")?.skipReason };
  }

  // ---- RSS ----
  let rss: FullDryRunReport["stages"]["rss"];
  if (cap("rss")?.willRun === "ready") {
    const rssReport = await timer.time("rss", () =>
      runControlledPipeline(resolveControlledPipelineConfig({ ...env, PIPELINE_RUN_MODE: "dry_run" })),
    );
    rss = {
      outcome: rssReport.candidate_pool_insufficient ? "degraded" : "ran",
      candidateCount: rssReport.candidateCount,
      clusterCount: rssReport.clusterCount,
      insufficientReason: rssReport.candidate_pool_insufficient
        ? rssReport.candidate_pool_insufficient_reason
        : null,
    };
  } else {
    // Skipped (e.g. no egress) — NOT a "0 candidates" degraded run. The
    // capability matrix names the reason; the timer records N/A.
    timer.markSkipped("rss");
    rss = { outcome: "skipped", skipReason: cap("rss")?.skipReason };
  }

  // ---- staging ----
  let staging: FullDryRunReport["stages"]["staging"];
  if (cap("staging")?.willRun === "ready") {
    const result = await timer.time("staging", () => runEditorialStaging({ dryRun: true, now }));
    const d = result.summary;
    staging = {
      outcome: result.success ? "ran" : "error",
      wouldStage: d.candidateCount,
      core: d.coreCount,
      context: d.contextCount,
      evergreenFiltered: d.candidatesFilteredEvergreen,
      crossDateWouldSkip: d.notionRowsSkippedDuplicateAcrossDates,
      detail: d.dryRunDetail,
      // If Notion was unreachable/uncredentialed, the P4 cross-date dedup leg is
      // degraded even though selection ran — surface that, never hide it.
      p4DedupNote: cap("staging")?.skipReason,
    };
  } else {
    timer.markSkipped("staging");
    staging = { outcome: "skipped", skipReason: cap("staging")?.skipReason };
  }

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
  lines.push(formatCapabilityMatrix(report.capabilityMatrix));
  lines.push("");
  lines.push(`stage_ms: ${Object.entries(report.stageMs).map(([k, v]) => `${k}=${v}`).join(" ")}`);
  lines.push("");
  for (const [name, s] of Object.entries(report.stages)) {
    const extra = Object.entries(s)
      .filter(([k]) => !["outcome", "skipReason", "error", "detail"].includes(k))
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
    lines.push(`${name.padEnd(11)} ${String(s.outcome).toUpperCase().padEnd(9)} ${s.skipReason ?? s.error ?? ""} ${extra}`.trimEnd());
  }
  return lines.join("\n");
}
