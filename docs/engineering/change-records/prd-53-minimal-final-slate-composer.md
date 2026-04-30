# PRD-53 Minimal Final-Slate Composer

Date: 2026-04-30

## Change Type

Feature implementation under approved PRD-53 amendment.

## Source of Truth

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-card-level-editorial-authority.md`

## Scope

This change adds the minimal Phase 2 admin composer for a reviewed Signals slate:

- Core slots 1-5
- Context slots 6-7
- candidate pool assignment controls
- remove-from-slate controls
- pure final-slate readiness validation
- disabled publish/readiness state
- release-governance gate alignment so implementation against an already-mapped canonical PRD amendment can pass without creating a duplicate PRD

The composer persists draft placement only. It does not publish rows, archive live rows, run cron, run the pipeline, or change public read behavior.

## Persistence

The migration adds nullable placement fields to `signal_posts`:

- `final_slate_rank`
- `final_slate_tier`

The fields are additive, nullable by default, and constrained to the approved 5 Core + 2 Context placement model. No production data backfill is included.

## Public Visibility

Public visibility remains gated by the existing public read contract:

- `is_live = true`
- `editorial_status = 'published'`
- `published_at IS NOT NULL`

`final_slate_rank` alone is not public visibility.

## Deferred

- reject / hold / replace / promote / demote controls
- locked slate publish workflow
- publish batches and rollback execution
- historical snapshot/schema layer
- cron re-enable consideration
