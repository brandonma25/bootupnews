# PRD-53 Stable Catalog Readonly Rerun

Date: 2026-04-30
Branch: `codex/prd-53-stable-catalog-readonly-rerun`
Readiness label: `catalog_level_review_pending_readonly_db_access`

## Effective Change Type

Remediation / alignment diagnostic under the approved PRD-53 Signals admin editorial workflow.

This packet is diagnostic only. It does not create a feature, create a PRD, apply production migrations, repair migration history, run direct SQL, mutate rows, run `draft_only`, publish, run cron, or start MVP measurement.

Object level: Surface Placement and Card read-model storage in legacy `public.signal_posts`, plus internal publish audit tables. `signal_posts` remains legacy/runtime naming for editorial/public placement storage, not canonical Signal identity.

## Source Of Truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

- `docs/operations/controlled-cycles/2026-04-30-prd-53-stable-catalog-readonly-review.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-stable-catalog-readonly-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-catalog-level-database-owner-review.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-catalog-level-database-owner-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-database-owner-migration-history-review.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-database-owner-migration-history-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-migration-history-drift-diagnosis.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-migration-history-drift-diagnosis.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`
- `docs/engineering/change-records/prd-53-minimal-published-slate-audit-history.md`

Hotfix context:

- PR #162 restored a safe public surface while schema alignment remains blocked.

## Why Stable Catalog-Level Review Was Rerun

PR #158 diagnosed Supabase migration-history drift: production dry-run reported seven pending migrations, not only the expected PRD-53 additive schema migrations.

PR #159 added database-owner review evidence and confirmed:

- some earlier schema effects are present,
- PRD-53 final-slate/editorial schema is genuinely missing,
- and catalog-level proof is still needed before any repair or apply step.

PR #160 and PR #161 narrowed the blocker to stable read-only production catalog access. The requested rerun was supposed to use `SUPABASE_DB_PASSWORD` or an equivalent read-only Postgres catalog access mechanism. That access is still unavailable in this execution environment, so the run stopped before Supabase, catalog, or migration-history commands.

## Workspace Baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-stable-catalog-readonly-rerun` |
| Branch | `codex/prd-53-stable-catalog-readonly-rerun` |
| Starting commit | `1f31eed95bb88268775c24cb0cc0962d0d5702d5` |
| Commit description | `Merge pull request #162 from brandonma25/codex/hotfix-public-schema-preflight-fallback` |
| UTC capture time | `2026-04-30T20:47:27Z` |
| Local capture time | `2026-05-01 04:47:27 CST` |
| Production URL | `https://bootupnews.vercel.app` |

The canonical checkout at `/Users/bm/dev/daily-intelligence-aggregator` remained on `feature/tldr-url-ingestion` and was not disturbed. A dedicated worktree was created from `origin/main` for this branch.

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

Stable read-only catalog access was not available.

Checked access indicators:

| Mechanism | Result |
| --- | --- |
| `SUPABASE_DB_PASSWORD` shell environment | Absent. |
| `DATABASE_URL` shell environment | Absent. |
| `POSTGRES_URL` shell environment | Absent. |
| `SUPABASE_ACCESS_TOKEN` shell environment | Absent. |
| Local env key scan for `SUPABASE_DB_PASSWORD`, `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `SUPABASE_ACCESS_TOKEN` | No matching keys found in checked local env files. |
| `psql` client | Not installed. |
| Equivalent operator-provided read-only catalog access | Not present in this execution environment. |

No secret values were printed, echoed, logged, or written to the repo.

## Linked Supabase Project Confirmation

The linked production project was not refreshed in this run because stable read-only catalog access was unavailable and the prompt required stopping before partial catalog inspection when access was missing.

Prior durable records remain the source of truth:

- Linked project ref: `fwkqjeumreaznfhnlzev`
- Status in prior runs: active and healthy
- Prior catalog-level evidence: production migration history recorded only the first four local migrations; seven later migrations remained unrecorded

## Pending Migration Inventory

The pending migration set was not refreshed in this run because stable catalog access was unavailable.

Prior durable pending set from PR #158 through PR #161:

1. `20260424083000_signal_posts_historical_archive.sql`
2. `20260426090000_pipeline_article_candidates.sql`
3. `20260426120000_signal_posts_public_depth_pool.sql`
4. `20260426143000_signal_posts_why_it_matters_quality_gate.sql`
5. `20260430100000_signal_posts_final_slate_composer.sql`
6. `20260430110000_signal_posts_editorial_card_controls.sql`
7. `20260430120000_published_slates_minimal_audit_history.sql`

These remain the durable pending set until stable catalog inspection can refresh them.

## Local SQL Inspection Summary

The local migration inventory was refreshed from `supabase/migrations` and still contains the expected eleven migration files:

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

The seven pending migrations were not reclassified from fresh catalog evidence in this run. Prior classification remains:

| Migration | Prior classification | Why it still matters |
| --- | --- | --- |
| `20260424083000_signal_posts_historical_archive.sql` | D - potential migration-history mismatch with C risk | Includes DDL plus `update public.signal_posts`; earlier column effects were previously observed, but constraints, indexes, and backfill effects remain unverified. |
| `20260426090000_pipeline_article_candidates.sql` | D - potential migration-history mismatch, earlier additive-only scope | Prior REST evidence found the table/columns, but indexes, RLS, and service-role policies remain unverified. |
| `20260426120000_signal_posts_public_depth_pool.sql` | E - requires manual DBA/catalog review | Constraint/index effects remain unverified. |
| `20260426143000_signal_posts_why_it_matters_quality_gate.sql` | D - potential migration-history mismatch with C risk | Includes DDL plus `update public.signal_posts`; WITM columns were previously observed, but defaults, constraints, and backfill effects remain unverified. |
| `20260430100000_signal_posts_final_slate_composer.sql` | A - expected PRD-53 additive schema migration | PRD-53 `final_slate_rank` and `final_slate_tier` were previously confirmed missing. |
| `20260430110000_signal_posts_editorial_card_controls.sql` | A - expected PRD-53 additive schema migration | PRD-53 editorial decision/reason/replacement/reviewer columns were previously confirmed missing. |
| `20260430120000_published_slates_minimal_audit_history.sql` | A - expected PRD-53 additive schema migration | `published_slates` and `published_slate_items` were previously confirmed missing. |

## Stable Catalog-Level Read-Only Schema Evidence

No stable catalog-level schema evidence was collected in this run because stable read-only catalog access is unavailable.

Intentionally not run:

- `supabase migration list --linked --workdir <worktree>`
- `supabase db push --dry-run --linked --workdir <worktree>`
- `psql`
- catalog queries against `information_schema`
- catalog queries against `pg_catalog`
- migration-history table reads

This follows the prompt instruction to stop when stable catalog access is unavailable.

## PRD-53 Schema Status

PRD-53 schema status was not refreshed in this run. Prior durable evidence from PR #159 through PR #161 remains:

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
- PRD-53 additive schema effects remain missing.

## Drift Diagnosis

Verified facts from this run:

- A fresh dedicated branch/worktree was created from latest `origin/main`.
- Stable read-only catalog access is still unavailable in this execution environment.
- No Supabase read, dry-run, catalog SQL, migration-history query, migration apply, migration repair, row mutation, `draft_only`, publish, or cron command was run.

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

Recommended path: Path E - stop for database-owner access before any repair/apply decision.

Reason:

- The requested stable read-only catalog access is still unavailable.
- The prior evidence is not enough to repair migration history safely.
- The prior evidence is not enough to apply all seven pending migrations safely.
- Earlier pending migrations include DML/backfill behavior.
- PRD-53 schema-only authorization would not cover those earlier out-of-scope migrations.

Next safe path:

1. Provide `SUPABASE_DB_PASSWORD` or an equivalent stable read-only Postgres catalog mechanism to the execution environment.
2. Rerun catalog inspection only.
3. Use read-only catalog queries to verify:
   - tables,
   - columns,
   - indexes,
   - constraints,
   - policies,
   - triggers,
   - functions,
   - enum values if applicable,
   - and `supabase_migrations.schema_migrations` rows.
4. Do not authorize repair, apply, earlier DML/backfill, `draft_only`, publish, cron, or MVP measurement in the same prompt.

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
| `pwd` | Confirmed canonical checkout path before worktree creation. |
| `git branch --show-current` | Confirmed canonical checkout was on `feature/tldr-url-ingestion`, so it was not disturbed. |
| `git status --short --branch` | Confirmed no local changes in the canonical checkout. |
| `git worktree list` | Confirmed requested branch was not already owned by another worktree. |
| `git ls-remote --heads origin codex/prd-53-stable-catalog-readonly-rerun` | No remote branch found. |
| `git branch --list codex/prd-53-stable-catalog-readonly-rerun` | No local branch found before creation. |
| `git fetch origin main` | Updated local remote-tracking information. |
| `git worktree add ... -b codex/prd-53-stable-catalog-readonly-rerun origin/main` | Created the dedicated worktree from latest `origin/main`. |
| Workspace identity commands in the new worktree | Confirmed branch ownership at `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-stable-catalog-readonly-rerun`. |
| Required protocol reads | Read `AGENTS.md`, engineering protocol, test checklist, PRD template, release machine, release automation guide, and canonical terminology. |
| Prior PRD-53 packet reads | Read prior PRD-53 migration-history and catalog-review packets. |
| `ls -1 supabase/migrations` | Confirmed the local migration inventory. |
| Environment key presence checks | Confirmed no stable catalog access mechanism was available. |
| `supabase --version` | Supabase CLI is installed. |
| `psql --version` | `psql` is not installed. |

## Commands Intentionally Not Run

| Command | Reason |
| --- | --- |
| `supabase migration list --linked --workdir <worktree>` | Stable catalog access was unavailable; prompt required stopping before partial catalog inspection. |
| `supabase db push --dry-run --linked --workdir <worktree>` | Stable catalog access was unavailable; prompt required stopping before partial catalog inspection. |
| `supabase db push --linked` | Not authorized. |
| `supabase migration repair` | Not authorized. |
| `psql` catalog queries | No stable credential and `psql` is not installed. |
| Direct SQL mutation / DDL / DML | Not authorized. |
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

Prior production hotfix verification after PR #162 did not change cron. Cron remains outside this task and blocked until the controlled workflow succeeds.

## Result

```text
catalog_level_review_pending_readonly_db_access
```

The stable catalog-level database-owner review remains blocked because the execution environment still lacks `SUPABASE_DB_PASSWORD` or an equivalent stable read-only Postgres catalog access mechanism.

## Exact Next Task

Provide stable read-only production catalog access, then rerun catalog inspection only:

```text
CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true
CONTROLLED_PRODUCTION_CATALOG_READONLY_INSPECTION_APPROVED=true

Rerun stable catalog-level database-owner review using SUPABASE_DB_PASSWORD or equivalent read-only Postgres catalog access only.

Do not authorize:
- migration repair
- migration apply
- earlier DML/backfill migrations
- direct SQL mutation
- draft_only
- publish
- cron
```
