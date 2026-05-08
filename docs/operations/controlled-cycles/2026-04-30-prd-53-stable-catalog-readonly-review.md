# PRD-53 Stable Catalog Readonly Review

Date: 2026-04-30
Branch: `codex/prd-53-stable-catalog-readonly-review`
Readiness label: `catalog_level_review_pending_readonly_db_access`

## Effective Change Type

Remediation / alignment diagnostic under the approved PRD-53 Signals admin editorial workflow.

This packet is diagnostic and decision-oriented only. It does not implement a feature, create a PRD, apply production migrations, repair migration history, run `draft_only`, publish, or run cron.

Object level: Surface Placement and Card read-model storage in legacy `public.signal_posts`, plus internal publish audit tables. `signal_posts` remains legacy/runtime naming for editorial/public placement storage, not canonical Signal identity.

## Source Of Truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

- `docs/operations/controlled-cycles/2026-04-30-prd-53-catalog-level-database-owner-review.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-catalog-level-database-owner-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-database-owner-migration-history-review.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-database-owner-migration-history-review.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-migration-history-drift-diagnosis.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-migration-history-drift-diagnosis.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-applied-schema-alignment-and-cycle-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-schema-alignment-and-cycle-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-schema-alignment-and-second-cycle-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-second-controlled-cycle.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`
- `docs/engineering/change-records/prd-53-minimal-published-slate-audit-history.md`

## Why This Review Was Needed

PR #160 attempted catalog-level database-owner review and produced useful migration-history evidence, but it did not complete stable catalog inspection. The result was `database_owner_catalog_review_blocked_missing_stable_catalog_access`.

The next requested run required stable read-only catalog access through one of:

- `SUPABASE_DB_PASSWORD` in the execution environment, or
- an equivalent operator-provided read-only database-owner catalog access mechanism.

This run checked that prerequisite before running any Supabase read or dry-run command. The prerequisite was still missing, so the run stopped before repeating partial Supabase catalog inspection.

## Workspace Baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-stable-catalog-readonly-review` |
| Branch | `codex/prd-53-stable-catalog-readonly-review` |
| Starting commit | `2c0de8f598407fd20fd6ffc555d38587ef37e4ea` |
| Commit description | `Merge pull request #160 from brandonma25/codex/prd-53-catalog-level-database-owner-review` |
| UTC capture time | `2026-04-30T18:59:32Z` |
| Local capture time | `2026-05-01 02:59:32 CST` |
| Production URL | `https://daily-intelligence-aggregator-ybs9.vercel.app` |

The stale `/Users/bm/Documents/daily-intelligence-aggregator-main` checkout was not used for repo work because prior and current workspace checks showed it is not the safe canonical repo path for this lane. The branch was created in the canonical `/Users/bm/dev/worktrees` workspace family.

PR #160 was confirmed merged:

```text
PR: https://github.com/brandonma25/daily-intelligence-aggregator/pull/160
Merge commit: 2c0de8f598407fd20fd6ffc555d38587ef37e4ea
```

## Authorization Variables

| Authorization | Status |
| --- | --- |
| `CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true` | Present in the prompt. |
| `CONTROLLED_PRODUCTION_CATALOG_READONLY_INSPECTION_APPROVED=true` | Present in the prompt. |
| `SUPABASE_DB_PASSWORD` or equivalent stable catalog access | Not present in the shell environment or local env files checked in this worktree. |
| `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` | Absent. |

Only read-only production schema/catalog inspection was authorized. No mutation authorization was present.

## Stable Catalog Access Check

The prerequisite check looked only for environment variable presence and local env-file key names. It did not print secret values.

Shell environment result:

| Key | Presence |
| --- | --- |
| `SUPABASE_DB_PASSWORD` | Absent. |
| `DATABASE_URL` | Absent. |
| `POSTGRES_URL` | Absent. |
| `POSTGRES_PRISMA_URL` | Absent. |
| `PGHOST` | Absent. |
| `PGUSER` | Absent. |
| `PGPASSWORD` | Absent. |
| `SUPABASE_ACCESS_TOKEN` | Absent. |

Local env-file scan result:

- Only `./.env.example` was present in this worktree.
- The example file lists placeholder keys, but no usable secret values.
- No `SUPABASE_DB_PASSWORD` key was present in the local checked env files.

Conclusion:

```text
Stable read-only catalog access is unavailable.
```

Per the prompt, the run stopped at this point and did not retry partial catalog inspection.

## Supabase Commands

No Supabase command was run in this review.

Commands intentionally not run:

| Command | Why not run |
| --- | --- |
| `supabase migration list --linked --workdir <worktree>` | Stable catalog access was unavailable. The prompt instructed this run to stop and avoid retrying partial catalog inspection when stable access is unavailable. |
| `supabase db push --dry-run --linked --workdir <worktree>` | Same reason. The prior dry-run evidence from PR #160 remains the durable record until stable access exists. |
| `supabase db push --linked` | Production schema mutation. Not authorized. |
| `supabase migration repair` | Migration-history mutation. Not authorized. |
| Direct SQL mutation | Explicitly out of scope. |

## Pending Migration Inventory

This run did not re-query the linked Supabase project. It carries forward the durable PR #160 evidence:

- production migration history records only the first four local migrations,
- seven later migrations remain unrecorded,
- the three PRD-53 additive migrations are genuinely missing by app-visible preflight and prior REST evidence,
- earlier drift exists because some columns/tables from earlier unrecorded migrations are already present.

Local migration inventory inspected in this run:

| Migration | Local purpose |
| --- | --- |
| `20260416200404_prd_13_signal_filtering_columns.sql` | Article filtering metadata columns and constraints. |
| `20260421120000_v1_account_controls.sql` | Account/profile fields and `sources.topic_id` nullability adjustment. |
| `20260423090000_signals_admin_editorial_layer.sql` | Initial `signal_posts` admin editorial table/read model. |
| `20260423120000_signal_posts_structured_editorial_payload.sql` | Structured edited/published why-it-matters payload columns. |
| `20260424083000_signal_posts_historical_archive.sql` | `signal_posts` briefing date/live state archive fields, live-rank constraints, and row updates. |
| `20260426090000_pipeline_article_candidates.sql` | Internal candidate-pool persistence table and service-role policies. |
| `20260426120000_signal_posts_public_depth_pool.sql` | Rank-depth constraint and live Top 5 uniqueness adjustment. |
| `20260426143000_signal_posts_why_it_matters_quality_gate.sql` | WITM validation fields, defaults, constraints, and row updates. |
| `20260430100000_signal_posts_final_slate_composer.sql` | PRD-53 final-slate rank/tier fields and constraints. |
| `20260430110000_signal_posts_editorial_card_controls.sql` | PRD-53 editorial decision/reason/replacement/reviewer fields and constraints. |
| `20260430120000_published_slates_minimal_audit_history.sql` | PRD-53 internal publish audit/history tables, indexes, RLS, and policies. |

## Per-Migration Classification

| Migration | DDL / DML | Catalog evidence this run | PRD-53 required | Classification | Recommended owner decision |
| --- | --- | --- | --- | --- | --- |
| `20260424083000_signal_posts_historical_archive.sql` | DDL plus `update public.signal_posts`. | Not refreshed; stable catalog access unavailable. PR #160 remains the durable evidence: migration history says not recorded; prior REST evidence says `briefing_date` and `is_live` columns exist; constraints, indexes, and row backfill effects remain unverified. | Indirect dependency for final-slate uniqueness and live archive safety. | D - potential migration-history mismatch with C risk. | Do not blindly re-run. Verify constraints/indexes/backfill with stable catalog access. Repair history only if full effects are proven already applied; otherwise separately authorize DML/backfill handling. |
| `20260426090000_pipeline_article_candidates.sql` | Additive DDL only. | Not refreshed; stable catalog access unavailable. PR #160 remains the durable evidence: migration history says not recorded; prior REST evidence says the table and checked columns exist; indexes/RLS/policies remain unverified. | Not directly required for PRD-53 publish schema. | D - potential migration-history mismatch, earlier additive-only scope. | Verify indexes and policies through stable catalog access. If present, repair the migration-history row under repair authorization. If absent, apply under separate drift authorization. |
| `20260426120000_signal_posts_public_depth_pool.sql` | Constraint/index DDL only. | Not refreshed; stable catalog access unavailable. Constraint/index effects remain unverified. | Not directly required for PRD-53 publish audit, but part of public depth behavior. | E - requires manual DBA/catalog review. | Verify `signal_posts_rank_check` and `signal_posts_live_top_rank_key` through stable database catalog access before any repair/apply decision. |
| `20260426143000_signal_posts_why_it_matters_quality_gate.sql` | DDL plus `update public.signal_posts`. | Not refreshed; stable catalog access unavailable. PR #160 remains the durable evidence: migration history says not recorded; prior REST evidence says WITM columns exist; defaults, not-null constraints, status check, and row backfill effects remain unverified. | Required for PRD-53 readiness because selected rows must be WITM-passed. | D - potential migration-history mismatch with C risk. | Do not blindly re-run. Verify defaults/constraints/backfill with stable catalog access. Repair history only if full effects are proven already applied; otherwise separately authorize DML/backfill handling. |
| `20260430100000_signal_posts_final_slate_composer.sql` | Additive DDL only. | Not refreshed; stable catalog access unavailable. PR #160 remains the durable evidence: migration history says not recorded and live schema preflight says `final_slate_rank` and `final_slate_tier` are missing. | Yes. | A - expected PRD-53 additive schema migration. | Apply later only after earlier drift is resolved or a safe narrowed migration path is explicitly authorized. |
| `20260430110000_signal_posts_editorial_card_controls.sql` | Additive DDL only. | Not refreshed; stable catalog access unavailable. PR #160 remains the durable evidence: migration history says not recorded and live schema preflight says all introduced columns are missing. | Yes. | A - expected PRD-53 additive schema migration. | Apply later only after earlier drift is resolved or a safe narrowed migration path is explicitly authorized. |
| `20260430120000_published_slates_minimal_audit_history.sql` | Additive DDL only. | Not refreshed; stable catalog access unavailable. PR #160 remains the durable evidence: migration history says not recorded and prior REST evidence says `published_slates` and `published_slate_items` are missing. | Yes. | A - expected PRD-53 additive schema migration. | Apply later only after earlier drift is resolved or a safe narrowed migration path is explicitly authorized. |

## PRD-53 Schema Status

This run did not mutate production schema and did not refresh production catalog evidence. The PRD-53 status therefore remains the same as PR #160:

- production is still missing PRD-53 final-slate/editorial `signal_posts` columns,
- production is still missing `published_slates`,
- production is still missing `published_slate_items`,
- the live product remains blocked before the intended Top 5 Core + Next 2 Context published briefing can be validated.

## Drift Diagnosis

Verified in this run:

- PR #160 is merged into `main` at `2c0de8f598407fd20fd6ffc555d38587ef37e4ea`.
- The dedicated worktree is based on that merged commit.
- The local repository still contains the same eleven Supabase migration files.
- The seven pending migrations from PR #160 remain the only durable pending set because stable catalog access was not available to refresh remote state.
- The local seven-migration classification remains unchanged.
- No Supabase read, dry-run, repair, apply, direct SQL, `draft_only`, publish, or cron command was run.

Carried forward from PR #160:

- Remote migration history records only the first four versions.
- Seven later migrations are unrecorded.
- Earlier migration effects are at least partially present in production despite absent migration-history rows.
- PRD-53 schema effects are genuinely absent.

Most likely cause remains:

```text
Some earlier migrations were applied or partially applied outside recorded Supabase migration history,
while the three PRD-53 additive migrations are genuinely unapplied.
```

This run does not add new catalog evidence because the stable access prerequisite was absent.

## Recommended Remediation Path

Recommended path: Path E until stable catalog access is provided; then Path D split authorization.

Immediate next task:

1. Provide `SUPABASE_DB_PASSWORD` or an equivalent stable read-only database-owner/catalog access mechanism.
2. Re-run this catalog-level review once, starting with read-only catalog queries only.
3. Verify:
   - `supabase_migrations.schema_migrations`,
   - `information_schema.columns`,
   - `pg_constraint`,
   - `pg_indexes`,
   - `pg_class.relrowsecurity`,
   - `pg_policies`,
   - defaults and not-null requirements,
   - and non-sensitive proof of whether earlier DML/backfill effects are complete.
4. If earlier migration effects are fully present, later repair only those exact migration-history rows under `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true`.
5. If earlier DML/backfill migration effects are missing or partial, handle them only under `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true`.
6. After earlier drift is repaired or otherwise resolved, rerun `supabase db push --dry-run --linked`.
7. Apply PRD-53 additive schema migrations only when the pending set is safe and `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` is explicitly present.
8. After production schema preflight passes, rerun the second controlled cycle from latest `main`.

Do not proceed to MVP measurement until the second controlled cycle succeeds.

## Exact Next Authorization Needed

Next operator prompt should still provide read-only catalog capability without authorizing mutation:

```text
CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true
CONTROLLED_PRODUCTION_CATALOG_READONLY_INSPECTION_APPROVED=true
```

And it must provide one of:

- `SUPABASE_DB_PASSWORD` in the operator environment, or
- an equivalent stable read-only database-owner/catalog inspection mechanism that can read `information_schema`, `pg_catalog`, and `supabase_migrations.schema_migrations`.

Do not add mutation flags until catalog evidence proves exactly what should be repaired or applied.

Later mutation flags must be separate and explicit:

- `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true` for proven already-applied migrations only.
- `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true` for earlier row-update/backfill migration handling.
- `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` for the PRD-53 additive schema migrations.
- `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` only after schema alignment and final-slate readiness pass.

## What Must Not Be Done

- Do not run `supabase db push` while the seven-migration pending set remains unresolved.
- Do not run `supabase migration repair` without catalog proof that the target migration effects already exist and explicit repair authorization.
- Do not use direct row-changing SQL as a shortcut.
- Do not run `draft_only`, controlled publish, cron, or MVP measurement until schema alignment and the second controlled cycle are complete.

## Commands Run

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
sed -n '1,260p' AGENTS.md
sed -n '1,240p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,220p' docs/engineering/protocols/prd-template.md
sed -n '1,260p' docs/engineering/protocols/release-machine.md
sed -n '1,260p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,220p' docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md
sed -n '1,260p' docs/operations/controlled-cycles/2026-04-30-prd-53-catalog-level-database-owner-review.md
sed -n '1,240p' docs/operations/controlled-cycles/2026-04-30-prd-53-database-owner-migration-history-review.md
sed -n '1,240p' docs/operations/controlled-cycles/2026-04-30-prd-53-migration-history-drift-diagnosis.md
find supabase/migrations -maxdepth 1 -type f -name '*.sql' | sort
sed -n '1,220p' supabase/migrations/20260424083000_signal_posts_historical_archive.sql
sed -n '1,240p' supabase/migrations/20260426090000_pipeline_article_candidates.sql
sed -n '1,220p' supabase/migrations/20260426120000_signal_posts_public_depth_pool.sql
sed -n '1,260p' supabase/migrations/20260426143000_signal_posts_why_it_matters_quality_gate.sql
sed -n '1,220p' supabase/migrations/20260430100000_signal_posts_final_slate_composer.sql
sed -n '1,240p' supabase/migrations/20260430110000_signal_posts_editorial_card_controls.sql
sed -n '1,260p' supabase/migrations/20260430120000_published_slates_minimal_audit_history.sql
find . -maxdepth 2 -type f \( -name '.env' -o -name '.env.*' \) -not -path './node_modules/*' -print
find . -maxdepth 2 -type f \( -name '.env' -o -name '.env.*' \) -not -path './node_modules/*' -exec sh -c '<print key names only>' sh {} +
sh -c '<check stable catalog environment key presence only>'
date -u '+%Y-%m-%dT%H:%M:%SZ'
date '+%Y-%m-%d %H:%M:%S %Z'
git rev-parse HEAD origin/main
git log -1 --oneline --decorate
gh pr view 160 --repo brandonma25/daily-intelligence-aggregator --json number,state,mergeCommit,title,url
git diff --check
test -d node_modules && echo node_modules_present || echo node_modules_absent
find /Users/bm/dev/worktrees -maxdepth 2 -type d -name node_modules -prune -print
sha256sum package.json package-lock.json
sha256sum /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/package.json /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/package-lock.json
git check-ignore -v node_modules .next next-env.d.ts scripts/__pycache__
npm run lint
ln -s /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/node_modules node_modules
npm run lint
npm run test
npm run build
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-stable-catalog-readonly-review --pr-title "PRD-53 stable catalog readonly review"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-stable-catalog-readonly-review --pr-title "PRD-53 stable catalog readonly review"
```

## Command Results

| Command | Result |
| --- | --- |
| Workspace identity commands | Confirmed this branch is owned by `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-stable-catalog-readonly-review`. |
| `gh pr view 160 ...` | Confirmed PR #160 is merged at `2c0de8f598407fd20fd6ffc555d38587ef37e4ea`. |
| Local migration inspection | Confirmed the same seven pending migration classifications from PR #160. |
| Stable access environment check | `SUPABASE_DB_PASSWORD`, equivalent Postgres connection variables, and `SUPABASE_ACCESS_TOKEN` were absent. |
| Local env-file key scan | Found only `.env.example`; no usable stable read-only catalog credential was present. |
| Supabase read/dry-run commands | Not run because stable catalog access was unavailable and the prompt required stopping before partial catalog inspection. |
| `git diff --check` | Passed. |
| Initial `npm run lint` | Failed because this fresh worktree had no `node_modules` and `eslint` was not installed locally. |
| Dependency-tree check | Found a sibling worktree with identical `package.json` and `package-lock.json`; `node_modules` is ignored by Git. |
| Symlinked dependency validation setup | Created an ignored `node_modules` symlink to the matching sibling dependency tree for validation only. |
| Second `npm run lint` | Passed. |
| `npm run test` | Passed: 73 test files and 572 tests. Existing `--localstorage-file` warnings appeared. |
| `npm run build` | Passed with existing workspace-root and module-type warnings. |
| `python3 scripts/validate-feature-system-csv.py` | Passed with pre-existing PRD slug warnings for PRD-32, PRD-37, and PRD-38. |
| `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-stable-catalog-readonly-review --pr-title "PRD-53 stable catalog readonly review"` | Passed. Classified as docs-only baseline. |
| `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-stable-catalog-readonly-review --pr-title "PRD-53 stable catalog readonly review"` | Passed. Classified as docs-only baseline. |

## Commands Intentionally Not Run

| Command | Why not run |
| --- | --- |
| `supabase migration list --linked ...` | Stable catalog access was unavailable. The prompt required stopping instead of retrying partial catalog inspection. |
| `supabase db push --dry-run --linked ...` | Same reason. |
| `supabase db push --linked` | Mutation command. Not authorized. |
| `supabase migration repair` | Mutation command. Not authorized. |
| Direct SQL mutation | Explicitly out of scope. |
| `draft_only` | Explicitly out of scope; schema alignment is not complete. |
| Production publish | Explicitly out of scope; publish authorization absent. |
| Cron enablement or cron execution | Explicitly out of scope; cron remains unauthorized. |

## Confirmation Of No Production Mutation

No Supabase command was run in this review. No production migration apply, no migration-history repair, no direct SQL mutation, no row mutation, no `draft_only`, no publish, and no cron execution occurred.

Only local repo inspection, local env-key presence checks, and docs changes were performed.

## Cron Status

Cron was not inspected or run in this review. The prior durable PR #160 packet recorded the cron endpoint as HTTP 401 unauthorized. This run did not change cron configuration or execute cron.

## Result

Stable catalog-level database-owner review remains blocked because the stable read-only catalog-access prerequisite is unavailable.

Readiness label:

```text
catalog_level_review_pending_readonly_db_access
```

## Exact Next Task

Provide `SUPABASE_DB_PASSWORD` or equivalent stable read-only database-owner catalog access, then rerun catalog-level inspection only. Do not authorize repair, apply, `draft_only`, publish, cron, or MVP measurement in that same prompt.
