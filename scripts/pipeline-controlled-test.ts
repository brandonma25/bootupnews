#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  resolveControlledPipelineConfig,
} from "@/lib/pipeline/controlled-execution";
import { runControlledPipeline } from "@/lib/pipeline/controlled-runner";

function buildArtifactPath(artifactDir: string, mode: string, testRunId: string | null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = testRunId ? `-${testRunId.replace(/[^a-z0-9_-]/gi, "-")}` : "";

  return path.resolve(
    process.cwd(),
    artifactDir,
    `controlled-pipeline-${mode}${suffix}-${timestamp}.json`,
  );
}

async function writeReportArtifact(
  artifactDir: string,
  mode: string,
  testRunId: string | null,
  report: unknown,
) {
  const artifactPath = buildArtifactPath(artifactDir, mode, testRunId);

  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return artifactPath;
}

async function main() {
  const config = resolveControlledPipelineConfig();
  const report = await runControlledPipeline(config);
  const persistence = report.persistence;
  const briefingDate = report.generatedBriefingDate;
  const artifactPath = await writeReportArtifact(
    config.artifactDir,
    config.mode,
    config.testRunId,
    report,
  );

  console.log(JSON.stringify({
    ok: persistence ? persistence.ok : true,
    mode: config.mode,
    artifactPath,
    runId: report.runId,
    briefingDate,
    candidateCount: report.candidateCount,
    eligibleCoreCount: report.selectionSummary.eligibleCoreCount,
    excludedWeakCandidateCount: report.selectionSummary.excludedWeakCandidateCount,
    candidate_pool_insufficient: report.candidate_pool_insufficient,
    insertedCount: persistence?.insertedCount ?? 0,
    insertedPostIds: persistence?.insertedPostIds ?? [],
    message: persistence?.message ?? "Dry run completed without Supabase writes.",
  }, null, 2));

  if (persistence && !persistence.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
