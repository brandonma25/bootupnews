# Controlled Pipeline Safety Remediation

Date: 2026-04-27

## Change Type

Remediation / alignment.

Canonical PRD required: No.

## Source of Truth

- Product Position: Boot Up is a curated briefing, not a feed.
- Product Position: Top 5 Core Signals require structural importance and explicit why-it-matters reasoning.
- Product Position: no false freshness.
- PRD-35 Why it matters quality framework.
- PRD-37 pipeline processing.
- PRD-53 Signals admin editorial layer.
- PRD-57 Homepage volume layers.
- Final Launch Content QA PASS report.
- Controlled Pipeline Test Plan: BLOCKED because no safe dry-run/draft-only execution mode existed.

No new canonical PRD is required because this is a remediation to make the existing pipeline and editorial publication contract safe to test.

## Object Level

- Article and Story Cluster: generation and scoring inputs.
- Signal: interpreted ranked output from generation.
- Surface Placement plus Card copy: `public.signal_posts` rows.

`signal_posts` remains a Surface Placement and Card copy read model, not canonical Signal identity.

## Pre-Change Write Path

The scheduled fetch route used this sequence:

1. `/api/cron/fetch-news` authorized the request with `CRON_SECRET`.
2. `runDailyNewsCron()` called `generateDailyBriefing()`.
3. `generateDailyBriefing()` called `runClusterFirstPipeline()`.
4. `runClusterFirstPipeline()` fetched source Articles, normalized/deduped them, formed Story Clusters, scored ranked outputs, and wrote `pipeline_article_candidates`.
5. `runDailyNewsCron()` called `persistSignalPostsForBriefing()`.
6. `persistSignalPostsForBriefing()` mapped briefing items to `signal_posts` rows and validated why-it-matters copy.
7. The persistence path could deactivate existing `is_live = true` rows and insert newly generated rows with `is_live = true` before editorial approval.

That violated the launch safety invariant: generation must not equal public activation.

## New Execution Modes

`PIPELINE_RUN_MODE` supports:

- `normal`: existing generation path, with the safety invariant enforced. Generation can write editorial review rows, but cannot activate public rows.
- `dry_run`: runs generation, scoring, and why-it-matters validation reporting without writing `pipeline_article_candidates` or `signal_posts`.
- `draft_only`: runs generation and inserts `signal_posts` review rows only. Rows are `editorial_status = needs_review`, `is_live = false`, and `published_at = null`.

The local script entrypoint is:

```bash
npm run pipeline:controlled-test
```

The controlled script intentionally supports only `dry_run` and `draft_only`; normal scheduled execution remains owned by `/api/cron/fetch-news` after explicit re-enable approval.

## Production Guardrails

Production `draft_only` refuses to run unless all of the following are present:

- `PIPELINE_RUN_MODE=draft_only`
- `PIPELINE_TARGET_ENV=production`
- `ALLOW_PRODUCTION_PIPELINE_TEST=true`
- `BRIEFING_DATE_OVERRIDE=YYYY-MM-DD`
- `PIPELINE_TEST_RUN_ID=<explicit id>`
- `PIPELINE_CRON_DISABLED_CONFIRMED=true`

`dry_run` does not require write credentials and disables pipeline candidate persistence.

## Public Activation Invariant

Pipeline generation no longer deactivates the current live set and no longer inserts generated rows as live.

Only the explicit editorial publish workflow may:

- set old live rows to `is_live = false`
- set new approved rows to `is_live = true`
- set `published_at`
- publish public why-it-matters copy

## Run Identification

No schema migration was added. `signal_posts` has no safe existing pipeline-run metadata field, and adding one is unnecessary for the controlled test.

For controlled runs, the script writes a local JSON artifact under `.pipeline-runs/` with:

- run id
- test run id
- generated briefing date
- proposed Top 5 and depth rows
- validation status and failure details
- persistence result and exact inserted row IDs for rollback

## Non-Goals

- Does not re-enable the scheduled Vercel cron.
- Does not run the pipeline.
- Does not write production data.
- Does not modify Action 1 ranking behavior.
- Does not change cleaned April 26 public content.
- Does not introduce a new canonical PRD.
