#!/usr/bin/env node

/**
 * `npm run pipeline:dry` — the blessed safe command (Track 2 full-pipeline
 * dry-run harness). Runs the ENTIRE pipeline (preflight → sweep → newsletter →
 * RSS → staging) in dry-run, writes NOTHING to prod, and prints the capability
 * matrix + per-stage timing + would-stage/evergreen/dedup counts. Validates a
 * pipeline change in <1 min instead of waiting ~24h for the cron tick.
 *
 * SCOPE BOUNDARY: a local node process has NO 60s ceiling — this does NOT
 * certify the Vercel timeout fix. A green run = logic + relative timing OK.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { formatFullDryRunReport, runFullPipelineDryRun } from "@/lib/pipeline/full-dry-run";

async function main() {
  const report = await runFullPipelineDryRun();

  const dir = process.env.PIPELINE_RUN_ARTIFACT_DIR?.trim() || ".pipeline-runs";
  const stamp = report.startedAt.replace(/[:.]/g, "-");
  const artifactPath = path.resolve(process.cwd(), dir, `full-dry-run-${stamp}.json`);
  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(formatFullDryRunReport(report));
  console.log(`\nartifact: ${artifactPath}`);

  // Exit non-zero only on a hard stage error. `skipped` (missing creds/egress)
  // and `degraded` (dependency returned nothing) are valid, observable states —
  // not failures of the harness itself.
  const erroredStages = Object.entries(report.stages)
    .filter(([, s]) => s.outcome === "error")
    .map(([name]) => name);
  if (erroredStages.length > 0) {
    console.error(`\nstages errored: ${erroredStages.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
