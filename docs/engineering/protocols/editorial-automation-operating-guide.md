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

## Required Environment Variables
- `NOTION_TOKEN` — Notion integration token from notion.so/my-integrations.
- `NOTION_EDITORIAL_QUEUE_DB_ID` — Notion Editorial Queue database ID (`56caed793822497e8e58e8dc2291d395`).
- `RESEND_API_KEY` — Resend API key for staging completion emails.
- `EDITORIAL_PUSH_SECRET` — Secret token for the push-approved endpoint.
- `CRON_SECRET` — Existing cron secret for the fetch-editorial-inputs cron route.

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
