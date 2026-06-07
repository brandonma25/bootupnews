/**
 * Shared editorial ingestion pipeline body (Track 2 — pipeline unification).
 *
 * ONE sequence — newsletter → RSS → staging — called by BOTH:
 *   - the production cron route /api/cron/fetch-editorial-inputs (dryRun: false)
 *   - the local dry-run harness `npm run pipeline:dry` (dryRun: true)
 *
 * This eliminates the earlier FORK where the harness re-implemented the stage
 * sequence and ran RSS through runControlledPipeline instead of the real prod
 * runDailyNewsCron. After this, the ONLY difference between a dry run and the
 * real 12:00 UTC cron is that dry mode persists nothing:
 *   - newsletter takes its in-memory dryRunExtract path (full Gmail fetch +
 *     parse, zero writes) instead of writing candidates,
 *   - runDailyNewsCron skips article-candidate + signal_posts persistence and
 *     the RSS cron-monitor check-in,
 *   - runEditorialStaging skips the Notion queue write + completion email
 *     (P4 read-only dedup + P7 filter + selection still run).
 *
 * Stage ORDER is load-bearing and identical to prod: newsletter MUST run before
 * RSS so reserveNewsletterCandidateRanksForRssSnapshot can claim high rank slots
 * before the RSS snapshot fills them.
 */

import { runDailyNewsCron, type DailyNewsCronRunResult } from "@/lib/cron/fetch-news";
import { runEditorialStaging, type EditorialStagingRunResult } from "@/lib/editorial-staging/runner";
import { runNewsletterIngestion, type NewsletterIngestionRunResult } from "@/lib/newsletter-ingestion/runner";

export type EditorialPipelineStageName = "newsletter" | "rss" | "editorial_staging";

/**
 * Wraps a single stage's execution. Consumers inject their own concerns:
 *   - the prod route records per-stage timeout attribution + degrade-don't-throw,
 *   - the harness times each stage (StageTimer) + records its outcome.
 *
 * A stage runner MUST resolve (catch-and-continue) so one leg failing never
 * aborts the others — matching prod's "degrade, don't fail" behavior. The
 * default runner just runs the stage with no wrapping.
 */
export type EditorialPipelineStageRunner = <T>(
  name: EditorialPipelineStageName,
  run: () => Promise<T>,
) => Promise<T>;

export type EditorialPipelineResults = {
  newsletter: NewsletterIngestionRunResult;
  rss: DailyNewsCronRunResult;
  editorialStaging: EditorialStagingRunResult;
};

const defaultRunStage: EditorialPipelineStageRunner = (_name, run) => run();

export async function runEditorialIngestionPipeline(options: {
  dryRun: boolean;
  now?: Date;
  runStage?: EditorialPipelineStageRunner;
}): Promise<EditorialPipelineResults> {
  const { dryRun, now } = options;
  const runStage = options.runStage ?? defaultRunStage;

  // Newsletter first (rank-slot reservation), then RSS, then staging — prod order.
  const newsletter = await runStage("newsletter", () =>
    dryRun
      ? runNewsletterIngestion({ dryRun: true, now })
      : runNewsletterIngestion({ writeCandidates: true, now }),
  );

  const rss = await runStage("rss", () => runDailyNewsCron({ dryRun }));

  const editorialStaging = await runStage("editorial_staging", () =>
    runEditorialStaging({ dryRun, now }),
  );

  return { newsletter, rss, editorialStaging };
}
