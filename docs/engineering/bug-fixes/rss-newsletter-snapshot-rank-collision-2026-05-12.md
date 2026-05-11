# RSS Newsletter Snapshot Rank Collision — Bug-Fix Record

## Summary
- Problem addressed: Newsletter discovery candidates could occupy ranks `1-5` in `signal_posts` for a briefing date before the RSS snapshot was persisted.
- Root cause: RSS snapshot idempotency checked only `briefing_date` plus occupied `rank` values. It did not distinguish RSS-derived Signal review rows from newsletter discovery rows.
- Affected object level: Surface Placement. The bug affected editorial-review placement rows in legacy `signal_posts`, not canonical Signal identity.

## Fix
- Exact change: RSS persistence now reserves existing unselected newsletter discovery rows into lower-priority rank slots before inserting the RSS snapshot, and newsletter promotion now allocates open ranks from `20` downward.
- Related PRD: PRD-60 scheduled RSS fetch and PRD-61 newsletter ingestion runtime.
- PR: Pending.
- Branch: `fix/rss-newsletter-snapshot-separation`
- Head SHA: Pending.
- Merge SHA: Pending.
- GitHub source-of-truth status: Pending PR.
- External references reviewed, if any: None.
- Google Sheet / Work Log reference, if historically relevant: Not updated directly; fallback tracker-sync record required if live tracker access is unavailable.
- Branch cleanup status: Pending merge.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
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
  - Confirm production Gmail OAuth refresh token belongs to the Gmail account with `boot-up-benchmark`.
  - After deployment and env correction, run the combined fetch and confirm the current editorial set contains RSS candidates above newsletter discovery rows.

## Remaining Risks / Follow-up
- Existing production newsletter discovery rows still require one post-deploy fetch to rebalance their ranks and let RSS rows occupy the current top ranks.
- Production newsletter fetching remains blocked until `GMAIL_REFRESH_TOKEN` is regenerated from the Gmail account that exposes `boot-up-benchmark`.
