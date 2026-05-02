# PRD-53 Seven-Row Publish Hardening

Date: 2026-04-30
Branch: `codex/prd-53-seven-row-publish-hardening`
Readiness label: `ready_for_prd_53_seven_row_publish_hardening_review`

## Source of truth

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`

## Summary

This change hardens the PRD-53 admin publish workflow so the existing editorial review surface can publish exactly the validated `5 Core + 2 Context` final slate.

The implementation updates the existing publish path instead of adding a parallel workflow:

- runs the final-slate readiness validator immediately before writes
- blocks invalid slates without modifying rows
- archives the existing live rows by setting `is_live = false`
- publishes exactly seven selected final-slate rows
- sets selected rows to `is_live = true`, `editorial_status = 'published'`, and `published_at`
- keeps rank-8, held, rejected, rewrite-requested, removed, Depth/unpromoted, candidate, and non-selected rows hidden
- keeps public reads gated by `is_live = true`, `editorial_status = 'published'`, and `published_at IS NOT NULL`
- uses `final_slate_rank` for public Core/Context ordering when present, with legacy `rank` as a fallback for older published rows

## Atomicity note

The current Supabase client path does not expose a repository transaction helper for this publish operation. The implementation validates all publishability conditions before writes, limits writes to previous live rows and selected final-slate rows, and performs best-effort restoration if selected-row publication fails after archiving.

Full transaction-backed publish batches and durable rollback history remain out of scope for this PR and belong to the next audit/history phase.

## Rollback preparation

If post-publish verification fails:

1. Identify the newly live seven final-slate rows.
2. Set those rows `is_live = false`.
3. Restore the archived previous live rows to `is_live = true`.
4. Preserve row data for diagnosis.
5. Verify `/` and `/signals` again.

This PR does not implement a rollback execution system or publish batch history.

## Non-actions

- No production publish was performed.
- No cron change was made.
- No `dry_run`, `draft_only`, or pipeline write-mode run was performed.
- No production database rows were mutated.
- No source governance, source list, ranking threshold, or WITM threshold changed.
- No full historical snapshot/schema layer was implemented.
- No Phase 2 architecture or personalization work was started.
