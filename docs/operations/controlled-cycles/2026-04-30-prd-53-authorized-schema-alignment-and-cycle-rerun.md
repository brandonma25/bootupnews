# PRD-53 Authorized Schema Alignment And Cycle Rerun

Date: 2026-04-30
Branch: `codex/prd-53-authorized-production-schema-alignment`
Readiness label: `production_schema_alignment_pending_authorization`

## Effective change type

Remediation / alignment under the approved PRD-53 Signals admin editorial workflow.

This packet does not implement a new feature, create a new PRD, change product scope, change source governance, change ranking or WITM thresholds, re-enable cron, or run production publish.

## Source of truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

- `docs/operations/controlled-cycles/2026-04-30-prd-53-second-controlled-cycle.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-schema-alignment-and-second-cycle-rerun.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-second-controlled-cycle.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-schema-alignment-and-second-cycle-rerun.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`
- `docs/engineering/change-records/prd-53-minimal-published-slate-audit-history.md`

## Object level

This is Data Layer alignment for legacy/runtime `signal_posts` Surface Placement plus Card workflow fields and the internal published-slate audit tables.

It does not introduce canonical Signal identity, Story Cluster persistence, semantic clustering, personalization, a public archive, or the Phase 2 historical content model.

## Authorization gates

| Gate | Required variable | Present | Result |
| --- | --- | --- | --- |
| Production schema migration | `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` | No | Migration not run. |
| Production publish | `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` | No | Publish not run. |

The prompt was not treated as migration authorization because it did not include the explicit approval value required by the runbook. No Supabase migration command that mutates production schema was run.

## Workspace baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-production-schema-alignment` |
| Branch | `codex/prd-53-authorized-production-schema-alignment` |
| Starting commit | `cca85e3` |
| Commit description | `Merge pull request #155 from brandonma25/codex/prd-53-production-schema-migration-alignment` |
| UTC capture time | `2026-04-30T05:19:46Z` |
| Local capture time | `2026-04-30 13:19:46 CST` |
| Production URL | `https://daily-intelligence-aggregator-ybs9.vercel.app` |

## Baseline production schema preflight

Read-only public route checks were run. No production rows were mutated.

| Check | Result |
| --- | --- |
| Homepage `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| Cron endpoint `/api/cron/fetch-news` | HTTP 401 unauthorized |
| Production app release marker | `cca85e3bf6902c7e2bde01daa4e79eb40596f053` |
| `signal_posts` PRD-53 schema status | Missing required PRD-53 additive columns |
| Published-slate audit table status | Not verifiable through public routes without service-role schema access |

The homepage is serving the PR #155 merge commit but still reports:

```text
signal_posts schema preflight failed. Missing expected columns: final_slate_rank, final_slate_tier, editorial_decision, decision_note, rejected_reason, held_reason, replacement_of_row_id, reviewed_by, reviewed_at.
```

`/signals` returned the public shell and did not expose candidate rows. The public page still reports that published Signals are not available yet.

The cron endpoint returned HTTP 401 unauthorized and was not run.

The standard production check failed because the homepage is degraded by the schema preflight and does not render the expected public briefing markers:

```text
production route probe failed for / with HTTP 200; missing markers: Why it matters, Details
```

## Repo migration source of truth

The PRD-53 schema additions are already present in committed repo migrations.

### Final-slate composer migration

File:

- `supabase/migrations/20260430100000_signal_posts_final_slate_composer.sql`

Adds:

- `signal_posts.final_slate_rank`
- `signal_posts.final_slate_tier`
- rank/tier check constraints for the 5 Core + 2 Context model
- unique `(briefing_date, final_slate_rank)` index for non-null final-slate ranks

### Editorial card controls migration

File:

- `supabase/migrations/20260430110000_signal_posts_editorial_card_controls.sql`

Adds:

- `signal_posts.editorial_decision`
- `signal_posts.decision_note`
- `signal_posts.rejected_reason`
- `signal_posts.held_reason`
- `signal_posts.replacement_of_row_id`
- `signal_posts.reviewed_by`
- `signal_posts.reviewed_at`
- editorial-decision check constraint
- `replacement_of_row_id` self-reference constraint

### Minimal published-slate audit/history migration

File:

- `supabase/migrations/20260430120000_published_slates_minimal_audit_history.sql`

Adds:

- `published_slates`
- `published_slate_items`
- published-slate item rank uniqueness
- published-slate item signal-post index
- published-slate published-at index
- RLS enabled for both audit tables
- service-role read/write/delete policies for both audit tables

## Local Supabase CLI status

The Supabase CLI is available locally:

```text
supabase 2.90.0
```

The dedicated repo worktree is not linked to a Supabase project:

```text
Cannot find project ref. Have you run supabase link?
```

Because migration authorization is absent and the worktree is not linked, no production schema migration was run. A dry-run command also failed safely before reaching a target project:

```text
Cannot find project ref. Have you run supabase link?
```

## Required production schema verification

After migration authorization is present, verify the following before rerunning the controlled cycle:

### `signal_posts`

- `final_slate_rank`
- `final_slate_tier`
- `editorial_decision`
- `decision_note`
- `rejected_reason`
- `held_reason`
- `replacement_of_row_id`
- `reviewed_by`
- `reviewed_at`

### Audit/history tables

- `published_slates`
- `published_slate_items`

Also verify constraints, indexes, and service-role policies from the committed migration files.

## Authorized migration runbook

Do not run this section unless `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` is explicitly present.

Preferred repo-supported path:

1. Confirm a clean worktree on latest `main`.
2. Confirm `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true`.
3. Confirm `CONTROLLED_PRODUCTION_PUBLISH_APPROVED` remains absent unless a later publish is explicitly authorized.
4. Link the repo worktree to the production Supabase project:

```bash
supabase link --project-ref <production-project-ref> --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-production-schema-alignment
```

5. Read remote migration history:

```bash
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-production-schema-alignment
```

6. Dry-run the migration push:

```bash
supabase db push --dry-run --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-production-schema-alignment
```

7. Confirm the pending set includes only expected additive migrations, or document and resolve any earlier migration-history drift before applying.
8. Apply the migration only after the pending set is confirmed:

```bash
supabase db push --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-production-schema-alignment
```

9. Rerun production schema preflight through the app and service-role schema checks.
10. Confirm homepage and `/signals` remain safe and cron remains unauthorized/disabled.

Fallback path if CLI linking is unavailable:

- Use the Supabase SQL editor only for the exact committed migration files listed above, in timestamp order.
- Do not write ad hoc SQL.
- Do not backfill data.
- Do not edit rows.
- Record before/after schema verification.

## Second controlled cycle rerun status

The second controlled cycle was not rerun in this branch.

Reasons:

- Production schema preflight still fails.
- Production schema migration authorization is absent.
- Running `draft_only` would be unsafe while production schema is missing required columns.
- Production publish authorization is absent.

The next controlled cycle should begin only after production schema preflight passes.

## Commands run

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
git fetch origin main --prune
git ls-remote origin refs/heads/main
gh pr view 155 --json state,mergeCommit,headRefOid,url,title
sed -n '1,220p' AGENTS.md
sed -n '1,380p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,220p' docs/engineering/protocols/prd-template.md
sed -n '1,220p' docs/engineering/protocols/release-machine.md
sed -n '1,260p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,220p' docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md
sed -n '1,260p' docs/operations/controlled-cycles/2026-04-30-prd-53-schema-alignment-and-second-cycle-rerun.md
sed -n '1,260p' docs/operations/controlled-cycles/2026-04-30-prd-53-second-controlled-cycle.md
sed -n '1,260p' supabase/migrations/20260430100000_signal_posts_final_slate_composer.sql
sed -n '1,260p' supabase/migrations/20260430110000_signal_posts_editorial_card_controls.sql
sed -n '1,300p' supabase/migrations/20260430120000_published_slates_minimal_audit_history.sql
printenv | rg 'CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED|CONTROLLED_PRODUCTION_PUBLISH_APPROVED|SUPABASE|VERCEL|PRODUCTION_BASE_URL|PIPELINE'
gh variable list --repo brandonma25/daily-intelligence-aggregator
curl -L -sS -o /tmp/bootup-authorized-align-home.html -w '%{http_code} %{url_effective}\n' https://daily-intelligence-aggregator-ybs9.vercel.app/
curl -L -sS -o /tmp/bootup-authorized-align-signals.html -w '%{http_code} %{url_effective}\n' https://daily-intelligence-aggregator-ybs9.vercel.app/signals
curl -L -sS -o /tmp/bootup-authorized-align-cron.txt -w '%{http_code} %{url_effective}\n' https://daily-intelligence-aggregator-ybs9.vercel.app/api/cron/fetch-news
rg -o 'sentry-release=[^,&"]+|signal_posts schema preflight failed\.[^<"]+|Missing expected columns: [^<"]+|0 signals|Published Signals are not available yet|Daily Executive Briefing|Today • [^<]+' /tmp/bootup-authorized-align-home.html /tmp/bootup-authorized-align-signals.html /tmp/bootup-authorized-align-cron.txt
node scripts/prod-check.js https://daily-intelligence-aggregator-ybs9.vercel.app
supabase --version
supabase migration list --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-production-schema-alignment
supabase db push --dry-run --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-production-schema-alignment
rg -n 'final_slate_rank|final_slate_tier|editorial_decision|decision_note|rejected_reason|held_reason|replacement_of_row_id|reviewed_by|reviewed_at|published_slates|published_slate_items' src/lib/signals-editorial.ts src/lib/signals-editorial.test.ts
git diff --check
python3 scripts/validate-feature-system-csv.py
npm install
df -h /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-production-schema-alignment
du -sh node_modules
rm -rf node_modules
test -d /Users/bm/dev/daily-intelligence-aggregator/node_modules && echo canonical-node-modules-present
du -sh /Users/bm/dev/daily-intelligence-aggregator/node_modules
cmp -s package-lock.json /Users/bm/dev/daily-intelligence-aggregator/package-lock.json
cmp -s package.json /Users/bm/dev/daily-intelligence-aggregator/package.json
find /Users/bm/dev/worktrees -maxdepth 2 -type d -name node_modules -prune -print
cmp -s package-lock.json /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/package-lock.json
cmp -s package.json /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/package.json
du -sh /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/node_modules
git -C /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment rev-parse HEAD
ln -s /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-production-schema-migration-alignment/node_modules node_modules
npm run lint
python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-authorized-production-schema-alignment --pr-title "PRD-53 authorized production schema alignment"
python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-authorized-production-schema-alignment --pr-title "PRD-53 authorized production schema alignment"
npm run test
npm run build
du -sh .next
rm -rf .next node_modules scripts/__pycache__ supabase/.temp next-env.d.ts
```

## Local validation results

| Command | Result |
| --- | --- |
| `git diff --check` | Passed. |
| `python3 scripts/validate-feature-system-csv.py` | Passed with pre-existing PRD slug warnings for PRD-32, PRD-37, and PRD-38. |
| `npm install` | Failed because the local disk was full while unpacking dependencies: `ENOSPC: no space left on device`. |
| `npm run lint` | Passed after using the matching dependency tree from the immediately prior PRD-53 schema-alignment worktree. `package.json` and `package-lock.json` matched that worktree. |
| `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-authorized-production-schema-alignment --pr-title "PRD-53 authorized production schema alignment"` | Passed. Classified as docs-only baseline. |
| `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-authorized-production-schema-alignment --pr-title "PRD-53 authorized production schema alignment"` | Passed. Classified as docs-only baseline. |
| `npm run test` | Passed: 73 files, 572 tests. |
| `npm run build` | Failed due local disk space after successful compile and TypeScript: `ENOSPC: no space left on device, open '.next/trace-build'`. |

The failed `.next` output and temporary dependency symlink were removed after validation so the worktree contains only the docs changes.

## Commands not run

| Command or action | Reason |
| --- | --- |
| `supabase db push` | `CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true` was absent. |
| Production `draft_only` | Production schema preflight still fails. |
| Controlled publish | `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true` was absent. |
| Direct SQL row surgery | Explicitly out of scope. |
| Cron run | Explicitly out of scope. |
| Pipeline write-mode | Explicitly out of scope. |
| MVP measurement instrumentation | Blocked until second controlled cycle succeeds. |

## Result

`production_schema_alignment_pending_authorization`

Production schema drift remains unresolved because migration authorization was absent. This branch records the refreshed production preflight and keeps the exact committed migration runbook ready for the authorized pass.

## Exact next task

Provide explicit production schema migration authorization:

```text
CONTROLLED_PRODUCTION_SCHEMA_MIGRATION_APPROVED=true
```

Then apply and verify the committed PRD-53 additive migrations through the supported migration process.

After schema preflight passes, rerun the second controlled cycle from latest `main`. Do not proceed to MVP measurement until that controlled cycle succeeds.

## Risks / follow-up

- Remote migration history may not exactly match actual production schema if earlier migrations were applied manually. Resolve that before applying anything broad.
- Dry-run candidate quality remains a separate editorial workflow issue after schema alignment; WITM failures should be handled through request rewrite, hold, reject, replace, promote, demote, and reorder controls before considering code remediation.
- MVP measurement instrumentation remains after a successful controlled cycle.
- Final launch-readiness QA remains after measurement.
- Cron remains last.
