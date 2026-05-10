# PRD-53 Stable Catalog Access Inspection

Date: 2026-04-30
Branch: `codex/prd-53-stable-catalog-access-inspection`
Readiness label: `catalog_level_review_pending_readonly_db_access`

## Effective Change Type

Remediation / alignment diagnostic under the approved PRD-53 Signals admin editorial workflow.

This packet is diagnostic only. It does not create a feature, create a PRD, apply production migrations, repair migration history, run direct SQL, mutate rows, run `draft_only`, publish, run cron, or start MVP measurement.

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
- PR #164 stable catalog readonly access rerun blocked record
- PR #162 public hotfix verification context
- `docs/operations/controlled-cycles/2026-04-30-prd-53-stable-catalog-readonly-access-rerun.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-stable-catalog-readonly-access-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-stable-catalog-readonly-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-stable-catalog-readonly-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-catalog-level-database-owner-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-database-owner-migration-history-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-migration-history-drift-diagnosis.md`

## Why This Inspection Was Needed

PR #164 was merged as a durable blocked access-rerun record after the prior attempt still could not see `SUPABASE_DB_PASSWORD` or an equivalent stable read-only Postgres catalog access mechanism.

This follow-up prompt again stated that stable read-only catalog access was available and authorized read-only production schema/catalog inspection only. The run therefore started from latest `main` after PR #164 merged, created a fresh branch/worktree, checked for the promised access without printing values, and attempted only the explicitly allowed Supabase read-only/dry-run inventory commands.

The inspection is still blocked. The fresh worktree does not have linked Supabase project metadata, and the promised stable credential or equivalent read-only catalog mechanism is still not visible to this process.

## Workspace Baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-stable-catalog-access-inspection` |
| Branch | `codex/prd-53-stable-catalog-access-inspection` |
| Starting commit | `25261ade8194f7150f0d4fcef469d03e756935de` |
| Commit description | `Merge pull request #164 from brandonma25/codex/prd-53-stable-catalog-readonly-access-rerun` |
| PR #164 merged at | `2026-04-30T21:26:21Z` |
| UTC capture time | `2026-04-30T21:29:16Z` |
| Local capture time | `2026-05-01 05:29:16 CST` |
| Production URL | `https://bootupnews.vercel.app` |

The canonical checkout at `/Users/bm/dev/daily-intelligence-aggregator` remained on `feature/tldr-url-ingestion` and was not disturbed. A dedicated worktree was created from `origin/main` for this branch after PR #164 merged.

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

Stable read-only catalog access is still unavailable in this execution environment.

Checked access indicators:

| Mechanism | Result |
| --- | --- |
| `SUPABASE_DB_PASSWORD` shell environment | Absent. |
| `DATABASE_URL` shell environment | Absent. |
| `POSTGRES_URL` shell environment | Absent. |
| `POSTGRES_PRISMA_URL` shell environment | Absent. |
| `SUPABASE_ACCESS_TOKEN` shell environment | Absent. |
| `.env.local` in this fresh worktree | Absent. |
| `psql` client | Not installed. |
| Node `pg` package | Not installed in this fresh worktree. |
| Supabase project link in this fresh worktree | Missing project ref. |
| Equivalent operator-provided read-only catalog access | Not present in this execution environment. |

No secret values were printed, echoed, logged, persisted, or written to the repo.

Prior durable records identify the expected linked production project as `fwkqjeumreaznfhnlzev`, but this fresh worktree does not have active link metadata. The current task did not run `supabase link` and did not write connection metadata.

## Read-Only Migration Inventory

The requested read-only/dry-run migration inventory did not complete.

| Command | Result |
| --- | --- |
| `supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-stable-catalog-access-inspection` | Failed before remote inventory: `Cannot find project ref. Have you run supabase link?` |
| `supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-stable-catalog-access-inspection` | Failed before dry-run inventory: `Cannot find project ref. Have you run supabase link?` |

No migration apply command was run. No migration-history repair command was run.

## Pending Migration Inventory

The pending migration set was not refreshed because stable catalog access and active Supabase project link metadata are unavailable.

Prior durable pending set from PR #158 through PR #164:

1. `20260424083000_signal_posts_historical_archive.sql`
2. `20260426090000_pipeline_article_candidates.sql`
3. `20260426120000_signal_posts_public_depth_pool.sql`
4. `20260426143000_signal_posts_why_it_matters_quality_gate.sql`
5. `20260430100000_signal_posts_final_slate_composer.sql`
6. `20260430110000_signal_posts_editorial_card_controls.sql`
7. `20260430120000_published_slates_minimal_audit_history.sql`

These remain the durable pending set until stable catalog inspection can refresh them.

## Local Migration Inventory

The local migration inventory was refreshed from `supabase/migrations` and contains the expected eleven migration files:

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

## Local SQL Inspection Summary

| Migration | Local SQL summary | DDL / DML | Additive / destructive | PRD-53 required | Risk | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| `20260424083000_signal_posts_historical_archive.sql` | Adds `signal_posts.briefing_date` and `signal_posts.is_live`, backfills values from existing row state, makes both columns not null, replaces rank uniqueness behavior, adds live-rank uniqueness. | DDL and DML. | Additive columns plus constraint/index changes and row backfill. | Predates PRD-53 final-slate work; indirectly supports public live-row behavior. | Medium/high because it updates production rows and changes uniqueness constraints. | C / D: earlier migration with DML/backfill risk and potential migration-history mismatch. |
| `20260426090000_pipeline_article_candidates.sql` | Creates `pipeline_article_candidates`, indexes, RLS, and service-role policies. | DDL only. | Additive table, indexes, policies. | Not directly required for PRD-53 final-slate additive schema. | Medium because it is out of PRD-53 schema-only scope and needs catalog proof of RLS/policies before repair decisions. | B / D: earlier additive-only migration, possible migration-history mismatch if table already exists. |
| `20260426120000_signal_posts_public_depth_pool.sql` | Changes `signal_posts.rank` check from 1-5 to 1-20, drops prior live-rank index, adds live Top 5 uniqueness index. | DDL only. | Constraint/index change, not purely additive. | Predates PRD-53 and supports Depth pool behavior, not final-slate audit tables. | Medium because it changes rank constraints and indexes. | E: requires catalog/DBA review. |
| `20260426143000_signal_posts_why_it_matters_quality_gate.sql` | Adds WITM validation columns, backfills defaults, makes several WITM columns not null, adds WITM status check. | DDL and DML. | Additive columns plus row backfill and not-null constraints. | Required for PRD-53 readiness validation behavior, but predates the three final-slate migrations. | Medium/high because it updates production rows and changes constraints/defaults. | C / D: earlier migration with DML/backfill risk and potential migration-history mismatch. |
| `20260430100000_signal_posts_final_slate_composer.sql` | Adds `final_slate_rank` and `final_slate_tier`, final-slate placement constraints, and `briefing_date` plus final-slate rank uniqueness index. | DDL only. | Additive PRD-53 schema with constraints/index. | Yes. | Low once earlier drift is resolved; still blocked by pending earlier migrations. | A: expected PRD-53 additive schema migration. |
| `20260430110000_signal_posts_editorial_card_controls.sql` | Adds editorial decision/note/reason/replacement/reviewer columns and replacement self-reference FK. | DDL only. | Additive PRD-53 schema with constraints/FK. | Yes. | Low once earlier drift is resolved; still blocked by pending earlier migrations. | A: expected PRD-53 additive schema migration. |
| `20260430120000_published_slates_minimal_audit_history.sql` | Creates `published_slates` and `published_slate_items`, indexes, RLS, and service-role policies. | DDL only. | Additive PRD-53 audit/history tables and policies. | Yes. | Low once earlier drift is resolved; still blocked by pending earlier migrations. | A: expected PRD-53 additive schema migration. |

## Stable Catalog-Level Read-Only Evidence

No stable catalog-level production schema evidence was collected in this run.

The following were intentionally not run because stable catalog access is unavailable:

- catalog queries against `information_schema.tables`
- catalog queries against `information_schema.columns`
- catalog queries against `information_schema.table_constraints`
- catalog queries against `information_schema.key_column_usage`
- catalog queries against `pg_catalog.pg_class`
- catalog queries against `pg_catalog.pg_namespace`
- catalog queries against `pg_catalog.pg_attribute`
- catalog queries against `pg_catalog.pg_index`
- catalog queries against `pg_catalog.pg_indexes`
- catalog queries against `pg_catalog.pg_constraint`
- catalog queries against `pg_catalog.pg_policy`
- catalog queries against `pg_catalog.pg_trigger`
- catalog queries against `pg_catalog.pg_proc`
- reads from `supabase_migrations.schema_migrations`

## PRD-53 Schema Status

PRD-53 schema status was not refreshed in this run.

Prior durable evidence remains:

Production is expected to be missing:

- `signal_posts.final_slate_rank`
- `signal_posts.final_slate_tier`
- `signal_posts.editorial_decision`
- `signal_posts.decision_note`
- `signal_posts.rejected_reason`
- `signal_posts.held_reason`
- `signal_posts.replacement_of_row_id`
- `signal_posts.reviewed_by`
- `signal_posts.reviewed_at`
- `published_slates`
- `published_slate_items`

PR #162 restored safe public behavior while leaving this schema blocker unresolved.

## Migration-History Metadata Evidence

Migration-history metadata was not refreshed in this run.

Prior durable evidence remains:

- Production migration history records only the first four local migrations.
- Seven later migrations remain unrecorded.
- Some earlier schema effects appear present despite absent migration-history records.
- PRD-53 final-slate/editorial columns and published-slate audit tables remain missing.

## Drift Diagnosis

Verified facts from this run:

- PR #164 was merged before this branch was created.
- A fresh dedicated branch/worktree was created from latest `origin/main`.
- The fresh worktree is not linked to the Supabase production project.
- `SUPABASE_DB_PASSWORD` or an equivalent stable read-only Postgres catalog access mechanism is still unavailable to this process.
- `supabase migration list --linked` and `supabase db push --dry-run --linked` failed before remote inventory because the fresh worktree has no project ref.
- No catalog SQL, migration-history query, migration apply, migration repair, row mutation, `draft_only`, publish, or cron command was run.

Prior verified facts still governing the blocker:

- Production public surface is safe after PR #162.
- Schema alignment remains blocked.
- The seven-migration pending set includes three expected PRD-53 additive schema migrations and four earlier out-of-scope migrations.
- Earlier historical archive and WITM quality-gate migrations include DML/backfill behavior.
- Some earlier schema effects appear present despite absent migration-history records.
- PRD-53 final-slate/editorial fields and published-slate audit tables remain missing.

Most likely cause remains unchanged:

```text
Earlier migrations were applied or partially applied outside recorded Supabase migration history,
while the three PRD-53 additive migrations are genuinely unapplied.
```

This diagnosis still cannot be promoted to a repair/apply decision without stable catalog-level evidence.

## Recommended Remediation Path

Recommended path: Path E - stop for database-owner access and stable project linkage before any repair/apply decision.

Reason:

- Stable read-only catalog access is still unavailable to this process.
- The fresh worktree is not linked to the production Supabase project.
- The prior evidence is not enough to repair migration history safely.
- The prior evidence is not enough to apply all seven pending migrations safely.
- Earlier pending migrations include DML/backfill behavior.
- PRD-53 schema-only authorization would not cover those earlier out-of-scope migrations.

Next safe path:

1. Make the intended production Supabase project link available to the dedicated worktree or provide a supported read-only `--db-url` mechanism.
2. Provide `SUPABASE_DB_PASSWORD` or an equivalent stable read-only Postgres catalog mechanism to the execution environment.
3. Rerun catalog inspection only.
4. Use read-only catalog queries to verify tables, columns, indexes, constraints, policies, triggers, functions, enum values if applicable, and `supabase_migrations.schema_migrations` rows.
5. Do not authorize repair, apply, earlier DML/backfill, `draft_only`, publish, cron, or MVP measurement in the same prompt.

Required authorization for the next run:

```text
CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true
CONTROLLED_PRODUCTION_CATALOG_READONLY_INSPECTION_APPROVED=true
```

Required access:

```text
SUPABASE_DB_PASSWORD=<available in environment>
```

or an explicitly documented equivalent read-only Postgres catalog mechanism.

Do not include these mutation flags unless intentionally authorizing a later mutating run:

```text
CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true
CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true
CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true
CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true
```

## Commands Run

| Command | Result |
| --- | --- |
| `pwd` / `git branch --show-current` / `git status --short --branch` / `git worktree list` | Confirmed the canonical checkout was on `feature/tldr-url-ingestion`; it was not disturbed. |
| `gh pr view 164 --json ...` | Confirmed PR #164 was initially open, then later merged. |
| `gh pr checks 164 --watch=false` | Confirmed PR #164 checks were green before merge. |
| `gh pr merge 164 --merge` | Merged PR #164 as the required baseline. |
| `git fetch origin main` and `git log --oneline -5 origin/main` | Confirmed `origin/main` includes PR #164 merge commit `25261ad`. |
| `git worktree add ... -b codex/prd-53-stable-catalog-access-inspection origin/main` | Created the dedicated worktree from latest `origin/main`. |
| Workspace identity commands in the new worktree | Confirmed branch ownership at `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-stable-catalog-access-inspection`. |
| Required protocol reads | Read `AGENTS.md`, engineering protocol, test checklist, PRD template, release machine, release automation guide, canonical terminology, and PRD-53. |
| Prior packet and source inspection | Read PRD-53 prior stable catalog packets and local migration SQL. |
| `ls -1 supabase/migrations` | Confirmed the local migration inventory. |
| Environment key presence checks | Confirmed no stable catalog access mechanism was available. |
| `supabase --version` | Supabase CLI is installed. |
| `psql` availability check | `psql` is not installed. |
| Node `pg` package availability check | `pg` is not installed in this fresh worktree. |
| `supabase migration list --linked --workdir ...` | Failed before remote inventory because the fresh worktree has no project ref. |
| `supabase db push --dry-run --linked --workdir ...` | Failed before dry-run inventory because the fresh worktree has no project ref. |

## Commands Intentionally Not Run

| Command | Reason |
| --- | --- |
| `supabase db push --linked` | Production schema mutation. Not authorized. |
| `supabase migration repair` | Migration-history mutation. Not authorized. |
| `psql` catalog queries | No stable credential and `psql` is not installed. |
| Direct SQL mutation / DDL / DML | Not authorized. |
| Row updates | Not authorized. |
| `draft_only` | Not authorized. |
| Production publish | Not authorized. |
| Cron | Not authorized. |
| MVP measurement | Still blocked by schema alignment and second controlled cycle. |

## Production Mutation Confirmation

No production mutation occurred.

Specifically:

- no production migration apply,
- no migration-history repair,
- no direct SQL mutation,
- no DDL,
- no DML,
- no row updates,
- no `draft_only`,
- no pipeline write-mode,
- no production publish,
- no cron change,
- no MVP measurement.

## Cron Status

Cron was not run or changed in this task.

## Result

```text
catalog_level_review_pending_readonly_db_access
```

The stable catalog-level database-owner inspection remains blocked because the execution environment still lacks `SUPABASE_DB_PASSWORD` or an equivalent stable read-only Postgres catalog access mechanism, and this fresh worktree is not linked to the production Supabase project.

## Exact Next Task

Make stable read-only production catalog access and supported production project link metadata available to the dedicated Codex worktree, then rerun catalog inspection only:

```text
CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true
CONTROLLED_PRODUCTION_CATALOG_READONLY_INSPECTION_APPROVED=true

Rerun stable catalog-level database-owner inspection using SUPABASE_DB_PASSWORD or equivalent read-only Postgres catalog access only.

Do not authorize:
- migration repair
- migration apply
- earlier DML/backfill migrations
- direct SQL mutation
- draft_only
- publish
- cron
```
