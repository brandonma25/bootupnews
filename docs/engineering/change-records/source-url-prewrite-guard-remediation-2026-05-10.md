# Source URL Pre-Write Guard Remediation — Change Record

## Classification
- Change type: bug-fix / data remediation.
- Canonical PRD required: No.
- Reason: This aligns the manual draft insertion, approval, final-slate, and publish-readiness paths with the existing Boot Up MVP source-backed editorial standard. It does not add a net-new product feature or system capability.

## Scope
- Prevent `signal_posts` Surface Placement rows from being inserted without at least one public `http://` or `https://` source URL.
- Report skipped draft candidates with `missing_public_source_url` before persistence.
- Block approval, final-slate assignment, final-slate readiness, and publish readiness for source-empty rows.
- Add a database-level source URL guard only after confirming production has no legitimate historical empty-source rows.

## Non-Goals
- No source manifest changes.
- No ingestion source additions.
- No ranking, WITM template, eligibility filter, or schema redesign.
- No cron re-enable.
- No automatic publish or replacement row insertion.

## Supporting Record
- Bug-fix record: `docs/engineering/bug-fixes/source-url-prewrite-guard-2026-05-10.md`
- PR: `https://github.com/brandonma25/daily-intelligence-aggregator/pull/208`
- Merge SHA: `24cf07e3b8f4f4394c3dd3667eec663de1f0782b`
- Production deploy: `dpl_5CDb9wxaBU54pnRw3ujF6podY3Hh`

## Validation Summary
- Production source-empty inventory after cleanup: 0 rows.
- Target invalid smoke-test rows remaining after cleanup: 0 rows.
- Public routes checked: `/`, `/signals`, `/briefing/2026-05-06`.
- Cron state checked: deployed cron list empty; unauthenticated cron endpoint returned HTTP 401.
- Local validation checked: targeted tests, full test suite, lint, build, release governance gate, documentation coverage, and local HTTP 200 load.
- Post-merge production deploy reached `Ready`; subsequent PR #203 documentation closeout deploy `dpl_6ueScqM69hWQbvkZNCkdnvvkDMbX` also reached `Ready` with the same public route and cron safety checks passing.
