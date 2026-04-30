# PRD-53 Database-Owner Migration-History Review

Date: 2026-04-30
Branch: `codex/prd-53-database-owner-migration-history-review`
Readiness label: `migration_history_drift_requires_manual_dba_action`

## Effective Change Type

Remediation / alignment diagnostic under the approved PRD-53 Signals admin editorial workflow.

This packet is diagnostic and decision-oriented only. It does not implement a feature, create a PRD, apply production migrations, repair migration history, run `draft_only`, publish, or run cron.

Object level: Surface Placement and Card read-model storage in legacy `public.signal_posts`, plus internal publish audit tables. `signal_posts` remains legacy/runtime naming for editorial/public placement storage, not canonical Signal identity.

## Source Of Truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

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

## Why Database-Owner Review Was Required

PR #157 had schema migration authorization, but stopped before migration apply because `supabase db push --dry-run --linked` reported seven pending migrations, not only the expected additive PRD-53 schema migrations.

PR #158 diagnosed the seven-migration pending set and found:

- three expected PRD-53 additive schema migrations,
- four earlier out-of-scope migrations,
- two earlier migrations with DML/backfill behavior,
- and app-visible evidence that some earlier `signal_posts` migration effects may already exist despite absent migration-history records.

This run adds authorized read-only schema evidence. It confirms the same broad split, but still cannot safely repair or apply migrations because catalog-level verification of constraints, indexes, policies, row backfill effects, and remote migration-history rows remains blocked without database-owner catalog access.

## Workspace Baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-database-owner-migration-history-review` |
| Branch | `codex/prd-53-database-owner-migration-history-review` |
| Starting commit | `e40a808541d21f89417b2205d6bd873cc38e2ff6` |
| Commit description | `Merge pull request #158 from brandonma25/codex/prd-53-migration-history-drift-diagnosis` |
| UTC capture time | `2026-04-30T18:01:23Z` |
| Local capture time | `2026-05-01 02:01:23 CST` |
| Production URL | `https://daily-intelligence-aggregator-ybs9.vercel.app` |

The stale `/Users/bm/Documents/daily-intelligence-aggregator-main` checkout was not used for repo work because `git status --short --branch` failed with `error: bad tree object HEAD`.

## Authorization Variables

| Authorization | Status |
| --- | --- |
| `CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true` | Present in the prompt. |
| `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` | Absent. |
| `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` | Absent. |

Only read-only production schema inspection was authorized.

## Linked Supabase Project Confirmation

The dedicated worktree initially was not linked:

```text
Cannot find project ref. Have you run supabase link?
```

`supabase projects list --output json` showed one active healthy linked project:

```text
Project ref: fwkqjeumreaznfhnlzev
Region: ap-northeast-2
Postgres: 17.6.1.104
Status: ACTIVE_HEALTHY
```

The worktree was linked with the repo-supported CLI flow:

```bash
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-database-owner-migration-history-review
```

This created ignored local Supabase metadata only. It did not mutate production schema or production rows.

## Pending Migration Inventory

`supabase db push --dry-run --linked` completed and confirmed the same seven pending migrations recorded by PR #158:

```text
DRY RUN: migrations will *not* be pushed to the database.
Would push these migrations:
 - 20260424083000_signal_posts_historical_archive.sql
 - 20260426090000_pipeline_article_candidates.sql
 - 20260426120000_signal_posts_public_depth_pool.sql
 - 20260426143000_signal_posts_why_it_matters_quality_gate.sql
 - 20260430100000_signal_posts_final_slate_composer.sql
 - 20260430110000_signal_posts_editorial_card_controls.sql
 - 20260430120000_published_slates_minimal_audit_history.sql
```

`supabase migration list --linked` still could not produce the remote migration-history table. It failed as the Supabase temporary login role and then reached the circuit breaker:

```text
failed SASL auth
FATAL: password authentication failed for user "cli_login_postgres"
FATAL: (ECIRCUITBREAKER) too many authentication failures
```

The retrying local process was stopped after the circuit-breaker response. No migration apply or migration repair was run.

## Read-Only Schema Evidence

The stale local service-role key from the old Documents checkout returned HTTP 401 and was not used for evidence. Current project API keys were retrieved through `supabase projects api-keys --project-ref fwkqjeumreaznfhnlzev --output json` inside a local script and were not printed or written to the repo.

Read-only REST probes then checked table/column presence only. No row data was selected or printed.

| Object | Read-only result |
| --- | --- |
| `signal_posts.briefing_date` | Present. |
| `signal_posts.is_live` | Present. |
| `signal_posts.why_it_matters_validation_status` | Present. |
| `signal_posts.why_it_matters_validation_failures` | Present. |
| `signal_posts.why_it_matters_validation_details` | Present. |
| `signal_posts.why_it_matters_validated_at` | Present. |
| `signal_posts.final_slate_rank` | Missing column (`42703`). |
| `signal_posts.final_slate_tier` | Missing column (`42703`). |
| `signal_posts.editorial_decision` | Missing column (`42703`). |
| `signal_posts.decision_note` | Missing column (`42703`). |
| `signal_posts.rejected_reason` | Missing column (`42703`). |
| `signal_posts.held_reason` | Missing column (`42703`). |
| `signal_posts.replacement_of_row_id` | Missing column (`42703`). |
| `signal_posts.reviewed_by` | Missing column (`42703`). |
| `signal_posts.reviewed_at` | Missing column (`42703`). |
| `pipeline_article_candidates` | Table exists; all 15 checked columns are present. |
| `published_slates` | Missing table (`PGRST205`). |
| `published_slate_items` | Missing table (`PGRST205`). |

Limits of this evidence:

- REST probes can verify table and column presence.
- REST probes cannot prove constraints, indexes, RLS policies, defaults, migration-history rows, or DML/backfill effects.
- The public-depth migration (`20260426120000`) is mostly constraint/index work, so it still requires database-owner catalog inspection.

## Live Product Status

| Check | Result |
| --- | --- |
| Homepage `/` | HTTP 200. |
| `/signals` | HTTP 200. |
| Cron endpoint `/api/cron/fetch-news` | HTTP 401 unauthorized. |
| Production app release marker | `e40a808541d21f89417b2205d6bd873cc38e2ff6`. |

Homepage still reports:

```text
signal_posts schema preflight failed. Missing expected columns: final_slate_rank, final_slate_tier, editorial_decision, decision_note, rejected_reason, held_reason, replacement_of_row_id, reviewed_by, reviewed_at.
```

`/signals` loads the published-signal shell but reports `0 signals` and:

```text
Published Signals are not available yet
```

The live product remains not aligned with the intended Top 5 Core + Next 2 Context published briefing experience.

## Per-Migration Classification

| Migration | Purpose | DDL / DML | Read-only schema evidence | PRD-53 required | Classification | Recommended owner decision |
| --- | --- | --- | --- | --- | --- | --- |
| `20260424083000_signal_posts_historical_archive.sql` | Adds `briefing_date`, `is_live`, archive/live-rank constraints, indexes, and row backfill. | DDL plus `update public.signal_posts`. | `briefing_date` and `is_live` are present. Constraints, indexes, and row backfill effects were not verifiable through REST. | Indirect dependency for final-slate uniqueness and live archive safety. | D - potential migration-history mismatch with C risk. | Do not blindly re-run. Use database-owner catalog access to verify constraints/indexes/backfill. Repair history only if full effects are proven already applied; otherwise separately authorize DML/backfill handling. |
| `20260426090000_pipeline_article_candidates.sql` | Adds internal candidate-pool table, indexes, RLS, and service-role policies. | Additive DDL only. | Table exists and all checked columns are present. Indexes/RLS/policies were not verifiable through REST. | Not directly required for PRD-53 publish schema. | D - potential migration-history mismatch, earlier additive-only scope. | Verify indexes and policies through catalog access. If present, repair the migration-history row under repair authorization. If absent, apply under separate drift authorization. |
| `20260426120000_signal_posts_public_depth_pool.sql` | Widens rank constraint and changes live uniqueness to Top 5. | Constraint/index DDL only. | Not directly verifiable through REST; `rank` existed before this migration. | Not directly required for PRD-53 publish audit, but part of public depth behavior. | E - requires manual DBA/catalog review. | Verify `signal_posts_rank_check` and `signal_posts_live_top_rank_key` through database catalog access before any repair/apply decision. |
| `20260426143000_signal_posts_why_it_matters_quality_gate.sql` | Adds WITM validation fields, defaults, constraints, and row backfill. | DDL plus `update public.signal_posts`. | All four WITM columns are present. Defaults, not-null constraints, status check, and row backfill effects were not verifiable through REST. | Required for PRD-53 readiness because selected rows must be WITM-passed. | D - potential migration-history mismatch with C risk. | Do not blindly re-run. Use database-owner catalog access to verify defaults/constraints/backfill. Repair history only if full effects are proven already applied; otherwise separately authorize DML/backfill handling. |
| `20260430100000_signal_posts_final_slate_composer.sql` | Adds final-slate rank/tier fields, placement constraints, and final-slate rank index. | Additive DDL only. | `final_slate_rank` and `final_slate_tier` are missing. | Yes. | A - expected PRD-53 additive schema migration. | Apply later only after earlier drift is resolved or a safe narrowed migration path is explicitly authorized. |
| `20260430110000_signal_posts_editorial_card_controls.sql` | Adds editorial decision/reason/replacement/reviewer fields and constraints. | Additive DDL only. | All seven introduced columns are missing. | Yes. | A - expected PRD-53 additive schema migration. | Apply later only after earlier drift is resolved or a safe narrowed migration path is explicitly authorized. |
| `20260430120000_published_slates_minimal_audit_history.sql` | Adds internal published-slate audit/history tables, indexes, RLS, and policies. | Additive DDL only. | `published_slates` and `published_slate_items` are missing. | Yes. | A - expected PRD-53 additive schema migration. | Apply later only after earlier drift is resolved or a safe narrowed migration path is explicitly authorized. |

## PRD-53 Schema Status

Production is genuinely missing app-visible PRD-53 additive `signal_posts` fields:

- `final_slate_rank`
- `final_slate_tier`
- `editorial_decision`
- `decision_note`
- `rejected_reason`
- `held_reason`
- `replacement_of_row_id`
- `reviewed_by`
- `reviewed_at`

Production is also missing the PRD-53 audit tables:

- `published_slates`
- `published_slate_items`

Earlier `signal_posts` archive and WITM columns are present, and `pipeline_article_candidates` table columns are present, despite those migrations still appearing in the dry-run pending set.

## Drift Diagnosis

Verified facts:

- Production serves app commit `e40a808541d21f89417b2205d6bd873cc38e2ff6`.
- The linked Supabase project is `fwkqjeumreaznfhnlzev`, active and healthy.
- The dry-run still reports seven pending migrations.
- Earlier columns from `20260424083000` and `20260426143000` are present in production.
- `pipeline_article_candidates` table columns from `20260426090000` are present in production.
- PRD-53 final-slate/editorial columns from `20260430100000` and `20260430110000` are missing.
- PRD-53 audit tables from `20260430120000` are missing.
- Remote migration-history listing still cannot complete through Supabase CLI temp-role authentication.
- Constraint/index/policy/default/backfill verification remains incomplete without database catalog access.

Most likely cause:

```text
Some earlier migrations were applied or partially applied outside recorded Supabase migration history,
while the three PRD-53 additive migrations are genuinely unapplied.
```

The evidence is now stronger than PR #158 because read-only table/column probes confirm that some earlier pending migration effects exist while the PRD-53 effects do not.

Unverified:

- Whether `20260424083000` constraints, indexes, and row backfill effects are complete.
- Whether `20260426090000` indexes, RLS, and service-role policies are complete.
- Whether `20260426120000` rank constraint and live Top 5 unique index are present.
- Whether `20260426143000` defaults, not-null constraints, status check, and row backfill effects are complete.
- Which migration-history rows are recorded in `supabase_migrations.schema_migrations`.

## Recommended Remediation Path

Recommended path: Path D - split authorization, with a manual DBA/catalog step before any mutation.

Sequence:

1. Use database-owner catalog access to inspect migration history and catalog objects directly.
2. Verify each earlier migration's full effects:
   - columns,
   - constraints,
   - indexes,
   - RLS enablement,
   - policies,
   - defaults,
   - and DML/backfill effects where applicable.
3. If an earlier migration's effects are fully present, later repair only that exact migration-history row under `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true`.
4. If an earlier DML/backfill migration is genuinely missing or partial, later apply or manually remediate it only under `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true`.
5. Re-run `supabase db push --dry-run --linked`.
6. Proceed to PRD-53 additive migrations only when the pending set is safe and explicitly authorized under `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true`.
7. After PRD-53 schema preflight passes, rerun the second controlled cycle from latest `main`.

This run should not move to MVP measurement.

## Exact Next Authorization Needed

Next operator prompt should provide database-owner catalog capability without authorizing mutation:

```text
CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true
```

And it must provide one of:

- `SUPABASE_DB_PASSWORD` in the operator environment, or
- an equivalent read-only database-owner/catalog inspection mechanism that can read `information_schema`, `pg_catalog`, and `supabase_migrations.schema_migrations`.

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

## Rollback And Recovery Considerations

- Migration repair changes migration history and should be treated as a database-owner action with before/after migration-history captures.
- Re-running migrations that contain `update public.signal_posts` can rewrite production rows; those migrations require explicit row-update/backfill authorization and a recovery plan.
- PRD-53 additive schema migrations are lower risk but should not be applied through a broad pending set until earlier migration-history drift is resolved.

## Commands Run

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
git fetch origin --prune
git show-ref --verify --quiet refs/heads/codex/prd-53-database-owner-migration-history-review
git ls-remote --heads origin codex/prd-53-database-owner-migration-history-review
git rev-parse origin/main
git worktree add /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-database-owner-migration-history-review -b codex/prd-53-database-owner-migration-history-review origin/main
sed -n '1,260p' AGENTS.md
sed -n '1,220p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,200p' docs/engineering/protocols/prd-template.md
sed -n '1,220p' docs/engineering/protocols/release-machine.md
sed -n '1,260p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,220p' docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md
sed -n '1,560p' docs/operations/controlled-cycles/2026-04-30-prd-53-migration-history-drift-diagnosis.md
sed -n '1,240p' docs/operations/tracker-sync/2026-04-30-prd-53-migration-history-drift-diagnosis.md
ls -1 supabase/migrations
sed -n '1,240p' supabase/migrations/20260424083000_signal_posts_historical_archive.sql
sed -n '1,240p' supabase/migrations/20260426090000_pipeline_article_candidates.sql
sed -n '1,240p' supabase/migrations/20260426120000_signal_posts_public_depth_pool.sql
sed -n '1,240p' supabase/migrations/20260426143000_signal_posts_why_it_matters_quality_gate.sql
sed -n '1,240p' supabase/migrations/20260430100000_signal_posts_final_slate_composer.sql
sed -n '1,240p' supabase/migrations/20260430110000_signal_posts_editorial_card_controls.sql
sed -n '1,240p' supabase/migrations/20260430120000_published_slates_minimal_audit_history.sql
sed -n '1,180p' src/lib/signals-editorial.ts
sed -n '360,580p' src/lib/signals-editorial.ts
sed -n '1,260p' supabase/schema.sql
find scripts -maxdepth 2 -type f | sort | rg 'supabase|migration|schema|prod|controlled|release|validate'
ls -la .env* 2>/dev/null || true
env | cut -d= -f1 | sort | rg 'CONTROLLED|SUPABASE|DATABASE|POSTGRES|VERCEL|PRODUCTION|CRON|PIPELINE|ADMIN' || true
supabase --version
supabase projects list --output json
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-database-owner-migration-history-review
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-database-owner-migration-history-review
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-database-owner-migration-history-review
supabase projects api-keys --project-ref fwkqjeumreaznfhnlzev --output json
node - <<'NODE' ...sanitized read-only REST schema probe...
curl -L -sS -o /tmp/bootup-db-owner-home.html -w 'home %{http_code} %{url_effective}\n' https://daily-intelligence-aggregator-ybs9.vercel.app/
curl -L -sS -o /tmp/bootup-db-owner-signals.html -w 'signals %{http_code} %{url_effective}\n' https://daily-intelligence-aggregator-ybs9.vercel.app/signals
curl -L -sS -o /tmp/bootup-db-owner-cron.txt -w 'cron %{http_code} %{url_effective}\n' https://daily-intelligence-aggregator-ybs9.vercel.app/api/cron/fetch-news
node - <<'NODE' ...sanitized route marker extraction...
date -u '+%Y-%m-%dT%H:%M:%SZ'
date '+%Y-%m-%d %H:%M:%S %Z'
git diff --check
python3 scripts/validate-feature-system-csv.py
npm run lint
cmp -s package.json /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/package.json
cmp -s package-lock.json /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/package-lock.json
ln -s /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/node_modules node_modules
npm run lint
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-database-owner-migration-history-review --pr-title "PRD-53 database-owner migration-history review"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-database-owner-migration-history-review --pr-title "PRD-53 database-owner migration-history review"
npm run test
npm run build
```

The `supabase projects api-keys` command was used inside local scripts only. Key values were not printed, written to repo files, or included in this packet.

## Local Validation Results

| Command | Result |
| --- | --- |
| `git diff --check` | Passed. |
| `python3 scripts/validate-feature-system-csv.py` | Passed with pre-existing PRD slug warnings for PRD-32, PRD-37, and PRD-38. |
| `npm run lint` | First attempt failed because the fresh worktree had no local `node_modules` and `eslint` was unavailable. |
| `npm run lint` after linking a matching dependency tree | Passed after confirming `package.json` and `package-lock.json` matched `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment`. |
| `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-database-owner-migration-history-review --pr-title "PRD-53 database-owner migration-history review"` | Passed. Classified as docs-only baseline. |
| `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-database-owner-migration-history-review --pr-title "PRD-53 database-owner migration-history review"` | Passed. Classified as docs-only baseline. |
| `npm run test` | Passed. 73 test files and 572 tests passed. |
| `npm run build` | Passed. Next.js build completed with existing workspace-root and module-type warnings. |

## Commands Intentionally Not Run

| Command or action | Reason |
| --- | --- |
| `supabase db push --linked` | Explicitly out of scope; migration apply was not authorized and pending set remains unsafe. |
| `supabase migration repair` | Explicitly out of scope; repair was not authorized and full catalog proof is incomplete. |
| Direct SQL mutation | Explicitly out of scope. |
| Production row inspection | Avoided to prevent exposing sensitive row data; this run checked schema shape only. |
| Production row mutation | Explicitly out of scope. |
| Production `draft_only` | Schema alignment remains blocked. |
| Controlled publish | Production publish was not authorized and schema remains blocked. |
| Cron execution or re-enable | Explicitly out of scope; cron endpoint remained HTTP 401 unauthorized. |
| Pipeline write-mode | Explicitly out of scope. |
| MVP measurement instrumentation | Blocked until the second controlled cycle succeeds. |

## Confirmation Of No Production Mutation

- No production migration apply was run.
- No migration-history repair was run.
- No direct production SQL was run.
- No production rows were inspected or changed.
- No `draft_only` was run.
- No production publish was attempted.
- No cron was run or re-enabled.

## Result

`migration_history_drift_requires_manual_dba_action`

Database-owner review is partially complete:

- The seven pending migrations were reconfirmed.
- Read-only table/column evidence confirms earlier migration-history drift.
- PRD-53 schema drift is confirmed as genuinely missing.

Database-owner review is not complete enough to mutate production:

- Remote migration-history listing remains blocked by Supabase temp-role auth/circuit breaker.
- Catalog checks for constraints, indexes, policies, defaults, and row backfill effects remain unavailable without database-owner catalog access.

## Exact Next Task

Perform a catalog-level database-owner review before any repair or apply step.

The next run should:

1. Provide `SUPABASE_DB_PASSWORD` or equivalent read-only database-owner catalog access.
2. Read `supabase_migrations.schema_migrations`.
3. Verify constraints, indexes, RLS, policies, defaults, and backfill effects for the four earlier pending migrations.
4. Decide which earlier migration-history rows can be safely repaired and which require separate apply/backfill authorization.
5. Only after earlier drift is resolved, apply the three PRD-53 additive migrations under explicit schema-migration authorization.
6. Verify production schema preflight.
7. Rerun the second controlled cycle from latest `main`.

Do not proceed to MVP measurement until the second controlled cycle succeeds.
