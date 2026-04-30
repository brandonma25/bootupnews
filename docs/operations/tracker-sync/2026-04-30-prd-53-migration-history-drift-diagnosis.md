# Tracker Sync Fallback - PRD-53 Migration-History Drift Diagnosis

Date: 2026-04-30
Branch: `codex/prd-53-migration-history-drift-diagnosis`
PRD: `PRD-53`
Canonical PRD file: `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
Readiness label: `migration_history_drift_requires_database_owner_review`

## Manual tracker update payload

Use this fallback if live Google Sheets tracker access is unavailable.

| Field | Value |
| --- | --- |
| `prd_id` | `PRD-53` |
| `PRD File` | `docs/product/prd/prd-53-signals-admin-editorial-layer.md` |
| `Status` | `In Review` |
| `Decision` | `build` |
| `Owner` | `Codex` |
| `Last Updated` | `2026-04-30` |
| `Notes` | Migration-history drift diagnosis completed without production mutation. `supabase db push --dry-run --linked` still reports seven pending migrations. Earlier pending migrations include row-update/backfill behavior, and app-visible schema suggests some earlier `signal_posts` effects may already exist despite absent migration-history records. Direct `supabase migration list --linked` was blocked by Supabase CLI temp-role authentication/circuit-breaker errors, so database-owner review is required before any `supabase migration repair`, `supabase db push`, PRD-53 schema alignment retry, `draft_only`, publish, cron, or MVP measurement. |

## Validation outcome

- Change type: remediation / alignment diagnostic.
- Production homepage returned HTTP 200 but still reports missing PRD-53 `signal_posts` columns.
- `/signals` returned HTTP 200 and did not expose candidate rows.
- Cron endpoint returned HTTP 401 unauthorized and was not run.
- Worktree was linked to Supabase project `fwkqjeumreaznfhnlzev` using local ignored metadata only.
- Migration dry-run reported the same seven pending migrations:
  - `20260424083000_signal_posts_historical_archive.sql`
  - `20260426090000_pipeline_article_candidates.sql`
  - `20260426120000_signal_posts_public_depth_pool.sql`
  - `20260426143000_signal_posts_why_it_matters_quality_gate.sql`
  - `20260430100000_signal_posts_final_slate_composer.sql`
  - `20260430110000_signal_posts_editorial_card_controls.sql`
  - `20260430120000_published_slates_minimal_audit_history.sql`
- Direct remote migration listing was unavailable because the Supabase CLI temp role hit authentication failures and circuit-breaker blocking.
- No production migration, no migration repair, no direct SQL, no row mutation, no `draft_only`, no publish, and no cron was performed.

## Required next action

Perform an authorized database-owner migration-history review before retrying PRD-53 schema alignment.

The next run should verify each pending migration's actual production effects, then choose one of:

- repair migration history only for migrations proven already applied,
- separately authorize and apply earlier missing DML/backfill migrations,
- or stop for database-owner review if any migration effect remains unclear.

Only after migration history is safe and understood should the PRD-53 additive schema migrations be applied and the second controlled cycle rerun.

## Explicit non-actions

- No feature implementation.
- No new PRD.
- No source governance change.
- No source addition.
- No ranking threshold change.
- No WITM threshold change.
- No public URL, domain, environment, or Vercel setting change.
- No direct DB row intervention.
- No production schema migration apply.
- No migration-history repair.
- No production publish.
- No `draft_only`.
- No cron.
- No automatic public publishing.
- No MVP measurement instrumentation.
- No Phase 2 architecture.
- No personalization.
