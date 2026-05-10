# PRD-53 Applied Schema Alignment And Cycle Rerun

Date: 2026-04-30
Branch: `codex/prd-53-apply-production-schema-alignment`
Readiness label: `production_schema_alignment_blocked`

## Effective change type

Remediation / alignment under the approved PRD-53 Signals admin editorial workflow.

This packet does not implement a new feature and does not create a new PRD.

## Source of truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

- `docs/operations/controlled-cycles/2026-04-30-prd-53-second-controlled-cycle.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-schema-alignment-and-second-cycle-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-schema-alignment-and-cycle-rerun.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-second-controlled-cycle.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-schema-alignment-and-second-cycle-rerun.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-authorized-schema-alignment-and-cycle-rerun.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`
- `docs/engineering/change-records/prd-53-minimal-published-slate-audit-history.md`

## Object level

This is Data Layer alignment for legacy/runtime `signal_posts` Surface Placement plus Card workflow fields and the internal published-slate audit tables.

It does not introduce canonical Signal identity, Story Cluster persistence, semantic clustering, personalization, a public archive, or the Phase 2 historical content model.

## Authorization gates

| Gate | Required variable | Status | Result |
| --- | --- | --- | --- |
| Production schema migration | `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` | Present in the task prompt | Migration dry-run was allowed. Real migration was blocked before apply. |
| Production publish | `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` | Absent | Publish not run. |

The production schema migration was not applied because the dry-run pending set was not limited to the expected committed additive PRD-53 migrations.

## Workspace baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-apply-production-schema-alignment` |
| Branch | `codex/prd-53-apply-production-schema-alignment` |
| Starting commit | `62b3fe4` |
| Commit description | `Merge pull request #156 from brandonma25/codex/prd-53-authorized-production-schema-alignment` |
| UTC capture time | `2026-04-30T06:05:46Z` |
| Local capture time | `2026-04-30 14:05:46 CST` |
| Production URL | `https://bootupnews.vercel.app` |

## Baseline production schema preflight

Read-only public route checks were run before migration inspection. No production rows were mutated.

| Check | Result |
| --- | --- |
| Homepage `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| Cron endpoint `/api/cron/fetch-news` | HTTP 401 unauthorized |
| Production app release marker | `62b3fe4b402f26a36cac47ef46368ec351d4aea3` |
| `signal_posts` PRD-53 schema status | Missing required PRD-53 additive columns |
| Published-slate audit table status | Not verifiable through public routes without service-role schema access |

The homepage still reports:

```text
signal_posts schema preflight failed. Missing expected columns: final_slate_rank, final_slate_tier, editorial_decision, decision_note, rejected_reason, held_reason, replacement_of_row_id, reviewed_by, reviewed_at.
```

`/signals` returned the public shell and did not expose candidate rows. The public page still reports that published Signals are not available yet.

The cron endpoint returned HTTP 401 unauthorized and was not run.

The standard production check failed because the homepage is degraded by the schema preflight and does not render the expected public briefing markers:

```text
production route probe failed for / with HTTP 200; missing markers: Why it matters, Details
```

## Committed PRD-53 migrations expected for this task

The expected PRD-53 schema additions are present in committed repo migrations.

| Migration | Expected purpose |
| --- | --- |
| `supabase/migrations/20260430100000_signal_posts_final_slate_composer.sql` | Adds `final_slate_rank`, `final_slate_tier`, final-slate placement constraints, and final-slate rank uniqueness. |
| `supabase/migrations/20260430110000_signal_posts_editorial_card_controls.sql` | Adds editorial decision/reason/replacement/reviewer fields and constraints. |
| `supabase/migrations/20260430120000_published_slates_minimal_audit_history.sql` | Adds `published_slates`, `published_slate_items`, indexes, RLS, and service-role policies. |

## Supabase project link

The dedicated worktree initially had no Supabase project link:

```text
Cannot find project ref. Have you run supabase link?
```

The Supabase account listed one active project:

```text
fwkqjeumreaznfhnlzev
```

The worktree was linked to that project using the repo-supported CLI flow:

```bash
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-apply-production-schema-alignment
```

This created local ignored Supabase metadata only. No production schema or production rows were changed by linking.

## Migration dry-run result

The migration dry-run was run:

```bash
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-apply-production-schema-alignment
```

Result:

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

This is not the expected safe pending set for this task. It includes four earlier migrations in addition to the three PRD-53 migrations.

Two of the earlier pending migrations include production row updates or backfill-like behavior:

| Migration | Blocking detail |
| --- | --- |
| `20260424083000_signal_posts_historical_archive.sql` | Includes `update public.signal_posts` and alters `briefing_date` / `is_live` to `not null`. |
| `20260426143000_signal_posts_why_it_matters_quality_gate.sql` | Includes `update public.signal_posts` and alters WITM validation fields to `not null`. |

The prompt allowed committed additive PRD-53 schema alignment only and explicitly prohibited production data backfill unless already safely defined and required. The dry-run shows migration-history drift or unapplied earlier migrations that must be resolved before this task can safely apply anything.

## Migration apply result

No migration was applied.

Reason:

- The pending migration set was not limited to the expected additive PRD-53 migrations.
- The pending set included earlier migrations outside this task scope.
- At least two earlier pending migrations include production row updates.

## Post-migration schema preflight

Not run, because no migration was applied.

## Second controlled cycle rerun status

The second controlled cycle was not rerun.

Reasons:

- Production schema preflight still fails.
- Production schema alignment is blocked by migration-history drift.
- Running `draft_only` would be unsafe while production schema is missing required columns.
- Production publish authorization is absent.

## Production publish status

No production publish was performed.

Reasons:

- `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` was absent.
- Production schema preflight still fails.
- No supported final-slate readiness cycle was rerun.

## Cron status

Cron remains unauthorized from the public route check:

```text
HTTP 401 from /api/cron/fetch-news
```

No cron run was performed and cron was not re-enabled.

## Commands run

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
git fetch origin main --prune
git branch --list codex/prd-53-apply-production-schema-alignment
git ls-remote --heads origin codex/prd-53-apply-production-schema-alignment
git ls-remote origin refs/heads/main
gh pr view 156 --json state,mergeCommit,mergedAt,title,url
git worktree add /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-apply-production-schema-alignment -b codex/prd-53-apply-production-schema-alignment origin/main
sed -n '1,220p' AGENTS.md
sed -n '1,380p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,220p' docs/engineering/protocols/prd-template.md
sed -n '1,260p' docs/engineering/protocols/release-machine.md
sed -n '1,260p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,220p' docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md
env | cut -d= -f1 | rg 'CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED|CONTROLLED_PRODUCTION_PUBLISH_APPROVED|SUPABASE|VERCEL|PRODUCTION_BASE_URL|PIPELINE'
sed -n '1,360p' docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-schema-alignment-and-cycle-rerun.md
sed -n '1,260p' supabase/migrations/20260430100000_signal_posts_final_slate_composer.sql
sed -n '1,260p' supabase/migrations/20260430110000_signal_posts_editorial_card_controls.sql
sed -n '1,320p' supabase/migrations/20260430120000_published_slates_minimal_audit_history.sql
sed -n '1,140p' src/lib/signals-editorial.ts
sed -n '360,530p' src/lib/signals-editorial.ts
date -u '+%Y-%m-%dT%H:%M:%SZ'
date '+%Y-%m-%d %H:%M:%S %Z'
gh variable list --repo brandonma25/daily-intelligence-aggregator
curl -L -sS -o /tmp/bootup-apply-schema-home-before.html -w '%{http_code} %{url_effective}\n' https://bootupnews.vercel.app/
curl -L -sS -o /tmp/bootup-apply-schema-signals-before.html -w '%{http_code} %{url_effective}\n' https://bootupnews.vercel.app/signals
curl -L -sS -o /tmp/bootup-apply-schema-cron-before.txt -w '%{http_code} %{url_effective}\n' https://bootupnews.vercel.app/api/cron/fetch-news
rg -o 'sentry-release=[^,&"]+|signal_posts schema preflight failed\.[^<"]+|published_slate audit schema preflight failed\.[^<"]+|Missing expected columns: [^<"]+|0 signals|Published Signals are not available yet|Daily Executive Briefing|Today • [^<]+' /tmp/bootup-apply-schema-home-before.html /tmp/bootup-apply-schema-signals-before.html /tmp/bootup-apply-schema-cron-before.txt
node scripts/prod-check.js https://bootupnews.vercel.app
supabase --version
find supabase -maxdepth 3 -type f | sort
find supabase/.temp -maxdepth 1 -type f -print 2>/dev/null | sort || true
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-apply-production-schema-alignment
supabase projects list --output json
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-apply-production-schema-alignment
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-apply-production-schema-alignment
sed -n '1,240p' supabase/migrations/20260424083000_signal_posts_historical_archive.sql
sed -n '1,240p' supabase/migrations/20260426090000_pipeline_article_candidates.sql
sed -n '1,240p' supabase/migrations/20260426120000_signal_posts_public_depth_pool.sql
sed -n '1,240p' supabase/migrations/20260426143000_signal_posts_why_it_matters_quality_gate.sql
git diff --check
python3 scripts/validate-feature-system-csv.py
cmp -s package-lock.json /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/package-lock.json
cmp -s package.json /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/package.json
test -d /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/node_modules
ln -s /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/node_modules node_modules
npm run lint
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-apply-production-schema-alignment --pr-title "PRD-53 apply production schema alignment"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-apply-production-schema-alignment --pr-title "PRD-53 apply production schema alignment"
npm run test
npm run build
rm -rf .next node_modules supabase/.temp scripts/__pycache__ next-env.d.ts
```

## Local validation results

| Command | Result |
| --- | --- |
| `git diff --check` | Passed. |
| `python3 scripts/validate-feature-system-csv.py` | Passed with pre-existing PRD slug warnings for PRD-32, PRD-37, and PRD-38. |
| `npm run lint` | Passed using the matching dependency tree from the immediately prior PRD-53 schema-alignment worktree. `package.json` and `package-lock.json` matched that worktree. |
| `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-apply-production-schema-alignment --pr-title "PRD-53 apply production schema alignment"` | Passed. Classified as docs-only baseline. |
| `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-apply-production-schema-alignment --pr-title "PRD-53 apply production schema alignment"` | Passed. Classified as docs-only baseline. |
| `npm run test` | Passed: 73 files, 572 tests. |
| `npm run build` | Passed. Build logged webpack cache-write `ENOSPC` warnings because the local disk was nearly full, but compile, TypeScript, static generation, and trace collection completed successfully. |

`npm install` was not rerun because the local filesystem had about 629 MB available and prior install attempts on this machine hit `ENOSPC`. The existing dependency tree from the immediately prior PRD-53 schema-alignment worktree was used only after confirming matching package files. Generated `.next`, `node_modules` symlink, and local Supabase link metadata were removed after validation.

## Commands not run

| Command or action | Reason |
| --- | --- |
| `supabase db push --linked` | Dry-run pending set included unexpected earlier migrations and row-update migrations. |
| Production `draft_only` | Production schema preflight still fails. |
| Controlled publish | `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` was absent. |
| Direct SQL row surgery | Explicitly out of scope. |
| Cron run | Explicitly out of scope. |
| Pipeline write-mode | Explicitly out of scope. |
| MVP measurement instrumentation | Blocked until second controlled cycle succeeds. |

## Result

`production_schema_alignment_blocked`

Production schema alignment did not complete. The blocker is migration-history drift or unapplied earlier migrations in the target Supabase project. Applying the current pending set would exceed the scoped authorization for additive PRD-53 schema alignment.

## Exact next task

Resolve migration-history drift before rerunning PRD-53 schema alignment.

Recommended next prompt:

```text
Diagnose Supabase production migration-history drift for Boot Up.
Do not apply production migrations yet.
Compare remote migration history with the actual production schema and the committed migration files.
Determine whether 20260424083000, 20260426090000, 20260426120000, and 20260426143000 were manually applied without being recorded, partially applied, or truly missing.
Propose the safest remediation:
- repair migration history only if schema already matches,
- apply only missing safe migrations if truly missing and explicitly authorized,
- or create a narrowly scoped runbook if manual Supabase SQL editor action is required.
Do not run draft_only, publish, cron, source changes, ranking changes, WITM threshold changes, or MVP measurement.
```

After migration history is resolved and production schema preflight passes, rerun the second controlled cycle from latest `main`. Do not proceed to MVP measurement until that controlled cycle succeeds.

## Risks / follow-up

- Migration-history drift can make `supabase db push` apply migrations that are outside the immediate PRD-53 scope.
- Earlier pending migrations include row updates, so they need separate explicit review before production apply.
- PRD-53 schema alignment remains blocked until the pending set is reduced to a safe, understood set.
- MVP measurement instrumentation remains after a successful controlled cycle.
- Final launch-readiness QA remains after measurement.
- Cron remains last.
