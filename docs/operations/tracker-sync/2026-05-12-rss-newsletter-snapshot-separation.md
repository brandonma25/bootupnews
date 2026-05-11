# Manual Tracker Sync — RSS Newsletter Snapshot Separation

## Context
- Branch: `fix/rss-newsletter-snapshot-separation`
- Work type: Bug fix / production remediation
- Related PRDs: PRD-60 scheduled RSS fetch, PRD-61 newsletter ingestion runtime
- Repo record: `docs/engineering/bug-fixes/rss-newsletter-snapshot-rank-collision-2026-05-12.md`

## Manual Update Payload
- Status: `Built` for the RSS snapshot separation fix.
- Owner: `BM`
- Notes: PR #223 merged and deployed. RSS persistence no longer treats newsletter discovery candidates as an existing RSS snapshot. Newsletter discovery candidates are assigned lower-priority ranks so the current RSS candidate set can occupy the top editorial-review ranks after the next fetch.
- Evidence: local lint, full unit suite, build, governance gate, documentation coverage, PR governance audit, PR checks, production deployment, and protected post-deploy RSS fetch passed for the RSS snapshot separation fix.
- Merge SHA: `316a089c37fe8b83c8fe88b71216917ef71be5eb`
- Validation record: `docs/engineering/testing/2026-05-12-pr223-rss-newsletter-snapshot-production-validation.md`

## Production Follow-Up
- Regenerate the production Gmail refresh token from the Gmail account that exposes `boot-up-benchmark`.
- Rerun `/api/cron/fetch-editorial-inputs` after the Gmail token is corrected.
- Confirm newsletter emails and story extractions populate only after Gmail label preflight succeeds.
- Publish only after BM selects and approves the final slate.
