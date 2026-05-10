# PRD-53 Migration-History Drift Diagnosis

Date: 2026-04-30
Branch: `codex/prd-53-migration-history-drift-diagnosis`
Readiness label: `migration_history_drift_requires_database_owner_review`

## Effective change type

Remediation / alignment diagnostic under the approved PRD-53 Signals admin editorial workflow.

This packet is diagnostic only. It does not implement a feature, create a PRD, apply production migrations, repair migration history, run `draft_only`, publish, or run cron.

## Source of truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

- `docs/operations/controlled-cycles/2026-04-30-prd-53-second-controlled-cycle.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-schema-alignment-and-second-cycle-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-schema-alignment-and-cycle-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-applied-schema-alignment-and-cycle-rerun.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-second-controlled-cycle.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-schema-alignment-and-second-cycle-rerun.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-authorized-schema-alignment-and-cycle-rerun.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-applied-schema-alignment-and-cycle-rerun.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`
- `docs/engineering/change-records/prd-53-minimal-published-slate-audit-history.md`

## Why this diagnostic was needed

PR #157 attempted the authorized production schema-alignment path, but stopped before migration apply because `supabase db push --dry-run --linked` reported seven pending migrations instead of only the expected PRD-53 additive schema set.

The pending set included earlier migrations outside the PRD-53 schema-only authorization. Two of those earlier migrations include row-update or backfill behavior. Applying the whole pending set would therefore exceed the scoped PRD-53 additive-schema authorization.

This diagnostic separates:

- expected PRD-53 additive schema migrations,
- earlier additive-only migrations,
- earlier migrations with DML/backfill behavior,
- likely migration-history mismatch evidence,
- and the next safe remediation path.

## Workspace baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-migration-history-drift-diagnosis` |
| Branch | `codex/prd-53-migration-history-drift-diagnosis` |
| Starting commit | `8f486f1` |
| Commit description | `Merge pull request #157 from brandonma25/codex/prd-53-apply-production-schema-alignment` |
| UTC capture time | `2026-04-30T06:53:42Z` |
| Local capture time | `2026-04-30 14:53:42 CST` |
| Production URL | `https://bootupnews.vercel.app` |

## Linked Supabase project confirmation

The dedicated worktree was initially unlinked:

```text
Cannot find project ref. Have you run supabase link?
```

The Supabase account listed one active healthy project:

```text
Project ref: fwkqjeumreaznfhnlzev
Region: ap-northeast-2
Postgres: 17.6.1.104
Status: ACTIVE_HEALTHY
```

The worktree was linked to that project using the repo-supported CLI flow:

```bash
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-migration-history-drift-diagnosis
```

This created ignored local Supabase metadata only. It did not mutate production schema or production rows.

## Local migration inventory

The repository contains these local Supabase migration files:

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

## Remote migration inventory

Direct remote migration-history listing was attempted with the explicit linked workdir:

```bash
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-migration-history-drift-diagnosis
```

Result:

```text
failed to connect as temp role
FATAL: password authentication failed for user "cli_login_postgres"
FATAL: (ECIRCUITBREAKER) too many authentication failures, new connections are temporarily blocked
Connect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD
```

No database password was present in the execution environment. The command was not retried after the circuit-breaker response.

The dry-run did succeed and provides the pending set inferred from remote migration history:

```bash
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-migration-history-drift-diagnosis
```

Dry-run result:

```text
DRY RUN: migrations will *not* be pushed to the database.
Would push these migrations:
 • 20260424083000_signal_posts_historical_archive.sql
 • 20260426090000_pipeline_article_candidates.sql
 • 20260426120000_signal_posts_public_depth_pool.sql
 • 20260426143000_signal_posts_why_it_matters_quality_gate.sql
 • 20260430100000_signal_posts_final_slate_composer.sql
 • 20260430110000_signal_posts_editorial_card_controls.sql
 • 20260430120000_published_slates_minimal_audit_history.sql
```

Inferred remote history from the dry-run:

- The first four local migrations are not pending.
- The seven migrations listed above are not recorded as applied in the linked remote migration history.
- The exact applied remote migration table was not read because `supabase migration list` was blocked by CLI temp-role auth.

## Seven pending migrations

| Migration | Timestamp | Purpose | DDL / DML | Needed for PRD-53 workflow | Classification | Recommended handling |
| --- | --- | --- | --- | --- | --- | --- |
| `20260424083000_signal_posts_historical_archive.sql` | 2026-04-24 08:30 | Adds `briefing_date`, `is_live`, archive/live-rank constraints and indexes. | DDL plus `update public.signal_posts`. | Indirect dependency because later PRD-53 final-slate uniqueness uses `briefing_date`, and publish safety uses `is_live`. | D - potential migration-history mismatch with C risk. | Do not blindly re-run. Verify actual columns, constraints, indexes, and whether row-update effects are already present; repair history only if proven applied, or apply under separate row-update authorization. |
| `20260426090000_pipeline_article_candidates.sql` | 2026-04-26 09:00 | Adds internal `pipeline_article_candidates` table, indexes, RLS, and service-role policies. | Additive DDL only. | Not required for PRD-53 publish schema, but part of broader production migration drift. | B - earlier additive-only migration, safe but out of PRD-53 scope. | Verify whether table/policies already exist. Apply or repair only under a drift-specific authorization, not under PRD-53 schema-only authorization. |
| `20260426120000_signal_posts_public_depth_pool.sql` | 2026-04-26 12:00 | Widens `signal_posts.rank` check to `1..20` and changes live uniqueness to Top 5. | DDL only. | Not required for the 7-row PRD-53 publish audit, but affects public depth semantics. | B - earlier additive/constraint-only migration, out of PRD-53 scope. | Verify rank constraint and live Top 5 index. Apply or repair only after confirming homepage-depth expectations and authorization. |
| `20260426143000_signal_posts_why_it_matters_quality_gate.sql` | 2026-04-26 14:30 | Adds WITM validation fields, defaults, not-null constraints, and status check. | DDL plus `update public.signal_posts`. | Required for PRD-53 editorial readiness because selected rows must be WITM-passed. | D - potential migration-history mismatch with C risk. | Do not blindly re-run. Public app evidence indicates WITM columns exist, but direct constraint/default/backfill verification is still needed before repair. |
| `20260430100000_signal_posts_final_slate_composer.sql` | 2026-04-30 10:00 | Adds `final_slate_rank`, `final_slate_tier`, final placement constraints, and unique final-slate rank index. | Additive DDL only. | Yes. | A - expected PRD-53 additive schema migration. | Apply after earlier migration-history drift is resolved or after an operator confirms a safe narrowed migration path. |
| `20260430110000_signal_posts_editorial_card_controls.sql` | 2026-04-30 11:00 | Adds decision/reason/replacement/reviewer fields and constraints. | Additive DDL only. | Yes. | A - expected PRD-53 additive schema migration. | Apply after earlier migration-history drift is resolved or after an operator confirms a safe narrowed migration path. |
| `20260430120000_published_slates_minimal_audit_history.sql` | 2026-04-30 12:00 | Adds internal `published_slates` and `published_slate_items` audit tables, indexes, RLS, and service-role policies. | Additive DDL only. | Yes. | A - expected PRD-53 additive schema migration. | Apply after earlier migration-history drift is resolved or after an operator confirms a safe narrowed migration path. |

## Production schema comparison

Only safe public/app-visible checks were available in this run. Direct service-role schema queries and schema dumps were not available because `supabase migration list` hit temp-role authentication failures and no `SUPABASE_DB_PASSWORD` or service-role schema-inspection environment was present.

Production public route checks:

| Check | Result |
| --- | --- |
| Homepage `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| Cron endpoint `/api/cron/fetch-news` | HTTP 401 unauthorized |
| Production app release marker | `8f486f15c31226a1384ad69edf241bf972d00346` |
| Production route probe | Failed because `/` was HTTP 200 but missing `Why it matters` and `Details` markers. |

Homepage schema preflight still reports:

```text
signal_posts schema preflight failed. Missing expected columns: final_slate_rank, final_slate_tier, editorial_decision, decision_note, rejected_reason, held_reason, replacement_of_row_id, reviewed_by, reviewed_at.
```

App-visible comparison:

| Migration | Expected production effect | App-visible status |
| --- | --- | --- |
| `20260424083000_signal_posts_historical_archive.sql` | `signal_posts.briefing_date`, `signal_posts.is_live`, archive/live rank constraints, row backfill. | `briefing_date` and `is_live` are not reported missing by the app schema preflight, so the columns appear present. Constraints, indexes, and row-update effects were not directly verified. |
| `20260426090000_pipeline_article_candidates.sql` | `pipeline_article_candidates` table, indexes, RLS, service-role policies. | Not app-visible through public routes. Not directly verified. |
| `20260426120000_signal_posts_public_depth_pool.sql` | `rank` check widened to 1-20 and live Top 5 uniqueness index. | Not directly verifiable through public routes. |
| `20260426143000_signal_posts_why_it_matters_quality_gate.sql` | WITM validation columns, defaults, not-null constraints, row backfill, status check. | WITM validation columns are not reported missing by app schema preflight, so the columns appear present. Constraints/defaults/backfill were not directly verified. |
| `20260430100000_signal_posts_final_slate_composer.sql` | `final_slate_rank`, `final_slate_tier`, placement constraints, final-slate rank index. | `final_slate_rank` and `final_slate_tier` are reported missing. |
| `20260430110000_signal_posts_editorial_card_controls.sql` | editorial decision/reason/replacement/reviewer fields and constraints. | All introduced columns are reported missing. |
| `20260430120000_published_slates_minimal_audit_history.sql` | `published_slates`, `published_slate_items`, indexes, RLS, service-role policies. | Not visible through public routes. Dry-run says the migration is pending. Direct verification was unavailable. |

## PRD-53 schema status

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

Production audit tables were not directly verified:

- `published_slates`
- `published_slate_items`

Because the audit migration is still pending in the dry-run, the safe assumption is that the audit tables are not aligned until directly proven otherwise.

## Drift diagnosis

Verified facts:

- The linked project is active and healthy.
- Production serves app commit `8f486f1`.
- Production still reports the missing PRD-53 `signal_posts` columns listed above.
- `supabase db push --dry-run --linked` reports seven pending migrations.
- The seven pending migrations include four earlier non-PRD-53 migrations and three PRD-53 migrations.
- Two earlier pending migrations include `update public.signal_posts` row-update/backfill behavior.
- Direct `supabase migration list --linked` did not complete because the CLI temp role hit authentication failures and circuit-breaker blocking.
- No production migration, migration repair, `draft_only`, publish, cron, or row mutation was run.

Most likely cause:

```text
2. Some migrations were manually applied but not recorded in Supabase migration history,
combined with
1. Production is genuinely missing at least the three PRD-53 migrations.
```

Evidence for that diagnosis:

- The dry-run says `20260424083000` and `20260426143000` are pending in migration history.
- The production app schema preflight does not report missing `briefing_date`, `is_live`, or WITM validation columns, which those earlier pending migrations introduced.
- The same app schema preflight does report missing PRD-53 final-slate and editorial-decision columns.

Unverified and requiring database-owner review:

- Whether `20260424083000` constraints, indexes, and row backfill effects are fully present.
- Whether `20260426143000` defaults, not-null constraints, status check, and row backfill effects are fully present.
- Whether `pipeline_article_candidates` exists with expected indexes, RLS, and service-role policies.
- Whether the public-depth rank constraint/index migration is present.
- Whether `published_slates` and `published_slate_items` exist.
- Whether Supabase migration-history rows were skipped intentionally or omitted by manual SQL application.

## Recommended remediation path

Recommended path: Path D - create an explicit DBA/operator runbook.

Reason:

- The safe path is not to apply all pending migrations blindly.
- The safe path is not to repair migration history blindly.
- Earlier pending migrations include DML/backfill behavior and must be separately reviewed.
- Direct schema verification was incomplete in this run because CLI migration listing hit auth/circuit-breaker failures and no database password was available.

Required authorization gate for the next run:

```text
CONTROLLED_PRODUCTION_MIGRATION_HISTORY_REPAIR_OR_APPLY_APPROVED=true
```

The next authorization should explicitly state whether it allows:

- read-only direct production schema inspection,
- migration-history repair for proven already-applied migrations,
- applying earlier out-of-scope migrations that include row updates/backfills,
- applying the PRD-53 additive schema migrations after earlier drift is resolved.

Recommended operator sequence for the next run:

1. Use a single Supabase CLI command at a time.
2. Provide the production database password or approved database-owner access, without committing it to the repo.
3. Read remote migration history:

```bash
supabase migration list --linked --workdir <worktree>
```

4. Run read-only schema verification for each pending migration's objects, constraints, indexes, and policies.
5. If earlier migration effects are fully present, repair only those exact migration-history rows:

```bash
supabase migration repair 20260424083000 20260426143000 --status applied --linked --workdir <worktree>
```

Only include versions that are proven already applied.

6. If an earlier pending migration is genuinely missing, get separate authorization before applying it, especially if it contains row updates/backfills.
7. After earlier drift is resolved, rerun:

```bash
supabase db push --dry-run --linked --workdir <worktree>
```

8. Proceed only when the pending set is limited to safe, understood, authorized migrations.
9. Apply migrations only in the later authorized run.
10. Rerun production schema preflight and then rerun the second controlled cycle from latest `main`.

What must not be done:

- Do not run `supabase db push` while the seven-migration pending set is unresolved.
- Do not run `supabase migration repair` without proving the target migration effects already exist.
- Do not run direct row-changing SQL as a shortcut.
- Do not run `draft_only`, controlled publish, cron, or MVP measurement until schema alignment and the second controlled cycle are complete.

Rollback and recovery considerations:

- Migration repair changes migration history; it should be treated as a database-owner action and documented with before/after migration lists.
- Re-running DML/backfill migrations can rewrite existing production rows. Earlier DML migrations need explicit row-update authorization and a recovery plan before execution.
- PRD-53 additive schema migrations are lower risk, but should not be applied through the broad pending set until earlier migration-history drift is resolved.

## Commands run

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
git fetch origin main --prune
git rev-parse origin/main
git branch --list codex/prd-53-migration-history-drift-diagnosis
git ls-remote --heads origin codex/prd-53-migration-history-drift-diagnosis
git worktree add /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-migration-history-drift-diagnosis -b codex/prd-53-migration-history-drift-diagnosis origin/main
sed -n '1,220p' AGENTS.md
sed -n '1,220p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,220p' docs/engineering/protocols/prd-template.md
sed -n '1,260p' docs/engineering/protocols/release-machine.md
sed -n '1,260p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,260p' docs/operations/controlled-cycles/2026-04-30-prd-53-applied-schema-alignment-and-cycle-rerun.md
sed -n '1,220p' docs/operations/tracker-sync/2026-04-30-prd-53-applied-schema-alignment-and-cycle-rerun.md
sed -n '1,260p' supabase/migrations/20260424083000_signal_posts_historical_archive.sql
sed -n '1,260p' supabase/migrations/20260426090000_pipeline_article_candidates.sql
sed -n '1,260p' supabase/migrations/20260426120000_signal_posts_public_depth_pool.sql
sed -n '1,260p' supabase/migrations/20260426143000_signal_posts_why_it_matters_quality_gate.sql
sed -n '1,260p' supabase/migrations/20260430100000_signal_posts_final_slate_composer.sql
sed -n '1,260p' supabase/migrations/20260430110000_signal_posts_editorial_card_controls.sql
sed -n '1,260p' supabase/migrations/20260430120000_published_slates_minimal_audit_history.sql
find supabase -maxdepth 3 -type f | sort
find supabase/.temp -maxdepth 1 -type f -print 2>/dev/null | sort || true
rg -n "supabase/.temp|\\.temp" .gitignore supabase -S
sed -n '1,260p' supabase/schema.sql
rg -n "migration repair|supabase migration|db push|schema drift|migration-history|migration history|Supabase" docs scripts supabase -S
ls -la .env* 2>/dev/null || true
supabase --version
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-migration-history-drift-diagnosis
supabase projects list --output json
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-migration-history-drift-diagnosis
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-migration-history-drift-diagnosis
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-migration-history-drift-diagnosis
curl -L -sS -o /tmp/bootup-drift-home.html -w '%{http_code} %{url_effective}\n' https://bootupnews.vercel.app/
curl -L -sS -o /tmp/bootup-drift-signals.html -w '%{http_code} %{url_effective}\n' https://bootupnews.vercel.app/signals
curl -L -sS -o /tmp/bootup-drift-cron.txt -w '%{http_code} %{url_effective}\n' https://bootupnews.vercel.app/api/cron/fetch-news
rg -o 'sentry-release=[^,&"]+|signal_posts schema preflight failed\.[^<"]+|published_slate audit schema preflight failed\.[^<"]+|Missing expected columns: [^<"]+|0 signals|Published Signals are not available yet|Daily Executive Briefing|Today • [^<]+' /tmp/bootup-drift-home.html /tmp/bootup-drift-signals.html /tmp/bootup-drift-cron.txt
node scripts/prod-check.js https://bootupnews.vercel.app
sed -n '1,140p' src/lib/signals-editorial.ts
sed -n '340,570p' src/lib/signals-editorial.ts
sed -n '1,220p' docs/engineering/change-records/2026-04-27-signal-posts-schema-preflight-remediation.md
sed -n '1,140p' docs/engineering/SIGNAL_POSTS_OPERATIONAL_CONTRACT.md
sed -n '1,260p' docs/engineering/change-records/2026-04-24-editorial-historical-signals-governance-mapping.md
sed -n '1,220p' docs/engineering/change-records/2026-04-26-signal-post-public-depth-migration.md
sed -n '1,220p' docs/engineering/change-records/2026-04-26-why-it-matters-quality-gate-remediation.md
sed -n '1,220p' docs/engineering/change-records/2026-04-26-pipeline-article-candidates.md
sed -n '1,220p' supabase/migrations/20260423090000_signals_admin_editorial_layer.sql
sed -n '1,220p' supabase/migrations/20260423120000_signal_posts_structured_editorial_payload.sql
sed -n '1,220p' supabase/migrations/20260416200404_prd_13_signal_filtering_columns.sql
sed -n '1,220p' supabase/migrations/20260421120000_v1_account_controls.sql
supabase migration repair --help
supabase migration list --help
supabase db push --help
date -u '+%Y-%m-%dT%H:%M:%SZ'
date '+%Y-%m-%d %H:%M:%S %Z'
env | cut -d= -f1 | rg 'CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED|CONTROLLED_PRODUCTION_PUBLISH_APPROVED|SUPABASE|VERCEL|PRODUCTION_BASE_URL|PIPELINE' || true
git diff --check
python3 scripts/validate-feature-system-csv.py
npm run lint
df -h .
find /Users/bm/dev/worktrees -maxdepth 2 -type d -name node_modules -print
cmp -s package.json /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/package.json
cmp -s package-lock.json /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/package-lock.json
ln -s /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/node_modules node_modules
npm run lint
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-migration-history-drift-diagnosis --pr-title "PRD-53 migration-history drift diagnosis"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-migration-history-drift-diagnosis --pr-title "PRD-53 migration-history drift diagnosis"
```

## Local validation results

| Command | Result |
| --- | --- |
| `git diff --check` | Passed. |
| `python3 scripts/validate-feature-system-csv.py` | Passed with pre-existing PRD slug warnings for PRD-32, PRD-37, and PRD-38. |
| `npm run lint` | First attempt failed because this fresh worktree had no local `node_modules` and `eslint` was unavailable. |
| `npm run lint` after linking a matching dependency tree | Passed after confirming `package.json` and `package-lock.json` matched `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment`. |
| `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-migration-history-drift-diagnosis --pr-title "PRD-53 migration-history drift diagnosis"` | Passed. Classified as docs-only baseline. |
| `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-migration-history-drift-diagnosis --pr-title "PRD-53 migration-history drift diagnosis"` | Passed. Classified as docs-only baseline. |

`npm install` was not run because the local filesystem had about 227 MB available. A matching existing dependency tree was used for lint only after confirming the package files matched.

## Commands intentionally not run

| Command or action | Reason |
| --- | --- |
| `supabase db push --linked` | Explicitly out of scope; dry-run pending set is unresolved and includes earlier DML migrations. |
| `supabase migration repair` | Explicitly out of scope; direct schema proof is incomplete. |
| Direct production SQL | Explicitly out of scope; no row-changing or schema-changing SQL allowed. |
| Production `draft_only` | Schema alignment remains unresolved. |
| Controlled publish | Production publish was not authorized and schema remains blocked. |
| Cron | Explicitly out of scope; cron endpoint remained HTTP 401 unauthorized. |
| Pipeline write-mode | Explicitly out of scope. |
| MVP measurement instrumentation | Blocked until the second controlled cycle succeeds. |
| `npm run test` | Docs-only change; no code changed. |
| `npm run build` | Docs-only change; no code changed. |

## Confirmation of no production mutation

- No production migration apply was run.
- No migration-history repair was run.
- No direct production SQL was run.
- No production rows were changed.
- No `draft_only` was run.
- No production publish was attempted.
- No cron was run or re-enabled.

## Result

`migration_history_drift_requires_database_owner_review`

The drift cause is partially identified:

- The linked project reports seven pending migrations.
- App-visible production schema suggests some earlier `signal_posts` migration effects are already present even though those migrations are pending in Supabase migration history.
- PRD-53 schema is genuinely missing at least the app-visible final-slate/editorial columns.

The diagnosis is not complete enough to repair or apply migrations automatically because direct remote migration listing and full schema comparison were not available in this run.

## Exact next task

Run an authorized database-owner migration-history review.

The next task should:

1. Provide safe database-owner access for read-only migration-history and schema inspection.
2. Verify each pending migration's actual production effects.
3. Repair migration history only for migrations proven already applied.
4. Separately authorize any earlier DML/backfill migration that is truly missing.
5. Re-run the migration dry-run until the pending set is safe and understood.
6. Apply the PRD-53 additive schema migrations only after earlier drift is resolved.
7. Verify production schema preflight.
8. Rerun the second controlled cycle from latest `main`.

Do not move to MVP measurement until the controlled cycle succeeds.
