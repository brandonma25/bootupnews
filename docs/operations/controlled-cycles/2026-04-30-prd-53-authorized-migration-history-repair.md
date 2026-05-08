# PRD-53 Authorized Migration History Repair

Date: 2026-04-30
Branch: `codex/prd-53-authorized-migration-history-repair`
Readiness label: `ready_for_authorized_prd_53_schema_apply`

## Effective Change Type

Remediation / alignment under the approved PRD-53 Signals admin editorial workflow.

This packet records a scoped production Supabase migration-history repair. It does not create a feature, create a PRD, apply production schema migrations, run DDL, run application-table DML, read or mutate application rows, run `draft_only`, publish, run cron, or start MVP measurement.

Object level: Surface Placement and Card read-model storage in legacy `public.signal_posts`, plus internal publish audit tables. `signal_posts` remains legacy/runtime naming for editorial/public placement storage, not canonical Signal identity.

## Source Of Truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

- `docs/operations/controlled-cycles/2026-04-30-prd-53-catalog-access-confirmed-inspection.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-catalog-access-confirmed-inspection.md`
- Prior PRD-53 schema/migration diagnostic packets from PR #158 through PR #166.

## Why This Repair Was Authorized

PR #166 verified through stable read-only catalog inspection that the four earlier out-of-scope migrations were absent from Supabase migration history even though their catalog-visible schema effects were already present in production.

PR #166 also verified that the three PRD-53 additive migrations were absent from migration history and their schema objects were genuinely missing.

The approved next action was therefore to repair migration history for only the four already-catalog-present earlier migrations, then stop after confirming that `supabase db push --dry-run --linked` narrows to only the three expected PRD-53 additive schema migrations.

## Workspace Baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair` |
| Branch | `codex/prd-53-authorized-migration-history-repair` |
| Starting commit | `ccbffdbc046a7f940964ac1cd5f01ce2818e3bbb` |
| Commit description | `Merge pull request #166 from brandonma25/codex/prd-53-catalog-access-confirmed-inspection` |
| UTC capture time | `2026-05-01T02:36:17Z` |
| Local capture time | `2026-05-01 10:36:17 CST` |
| Production project ref | `fwkqjeumreaznfhnlzev` |
| Production app URL | `https://daily-intelligence-aggregator-ybs9.vercel.app` |

The canonical checkout at `/Users/bm/dev/daily-intelligence-aggregator` remained on its existing branch and was not disturbed. This repair used the dedicated worktree above.

## Authorization

Prompt-level authorization present:

- `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true`
- `CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true`
- `CONTROLLED_PRODUCTION_CATALOG_READONLY_INSPECTION_APPROVED=true`

Prompt-level authorization absent:

- `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true`
- `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true`
- `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true`

The shell did not export these variables as environment variables, so the approval basis was the explicit operator prompt. No secrets, database passwords, connection strings, browser cookies, API tokens, or session data were printed, echoed, logged, persisted into docs, or committed.

## Authorized Repair Set

Only these four earlier migration versions were repaired:

| Version | Migration | Eligibility basis |
| --- | --- | --- |
| `20260424083000` | `signal_posts_historical_archive.sql` | PR #166 showed catalog-visible schema effects present and migration history absent. The local SQL includes backfill/update behavior, so re-applying it blindly was out of scope. |
| `20260426090000` | `pipeline_article_candidates.sql` | PR #166 showed the table, indexes, RLS, and service-role policies present and migration history absent. |
| `20260426120000` | `signal_posts_public_depth_pool.sql` | PR #166 showed the widened rank constraint and live top-rank index present and migration history absent. |
| `20260426143000` | `signal_posts_why_it_matters_quality_gate.sql` | PR #166 showed WITM validation columns and constraints present and migration history absent. The local SQL includes backfill/update behavior, so re-applying it blindly was out of scope. |

These versions were not repaired:

- `20260430100000`
- `20260430110000`
- `20260430120000`

They are the expected PRD-53 additive schema migrations and must remain pending until a separate prompt explicitly authorizes schema migration apply.

## Commands Run

Workspace and source-of-truth inspection:

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
git fetch origin main
git worktree add /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair -b codex/prd-53-authorized-migration-history-repair origin/main
sed -n '1,220p' AGENTS.md
sed -n '1,220p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,220p' docs/engineering/protocols/prd-template.md
sed -n '1,220p' docs/engineering/protocols/release-machine.md
sed -n '1,240p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,220p' docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md
sed -n '1,620p' docs/operations/controlled-cycles/2026-04-30-prd-53-catalog-access-confirmed-inspection.md
sed -n '1,260p' docs/operations/tracker-sync/2026-04-30-prd-53-catalog-access-confirmed-inspection.md
```

Supabase project and local migration inspection:

```bash
supabase --version
supabase projects list --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair
ls -1 supabase/migrations
rg -n "^(alter table|create table|create index|create unique index|create policy|update |insert |delete |drop |create trigger|create function|create type|alter policy|drop index|add constraint)" <seven pending migration files>
```

Pre-repair inventory:

```bash
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair
supabase db query "<read-only migration-history status select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair --output table
supabase db query "<read-only catalog eligibility select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair --output table
```

Authorized migration-history repair:

```bash
supabase migration repair 20260424083000 --status applied --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair
supabase migration repair 20260426090000 --status applied --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair
supabase migration repair 20260426120000 --status applied --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair
supabase migration repair 20260426143000 --status applied --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair
```

Post-repair verification:

```bash
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair
supabase db query "<read-only migration-history status select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-migration-history-repair --output table
```

Public safety verification:

```bash
python3 - <<'PY'
from urllib.request import Request, urlopen
routes = ['/', '/signals']
base = 'https://daily-intelligence-aggregator-ybs9.vercel.app'
for route in routes:
    req = Request(base + route, headers={'User-Agent': 'codex-public-safety-smoke/1.0'})
    with urlopen(req, timeout=20) as resp:
        body = resp.read().decode('utf-8', errors='replace')
        print(route, {
            'status': resp.status,
            'has_schema_preflight_error': 'signal_posts schema preflight failed' in body,
            'has_final_slate_rank': 'final_slate_rank' in body,
            'has_final_slate_tier': 'final_slate_tier' in body,
            'has_editorial_decision': 'editorial_decision' in body,
            'has_published_signals': 'Published Signals' in body,
            'has_top5_core': 'Top 5 Core Signals' in body,
            'has_next2_context': 'Next 2 Context Signals' in body,
        })
PY
```

One extra post-repair PRD-53 catalog probe hit Supabase temporary-role authentication circuit breaker retries and was stopped. The successful post-repair migration-history query and dry-run had already verified the required repair result.

## Pre-Repair Migration State

`supabase migration list --linked` showed:

| Version | Remote status |
| --- | --- |
| `20260416200404` | Recorded |
| `20260421120000` | Recorded |
| `20260423090000` | Recorded |
| `20260423120000` | Recorded |
| `20260424083000` | Missing |
| `20260426090000` | Missing |
| `20260426120000` | Missing |
| `20260426143000` | Missing |
| `20260430100000` | Missing |
| `20260430110000` | Missing |
| `20260430120000` | Missing |

`supabase db push --dry-run --linked` showed exactly seven pending migrations:

1. `20260424083000_signal_posts_historical_archive.sql`
2. `20260426090000_pipeline_article_candidates.sql`
3. `20260426120000_signal_posts_public_depth_pool.sql`
4. `20260426143000_signal_posts_why_it_matters_quality_gate.sql`
5. `20260430100000_signal_posts_final_slate_composer.sql`
6. `20260430110000_signal_posts_editorial_card_controls.sql`
7. `20260430120000_published_slates_minimal_audit_history.sql`

The pre-repair read-only migration-history query confirmed all seven were absent from `supabase_migrations.schema_migrations`.

## Repair Command Result

The four authorized one-by-one repair commands succeeded:

| Version | Repair result |
| --- | --- |
| `20260424083000` | `Repaired migration history: [20260424083000] => applied` |
| `20260426090000` | `Repaired migration history: [20260426090000] => applied` |
| `20260426120000` | `Repaired migration history: [20260426120000] => applied` |
| `20260426143000` | `Repaired migration history: [20260426143000] => applied` |

No PRD-53 migration versions were repaired.

## Post-Repair Migration State

`supabase migration list --linked` showed:

| Version | Remote status |
| --- | --- |
| `20260416200404` | Recorded |
| `20260421120000` | Recorded |
| `20260423090000` | Recorded |
| `20260423120000` | Recorded |
| `20260424083000` | Recorded |
| `20260426090000` | Recorded |
| `20260426120000` | Recorded |
| `20260426143000` | Recorded |
| `20260430100000` | Missing |
| `20260430110000` | Missing |
| `20260430120000` | Missing |

Read-only migration-history query confirmed:

| Version | Migration-history status |
| --- | --- |
| `20260424083000` | Recorded |
| `20260426090000` | Recorded |
| `20260426120000` | Recorded |
| `20260426143000` | Recorded |
| `20260430100000` | Absent |
| `20260430110000` | Absent |
| `20260430120000` | Absent |

## Post-Repair Dry-Run Result

`supabase db push --dry-run --linked` showed exactly three pending migrations:

1. `20260430100000_signal_posts_final_slate_composer.sql`
2. `20260430110000_signal_posts_editorial_card_controls.sql`
3. `20260430120000_published_slates_minimal_audit_history.sql`

The earlier DML/backfill migrations no longer appear in dry-run output. No unexpected migration remains pending.

## Public Safety Verification

Production app URL: `https://daily-intelligence-aggregator-ybs9.vercel.app`

| Route | HTTP status | Public raw schema error exposed | Missing PRD-53 column names exposed | Public expected markers |
| --- | --- | --- | --- | --- |
| `/` | `200` | No | No | Public hotfix surface remains safe. |
| `/signals` | `200` | No | No | `Published Signals`, `Top 5 Core Signals`, and `Next 2 Context Signals` were present. |

No admin action was run and no publish path was exercised.

Cron status: no cron command was run, no cron configuration was changed, and this branch did not re-enable or trigger cron. The prior operational cron-blocked state remains unchanged by this repair.

## Production Mutation Confirmation

Authorized mutation performed:

- Supabase migration-history repair only for `20260424083000`, `20260426090000`, `20260426120000`, and `20260426143000`.

Not performed:

- No `supabase db push` was run.
- No PRD-53 schema migration was applied.
- No production schema migration was applied.
- No DDL was run.
- No application-table DML was run.
- No application row contents were read.
- No application rows were mutated.
- No `draft_only` command was run.
- No pipeline write-mode was run.
- No production publish was attempted.
- No cron command was run.
- No MVP measurement was started.

## Commands Intentionally Not Run

- `supabase db push --linked`
- DDL
- application-table DML
- application row reads
- application row mutation
- `draft_only`
- production publish
- cron
- MVP measurement instrumentation
- final launch-readiness QA
- Phase 2 architecture
- personalization

## Validation

Validation commands run:

```bash
git diff --check
python3 scripts/validate-feature-system-csv.py
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-authorized-migration-history-repair --pr-title "PRD-53 authorized migration history repair"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-authorized-migration-history-repair --pr-title "PRD-53 authorized migration history repair"
```

Results:

- `git diff --check`: passed.
- `python3 scripts/validate-feature-system-csv.py`: passed with pre-existing PRD slug warnings.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local ...`: passed as docs-only / baseline.
- `python3 scripts/release-governance-gate.py --diff-mode local ...`: passed as docs-only with valid CSV schema and PRD/CSV consistency.

Commands not run:

- `npm run lint`: not run because `node_modules` is not present in this worktree and this is a docs-only change.
- `npm run test`: not run because no code changed.
- `npm run build`: not run because no code changed.

## Result

```text
ready_for_authorized_prd_53_schema_apply
```

Migration-history repair is complete for the four earlier already-catalog-present migrations. The pending set is now narrowed to exactly the three expected PRD-53 additive schema migrations.

## Exact Next Task

Only after this PR is reviewed and merged, the next separate authorized task is PRD-53 additive schema apply.

That future prompt must explicitly include:

```text
CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true
```

The future schema-apply run should begin with:

```bash
supabase migration list --linked --workdir <worktree>
supabase db push --dry-run --linked --workdir <worktree>
```

It must verify that only these three migrations are pending before any apply:

```text
20260430100000_signal_posts_final_slate_composer.sql
20260430110000_signal_posts_editorial_card_controls.sql
20260430120000_published_slates_minimal_audit_history.sql
```

Do not run `draft_only`, publish, cron, MVP measurement, or any public launch-readiness workflow in the same prompt unless explicitly authorized.
