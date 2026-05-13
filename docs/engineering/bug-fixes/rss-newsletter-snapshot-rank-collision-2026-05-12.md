# RSS Newsletter Snapshot Rank Collision — Bug-Fix Record

## Summary
- Problem addressed: Newsletter discovery candidates could occupy ranks `1-5` in `signal_posts` for a briefing date before the RSS snapshot was persisted.
- Root cause: RSS snapshot idempotency checked only `briefing_date` plus occupied `rank` values. It did not distinguish RSS-derived Signal review rows from newsletter discovery rows.
- Affected object level: Surface Placement. The bug affected editorial-review placement rows in legacy `signal_posts`, not canonical Signal identity.

## Fix
- Exact change: RSS persistence now reserves existing unselected newsletter discovery rows into lower-priority rank slots before inserting the RSS snapshot, and newsletter promotion now allocates open ranks from `20` downward.
- Related PRD: PRD-60 scheduled RSS fetch and PRD-61 newsletter ingestion runtime.
- PR: [#223](https://github.com/brandonma25/bootupnews/pull/223)
- Branch: `fix/rss-newsletter-snapshot-separation`
- Head SHA: `dce4b0c7c104424d2ea0a9ce36c68b2a046975e0`
- Merge SHA: `316a089c37fe8b83c8fe88b71216917ef71be5eb`
- GitHub source-of-truth status: Merged into `main` on 2026-05-11.
- External references reviewed, if any: None.
- Google Sheet / Work Log reference, if historically relevant: No live Google Sheets update claimed. Operational closeout and tracker-sync evidence should live in PR metadata, GitHub history, or private archive records rather than public documentation links.
- Branch cleanup status: Source branch and temporary implementation worktree were removed after merge.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `signal_posts` naming remains documented as operational placement storage.

## Validation
- Automated checks:
  - `npm install`
  - `npm run test -- src/lib/signals-editorial.test.ts src/lib/newsletter-ingestion/storage-promotion.test.ts src/lib/newsletter-ingestion/dry-run-report.test.ts`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `python3 scripts/release-governance-gate.py`
  - `python3 scripts/validate-documentation-coverage.py`
  - `python3 scripts/pr-governance-audit.py`
- Human checks:
  - Confirm production Gmail OAuth refresh token belongs to the Gmail account with `[REDACTED_GMAIL_LABEL]`.
  - After deployment and env correction, run the combined fetch and confirm the current editorial set contains RSS candidates above newsletter discovery rows.
- GitHub PR checks:
  - `feature-system-csv-validation`
  - `release-governance-gate`
  - `pr-lint`
  - `pr-unit-tests`
  - `pr-build`
  - `pr-e2e-chromium`
  - `pr-e2e-webkit`
  - `pr-summary`
- Post-merge production validation:
  - Production deploy for merge SHA `316a089c37fe8b83c8fe88b71216917ef71be5eb` reached `READY`.
  - Protected fetch persisted a new RSS review snapshot for briefing date `2026-05-11`.
  - RSS result inserted `5` `signal_posts` review candidates and reserved `5` newsletter discovery candidate ranks outside the RSS snapshot range.
  - Public `/` and `/signals` returned HTTP `200`; public slate remained the May 6 published slate because BM had not selected and approved a new final slate.
  - Newsletter fetch still failed closed at Gmail label preflight with a sanitized account/label mismatch message.

## Remaining Risks / Follow-up
- RSS snapshot rank collision is fixed and post-deploy fetch rebalanced existing newsletter discovery rows out of the RSS top-rank range.
- Production newsletter fetching remains blocked until `GMAIL_REFRESH_TOKEN` is regenerated from the Gmail account that exposes `[REDACTED_GMAIL_LABEL]`.
- Publishing the new public signal slate remains an editorial action; no publish was performed by this fix.
