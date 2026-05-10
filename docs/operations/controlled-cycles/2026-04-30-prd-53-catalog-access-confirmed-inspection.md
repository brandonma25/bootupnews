# PRD-53 Catalog Access Confirmed Inspection

Date: 2026-04-30
Branch: `codex/prd-53-catalog-access-confirmed-inspection`
Readiness label: `ready_for_authorized_migration_history_repair_or_apply`

## Effective Change Type

Remediation / alignment diagnostic under the approved PRD-53 Signals admin editorial workflow.

This packet is diagnostic only. It does not create a feature, create a PRD, apply production migrations, repair migration history, run DDL, run DML, mutate rows, run `draft_only`, publish, run cron, or start MVP measurement.

Object level: Surface Placement and Card read-model storage in legacy `public.signal_posts`, plus internal publish audit tables. `signal_posts` remains legacy/runtime naming for editorial/public placement storage, not canonical Signal identity.

## Source Of Truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

- PR #158 migration-history drift diagnosis
- PR #159 database-owner migration-history review
- PR #160 catalog-level database-owner review
- PR #161 stable catalog readonly blocked record
- PR #163 stable catalog readonly rerun blocked record
- PR #164 stable catalog access blocked record
- PR #165 stable catalog access inspection blocked record
- PR #162 public hotfix verification context
- `docs/operations/controlled-cycles/2026-04-30-prd-53-stable-catalog-access-inspection.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-stable-catalog-access-inspection.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-stable-catalog-readonly-access-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-stable-catalog-readonly-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-stable-catalog-readonly-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-catalog-level-database-owner-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-database-owner-migration-history-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-migration-history-drift-diagnosis.md`

## Why This Inspection Was Needed

PR #158 through PR #165 narrowed the production schema-alignment blocker to Supabase migration-history drift. The prior stable-catalog runs could not complete because stable read-only catalog access was not available to Codex. This run was started only after the operator confirmed that stable read-only production schema/catalog access was available.

The purpose of this inspection was to determine whether the seven pending migrations are genuinely missing, already applied but unrecorded, partially applied, or blocked by an unsafe out-of-scope migration order.

The run used only read-only/dry-run Supabase commands and read-only catalog queries. No production schema, migration history, or application rows were mutated.

## Workspace Baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection` |
| Branch | `codex/prd-53-catalog-access-confirmed-inspection` |
| Starting commit | `3fbca5bb50af746426e18f66d0bf7afee8859f28` |
| Commit description | `Merge pull request #165 from brandonma25/codex/prd-53-stable-catalog-access-inspection` |
| UTC capture time | `2026-05-01T01:56:40Z` |
| Local capture time | `2026-05-01 09:56:40 CST` |
| Production project ref | `fwkqjeumreaznfhnlzev` |
| Production project URL | `https://fwkqjeumreaznfhnlzev.supabase.co` |
| Production app URL | `https://bootupnews.vercel.app` |

The canonical checkout at `/Users/bm/dev/daily-intelligence-aggregator` remained on its existing branch and was not disturbed. This inspection used the dedicated worktree above.

## Authorization Variables

| Authorization | Status |
| --- | --- |
| `CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true` | Present in the prompt. |
| `CONTROLLED_PRODUCTION_CATALOG_READONLY_INSPECTION_APPROVED=true` | Present in the prompt. |
| `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` | Absent. |

Only read-only production schema/catalog inspection was authorized. Mutation was not authorized.

## Catalog Access Method

Stable read-only catalog access was available in this run through:

- the Supabase dashboard SQL Editor already open in Chrome, using the production project `fwkqjeumreaznfhnlzev`;
- Supabase CLI project listing and local link metadata for the same project ref;
- `supabase db query --linked`, which successfully ran `select 1 as ok` and subsequent catalog-only `select` queries.

No secret values, database passwords, connection strings, browser cookies, API tokens, or session data were printed, echoed, logged, persisted, copied into docs, or committed.

The only local project-linking action was:

```bash
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection
```

That action created local Supabase project-link metadata only. It did not mutate production schema, production rows, or migration history.

## Commands Run

Workspace and repo context:

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
git log -1 --oneline
date -u +%Y-%m-%dT%H:%M:%SZ
date '+%Y-%m-%d %H:%M:%S %Z'
```

Supabase project and migration inventory:

```bash
supabase projects list --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection
```

Read-only catalog checks:

```bash
supabase db query "select 1 as ok;" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
supabase db query "<migration-history expected-version select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
supabase db query "<PRD-53 signal_posts column presence select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
supabase db query "<earlier signal_posts column presence select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
supabase db query "<table presence select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
supabase db query "<target index presence select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
supabase db query "<target constraint presence select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
supabase db query "<target constraint definition select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
supabase db query "<pipeline policy presence select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
supabase db query "<pipeline index presence select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
supabase db query "<RLS table presence select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-access-confirmed-inspection --output table
```

Local SQL inspection:

```bash
ls supabase/migrations
rg -n "^(alter table|create table|create index|create unique index|create policy|update |insert |delete |drop |create trigger|create function|create type|alter policy|drop index|drop constraint|add constraint)" supabase/migrations/20260424083000_signal_posts_historical_archive.sql supabase/migrations/20260426090000_pipeline_article_candidates.sql supabase/migrations/20260426120000_signal_posts_public_depth_pool.sql supabase/migrations/20260426143000_signal_posts_why_it_matters_quality_gate.sql supabase/migrations/20260430100000_signal_posts_final_slate_composer.sql supabase/migrations/20260430110000_signal_posts_editorial_card_controls.sql supabase/migrations/20260430120000_published_slates_minimal_audit_history.sql
```

The `supabase migration list --linked` command did not complete a stable inventory because the CLI temporary login role hit a password-auth/circuit-breaker failure. The dry-run push and linked catalog queries did complete successfully.

## Read-Only Migration Inventory

`supabase db push --dry-run --linked` reported that it would push exactly seven migrations:

1. `20260424083000_signal_posts_historical_archive.sql`
2. `20260426090000_pipeline_article_candidates.sql`
3. `20260426120000_signal_posts_public_depth_pool.sql`
4. `20260426143000_signal_posts_why_it_matters_quality_gate.sql`
5. `20260430100000_signal_posts_final_slate_composer.sql`
6. `20260430110000_signal_posts_editorial_card_controls.sql`
7. `20260430120000_published_slates_minimal_audit_history.sql`

No `supabase db push --linked` command was run.

## Migration-History Metadata Evidence

Read-only query against `supabase_migrations.schema_migrations`:

| Version | Migration | Migration-history status |
| --- | --- | --- |
| `20260416200404` | `prd_13_signal_filtering_columns.sql` | Recorded |
| `20260421120000` | `v1_account_controls.sql` | Recorded |
| `20260423090000` | `signals_admin_editorial_layer.sql` | Recorded |
| `20260423120000` | `signal_posts_structured_editorial_payload.sql` | Recorded |
| `20260424083000` | `signal_posts_historical_archive.sql` | Absent |
| `20260426090000` | `pipeline_article_candidates.sql` | Absent |
| `20260426120000` | `signal_posts_public_depth_pool.sql` | Absent |
| `20260426143000` | `signal_posts_why_it_matters_quality_gate.sql` | Absent |
| `20260430100000` | `signal_posts_final_slate_composer.sql` | Absent |
| `20260430110000` | `signal_posts_editorial_card_controls.sql` | Absent |
| `20260430120000` | `published_slates_minimal_audit_history.sql` | Absent |

Production migration history records only the first four local migrations. The four earlier out-of-scope migrations and the three PRD-53 migrations are not recorded.

## Local Migration Inventory

`supabase/migrations` contains the expected eleven files:

1. `20260416200404_prd_13_signal_filtering_columns.sql`
2. `20260421120000_v1_account_controls.sql`
3. `20260423090000_signals_admin_editorial_layer.sql`
4. `20260423120000_signal_posts_structured_editorial_payload.sql`
5. `20260424083000_signal_posts_historical_archive.sql`
6. `20260426090000_pipeline_article_candidates.sql`
7. `20260426120000_signal_posts_public_depth_pool.sql`
8. `20260426143000_signal_posts_why_it_matters_quality_gate.sql`
9. `20260430100000_signal_posts_final_slate_composer.sql`
10. `20260430110000_signal_posts_editorial_card_controls.sql`
11. `20260430120000_published_slates_minimal_audit_history.sql`

## Per-Migration Classification

| Migration | Purpose | Local behavior | Catalog evidence | PRD-53 required | Risk | Classification | Recommended handling |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `20260424083000_signal_posts_historical_archive.sql` | Add archive/live-row support for `signal_posts`. | Adds `briefing_date` and `is_live`, backfills existing rows, sets defaults/not-null, changes rank uniqueness. | `briefing_date`, `is_live`, `signal_posts_briefing_date_rank_key`, and widened `signal_posts_rank_check` are present. Superseded `signal_posts_live_rank_key` is absent because the later depth-pool index is present. | Predates PRD-53; supports public live-row behavior but is not one of the PRD-53 final-slate migrations. | Medium/high because local SQL includes row backfill and constraint/index changes. | D with C risk: catalog effects present, migration history not recorded, row-backfill effects not inspected by design. | Do not re-run blindly. Repair migration history only with explicit database-owner authorization. |
| `20260426090000_pipeline_article_candidates.sql` | Add pipeline candidate staging table. | Creates table, indexes, RLS, and service-role policies. | `pipeline_article_candidates` table exists; expected indexes, RLS, and service-role policies are present. | Out of PRD-53 final-slate schema scope. | Medium because it is out of the scoped PRD-53 schema authorization, though local SQL is additive DDL. | D / B: earlier additive migration appears applied but not recorded. | Prefer migration-history repair with explicit authorization rather than re-apply. |
| `20260426120000_signal_posts_public_depth_pool.sql` | Widen public candidate rank pool and replace live-rank uniqueness. | Alters `rank` check to 1-20, drops old live-rank index, creates `signal_posts_live_top_rank_key`. | `signal_posts_rank_check` is `rank >= 1 and rank <= 20`; `signal_posts_live_top_rank_key` is present; old `signal_posts_live_rank_key` is absent. | Predates PRD-53 final-slate schema. | Medium because it changes constraints/indexes. | D: catalog effects present, migration history not recorded. | Prefer migration-history repair with explicit authorization. |
| `20260426143000_signal_posts_why_it_matters_quality_gate.sql` | Add WITM validation gate fields. | Adds WITM validation columns, backfills defaults, sets not-null/defaults, adds status check. | All inspected WITM columns are present and `signal_posts_why_it_matters_validation_status_check` is present. | Supports PRD-53 readiness validation behavior but predates the final-slate additive migrations. | Medium/high because local SQL includes row backfill and not-null/default changes. | D with C risk: catalog effects present, migration history not recorded, row-backfill effects not inspected by design. | Do not re-run blindly. Repair migration history only with explicit database-owner authorization. |
| `20260430100000_signal_posts_final_slate_composer.sql` | Add PRD-53 final-slate composer placement fields. | Adds `final_slate_rank`, `final_slate_tier`, final-slate constraints, and final-slate uniqueness index. | All inspected final-slate columns and final-slate constraints/index are absent. | Yes. | Low once earlier history drift is repaired; blocked by earlier pending migrations in CLI order. | A: expected PRD-53 additive schema migration, genuinely not applied. | Apply later only after earlier drift is repaired or a safe narrowed path is explicitly authorized. |
| `20260430110000_signal_posts_editorial_card_controls.sql` | Add PRD-53 editorial card decision fields. | Adds decision/note/reason/replacement/reviewer columns and replacement FK. | All inspected editorial decision/control columns and replacement FK are absent. | Yes. | Low once earlier history drift is repaired; blocked by earlier pending migrations in CLI order. | A: expected PRD-53 additive schema migration, genuinely not applied. | Apply later only after earlier drift is repaired or a safe narrowed path is explicitly authorized. |
| `20260430120000_published_slates_minimal_audit_history.sql` | Add PRD-53 minimal publish audit history. | Creates `published_slates`, `published_slate_items`, indexes, RLS, and policies. | `published_slates`, `published_slate_items`, their policies, and their inspected indexes are absent. | Yes. | Low once earlier history drift is repaired; blocked by earlier pending migrations in CLI order. | A: expected PRD-53 additive schema migration, genuinely not applied. | Apply later only after earlier drift is repaired or a safe narrowed path is explicitly authorized. |

## Stable Catalog-Level Read-Only Evidence

### Earlier Schema Effects Present

`signal_posts` columns present:

- `briefing_date`
- `is_live`
- `why_it_matters_validated_at`
- `why_it_matters_validation_details`
- `why_it_matters_validation_failures`
- `why_it_matters_validation_status`

Earlier constraints/indexes present:

- `signal_posts_briefing_date_rank_key`
- `signal_posts_rank_check`
- `signal_posts_why_it_matters_validation_status_check`
- `signal_posts_live_top_rank_key`

Constraint definitions:

- `signal_posts_rank_check`: `CHECK (((rank >= 1) AND (rank <= 20)))`
- `signal_posts_why_it_matters_validation_status_check`: permits `passed` and `requires_human_rewrite`

Pipeline candidate table evidence:

- `pipeline_article_candidates` table exists.
- RLS is enabled for `pipeline_article_candidates`.
- Indexes present:
  - `pipeline_article_candidates_pkey`
  - `pipeline_article_candidates_run_id_idx`
  - `pipeline_article_candidates_run_id_surfaced_idx`
  - `pipeline_article_candidates_ingested_at_idx`
- Policies present:
  - `Service role reads pipeline article candidates`
  - `Service role writes pipeline article candidates`
  - `Service role updates pipeline article candidates`
  - `Service role deletes pipeline article candidates`

### PRD-53 Schema Effects Absent

`signal_posts` final-slate/editorial columns returned no rows:

- `final_slate_rank`
- `final_slate_tier`
- `editorial_decision`
- `decision_note`
- `rejected_reason`
- `held_reason`
- `replacement_of_row_id`
- `reviewed_by`
- `reviewed_at`

PRD-53 audit tables absent:

- `published_slates`
- `published_slate_items`

PRD-53 indexes/constraints/policies absent from inspected catalog:

- `signal_posts_briefing_date_final_slate_rank_key`
- `published_slate_items_slate_rank_key`
- `signal_posts_final_slate_rank_check`
- `signal_posts_final_slate_tier_check`
- `signal_posts_final_slate_placement_check`
- `signal_posts_editorial_decision_check`
- `signal_posts_replacement_of_row_id_fkey`
- published-slate service-role policies

## PRD-53 Schema Status

PRD-53 additive production schema is genuinely missing.

Production does not have the final-slate/editorial `signal_posts` columns, and it does not have the `published_slates` / `published_slate_items` audit tables.

PR #162 restored safe public behavior while this operational schema blocker remains unresolved. The public hotfix did not align production schema, repair migration history, run the controlled cycle, start MVP measurement, or re-enable cron.

## Drift Diagnosis

Verified facts:

- The linked production Supabase project is `fwkqjeumreaznfhnlzev`.
- `supabase db push --dry-run --linked` still reports exactly seven pending migrations.
- `supabase_migrations.schema_migrations` records only the first four local migrations.
- The four earlier out-of-scope pending migrations are absent from migration history.
- The three PRD-53 additive migrations are absent from migration history.
- Catalog evidence shows the earlier schema effects from `20260424083000`, `20260426090000`, `20260426120000`, and `20260426143000` are present.
- Catalog evidence shows the three PRD-53 final-slate / published-slate schema effects are absent.
- Row-level backfill effects from the two earlier DML migrations were not inspected because the authorized scope was catalog-only metadata inspection.

Most likely cause:

```text
Earlier migrations were applied outside recorded Supabase CLI migration history, or migration-history records were lost/omitted after their schema effects reached production. The three PRD-53 additive migrations are genuinely not applied.
```

This is not consistent with production genuinely missing all seven migrations, because the earlier table/column/index/constraint/policy effects are visible in the catalog.

This is not consistent with a wrong linked environment, because the dashboard and CLI both identified the same production project ref and the live app symptoms match the same missing PRD-53 objects.

## Recommended Remediation Path

Recommended path: Path B - repair migration history for already-applied earlier migrations, then apply PRD-53 additive migrations.

This path is recommended because:

- the earlier four pending migrations are absent from migration history but their catalog-visible effects are present;
- re-running the earlier four migrations is unnecessary and could re-enter out-of-scope DML/backfill or constraint behavior;
- the three PRD-53 migrations are genuinely absent and remain needed for the approved PRD-53 admin/editorial workflow;
- `supabase db push` cannot safely apply only the PRD-53 migrations while the earlier four remain pending in history.

Required next authorization gate:

```text
CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true
```

Recommended repair command for a later authorized run:

```bash
supabase migration repair 20260424083000 20260426090000 20260426120000 20260426143000 --status applied --linked --workdir <worktree>
```

Expected verification after repair:

```bash
supabase migration list --linked --workdir <worktree>
supabase db push --dry-run --linked --workdir <worktree>
```

Expected dry-run result after repair:

```text
Would push these migrations:
 • 20260430100000_signal_posts_final_slate_composer.sql
 • 20260430110000_signal_posts_editorial_card_controls.sql
 • 20260430120000_published_slates_minimal_audit_history.sql
```

Only after that narrowed dry-run is verified should a separate prompt authorize PRD-53 additive schema migration apply:

```text
CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true
```

Then a later authorized schema-alignment run may execute:

```bash
supabase db push --linked --workdir <worktree>
```

Rollback/recovery considerations:

- `supabase migration repair` changes migration-history metadata only; it does not create missing schema objects. Repair should be limited to the four earlier migrations whose catalog-visible schema effects are present.
- Because the two earlier DML migrations included row backfills, the database owner should explicitly accept that this catalog-only inspection did not inspect application row contents.
- Before any PRD-53 schema apply, verify that dry-run output contains only the three PRD-53 additive migrations.
- After PRD-53 schema apply, run the existing production schema preflight before any controlled cycle or publish path.

Actions still not allowed without later explicit authorization:

- migration repair
- production migration apply
- applying earlier DML/backfill migrations
- direct SQL mutation
- DDL
- DML
- row updates
- `draft_only`
- production publish
- cron
- MVP measurement

## Commands Intentionally Not Run

- `supabase db push --linked`
- `supabase migration repair`
- direct SQL mutation
- DDL
- DML
- row updates
- `draft_only`
- production publish
- cron
- MVP measurement instrumentation
- final launch-readiness QA
- Phase 2 architecture
- personalization

## Production Mutation Confirmation

No production migration was applied.
No migration-history repair was run.
No DDL was run.
No DML was run.
No application rows were selected or mutated.
No `draft_only` command was run.
No production publish was attempted.
Cron remained disabled.
MVP measurement remained blocked.

## Exact Next Task

Authorize migration-history repair only for the four earlier migrations whose catalog effects are present:

```text
CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true
```

Then run the repair command, verify migration history and dry-run output, and stop before applying PRD-53 schema unless a separate prompt explicitly includes:

```text
CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true
```
