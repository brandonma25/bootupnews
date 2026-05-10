# PRD-53 Authorized Controlled Draft Only Rerun

Date: 2026-04-30
Branch: `codex/prd-53-authorized-controlled-draft-only-rerun`
Readiness label: `ready_for_admin_rewrite_and_final_slate_validation`

## Effective Change Type

Operations validation / remediation alignment under the approved PRD-53 Signals admin editorial workflow.

This packet does not create a new feature, create a new PRD, change product scope, publish, run cron, apply schema migrations, run migration repair, run direct SQL row surgery, change source/ranking/WITM thresholds, or start MVP measurement.

Object level: `public.signal_posts` remains legacy/runtime storage for editorial and published Surface Placement plus Card copy. This run created non-live review rows through the supported pipeline workflow only.

## Source Of Truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

- `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-controlled-draft-only.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-authorized-controlled-draft-only.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-second-controlled-cycle-rerun.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-second-controlled-cycle-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-schema-apply.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-authorized-schema-apply.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`
- `docs/engineering/change-records/prd-53-minimal-published-slate-audit-history.md`

## Why This Rerun Was Authorized

PR #170 recorded that the first authorized `draft_only` attempt was blocked because the pulled production environment had public Supabase values but a blank `SUPABASE_SERVICE_ROLE_KEY`.

This rerun was authorized only for controlled production `draft_only` / non-live candidate creation through the supported pipeline workflow after a non-blank service-role credential was made available to this execution context. It was not authorized to publish, set `is_live=true`, set `published_at`, archive prior live rows, create a published-slate audit record through the publish path, run cron, run normal pipeline write-mode, run direct SQL mutation, change sources, change thresholds, or start MVP measurement.

## Workspace Baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-controlled-draft-only-rerun` |
| Branch | `codex/prd-53-authorized-controlled-draft-only-rerun` |
| Starting commit | `548ffdfb6e5845d0a0a2e3dccaa01d50ac0cba2c` |
| Commit description | `Merge pull request #170 from brandonma25/codex/prd-53-authorized-controlled-draft-only` |
| Production app URL | `https://bootupnews.vercel.app` |
| Production deployment | `dpl_ESSRCej2jGfgNdjKFUCwtfY72iCz`, status Ready |

The canonical checkout at `/Users/bm/dev/daily-intelligence-aggregator` remained on its existing branch and was not disturbed. This validation used the dedicated worktree above.

## Authorization

Prompt-level authorization present:

- `CONTROLLED_PRODUCTION_DRAFT_ONLY_APPROVED=true`
- controlled dry-run recheck
- supported `draft_only` creation of non-live review rows
- read-only verification
- admin page inspection through Chrome without mutation
- documentation packet creation

Prompt-level authorization absent:

- `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true`
- production publish authorization
- cron authorization
- migration-history repair authorization
- schema migration authorization
- direct SQL mutation authorization
- MVP measurement authorization

No secrets, database passwords, connection strings, browser cookies, API tokens, or session data were printed into docs or committed. The service-role credential was passed into the command process through silent standard input and Vercel production environment variables were loaded through ephemeral temporary files that were removed by shell traps. Only key presence and workflow results were recorded, never secret values.

Security note: because the service-role credential was exposed in chat before this run, it should be rotated after the controlled operation is complete.

## Commands Run

Workspace, branch, source-of-truth, and PR #170 checks:

```bash
pwd
git branch --show-current
git status --short --branch --untracked-files=no
git worktree list
gh pr checks 170 --watch=false
gh pr view 170 --json number,state,isDraft,mergeable,mergeStateStatus,headRefName,headRefOid,baseRefName
gh api repos/brandonma25/daily-intelligence-aggregator/pulls/170/merge -X PUT -f merge_method=merge ...
git push origin --delete codex/prd-53-authorized-controlled-draft-only
git fetch origin main --prune
git worktree add /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-controlled-draft-only-rerun -b codex/prd-53-authorized-controlled-draft-only-rerun origin/main
```

Required protocol and source inspection:

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,220p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,220p' docs/engineering/protocols/prd-template.md
sed -n '1,220p' docs/engineering/protocols/release-machine.md
sed -n '1,220p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,220p' docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md
rg "pipeline:controlled-test|PIPELINE_RUN_MODE|draft_only|REPLAY_ARTIFACT|SUPABASE_SERVICE_ROLE_KEY|CONTROLLED_PRODUCTION_DRAFT_ONLY_APPROVED" package.json scripts src docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-controlled-draft-only.md
```

Setup and baseline checks:

```bash
npm install
vercel link --yes --project bootup --scope brandonma25s-projects --no-color
node scripts/prod-check.js https://bootupnews.vercel.app/
vercel inspect https://bootupnews.vercel.app --no-color
node <public route baseline check>
node <read-only Supabase aggregate baseline check>
```

Controlled dry-run recheck:

```bash
PIPELINE_RUN_MODE=dry_run \
PIPELINE_TARGET_ENV=production \
PIPELINE_CRON_DISABLED_CONFIRMED=true \
BRIEFING_DATE_OVERRIDE=2026-05-01 \
PIPELINE_TEST_RUN_ID=prd53-controlled-draft-rerun-dryrun-20260501T0456Z \
npm run pipeline:controlled-test
```

Authorized `draft_only` rerun:

```bash
CONTROLLED_PRODUCTION_DRAFT_ONLY_APPROVED=true \
PIPELINE_RUN_MODE=draft_only \
PIPELINE_TARGET_ENV=production \
ALLOW_PRODUCTION_PIPELINE_TEST=true \
PIPELINE_CRON_DISABLED_CONFIRMED=true \
BRIEFING_DATE_OVERRIDE=2026-05-01 \
PIPELINE_TEST_RUN_ID=prd53-controlled-draft-only-rerun-20260501T0457Z \
PIPELINE_DRAFT_TIER_ALLOWLIST=core,context \
PIPELINE_DRAFT_MAX_ROWS=7 \
PIPELINE_REPLAY_ARTIFACT_PATH=<dry-run artifact path> \
PIPELINE_REPLAY_EXPECTED_RUN_ID=pipeline-1777611368533 \
npm run pipeline:controlled-test
```

Post-run verification:

```bash
node <read-only Supabase verification for inserted review row IDs>
node scripts/prod-check.js https://bootupnews.vercel.app/
node <public route post-check>
node <read-only live row ID overlap check>
npx tsx -e "<final-slate readiness validation against created rows>"
Chrome Computer Use inspection of /dashboard/signals/editorial-review
```

## Commands Intentionally Not Run

- production publish
- supported publish action
- setting `is_live=true`
- setting `published_at`
- archiving previous live rows
- published-slate audit creation through the publish path
- cron
- normal pipeline write-mode
- direct SQL row surgery
- direct SQL mutation
- schema migration apply
- migration-history repair
- source changes
- ranking threshold changes
- WITM threshold changes
- MVP measurement
- final launch-readiness QA

## Baseline Public Status

Production route baseline before `draft_only`:

| Route | Result |
| --- | --- |
| `/` | HTTP 200, no raw schema-preflight error, no PRD-53 column names, last clean briefing marker `Wednesday, April 29, 2026` |
| `/signals` | HTTP 200, no raw schema-preflight error, no PRD-53 column names, shows `Published Signals`, `Top 5 Core Signals`, and `Next 2 Context Signals` |
| `/dashboard/signals/editorial-review` | HTTP 200 in fetch baseline, admin route gated when unauthenticated |
| `/api/cron/fetch-news` | HTTP 401 Unauthorized |

Read-only database baseline before `draft_only`:

| Check | Result |
| --- | --- |
| live published total | 7 |
| rows for `2026-05-01` | 0 |
| live rows for `2026-05-01` | 0 |
| published rows for `2026-05-01` | 0 |
| published-slate audit count | 0 |

## Dry Run Result

Artifact:

```text
.pipeline-runs/controlled-pipeline-dry_run-prd53-controlled-draft-rerun-dryrun-20260501T0456Z-2026-05-01T04-56-13-693Z.json
```

Run ID:

```text
pipeline-1777611368533
```

Summary:

| Field | Result |
| --- | --- |
| mode | `dry_run` |
| candidate count | 101 |
| cluster count | 101 |
| eligible Core count | 5 |
| Context eligible count | 2 |
| Depth-only count | 13 |
| excluded weak candidate count | 145 |
| candidate pool insufficient | false |
| inserted count | 0 |
| warning summary | `source_accessibility_thin`, `source_health_warning`, `source_accessibility_constrained_selection` |

Dry-run selected review set:

| Rank | Tier | Title | Source | WITM status | Failure |
| --- | --- | --- | --- | --- | --- |
| 1 | Core | Trump signs DHS legislation, ending record-breaking shutdown | Politico Congress | passed | none |
| 2 | Core | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | requires_human_rewrite | `unsupported_structural_claim` |
| 3 | Core | A Closer Look at Emerging Market Resilience During Recent Shocks | Liberty Street Economics | passed | none |
| 4 | Core | The R*-Labor Share Nexus | Liberty Street Economics | passed | none |
| 5 | Core | The AI Investing Landscape: Insights from Venture Capital | SF Fed Research and Insights | passed | none |
| 6 | Context | Anthropic, OpenAI back Warner-Budd workforce data bill | Politico Congress | passed | none |
| 7 | Context | Congress keeps kicking surveillance reform down the road | The Verge | requires_human_rewrite | `evidence_accessibility_mismatch` |

The dry-run candidate set was suitable for `draft_only`: it contained 5 Core plus 2 Context rows, no Depth rows were needed for the product-target slate, and candidate-pool insufficiency was false. The two rewrite-required rows were acceptable for review-row creation only; they still block publish readiness.

## Draft Only Result

Artifact:

```text
.pipeline-runs/controlled-pipeline-draft_only-prd53-controlled-draft-only-rerun-20260501T0457Z-2026-05-01T04-57-12-063Z.json
```

Result:

| Field | Result |
| --- | --- |
| mode | `draft_only` |
| run ID | `pipeline-1777611368533` |
| briefing date | `2026-05-01` |
| candidate count | 7 |
| eligible Core count | 5 |
| Context eligible count | 2 |
| Depth-only count | 0 |
| inserted count | 7 |
| message | `Persisted 7 missing signal snapshot rows for editorial review.` |

Created non-live review rows:

| Rank | Created row ID | Title | Source | Editorial status | Editorial decision | Live | Published | WITM status | Failure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `0e21b2ea-4a6b-4e2b-8a9b-7f470120e1a5` | Trump signs DHS legislation, ending record-breaking shutdown | Politico Congress | `needs_review` | `pending_review` | false | null | passed | none |
| 2 | `c94fe250-2a4f-4b35-835c-582cdb9916a6` | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | `needs_review` | `pending_review` | false | null | requires_human_rewrite | `unsupported_structural_claim` |
| 3 | `5bdb8ffe-ab97-40f3-8c62-67864878d646` | A Closer Look at Emerging Market Resilience During Recent Shocks | Liberty Street Economics | `needs_review` | `pending_review` | false | null | passed | none |
| 4 | `e1edddd2-3792-453e-acab-7b34d5912f99` | The R*-Labor Share Nexus | Liberty Street Economics | `needs_review` | `pending_review` | false | null | passed | none |
| 5 | `a0f71fc3-5478-442d-8d03-2b3a0a263d41` | The AI Investing Landscape: Insights from Venture Capital | SF Fed Research and Insights | `needs_review` | `pending_review` | false | null | passed | none |
| 6 | `87729916-366a-4c0e-a5d1-0fce5f4e47ce` | Anthropic, OpenAI back Warner-Budd workforce data bill | Politico Congress | `needs_review` | `pending_review` | false | null | passed | none |
| 7 | `a2e9edc7-b9c1-4a10-b6a8-a60ae81c864f` | Congress keeps kicking surveillance reform down the road | The Verge | `needs_review` | `pending_review` | false | null | requires_human_rewrite | `evidence_accessibility_mismatch` |

Verification summary for the seven created row IDs:

| Check | Result |
| --- | --- |
| rows returned | 7 |
| non-live rows | 7 |
| unpublished rows | 7 |
| `needs_review` rows | 7 |
| WITM passed rows | 5 |
| WITM rewrite-required rows | 2 |
| `final_slate_rank` null | 7 |
| `final_slate_tier` null | 7 |
| public visible count for created IDs | 0 |
| total rows for `2026-05-01` | 7 |

## Public Safety Verification

Post-`draft_only` production checks:

| Route | Result |
| --- | --- |
| `/` | HTTP 200, no raw schema-preflight error, no PRD-53 column names, last clean briefing marker still present |
| `/signals` | HTTP 200, no raw schema-preflight error, no PRD-53 column names, shows `Published Signals`, `Top 5 Core Signals`, and `Next 2 Context Signals` |
| `/dashboard/signals/editorial-review` | HTTP 200 |
| `/api/cron/fetch-news` | HTTP 401 Unauthorized |

Public page text contains two article/source-title strings that also belong to prior clean briefing copy, but row-ID verification confirmed the newly created `2026-05-01` review rows have `publicVisibleCount=0` and `createdIdOverlapCount=0` against live published rows.

## Admin Workflow Inspection

Chrome Computer Use inspected:

```text
https://bootupnews.vercel.app/dashboard/signals/editorial-review
```

Observed admin state:

- Admin/editor route loaded for `newsweb2026@gmail.com`.
- Header showed `Current set 2026-05-01` and `7 current candidates`.
- The seven created rows appeared in the admin candidate/review workflow.
- WITM status was visible for each row.
- WITM failure details were visible for the two rewrite-required rows.
- Valid rows were distinguishable from rewrite-required rows.
- Final Slate Composer showed `0/7 selected`, `0/5 Core`, `0/2 Context`, and `Slate not ready`.
- `Publish Final Slate` was disabled with the message: `Final slate requires exactly 7 selected rows. Current count: 0.`
- The page showed no published-slate audit record yet.

No admin mutation actions were clicked. No approve, reject, hold, replace, assign, publish, or row mutation action was performed.

## Final Slate Readiness

The repo final-slate readiness validator was run locally against the created rows.

Current production state:

| Field | Result |
| --- | --- |
| ready | false |
| selected rows | 0 |
| global failure | `Final slate requires exactly 7 selected rows. Current count: 0.` |
| Core failure | `Only 0 Core rows selected; 5 required.` |
| Context failure | `Only 0 Context rows selected; 2 required.` |
| slot failures | Core slots 1-5 empty, Context slots 6-7 empty |

Hypothetical approved/selected validation was also run without mutating rows to identify the quality blockers that admin must resolve before publish. It still failed because:

- Rank 2, `Economic Letter Countdown: Most Read Topics from 2025`, has WITM status `requires_human_rewrite` and unresolved WITM failure details.
- Rank 7, `Congress keeps kicking surveillance reform down the road`, has WITM status `requires_human_rewrite` and unresolved WITM failure details.

## What Changed

- The supported pipeline workflow created seven non-live review rows for `2026-05-01`.
- The rows are available to the admin editorial workflow.
- WITM validation metadata was preserved.

## What Did Not Change

- No production publish occurred.
- No row was made live.
- No `published_at` value was set.
- No previous live row was archived.
- No published-slate audit record was created through the publish path.
- No cron ran or was re-enabled.
- No schema migration ran.
- No migration-history repair ran.
- No direct SQL row surgery ran.
- No source, ranking, or WITM threshold changed.
- No MVP measurement started.

## Validation

Repo-standard validation for this docs-only packet:

| Command | Result |
| --- | --- |
| `git diff --check` | passed |
| `python3 scripts/validate-feature-system-csv.py` | passed with pre-existing PRD slug warnings for PRD-32, PRD-37, and PRD-38 |
| `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-authorized-controlled-draft-only-rerun --pr-title "PRD-53 authorized controlled draft only rerun"` | passed |
| `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-authorized-controlled-draft-only-rerun --pr-title "PRD-53 authorized controlled draft only rerun"` | passed |
| `npm run lint` | passed |
| `npm run test` | passed, 73 test files and 575 tests |
| `npm run build` | passed |

Noted non-blocking warnings:

- `npm install` reported 2 audit vulnerabilities, unchanged from prior local setup.
- `npm run test` emitted repeated `--localstorage-file` warnings without test failures.
- `npm run build` emitted the existing workspace-root/multiple-lockfile and module-type warnings without build failure.

## Result

```text
ready_for_admin_rewrite_and_final_slate_validation
```

## Exact Next Task

Use the supported admin/editorial workflow to perform human rewrite and final-slate validation:

1. Review the seven `2026-05-01` candidates in `/dashboard/signals/editorial-review`.
2. Rewrite or replace the two WITM rewrite-required rows.
3. Approve only valid rows.
4. Assign exactly 5 Core slots and 2 Context slots.
5. Run final-slate readiness validation.
6. Do not publish until a later prompt explicitly includes `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true`.

The next readiness target is `ready_for_authorized_second_controlled_publish` only after admin rewrite, approval, and final-slate readiness pass.
