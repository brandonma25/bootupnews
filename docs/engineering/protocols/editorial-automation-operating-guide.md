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
- `GET /api/cron/fetch-editorial-inputs` — daily ingestion. Authenticates via the `x-cron-secret` HTTP header matching `CRON_SECRET`. Triggered externally by cron-job.org (see Triggering below).

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

## Key Files
- `src/lib/editorial-staging/runner.ts` — orchestrates Steps B–G
- `src/lib/editorial-staging/dedup.ts` — Jaccard dedup
- `src/lib/editorial-staging/notion-writer.ts` — Notion REST API writer
- `src/lib/editorial-staging/email.ts` — Resend completion email
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
