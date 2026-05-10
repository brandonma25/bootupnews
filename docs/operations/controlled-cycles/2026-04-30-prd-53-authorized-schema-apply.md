# PRD-53 Authorized Schema Apply

Date: 2026-04-30
Branch: `codex/prd-53-authorized-schema-apply`
Readiness label: `ready_for_second_controlled_cycle_rerun`

## Effective Change Type

Remediation / alignment under the approved PRD-53 Signals admin editorial workflow.

This packet records the authorized production Supabase schema apply for the three committed PRD-53 additive migrations. It does not create a feature, create a PRD, run migration-history repair, apply earlier out-of-scope migrations, run direct SQL, run ad hoc DDL, read or mutate application rows, run `draft_only`, publish, run cron, or start MVP measurement.

Object level: Surface Placement and Card read-model storage in legacy `public.signal_posts`, plus internal publish audit tables. `signal_posts` remains legacy/runtime naming for editorial/public placement storage, not canonical Signal identity.

## Source Of Truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

- `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-migration-history-repair.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-authorized-migration-history-repair.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-catalog-access-confirmed-inspection.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-catalog-access-confirmed-inspection.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`
- `docs/engineering/change-records/prd-53-minimal-published-slate-audit-history.md`

## Why This Apply Was Authorized

PR #167 repaired production Supabase migration history for the four earlier already-catalog-present migrations:

- `20260424083000`
- `20260426090000`
- `20260426120000`
- `20260426143000`

After that repair, `supabase db push --dry-run --linked` showed only the three expected PRD-53 additive schema migrations pending. The approved next action was therefore to apply only those three committed migrations, verify production schema readiness, and stop before `draft_only`, publish, cron, or MVP measurement.

## Workspace Baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-schema-apply` |
| Branch | `codex/prd-53-authorized-schema-apply` |
| Starting commit | `3ccef8c9aefa676c66e3e81005850f4838806937` |
| Commit description | `Merge pull request #167 from brandonma25/codex/prd-53-authorized-migration-history-repair` |
| UTC capture time | `2026-05-01T03:10:19Z` |
| Local capture time | `2026-05-01 11:10:19 CST` |
| Production project ref | `fwkqjeumreaznfhnlzev` |
| Production app URL | `https://bootupnews.vercel.app` |
| Supabase CLI version | `2.90.0` |

The canonical checkout at `/Users/bm/dev/daily-intelligence-aggregator` remained on its existing branch and was not disturbed. This apply used the dedicated worktree above.

## Authorization

Prompt-level authorization present:

- `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true`
- `CONTROLLED_PRODUCTION_SCHEMA_READONLY_INSPECTION_APPROVED=true`
- `CONTROLLED_PRODUCTION_CATALOG_READONLY_INSPECTION_APPROVED=true`

Prompt-level authorization absent:

- `CONTROLLED_PRODUCTION_MIGRATION_REPAIR_APPROVED=true`
- `CONTROLLED_PRODUCTION_EARLIER_MIGRATIONS_WITH_DML_APPROVED=true`
- `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true`

The shell did not export these variables as environment variables, so the approval basis was the explicit operator prompt. No secrets, database passwords, connection strings, browser cookies, API tokens, or session data were printed, echoed, logged, persisted into docs, or committed.

## Authorized Apply Set

Only these three committed PRD-53 additive schema migrations were applied:

| Version | Migration | Purpose | DML / row mutation |
| --- | --- | --- | --- |
| `20260430100000` | `signal_posts_final_slate_composer.sql` | Adds final-slate placement columns, constraints, and unique rank index to `public.signal_posts`. | No |
| `20260430110000` | `signal_posts_editorial_card_controls.sql` | Adds editorial decision, reason, replacement, and reviewer columns plus constraints to `public.signal_posts`. | No |
| `20260430120000` | `published_slates_minimal_audit_history.sql` | Adds internal published-slate audit tables, indexes, RLS, and service-role policies. | No |

These were not authorized and were not run:

- migration-history repair,
- earlier out-of-scope migration apply,
- direct SQL or ad hoc DDL,
- application-table DML outside the committed migrations,
- application row reads,
- application row mutation,
- `draft_only`,
- production publish,
- cron,
- MVP measurement.

## Commands Run

Workspace and source-of-truth inspection:

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
gh pr checks 167
gh pr view 167 --json number,state,mergeable,headRefName,headRefOid,baseRefName,url
gh pr merge 167 --merge --delete-branch=false
gh pr view 167 --json number,state,mergeCommit,mergedAt,url
git fetch origin main
git worktree add /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-schema-apply -b codex/prd-53-authorized-schema-apply origin/main
sed -n '1,220p' AGENTS.md
sed -n '1,220p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,220p' docs/engineering/protocols/prd-template.md
sed -n '1,220p' docs/engineering/protocols/release-machine.md
sed -n '1,240p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,220p' docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md
sed -n '1,360p' docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-migration-history-repair.md
sed -n '1,220p' docs/operations/tracker-sync/2026-04-30-prd-53-authorized-migration-history-repair.md
```

Supabase project and migration inspection:

```bash
supabase --version
supabase db push --help
supabase projects list --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-schema-apply
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-schema-apply
ls -1 supabase/migrations
rg -n "^(alter table|create table|create index|create unique index|create policy|update |insert |delete |drop |create trigger|create function|create type|alter policy|drop index|add constraint)" <three PRD-53 migration files>
```

Pre-apply inventory:

```bash
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-schema-apply
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-schema-apply
```

Authorized schema apply:

```bash
supabase db push --linked --yes --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-schema-apply
```

Post-apply verification:

```bash
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-schema-apply
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-schema-apply
supabase db query "<read-only PRD-53 catalog verification select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-schema-apply --output table
```

Public and admin safety checks:

```bash
python3 - <<'PY'
from urllib.request import Request, urlopen
base = 'https://bootupnews.vercel.app'
routes = ['/', '/signals', '/dashboard/signals/editorial-review']
needles = ['signal_posts schema preflight failed', 'published_slate audit schema preflight failed', 'final_slate_rank', 'final_slate_tier', 'editorial_decision', 'reviewed_at']
for route in routes:
    req = Request(base + route, headers={'User-Agent': 'codex-schema-apply-smoke/1.0'})
    with urlopen(req, timeout=30) as resp:
        body = resp.read().decode('utf-8', errors='replace')
        print(route)
        print('  status:', resp.status)
        for needle in needles:
            print(f'  has {needle!r}:', needle in body)
        if route == '/signals':
            for marker in ['Published Signals', 'Top 5 Core Signals', 'Next 2 Context Signals']:
                print(f'  has {marker!r}:', marker in body)
        if route == '/dashboard/signals/editorial-review':
            for marker in ['Admin sign-in required', 'Signals Final-Slate Composer', 'Publish Final Slate', 'Sign in']:
                print(f'  has {marker!r}:', marker in body)
PY

python3 - <<'PY'
from urllib.request import Request, urlopen
from urllib.error import HTTPError
url = 'https://bootupnews.vercel.app/api/cron/fetch-news'
req = Request(url, headers={'User-Agent': 'codex-cron-disabled-smoke/1.0'})
try:
    with urlopen(req, timeout=20) as resp:
        print('status:', resp.status)
        body = resp.read().decode('utf-8', errors='replace')
        print('body_prefix:', body[:120].replace('\n', ' '))
except HTTPError as exc:
    body = exc.read().decode('utf-8', errors='replace')
    print('status:', exc.code)
    print('body_prefix:', body[:120].replace('\n', ' '))
PY
```

Browser check:

- Opened Chrome to attempt a non-mutating admin route check.
- The browser did not provide reliable authenticated admin evidence, so it was not used as schema-readiness proof.

## Pre-Apply Migration State

`supabase migration list --linked` showed the first eight migration versions recorded on remote and these three PRD-53 versions missing:

| Version | Remote status before apply |
| --- | --- |
| `20260430100000` | Missing |
| `20260430110000` | Missing |
| `20260430120000` | Missing |

`supabase db push --dry-run --linked` showed exactly these three pending migrations:

1. `20260430100000_signal_posts_final_slate_composer.sql`
2. `20260430110000_signal_posts_editorial_card_controls.sql`
3. `20260430120000_published_slates_minimal_audit_history.sql`

No earlier migration and no unexpected migration remained pending.

## Apply Result

The authorized `supabase db push --linked --yes` command applied exactly the three PRD-53 migrations:

1. `20260430100000_signal_posts_final_slate_composer.sql`
2. `20260430110000_signal_posts_editorial_card_controls.sql`
3. `20260430120000_published_slates_minimal_audit_history.sql`

The apply completed with `Finished supabase db push.`

The only notices were idempotent `drop constraint if exists` / `drop policy if exists` notices for objects that did not exist before the additive migration created the replacement constraints and policies.

## Post-Apply Migration State

`supabase migration list --linked` showed all eleven local migrations recorded on remote:

| Version | Remote status after apply |
| --- | --- |
| `20260416200404` | Recorded |
| `20260421120000` | Recorded |
| `20260423090000` | Recorded |
| `20260423120000` | Recorded |
| `20260424083000` | Recorded |
| `20260426090000` | Recorded |
| `20260426120000` | Recorded |
| `20260426143000` | Recorded |
| `20260430100000` | Recorded |
| `20260430110000` | Recorded |
| `20260430120000` | Recorded |

`supabase db push --dry-run --linked` returned:

```text
Remote database is up to date.
```

No pending migrations remain.

## PRD-53 Schema Verification

Read-only catalog verification against metadata only showed all expected PRD-53 objects present:

| Object type | Object | Present |
| --- | --- | --- |
| column | `signal_posts.final_slate_rank` | Yes |
| column | `signal_posts.final_slate_tier` | Yes |
| column | `signal_posts.editorial_decision` | Yes |
| column | `signal_posts.decision_note` | Yes |
| column | `signal_posts.rejected_reason` | Yes |
| column | `signal_posts.held_reason` | Yes |
| column | `signal_posts.replacement_of_row_id` | Yes |
| column | `signal_posts.reviewed_by` | Yes |
| column | `signal_posts.reviewed_at` | Yes |
| table | `published_slates` | Yes |
| table | `published_slate_items` | Yes |
| index | `signal_posts_briefing_date_final_slate_rank_key` | Yes |
| index | `published_slate_items_slate_rank_key` | Yes |
| index | `published_slate_items_signal_post_id_idx` | Yes |
| index | `published_slates_published_at_idx` | Yes |
| constraint | `signal_posts_final_slate_rank_check` | Yes |
| constraint | `signal_posts_final_slate_tier_check` | Yes |
| constraint | `signal_posts_final_slate_placement_check` | Yes |
| constraint | `signal_posts_editorial_decision_check` | Yes |
| constraint | `signal_posts_replacement_of_row_id_fkey` | Yes |
| policy | `published_slates` service-role read/write/delete policies | Yes |
| policy | `published_slate_items` service-role read/write/delete policies | Yes |

This establishes schema-layer readiness for the PRD-53 final-slate/admin workflow. Publish remains governed by final-slate readiness, explicit editor action, and separate production publish authorization.

## Public Safety Verification

Production app URL: `https://bootupnews.vercel.app`

| Route | HTTP status | Public raw schema error exposed | Missing PRD-53 column names exposed | Expected public markers |
| --- | --- | --- | --- | --- |
| `/` | `200` | No | No | Public hotfix surface remains safe. |
| `/signals` | `200` | No | No | `Published Signals`, `Top 5 Core Signals`, and `Next 2 Context Signals` were present. |

No public route exposed `signal_posts schema preflight failed`, `published_slate audit schema preflight failed`, `final_slate_rank`, `final_slate_tier`, `editorial_decision`, or `reviewed_at`.

## Admin Schema-Readiness Verification

Read-only catalog verification proves the PRD-53 schema objects required by the admin final-slate workflow now exist.

Unauthenticated browser/HTTP checks to `/dashboard/signals/editorial-review` returned HTTP 200 with the admin sign-in surface and did not expose schema-preflight errors or missing-column names. Because no authenticated admin browser session was reliably available to Codex, this run did not click through the authenticated composer, approve/reject/hold/replace any row, or exercise publish.

Admin schema readiness is therefore verified at the schema/catalog layer. Functional admin workflow execution remains the next controlled-cycle task and still requires explicit non-publish or publish authorization as applicable.

## Cron Status

No cron command was run and no cron configuration was changed.

An unauthenticated production request to `/api/cron/fetch-news` returned HTTP `401` with `Unauthorized`, so the cron endpoint was not executed during this verification.

## Production Mutation Confirmation

Authorized production mutation performed:

- `supabase db push --linked --yes` applied the three committed PRD-53 additive schema migrations.

Not performed:

- No migration-history repair was run.
- No earlier out-of-scope migration was applied.
- No direct SQL was run.
- No ad hoc DDL was run.
- No application-table DML was run outside the committed migrations.
- No application row contents were read.
- No application rows were mutated.
- No `draft_only` command was run.
- No pipeline write-mode was run.
- No production publish was attempted.
- No cron command was run.
- No MVP measurement was started.

## Commands Intentionally Not Run

- `supabase migration repair`
- direct SQL
- ad hoc DDL
- application-table DML
- application row reads
- application row mutation
- `draft_only`
- pipeline write-mode
- production publish
- authenticated admin mutation actions
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
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-authorized-schema-apply --pr-title "PRD-53 authorized schema apply"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-authorized-schema-apply --pr-title "PRD-53 authorized schema apply"
```

Results are recorded in this PR after validation.

Results:

- `git diff --cached --check`: passed.
- `python3 scripts/validate-feature-system-csv.py`: passed with pre-existing PRD slug warnings.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local ...`: passed as docs-only / baseline.
- `python3 scripts/release-governance-gate.py --diff-mode local ...`: passed as docs-only with valid CSV schema and PRD/CSV consistency.

Commands not run:

- `npm run lint`: not run because `node_modules` is not present in this worktree and this PR changes docs only.
- `npm run test`: not run because no application code changed in this branch.
- `npm run build`: not run because no application code changed in this branch.

## Result

```text
ready_for_second_controlled_cycle_rerun
```

PRD-53 schema alignment is complete at the migration-history, dry-run, and catalog-object levels. Public surfaces remain safe. No publish, `draft_only`, cron, or MVP measurement occurred.

## Exact Next Task

After this PR is reviewed and merged, rerun the second controlled PRD-53 cycle.

That next run must still avoid MVP measurement, final launch-readiness QA, and cron. It must not publish unless a later prompt explicitly includes production publish authorization.
