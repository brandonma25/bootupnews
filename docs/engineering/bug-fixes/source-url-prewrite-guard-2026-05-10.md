# Source URL Pre-Write Guard — Bug-Fix Record

## Summary
- Problem addressed: Three manual smoke-test Surface Placement rows were inserted with empty `source_url`, and two later reached `approved` status even though they had no reviewable public source authority.
- Root cause: Manual `draft_only` persistence built signal-card rows and WITM validation metadata before enforcing that at least one public `http://` or `https://` source URL existed.
- Affected object level: Surface Placement + Card copy read model (`signal_posts` legacy/runtime table name), not canonical Signal identity.

## Fix
- Exact change: Delete the three invalid non-live rows, skip missing-source candidates before draft insertion, report skipped candidates with `missing_public_source_url`, block approval/final-slate assignment/final-slate readiness/publish readiness for missing public URLs, and add a database constraint preventing empty or non-http(s) `signal_posts.source_url`.
- Related PRD: Not required. This is bug-fix / data remediation aligned to the existing Boot Up MVP editorial source-of-truth.
- PR: `https://github.com/brandonma25/daily-intelligence-aggregator/pull/208`.
- Branch: `bugfix/source-url-prewrite-guard-20260510`
- Head SHA: `0349988e60ce0d860c18fd26ca4b07d92ec2f6d5`.
- Merge SHA: `24cf07e3b8f4f4394c3dd3667eec663de1f0782b`.
- Production deploy: `dpl_5CDb9wxaBU54pnRw3ujF6podY3Hh`.
- GitHub source-of-truth status: This record is the repo-side bug-fix record for the remediation.
- External references reviewed, if any: None.
- Google Sheet / Work Log reference, if historically relevant: None.
- Branch cleanup status: Merged remote branch deleted. Local worktree retained for follow-up cleanup.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Surface Placement + Card copy.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] If legacy naming is inconsistent, document it instead of silently expanding it.

## Validation
- Automated checks:
  - `npm run test -- src/lib/signals-editorial.test.ts src/lib/final-slate-readiness.test.ts` passed.
  - `npm run lint` passed.
  - `npm run test` passed.
  - `npm run build` passed.
  - `python3 scripts/release-governance-gate.py` passed after adding the no-PRD remediation change record.
  - `python3 scripts/validate-documentation-coverage.py` passed.
  - Local app load check returned HTTP 200 at `http://localhost:3000/`.
- Human checks:
  - Production data readback confirmed the three invalid rows were deleted.
  - Production data readback found zero empty or non-http(s) `source_url` rows in the scanned `signal_posts` set.
  - Production public routes `/`, `/signals`, and `/briefing/2026-05-06` returned HTTP 200.
  - Production cron endpoint `/api/cron/fetch-news` returned HTTP 401 without credentials.
  - Vercel deployed cron list returned `crons: []`.
  - Post-merge production deployment `dpl_5CDb9wxaBU54pnRw3ujF6podY3Hh` reached `Ready`.

## Remaining Risks / Follow-up
- The database constraint is present as a repo migration and should be applied through the normal migration/deploy path for production enforcement. Application-level guards already prevent draft insertion, approval, final-slate assignment, and publish readiness for missing public URLs after this code is deployed.
