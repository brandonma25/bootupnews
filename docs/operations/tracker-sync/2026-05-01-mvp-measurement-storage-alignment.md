# Tracker Sync Fallback - MVP Measurement Storage Alignment

Date: 2026-05-01
Branch: `codex/mvp-measurement-storage-alignment`
Readiness label: `ready_for_final_launch_readiness_qa_rerun`

## Manual Tracker Update Payload

| Field | Value |
| --- | --- |
| Record | Product Position - MVP Success Criteria / PR #175 MVP measurement instrumentation |
| Status | In Review |
| Decision | keep |
| PRD File | `docs/product/prd/prd-53-signals-admin-editorial-layer.md` |
| Latest validation packet | `docs/operations/controlled-cycles/2026-05-01-mvp-measurement-storage-alignment.md` |
| Result | Production measurement storage was aligned by applying the committed additive `20260501100000_mvp_measurement_events.sql` migration through Supabase CLI. Production event API now returns `stored:true` for synthetic `homepage_view`, `signals_page_view`, and `signal_full_expansion_proxy` QA events. Public `/`, `/signals`, and `/briefing/2026-05-01` remained safe; cron endpoint remained protected with HTTP 401. |
| Limitations | Post-apply `supabase migration list --linked` was blocked by Supabase CLI auth circuit breaker after apply, though post-apply dry-run returned remote database up to date. Local measurement summary helper could not read production rows because Supabase server config is not exposed in this worktree. |
| Next task | Rerun final launch-readiness QA from latest `main`; verify event API still returns `stored:true`, rerun migration-list readback after the circuit breaker cools down, run the measurement summary helper in a configured environment, then decide readiness for controlled user exposure. |

## Source Of Truth

- Product Position - MVP Success Criteria
- PR #175 MVP measurement instrumentation
- PR #176 final launch-readiness QA blocker
- `docs/engineering/change-records/mvp-measurement-instrumentation.md`
- `docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa.md`
- `docs/operations/tracker-sync/2026-05-01-final-launch-readiness-qa.md`
- `docs/operations/controlled-cycles/2026-05-01-mvp-measurement-storage-alignment.md`

## Validation

Run from branch `codex/mvp-measurement-storage-alignment`:

- `npm install`
- `git diff --check`
- `python3 scripts/validate-feature-system-csv.py`
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/mvp-measurement-storage-alignment --pr-title "MVP measurement storage alignment"`
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/mvp-measurement-storage-alignment --pr-title "MVP measurement storage alignment"`
- `npm run lint`
- `npm run test`
- `npm run build`

Results:

- docs validation and release governance gate passed
- lint passed
- test passed: 77 test files, 586 tests
- build passed
