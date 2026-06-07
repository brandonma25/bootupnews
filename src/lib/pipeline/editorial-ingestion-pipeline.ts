/**
 * Shared editorial ingestion pipeline body (Track 2 — pipeline unification +
 * leg decoupling).
 *
 * ONE sequence — newsletter → RSS → staging — invoked (as a whole OR as a stage
 * SUBSET) by:
 *   - the local dry-run harness `npm run pipeline:dry` (dryRun: true, all stages)
 *   - the NEW newsletter endpoint /api/cron/ingest-newsletters (stages: ["newsletter"])
 *   - the briefing endpoint /api/cron/fetch-editorial-inputs (stages: ["rss",
 *     "editorial_staging"])
 *
 * Leg decoupling (Track 2 timeout cure) splits the legs across endpoints so each
 * gets its OWN 60s Vercel budget and neither starves the other — but they all go
 * through this ONE body via the `stages` filter + `runStage` seam, so the
 * combined output is identical to a single-request run. No fork.
 *
 * The newsletter → staging hand-off is DB-based: the newsletter stage writes
 * newsletter_emails + newsletter_story_extractions; runEditorialStaging READS
 * them back (fetchNewsletterCandidates, keyed on the briefing day's received_at
 * window). So staging in the briefing endpoint sources newsletter candidates
 * from the persisted store written by the newsletter endpoint — no in-memory
 * hand-off to preserve.
 *
 * The ONLY difference between dryRun and a real run is that dry persists nothing:
 *   - newsletter takes its in-memory dryRunExtract path (full Gmail fetch + parse),
 *   - runDailyNewsCron skips article-candidate + signal_posts persistence + the
 *     RSS cron-monitor check-in,
 *   - runEditorialStaging skips the Notion queue write + completion email.
 *
 * Stage ORDER is load-bearing and identical to prod: newsletter MUST run before
 * RSS so reserveNewsletterCandidateRanksForRssSnapshot can claim high rank slots
 * before the RSS snapshot fills them. When the legs are decoupled the ordering is
 * enforced by the cron SCHEDULE (newsletter endpoint fires ~10 min before the
 * briefing endpoint) instead of in-process sequencing.
 */

import { runDailyNewsCron, type DailyNewsCronRunResult } from "@/lib/cron/fetch-news";
import { runEditorialStaging, type EditorialStagingRunResult } from "@/lib/editorial-staging/runner";
import { runNewsletterIngestion, type NewsletterIngestionRunResult } from "@/lib/newsletter-ingestion/runner";

export type EditorialPipelineStageName = "newsletter" | "rss" | "editorial_staging";

export const ALL_EDITORIAL_PIPELINE_STAGES: EditorialPipelineStageName[] = [
  "newsletter",
  "rss",
  "editorial_staging",
];

/**
 * Wraps a single stage's execution. Consumers inject their own concerns:
 *   - each live endpoint records per-stage timing (StageTimer) + timeout
 *     attribution + degrade-don't-throw,
 *   - the harness times each stage + records its outcome.
 *
 * A stage runner MUST resolve (catch-and-continue) so one leg failing never
 * aborts the others — matching prod's "degrade, don't fail" behavior. The
 * default runner just runs the stage with no wrapping.
 */
export type EditorialPipelineStageRunner = <T>(
  name: EditorialPipelineStageName,
  run: () => Promise<T>,
) => Promise<T>;

/**
 * Results keyed by stage. A stage that was NOT in the requested `stages` subset
 * is `null` (it did not run in this invocation — e.g. the briefing endpoint
 * returns `newsletter: null` because the newsletter endpoint ran it separately).
 */
export type EditorialPipelineResults = {
  newsletter: NewsletterIngestionRunResult | null;
  rss: DailyNewsCronRunResult | null;
  editorialStaging: EditorialStagingRunResult | null;
};

const defaultRunStage: EditorialPipelineStageRunner = (_name, run) => run();

export async function runEditorialIngestionPipeline(options: {
  dryRun: boolean;
  now?: Date;
  runStage?: EditorialPipelineStageRunner;
  /** Stage subset to run, in prod order. Defaults to all three. */
  stages?: EditorialPipelineStageName[];
}): Promise<EditorialPipelineResults> {
  const { dryRun, now } = options;
  const runStage = options.runStage ?? defaultRunStage;
  const stages = options.stages ?? ALL_EDITORIAL_PIPELINE_STAGES;
  const results: EditorialPipelineResults = { newsletter: null, rss: null, editorialStaging: null };

  // Always evaluated in prod order, regardless of subset.
  if (stages.includes("newsletter")) {
    results.newsletter = await runStage("newsletter", () =>
      dryRun
        ? runNewsletterIngestion({ dryRun: true, now })
        : runNewsletterIngestion({ writeCandidates: true, now }),
    );
  }

  if (stages.includes("rss")) {
    results.rss = await runStage("rss", () => runDailyNewsCron({ dryRun }));
  }

  if (stages.includes("editorial_staging")) {
    results.editorialStaging = await runStage("editorial_staging", () =>
      runEditorialStaging({ dryRun, now }),
    );
  }

  return results;
}
