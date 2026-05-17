# Editorial Automation Operating Guide

## Purpose
- Define the editorial automation pipeline: how candidates are staged to Notion, reviewed, and promoted to published signals.
- Keep routine editorial triage out of the codebase and inside a BM-controlled Notion queue.

## Pipeline Overview
1. `fetch-editorial-inputs` cron runs in sequence: newsletter → RSS → editorial staging.
2. Editorial staging deduplicates newsletter and RSS candidates using Jaccard similarity, scores them, and writes rows to the Notion Editorial Queue database.
3. BM reviews rows in Notion, sets status to `Approved`, then triggers the push endpoint.
4. The push endpoint reads approved rows from Notion and inserts them into `signal_posts`.

## Endpoints
- `GET /api/editorial/push-approved?token=<EDITORIAL_PUSH_SECRET>` — promotes approved Notion rows to `signal_posts`.
- `GET /api/cron/fetch-editorial-inputs` — daily ingestion. Authenticates via the `x-cron-secret` HTTP header matching `CRON_SECRET`. Triggered externally by cron-job.org (see Triggering below). Writes a Pipeline Log row on completion (see Operational Logging).
- `GET /api/cron/health` — daily editorial-queue health check. Same auth contract as the ingestion endpoint. Returns HTTP 200 when row count for the day ≥ 7 (status `ok` or `warn`); HTTP 500 when below (status `fail`) so cron-job.org's email alert fires. Writes a Pipeline Log row on every invocation.

## Triggering
- Canonical scheduler: **cron-job.org** at 10:15 UTC and 11:45 UTC daily (= 6:15 PM and 7:45 PM Taipei). Per-minute precision, email alert on non-200.
- Auth: `x-cron-secret: <CRON_SECRET>` header. The same value must be set in Vercel production env and on each cron-job.org job's custom-header config. Missing or mismatched header → HTTP 401, pipeline not invoked.
- Rollback escape hatch: setting `ALLOW_VERCEL_CRON_FALLBACK=true` in Vercel re-enables the legacy `Authorization: Bearer <CRON_SECRET>` header path so the `crons` block can be re-added to `vercel.json` during a cron-job.org outage. Default is `false` — header-only auth is the normal path.
- Historical: Vercel Hobby Cron was the previous trigger source (`crons` array in `vercel.json`). Decommissioned in PRD-65 phase 2 because Hobby's ±59 min firing window allowed the two daily runs to overlap and double-write Notion. The `crons` array is intentionally absent from `vercel.json`; do not re-add it without flipping the fallback flag.

## Schedule Management (cron-job.org)
- Source of truth: [`scripts/cron-jobs.config.ts`](../../../scripts/cron-jobs.config.ts). Never edit cron-job.org via its web UI for routine changes — the config file drifts and the sync script will revert.
- Apply changes with `npm run cron:sync` (idempotent: a re-run with no config change writes zero). Preview with `npm run cron:sync:dry-run`. Use `npm run cron:sync:prune` to delete `bootup-*` jobs that are no longer in the config.
- Runbook for first-time setup, env-var contract, rollback, and operator handoff: [`docs/CRON_SETUP.md`](../../CRON_SETUP.md).

## Required Environment Variables
- `NOTION_TOKEN` — Notion integration token from notion.so/my-integrations.
- `NOTION_EDITORIAL_QUEUE_DB_ID` — Notion Editorial Queue database ID (`56caed793822497e8e58e8dc2291d395`).
- `RESEND_API_KEY` — Resend API key for staging completion emails.
- `EDITORIAL_PUSH_SECRET` — Secret token for the push-approved endpoint.
- `CRON_SECRET` — Shared secret for the `/api/cron/fetch-editorial-inputs` route. Required in Vercel env and on every cron-job.org job's custom header.
- `ALLOW_VERCEL_CRON_FALLBACK` — Rollback flag. Defaults to unset/`false`. Set to `"true"` only to temporarily re-enable the legacy Vercel Cron `Authorization: Bearer` header during a cron-job.org outage.
- `NOTION_PIPELINE_LOG_DB_ID` — Notion database ID for the Pipeline Log (one row per ingestion run and per health check). Schema: [`docs/notion-pipeline-log-schema.md`](../../notion-pipeline-log-schema.md). If unset, the ingestion and health endpoints log a warning and continue — pipeline-log writes are best-effort and never fail the cron.
- `NOTION_SOURCE_HEALTH_LOG_DB_ID` — Notion database ID for the Source Health Log (per-source-per-day RSS fetch outcomes). Schema: [`docs/notion-source-health-schema.md`](../../notion-source-health-schema.md). Read by the Phase 4.5 circuit breaker before every fetch and written after every fetch. If unset, the circuit breaker permissively falls through (`skip: false`) and the fetch path proceeds — observability degradation must never block ingestion.

## Key Files
- `src/lib/editorial-staging/runner.ts` — orchestrates Steps B–G
- `src/lib/editorial-staging/dedup.ts` — Jaccard dedup
- `src/lib/editorial-staging/notion-writer.ts` — Notion REST API writer
- `src/lib/editorial-staging/email.ts` — Resend completion email
- `src/lib/observability/pipeline-log.ts` — Pipeline Log writer (Phase 4)
- `src/lib/observability/source-health-log.ts` — Source Health Log writer (Phase 4)
- `src/lib/observability/rss-circuit-breaker.ts` — RSS circuit breaker (Phase 4.5)
- `src/lib/rss.ts` — `fetchFeedArticles` invokes the circuit breaker pre-fetch and records per-source outcomes
- `src/lib/sentry-config.ts` — `isFilteredRssNoiseEvent` drops `Feed request retry exhausted for *` events from Sentry
- `src/app/api/cron/health/route.ts` — health-check endpoint (Phase 4)
- `src/app/api/editorial/push-approved/route.ts` — approval promotion endpoint

## Operating Notes
- Newsletter ingestion must run before RSS in the cron so that newsletter candidates can reserve rank slots before the RSS snapshot fills them.
- Editorial staging is non-critical: cron success is determined by RSS and newsletter task results only.
- A failed `NOTION_TOKEN` will cause staging to fail silently; check Vercel logs if Notion rows stop appearing.

## Idempotency Contract (Branch C / Step E3 Notion writes)
- Each write keys on `Headline + Briefing Date`. The runner queries the Editorial Queue database before each write and chooses one of three actions:
  - **`inserted`** — no matching row exists. POST creates the row at `Status=raw`.
  - **`updated`** — matching row exists at `Status=raw`. PATCH overwrites the AI-generated fields. The PATCH body intentionally omits `Status` so a write can never demote a row that may be about to be promoted.
  - **`skipped_human_edited`** — matching row exists at any non-raw Status (including the defensive "unset" case). No write happens. BM's edits are preserved.
- Every write logs `editorial_queue_row.action = <action>` on the event payload for operational visibility.
- The run summary surfaces `notionRowsInserted`, `notionRowsUpdated`, and `notionRowsSkippedHumanEdited`. `notionRowsWritten` is defined as inserts + updates; skips are not counted as writes.
- Result: a re-run with the same source set produces zero duplicates. cron-job.org transient retries and any future trigger overlap are safe at this layer.

## Operational Logging (Pipeline Log / Source Health Log)
- The ingestion endpoint writes one row to the Notion Pipeline Log on every completion (success or failure). `Status` is `ok` when every branch succeeded, `warn` when staging surfaced row-level errors but the cron still returned 200, `fail` otherwise. Body includes per-branch success flags, the `inserted/updated/skipped` row counts from Branch C, and the row total for the day.
- The health endpoint writes one Pipeline Log row per invocation, capturing today's row count, the expected sources, and any missing sources. `fail` (HTTP 500) when row count < 7; `warn` (HTTP 200) when row count ≥ 7 but at least one expected source is missing; `ok` (HTTP 200) otherwise.
- Both writers are best-effort. Missing `NOTION_PIPELINE_LOG_DB_ID`, missing `NOTION_TOKEN`, or any Notion API failure produces a warn-level log entry and a `{ written: false, reason }` result — the underlying cron or health check is never failed by a log write.
- The Source Health Log writer (`src/lib/observability/source-health-log.ts`) is keyed on `(Source, Date)` and follows the same insert-or-update idempotency contract as Branch C E3. The Branch B fetch path calls this writer on every fetch attempt — `success` increments `Success Count` and updates `Last Successful Fetch`; `fail` increments `Fail Count`; `skipped_circuit_breaker` does not increment either counter and bypasses Sentry.

## RSS Circuit Breaker (Branch B Step R2)
- Threshold: today's `Fail Count` for a source ≥ 5 → skip the next fetch for that source. Implementation: [`src/lib/observability/rss-circuit-breaker.ts`](../../../src/lib/observability/rss-circuit-breaker.ts).
- Auto-reset: daily rollover at Taipei midnight. Each new day's row starts at `Fail Count = 0`, so a skipped source is automatically retried on the next day's first ingestion run (~22 h window between the last 19:45 Taipei run and the next 18:15 Taipei run).
- Skip behavior:
  - Writes a Source Health Log entry with `Last Outcome = skipped_circuit_breaker`.
  - Throws `RssCircuitBreakerSkipError` so the caller's existing per-source failure path records the skip in the failure list without a network call.
  - Does **not** call `captureRssFailure` — Sentry stays quiet for known-flaky sources.
- Sentry noise filter: `sentry.server.config.ts` runs `isFilteredRssNoiseEvent` in `beforeSend` and drops events whose exception message matches `^Feed request retry exhausted for `. Those failures are now tracked exclusively in the Source Health Log. All other `RssError` variants continue to report normally.
- Permissive failure contract: if `NOTION_SOURCE_HEALTH_LOG_DB_ID` is unset or the Notion query fails, the circuit breaker returns `skip: false` and the fetch proceeds. Observability degradation must never silently disable ingestion.
