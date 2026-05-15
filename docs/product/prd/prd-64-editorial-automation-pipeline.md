# PRD-64 — Editorial Automation Pipeline

- PRD ID: `PRD-64`
- Canonical file: `docs/product/prd/prd-64-editorial-automation-pipeline.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Automate the daily triage of RSS and newsletter candidates into a Notion editorial queue so BM can approve, edit, and publish signals without manual copy-paste work.

## Problem
- Signal candidates from RSS and newsletter ingestion accumulate in the database with no lightweight editorial surface for review and one-click promotion to published signals.

## Scope
### Must Do
- Deduplicate RSS and newsletter candidates using Jaccard similarity before staging.
- Score and write deduplicated candidates to a Notion Editorial Queue database.
- Send a Resend completion email after each staging run summarising what was written.
- Expose a `GET /api/editorial/test-stage` endpoint to trigger staging manually.
- Expose a `GET /api/editorial/push-approved?token=` endpoint to promote approved Notion rows into `signal_posts`.
- Extend the `fetch-editorial-inputs` cron to run editorial staging as a third sequential task after newsletter and RSS.

### Must Not Do
- Replace the existing RSS or newsletter ingestion pipelines.
- Auto-publish signals without BM approval in Notion.
- Require a Notion connection for the RSS or newsletter ingestion tasks to succeed.

## System Behavior
- The cron runs newsletter → RSS → editorial staging in sequence.
- Editorial staging reads from `signal_posts` and `newsletter_story_extractions`, deduplicates, scores, and writes rows to the Notion Editorial Queue DB (`56caed793822497e8e58e8dc2291d395`).
- BM reviews rows in Notion, sets status to Approved, then hits the push endpoint to promote them.

## Key Logic
- `src/lib/editorial-staging/dedup.ts` — Jaccard dedup across newsletter and RSS candidates
- `src/lib/editorial-staging/notion-writer.ts` — writes staged rows to Notion via REST API
- `src/lib/editorial-staging/email.ts` — sends Resend completion email
- `src/lib/editorial-staging/runner.ts` — orchestrates Steps B–G
- `src/app/api/editorial/test-stage/route.ts` — manual trigger endpoint
- `src/app/api/editorial/push-approved/route.ts` — approval promotion endpoint
