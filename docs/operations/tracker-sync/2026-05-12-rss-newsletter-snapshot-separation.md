# Manual Tracker Sync — RSS Newsletter Snapshot Separation

## Context
- Branch: `fix/rss-newsletter-snapshot-separation`
- Work type: Bug fix / production remediation
- Related PRDs: PRD-60 scheduled RSS fetch, PRD-61 newsletter ingestion runtime
- Repo record: `docs/engineering/bug-fixes/rss-newsletter-snapshot-rank-collision-2026-05-12.md`

## Manual Update Payload
- Status: `In Review` until PR checks pass and the PR is merged.
- Owner: `BM`
- Notes: RSS persistence no longer treats newsletter discovery candidates as an existing RSS snapshot. Newsletter discovery candidates are assigned lower-priority ranks so the current RSS candidate set can occupy the top editorial-review ranks after the next fetch.
- Evidence: local lint, full unit suite, build, governance gate, documentation coverage, and PR governance audit passed.

## Production Follow-Up
- After merge/deploy, regenerate the production Gmail refresh token from the Gmail account that exposes `boot-up-benchmark`.
- Rerun `/api/cron/fetch-editorial-inputs`.
- Confirm the current editorial set has RSS candidates in ranks `1-5` and newsletter discovery rows below them.
- Publish only after BM selects and approves the final slate.
