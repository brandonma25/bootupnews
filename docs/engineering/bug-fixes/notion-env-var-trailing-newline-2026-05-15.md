# Notion Env Var Trailing Newline — Bug-Fix Record

## Summary
- Problem addressed: `notionRowsWritten` was always `0` despite `candidateCount > 0` after editorial staging ran. All Notion page-create requests silently failed.
- Root cause: `NOTION_EDITORIAL_QUEUE_DB_ID` and `NOTION_TOKEN` env vars set in Vercel contained a trailing newline character. The raw value was passed directly to the Notion REST API, which rejected the malformed `database_id` field with a validation error. The error was caught per-row and logged but did not surface in the top-level run result.
- Affected object level: Pipeline infrastructure. No canonical Signal, Cluster, Card, or Surface Placement data was corrupted; the editorial staging Notion writes simply never landed.

## Fix
- Exact change: Added `.trim()` at every env var read site — `process.env.NOTION_EDITORIAL_QUEUE_DB_ID?.trim()` in `runner.ts` and `push-approved/route.ts`, and `process.env.NOTION_TOKEN?.trim()` in `notion-writer.ts`.
- Related PRD: PRD-64 editorial automation pipeline.
- PR: [#239](https://github.com/brandonma25/bootupnews/pull/239)
- Branch: `feat/editorial-automation-pipeline`
- GitHub source-of-truth status: Pending merge into `main`.
- External references reviewed, if any: None.
- Branch cleanup status: To be removed after merge.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Pipeline infrastructure only.
- [x] No new variable, file, function, component, or database terminology introduced.
- [x] Legacy `signal_posts` naming unaffected.

## Validation
- Human checks:
  - Verify rows appear in Notion Editorial Queue database after next cron run.
- GitHub PR checks:
  - `feature-system-csv-validation`
  - `release-governance-gate`
  - `pr-lint`
  - `pr-unit-tests`
  - `pr-build`

## Remaining Risks / Follow-up
- None. The fix is defensive (`.trim()` is a no-op when the value has no whitespace) and does not change any observable behaviour for correctly-formatted env vars.
- `/api/editorial/test-stage` route deleted in chore/remove-test-stage-endpoint (post-validation cleanup).
