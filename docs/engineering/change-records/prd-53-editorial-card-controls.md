# PRD-53 Editorial Card Controls

Date: 2026-04-30

## Change Type

Feature implementation under the approved PRD-53 amendment.

## Source of Truth

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-card-level-editorial-authority.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`

## Scope

This change extends the PRD-53 final-slate composer with explicit card-level editorial controls:

- approve and save draft edit through the existing editorial workflow
- request rewrite
- reject
- hold as editorial evidence
- replace a selected row with an existing candidate
- promote or move a candidate into Core or Context slots
- demote or remove a row from the draft slate
- block rejected, held, rewrite-requested, removed, live, and already-published rows from draft slate assignment
- keep public reads from showing rows with blocking editorial decisions

## Persistence

The migration adds nullable decision fields to `signal_posts`:

- `editorial_decision`
- `decision_note`
- `rejected_reason`
- `held_reason`
- `replacement_of_row_id`
- `reviewed_by`
- `reviewed_at`

The fields are additive and nullable by default. No production data backfill is included.

## Public Visibility

Public visibility remains gated by the existing public read contract:

- `is_live = true`
- `editorial_status = 'published'`
- `published_at IS NOT NULL`

Rows with `editorial_decision` values of `rejected`, `held`, `rewrite_requested`, or `removed_from_slate` are also filtered out as a safety measure.

## Deferred

- final 7-row publish workflow
- publish batches
- rollback execution
- source concentration controls
- full audit/history event tables
- historical snapshot/schema layer
- cron re-enable consideration
