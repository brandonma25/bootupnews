# PRD-53 Catalog-Level Database-Owner Review

Date: 2026-04-30
Branch: `codex/prd-53-catalog-level-database-owner-review`
Readiness label: `database_owner_catalog_review_blocked_missing_stable_catalog_access`

## Effective Change Type

Remediation / alignment diagnostic under the approved PRD-53 Signals admin editorial workflow.

This packet is diagnostic and decision-oriented only. It does not implement a feature, create a PRD, apply production migrations, repair migration history, run `draft_only`, publish, or run cron.

Object level: Surface Placement and Card read-model storage in legacy `public.signal_posts`, plus internal publish audit tables. `signal_posts` remains legacy/runtime naming for editorial/public placement storage, not canonical Signal identity.

## Source Of Truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

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

PR #158 diagnosed migration-history drift and found seven pending Supabase migrations:

- three expected PRD-53 additive schema migrations,
- four earlier out-of-scope migrations,
- and two earlier migrations with DML/backfill behavior.

PR #159 added read-only REST-level table and column evidence. It confirmed that some earlier migration effects are visible in production, while PRD-53 final-slate/editorial columns and audit tables are genuinely missing. However, REST-level probes could not verify migration history, constraints, indexes, RLS policies, defaults, or row backfill effects.

This run attempted catalog-level production inspection under read-only authorization only.

## Workspace Baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-level-database-owner-review` |
| Branch | `codex/prd-53-catalog-level-database-owner-review` |
| Starting commit | `46def4fd98aa88de4cd9b25528cb3e809422c998` |
| Commit description | `Merge pull request #159 from brandonma25/codex/prd-53-database-owner-migration-history-review` |
| UTC capture time | `2026-04-30T18:32:01Z` |
| Local capture time | `2026-05-01 02:32:01 CST` |
| Production URL | `https://daily-intelligence-aggregator-ybs9.vercel.app` |

The stale `/Users/bm/Documents/daily-intelligence-aggregator-main` checkout was not used for repo work because `git status --short --branch` failed with `error: bad tree object HEAD`.

## Authorization Variables

| Authorization | Status |
| --- | --- |
| `CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true` | Present in the prompt. |
| `CONTROLLED_PRODUCTION_CATALOG_READONLY_INSPECTION_APPROVED=true` | Present in the prompt. |
| `SUPABASE_DB_PASSWORD` or equivalent stable catalog access | Not present in the shell environment or checked local env files. |
| `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` | Absent. |

Only read-only production schema/catalog inspection was authorized. No mutation authorization was present.

## Linked Supabase Project Confirmation

`supabase projects list --output json` showed the same active healthy production project:

```text
Project ref: fwkqjeumreaznfhnlzev
Region: ap-northeast-2
Postgres: 17.6.1.104
Status: ACTIVE_HEALTHY
Linked: true
```

The dedicated worktree was linked with the repo-supported CLI flow:

```bash
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-level-database-owner-review
```

This created ignored local Supabase metadata only. It did not mutate production schema or production rows.

## Pending Migration Inventory

`supabase migration list --linked` completed in this run and confirmed that the remote migration-history table records only the first four local migrations:

| Local | Remote |
| --- | --- |
| `20260416200404` | `20260416200404` |
| `20260421120000` | `20260421120000` |
| `20260423090000` | `20260423090000` |
| `20260423120000` | `20260423120000` |
| `20260424083000` | not recorded |
| `20260426090000` | not recorded |
| `20260426120000` | not recorded |
| `20260426143000` | not recorded |
| `20260430100000` | not recorded |
| `20260430110000` | not recorded |
| `20260430120000` | not recorded |

A direct read-only catalog query also confirmed the applied migration-history versions:

```text
20260416200404
20260421120000
20260423090000
20260423120000
```

`supabase db push --dry-run --linked` was attempted but hit the Supabase temporary login role failure and began retrying:

```text
failed SASL auth
FATAL: password authentication failed for user "cli_login_postgres"
Retry (3/8)
```

The retrying dry-run was stopped before it could churn into another circuit-breaker failure. Because the migration list and `supabase_migrations.schema_migrations` query agree, the current pending set is still the same seven migrations documented by PR #158 and PR #159.

## Catalog-Level Evidence

Catalog evidence obtained:

| Catalog area | Result |
| --- | --- |
| `supabase_migrations.schema_migrations` table | Readable once through `supabase db query --linked`; contains only the first four migration versions. |
| Remote migration list | Readable once through `supabase migration list --linked`; confirms the same first four applied versions and seven unrecorded later versions. |
| Linked project identity | Confirmed as `fwkqjeumreaznfhnlzev`, active and healthy. |

Catalog evidence not obtained:

| Catalog area | Reason |
| --- | --- |
| `information_schema.columns` full readout | Combined read-only catalog query hit `ECIRCUITBREAKER` on the Supabase temporary login role. |
| `pg_constraint` constraints | Blocked by the same temp-login circuit breaker. |
| `pg_indexes` indexes | Blocked by the same temp-login circuit breaker. |
| `pg_class.relrowsecurity` RLS enablement | Blocked by the same temp-login circuit breaker. |
| `pg_policies` policies | Blocked by the same temp-login circuit breaker. |
| Column defaults and not-null proof beyond prior REST checks | Blocked by the same temp-login circuit breaker. |

The prompt required `SUPABASE_DB_PASSWORD` or an equivalent read-only catalog mechanism for stable catalog inspection. That credential/mechanism was not available in the execution environment. The Supabase temp-login path was sufficient for migration-history evidence once, but not stable enough for the full catalog review.

## Live Product Status

| Check | Result |
| --- | --- |
| Homepage `/` | HTTP 200. |
| `/signals` | HTTP 200. |
| Cron endpoint `/api/cron/fetch-news` | HTTP 401 unauthorized. |
| Production app release marker | `e40a808541d21f89417b2205d6bd873cc38e2ff6`. |
| Standard production route probe | Failed because `/` returned HTTP 200 but did not include expected public briefing markers. |

Homepage still reports:

```text
signal_posts schema preflight failed. Missing expected columns: final_slate_rank, final_slate_tier, editorial_decision, decision_note, rejected_reason, held_reason, replacement_of_row_id, reviewed_by, reviewed_at.
```

`/signals` still reports:

```text
Published Signals are not available yet
```

The live product remains not aligned with the intended Top 5 Core + Next 2 Context published briefing experience.

## Per-Migration Classification

| Migration | Purpose | DDL / DML | Catalog evidence this run | PRD-53 required | Classification | Recommended owner decision |
| --- | --- | --- | --- | --- | --- | --- |
| `20260424083000_signal_posts_historical_archive.sql` | Adds `briefing_date`, `is_live`, archive/live-rank constraints, indexes, and row backfill. | DDL plus `update public.signal_posts`. | Migration history says not recorded. Prior REST evidence says `briefing_date` and `is_live` columns exist. Constraints, indexes, and row backfill effects remain unverified. | Indirect dependency for final-slate uniqueness and live archive safety. | D - potential migration-history mismatch with C risk. | Do not blindly re-run. Use stable database-owner catalog access to verify constraints/indexes/backfill. Repair history only if full effects are proven already applied; otherwise separately authorize DML/backfill handling. |
| `20260426090000_pipeline_article_candidates.sql` | Adds internal candidate-pool table, indexes, RLS, and service-role policies. | Additive DDL only. | Migration history says not recorded. Prior REST evidence says the table and checked columns exist. Indexes/RLS/policies remain unverified. | Not directly required for PRD-53 publish schema. | D - potential migration-history mismatch, earlier additive-only scope. | Verify indexes and policies through stable catalog access. If present, repair the migration-history row under repair authorization. If absent, apply under separate drift authorization. |
| `20260426120000_signal_posts_public_depth_pool.sql` | Widens rank constraint and changes live uniqueness to Top 5. | Constraint/index DDL only. | Migration history says not recorded. Constraint/index effects remain unverified. | Not directly required for PRD-53 publish audit, but part of public depth behavior. | E - requires manual DBA/catalog review. | Verify `signal_posts_rank_check` and `signal_posts_live_top_rank_key` through stable database catalog access before any repair/apply decision. |
| `20260426143000_signal_posts_why_it_matters_quality_gate.sql` | Adds WITM validation fields, defaults, constraints, and row backfill. | DDL plus `update public.signal_posts`. | Migration history says not recorded. Prior REST evidence says the WITM columns exist. Defaults, not-null constraints, status check, and row backfill effects remain unverified. | Required for PRD-53 readiness because selected rows must be WITM-passed. | D - potential migration-history mismatch with C risk. | Do not blindly re-run. Use stable database-owner catalog access to verify defaults/constraints/backfill. Repair history only if full effects are proven already applied; otherwise separately authorize DML/backfill handling. |
| `20260430100000_signal_posts_final_slate_composer.sql` | Adds final-slate rank/tier fields, placement constraints, and final-slate rank index. | Additive DDL only. | Migration history says not recorded. Live schema preflight says `final_slate_rank` and `final_slate_tier` are missing. | Yes. | A - expected PRD-53 additive schema migration. | Apply later only after earlier drift is resolved or a safe narrowed migration path is explicitly authorized. |
| `20260430110000_signal_posts_editorial_card_controls.sql` | Adds editorial decision/reason/replacement/reviewer fields and constraints. | Additive DDL only. | Migration history says not recorded. Live schema preflight says all introduced columns are missing. | Yes. | A - expected PRD-53 additive schema migration. | Apply later only after earlier drift is resolved or a safe narrowed migration path is explicitly authorized. |
| `20260430120000_published_slates_minimal_audit_history.sql` | Adds internal published-slate audit/history tables, indexes, RLS, and policies. | Additive DDL only. | Migration history says not recorded. Prior REST evidence says `published_slates` and `published_slate_items` are missing. | Yes. | A - expected PRD-53 additive schema migration. | Apply later only after earlier drift is resolved or a safe narrowed migration path is explicitly authorized. |

## PRD-53 Schema Status

Production is still missing app-visible PRD-53 additive `signal_posts` fields:

- `final_slate_rank`
- `final_slate_tier`
- `editorial_decision`
- `decision_note`
- `rejected_reason`
- `held_reason`
- `replacement_of_row_id`
- `reviewed_by`
- `reviewed_at`

Production is also missing the PRD-53 audit tables according to PR #159 read-only REST evidence:

- `published_slates`
- `published_slate_items`

This run did not change production schema, so those blockers remain.

## Drift Diagnosis

Verified facts:

- PR #159 is merged into `main` at `46def4fd98aa88de4cd9b25528cb3e809422c998`.
- The linked Supabase project is `fwkqjeumreaznfhnlzev`, active and healthy.
- Remote migration history records only:
  - `20260416200404`
  - `20260421120000`
  - `20260423090000`
  - `20260423120000`
- The seven later local migrations are not recorded in `supabase_migrations.schema_migrations`.
- Prior REST evidence confirms some earlier migration objects are present even though their migration-history versions are not recorded.
- PRD-53 final-slate/editorial schema remains missing in the live app.
- The full catalog review remains blocked without stable database-owner access.

Most likely cause:

```text
Some earlier migrations were applied or partially applied outside recorded Supabase migration history,
while the three PRD-53 additive migrations are genuinely unapplied.
```

New evidence from this run strengthens the diagnosis: it proves the remote migration-history table itself does not record the seven later migrations. It does not prove whether the earlier unrecorded migrations are fully or only partially applied.

## Recommended Remediation Path

Recommended path: Path E until stable catalog access is provided; then Path D split authorization.

Immediate next step:

1. Provide `SUPABASE_DB_PASSWORD` or an equivalent stable read-only database-owner/catalog access mechanism.
2. Re-run a single combined read-only catalog query that verifies:
   - `supabase_migrations.schema_migrations`,
   - `information_schema.columns`,
   - `pg_constraint`,
   - `pg_indexes`,
   - `pg_class.relrowsecurity`,
   - `pg_policies`,
   - defaults and not-null requirements,
   - and non-sensitive proof of whether earlier DML/backfill effects are complete.
3. If earlier migration effects are fully present, later repair only those exact migration-history rows under `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true`.
4. If earlier DML/backfill migration effects are missing or partial, handle them only under `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true`.
5. After earlier drift is repaired or otherwise resolved, rerun `supabase db push --dry-run --linked`.
6. Apply PRD-53 additive schema migrations only when the pending set is safe and `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` is explicitly present.
7. After production schema preflight passes, rerun the second controlled cycle from latest `main`.

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

Later mutation flags should be separate and explicit:

- `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true` for proven already-applied migrations only.
- `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true` for earlier row-update/backfill migration handling.
- `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` for the PRD-53 additive schema migrations.
- `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` only after schema alignment and final-slate readiness pass.

## What Must Not Be Done

- Do not run `supabase db push` while the seven-migration pending set remains unresolved.
- Do not run `supabase migration repair` without catalog proof that the target migration effects already exist.
- Do not use direct row-changing SQL as a shortcut.
- Do not run `draft_only`, controlled publish, cron, or MVP measurement until schema alignment and the second controlled cycle are complete.

## Commands Run

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
git fetch origin --prune
gh pr view 159 --repo brandonma25/daily-intelligence-aggregator --json number,state,mergeCommit,title,url
gh pr merge 159 --repo brandonma25/daily-intelligence-aggregator --merge
git show-ref --verify --quiet refs/heads/codex/prd-53-catalog-level-database-owner-review
git ls-remote --heads origin codex/prd-53-catalog-level-database-owner-review
git worktree add /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-level-database-owner-review -b codex/prd-53-catalog-level-database-owner-review origin/main
sed -n '1,260p' AGENTS.md
sed -n '1,240p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,220p' docs/engineering/protocols/prd-template.md
sed -n '1,260p' docs/engineering/protocols/release-machine.md
sed -n '1,260p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,220p' docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md
sed -n '1,320p' docs/operations/controlled-cycles/2026-04-30-prd-53-database-owner-migration-history-review.md
sed -n '1,220p' docs/operations/tracker-sync/2026-04-30-prd-53-database-owner-migration-history-review.md
sed -n '1,320p' docs/operations/controlled-cycles/2026-04-30-prd-53-migration-history-drift-diagnosis.md
ls -1 supabase/migrations
env | cut -d= -f1 | sort | rg '^(CONTROLLED|SUPABASE|DATABASE|POSTGRES|PG|VERCEL|PRODUCTION|CRON|PIPELINE|ADMIN)'
ls -la .env*
which psql
supabase --version
find /Users/bm/dev /Users/bm/Documents -maxdepth 4 -name '.env*'
supabase projects list --output json
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-level-database-owner-review
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-level-database-owner-review
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-level-database-owner-review
supabase db query --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-level-database-owner-review --output json "select version from supabase_migrations.schema_migrations order by version;"
supabase db query --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-level-database-owner-review --output json "<combined read-only catalog query>"
curl -sS -I https://daily-intelligence-aggregator-ybs9.vercel.app/
curl -sS -I https://daily-intelligence-aggregator-ybs9.vercel.app/signals
curl -sS -I https://daily-intelligence-aggregator-ybs9.vercel.app/api/cron/fetch-news
curl -L -sS -o /tmp/bootup-catalog-review-home.html -w 'home %{http_code} %{url_effective}\n' https://daily-intelligence-aggregator-ybs9.vercel.app/
curl -L -sS -o /tmp/bootup-catalog-review-signals.html -w 'signals %{http_code} %{url_effective}\n' https://daily-intelligence-aggregator-ybs9.vercel.app/signals
node scripts/prod-check.js https://daily-intelligence-aggregator-ybs9.vercel.app
rg -o 'sentry-release=[^,&"]+|signal_posts schema preflight failed\.[^<"]+|published_slate audit schema preflight failed\.[^<"]+|Missing expected columns: [^<"]+|0 signals|Published Signals are not available yet|Daily Executive Briefing|Today • [^<]+' /tmp/bootup-catalog-review-home.html /tmp/bootup-catalog-review-signals.html
git diff --check
npm run lint
npm run test
npm run build
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-catalog-level-database-owner-review --pr-title "PRD-53 catalog-level database-owner review"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-catalog-level-database-owner-review --pr-title "PRD-53 catalog-level database-owner review"
```

## Command Results

| Command | Result |
| --- | --- |
| `gh pr view 159 ...` | Initially showed PR #159 as open. |
| `gh pr merge 159 --merge` | Merged PR #159 so this branch could start from the requested merged baseline. Merge commit: `46def4fd98aa88de4cd9b25528cb3e809422c998`. |
| Workspace identity commands | Confirmed this branch is owned by `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-catalog-level-database-owner-review`. |
| `supabase projects list --output json` | Confirmed project `fwkqjeumreaznfhnlzev` is active and healthy. |
| `supabase migration list --linked ...` | Passed; remote migration history records only the first four versions. |
| `supabase db query ... schema_migrations ...` | Passed once; confirmed the same first four applied versions. |
| `supabase db push --dry-run --linked ...` | Attempted; stopped after temp-login auth failure began retrying. No migration was applied. |
| Combined read-only catalog query | Blocked by `ECIRCUITBREAKER` on Supabase temp-login role. No mutation occurred. |
| Homepage and `/signals` HEAD checks | Both HTTP 200. |
| Cron endpoint HEAD check | HTTP 401 unauthorized. |
| `node scripts/prod-check.js https://daily-intelligence-aggregator-ybs9.vercel.app` | Failed because `/` was HTTP 200 but missing expected public briefing markers. |
| `git diff --check` | Passed. |
| `npm run lint` | Passed using a matching dependency tree symlinked from a sibling worktree with identical `package.json` and `package-lock.json`. |
| `npm run test` | Passed: 73 test files and 572 tests. |
| `npm run build` | Passed with existing workspace-root and module-type warnings. |
| `python3 scripts/validate-feature-system-csv.py` | Passed with pre-existing PRD slug warnings for PRD-32, PRD-37, and PRD-38. |
| `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-catalog-level-database-owner-review --pr-title "PRD-53 catalog-level database-owner review"` | Passed. Classified as docs-only baseline. |
| `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-catalog-level-database-owner-review --pr-title "PRD-53 catalog-level database-owner review"` | Passed. Classified as docs-only baseline. |

## Commands Intentionally Not Run

| Command | Why not run |
| --- | --- |
| `supabase db push --linked` | Mutation command. Not authorized and pending set remains unsafe. |
| `supabase migration repair` | Mutation command. Not authorized and full catalog proof is unavailable. |
| Direct SQL mutation | Explicitly out of scope. |
| `draft_only` | Explicitly out of scope; schema alignment is not complete. |
| Production publish | Explicitly out of scope; publish authorization absent. |
| Cron enablement or cron execution | Explicitly out of scope; cron remains unauthorized. |

## Confirmation Of No Production Mutation

No production migration apply, no migration-history repair, no direct SQL mutation, no row mutation, no `draft_only`, no publish, and no cron execution occurred.

Only read-only Supabase commands, read-only production HTTP checks, and docs changes were performed.

## Cron Status

Cron remained disabled/unauthorized for this task. The cron endpoint returned HTTP 401 and was not run with credentials.

## Result

Database-owner catalog review is still blocked.

This run improved the evidence by proving that the linked production migration-history table records only the first four migrations. It did not complete full catalog proof for constraints, indexes, policies, defaults, or earlier backfill effects because stable database-owner catalog access was not available and the temporary Supabase login role hit the circuit breaker.

## Exact Next Task

Provide `SUPABASE_DB_PASSWORD` or equivalent stable read-only database-owner catalog access, then rerun catalog-level inspection only. Do not authorize repair, apply, `draft_only`, publish, cron, or MVP measurement in that same prompt.
