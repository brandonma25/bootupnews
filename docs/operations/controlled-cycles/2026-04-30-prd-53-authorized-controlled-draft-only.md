# PRD-53 Authorized Controlled Draft Only

Date: 2026-04-30
Branch: `codex/prd-53-authorized-controlled-draft-only`
Readiness label: `controlled_draft_only_blocked`

## Effective Change Type

Operations validation / remediation alignment under the approved PRD-53 Signals admin editorial workflow.

This packet does not implement a new feature, create a new PRD, change product scope, publish, run cron, apply schema migrations, run migration repair, run direct SQL row surgery, change source/ranking/WITM thresholds, or start MVP measurement.

Object level: `public.signal_posts` remains legacy/runtime storage for editorial and published Surface Placement plus Card copy. This run attempted to create non-live review rows through the supported pipeline workflow only.

## Source Of Truth

Primary source:

- `docs/product/prd/prd-53-signals-admin-editorial-layer.md`

Secondary sources:

- `docs/operations/controlled-cycles/2026-04-30-prd-53-second-controlled-cycle-rerun.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-second-controlled-cycle-rerun.md`
- `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-schema-apply.md`
- `docs/operations/tracker-sync/2026-04-30-prd-53-authorized-schema-apply.md`
- `docs/engineering/change-records/prd-53-minimal-final-slate-composer.md`
- `docs/engineering/change-records/prd-53-editorial-card-controls.md`
- `docs/engineering/change-records/prd-53-seven-row-publish-hardening.md`
- `docs/engineering/change-records/prd-53-minimal-published-slate-audit-history.md`

## Why This Run Was Authorized

PR #168 aligned production schema for PRD-53. PR #169 reran the second controlled cycle through `dry_run` and reached `ready_for_authorized_controlled_draft_only`.

This run was authorized only for controlled production `draft_only` / non-live candidate creation through the supported pipeline workflow. It was not authorized to publish, set `is_live=true`, set `published_at`, archive prior live rows, create a published-slate audit record through the publish path, run cron, run normal pipeline write-mode, run direct SQL mutation, change sources, change thresholds, or start MVP measurement.

## Workspace Baseline

| Field | Value |
| --- | --- |
| Worktree | `/Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-controlled-draft-only` |
| Branch | `codex/prd-53-authorized-controlled-draft-only` |
| Starting commit | `37a0d4cf8de98a5171e38a8486618a48e0ca7916` |
| Commit description | `Merge pull request #169 from brandonma25/codex/prd-53-second-controlled-cycle-rerun` |
| PR #169 merged at | `2026-05-01T04:11:41Z` |
| UTC capture time | `2026-05-01T04:13:20Z` |
| Local capture time | `2026-05-01 12:13:20 CST` |
| Production deployment SHA | `37a0d4cf8de98a5171e38a8486618a48e0ca7916` |
| Production app URL | `https://daily-intelligence-aggregator-ybs9.vercel.app` |
| Supabase project ref | `fwkqjeumreaznfhnlzev` |

The canonical checkout at `/Users/bm/dev/daily-intelligence-aggregator` remained on its existing branch and was not disturbed. This validation used the dedicated worktree above.

## Authorization

Prompt-level authorization present:

- `CONTROLLED_PRODUCTION_DRAFT_ONLY_APPROVED=true`
- controlled dry-run recheck
- supported `draft_only` creation of non-live review rows
- read-only verification
- admin page inspection if safely available
- documentation packet creation

Prompt-level authorization absent:

- `CONTROLLED_PRODUCTION_PUBLISH_APPROVED=true`
- production publish authorization
- cron authorization
- migration-history repair authorization
- schema migration authorization
- direct SQL mutation authorization
- MVP measurement authorization

No secrets, database passwords, connection strings, browser cookies, API tokens, or session data were printed into docs or committed. Vercel production environment variables were loaded through an ephemeral temporary file for the supported `draft_only` attempt; the file was deleted after loading. Only key presence/blankness was recorded, never secret values.

## Commands Run

Workspace, branch, source-of-truth, and prior PR checks:

```bash
pwd
git branch --show-current
git status --short --branch
git worktree list
gh pr checks 169
gh pr view 169 --json number,state,mergeable,headRefName,headRefOid,baseRefName,url
gh pr merge 169 --merge --delete-branch=false
gh pr view 169 --json number,state,mergeCommit,mergedAt,url
git fetch origin main
git worktree add /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-controlled-draft-only -b codex/prd-53-authorized-controlled-draft-only origin/main
sed -n '1,240p' AGENTS.md
sed -n '1,220p' docs/engineering/protocols/engineering-protocol.md
sed -n '1,220p' docs/engineering/protocols/test-checklist.md
sed -n '1,220p' docs/engineering/protocols/prd-template.md
sed -n '1,220p' docs/engineering/protocols/release-machine.md
sed -n '1,260p' docs/engineering/protocols/release-automation-operating-guide.md
sed -n '1,220p' docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md
sed -n '1,260p' docs/product/prd/prd-53-signals-admin-editorial-layer.md
sed -n '1,260p' docs/operations/controlled-cycles/2026-04-30-prd-53-second-controlled-cycle-rerun.md
```

Supported workflow and preflight inspection:

```bash
rg "draft_only|ALLOW_PRODUCTION_PIPELINE_TEST|PIPELINE_RUN_MODE|PIPELINE_TARGET_ENV|PIPELINE_CRON_DISABLED_CONFIRMED" -n src scripts docs
sed -n '1,420p' src/lib/pipeline/controlled-execution.ts
sed -n '1,360p' src/lib/pipeline/controlled-runner.ts
sed -n '1040,1390p' src/lib/signals-editorial.ts
npm install
```

Baseline read-only checks:

```bash
python3 <public route baseline smoke script>
node scripts/prod-check.js https://daily-intelligence-aggregator-ybs9.vercel.app
supabase projects list --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-controlled-draft-only
supabase link --project-ref fwkqjeumreaznfhnlzev --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-controlled-draft-only
supabase db query "<read-only live/audit/count select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-controlled-draft-only --output table
```

Dry-run recheck:

```bash
PIPELINE_RUN_MODE=dry_run \
PIPELINE_TARGET_ENV=production \
PIPELINE_CRON_DISABLED_CONFIRMED=true \
BRIEFING_DATE_OVERRIDE=2026-05-01 \
PIPELINE_TEST_RUN_ID=prd53-authorized-draft-only-dryrun-20260501T0418Z \
npm run pipeline:controlled-test
```

Authorized `draft_only` attempt:

```bash
CONTROLLED_PRODUCTION_DRAFT_ONLY_APPROVED=true \
PIPELINE_RUN_MODE=draft_only \
PIPELINE_TARGET_ENV=production \
ALLOW_PRODUCTION_PIPELINE_TEST=true \
PIPELINE_CRON_DISABLED_CONFIRMED=true \
BRIEFING_DATE_OVERRIDE=2026-05-01 \
PIPELINE_TEST_RUN_ID=prd53-authorized-controlled-draft-only-20260501T0420Z \
PIPELINE_DRAFT_TIER_ALLOWLIST=core,context \
PIPELINE_DRAFT_MAX_ROWS=7 \
PIPELINE_REPLAY_ARTIFACT_PATH=<dry-run artifact path> \
PIPELINE_REPLAY_EXPECTED_RUN_ID=pipeline-1777608997529 \
npm run pipeline:controlled-test
```

Post-attempt verification:

```bash
supabase db query "<read-only 2026-05-01 row count select>" --linked --workdir /Users/bm/dev/worktrees/daily-intelligence-aggregator-prd-53-authorized-controlled-draft-only --output table
python3 <public route post-check script>
npx tsx -e "<local dry-run final-slate readiness validation>"
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

| Check | Result |
| --- | --- |
| Homepage `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| Production route probe | Passed for `/` and `/dashboard` |
| Public raw schema-preflight exposure | Not present |
| Public PRD-53 column-name exposure | Not present |
| Public last clean briefing date | `Wednesday, April 29, 2026` |
| `/signals` markers | `Published Signals`, `Top 5 Core Signals`, `Next 2 Context Signals` |
| Live published rows | `7` |
| Existing rows for `2026-05-01` before draft-only | `0` |
| Published-slate audit rows | `0` |
| Cron endpoint | HTTP 401 unauthorized |

The first baseline admin-route fetch timed out, but the post-attempt admin-route check returned HTTP 200 and showed the unauthenticated sign-in gate.

## Dry Run Result

The dry-run recheck completed successfully and performed no Supabase writes.

Artifact:

```text
.pipeline-runs/controlled-pipeline-dry_run-prd53-authorized-draft-only-dryrun-20260501T0418Z-2026-05-01T04-16-42-642Z.json
```

Summary:

| Field | Value |
| --- | --- |
| `mode` | `dry_run` |
| `runId` | `pipeline-1777608997529` |
| `briefingDate` | `2026-05-01` |
| `candidateCount` | `102` |
| `clusterCount` | `102` |
| `eligibleCoreCount` | `5` |
| `contextEligibleCount` | `2` |
| `depthOnlyCount` | `13` |
| `excludedWeakCandidateCount` | `143` |
| `candidate_pool_insufficient` | `false` |
| `insertedCount` | `0` |

Warnings:

- `source_accessibility_thin`
- `source_health_warning`
- `source_accessibility_constrained_selection`
- Reuters Business feed fetch failed with `rss_retry_exhausted`; the controlled dry run continued.

Selected review candidate set:

| Rank | Tier | Title | Source | WITM status | Failure |
| --- | --- | --- | --- | --- | --- |
| 1 | Core | Trump signs DHS legislation, ending record-breaking shutdown | Politico Congress | passed | None |
| 2 | Core | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | requires_human_rewrite | `unsupported_structural_claim` |
| 3 | Core | A Closer Look at Emerging Market Resilience During Recent Shocks | Liberty Street Economics | passed | None |
| 4 | Core | The R*-Labor Share Nexus | Liberty Street Economics | passed | None |
| 5 | Core | The AI Investing Landscape: Insights from Venture Capital | SF Fed Research and Insights | passed | None |
| 6 | Context | Anthropic, OpenAI back Warner-Budd workforce data bill | Politico Congress | passed | None |
| 7 | Context | Congress keeps kicking surveillance reform down the road | The Verge | requires_human_rewrite | `evidence_accessibility_mismatch` |

Source concentration:

| Source | Selected count |
| --- | --- |
| Politico Congress | `2` |
| SF Fed Research and Insights | `2` |
| Liberty Street Economics | `2` |
| The Verge | `1` |

The dry-run candidate set was suitable for `draft_only`: it contained 5 Core plus 2 Context rows, no Depth rows were needed for the product-target slate, and candidate-pool insufficiency was false. The two rewrite-required rows were acceptable for review-row creation only; they still block publish readiness.

## Draft-Only Attempt Result

The supported `draft_only` command was attempted using the dry-run artifact as replay input, with the Core/Context product-target cap:

- `PIPELINE_DRAFT_TIER_ALLOWLIST=core,context`
- `PIPELINE_DRAFT_MAX_ROWS=7`
- `PIPELINE_REPLAY_EXPECTED_RUN_ID=pipeline-1777608997529`

Artifact:

```text
.pipeline-runs/controlled-pipeline-draft_only-prd53-authorized-controlled-draft-only-20260501T0420Z-2026-05-01T04-17-15-411Z.json
```

Result:

| Field | Value |
| --- | --- |
| `ok` | `false` |
| `mode` | `draft_only` |
| `runId` | `pipeline-1777608997529` |
| `briefingDate` | `2026-05-01` |
| `candidateCount` | `7` |
| `eligibleCoreCount` | `5` |
| `contextEligibleCount` | `2` |
| `depthOnlyCount` | `0` |
| `insertedCount` | `0` |
| `insertedPostIds` | Empty / unavailable because no rows inserted |
| Message | `Editorial storage is unavailable. Configure Supabase and SUPABASE_SERVICE_ROLE_KEY.` |

Vercel production environment inspection without exposing values showed:

- `NEXT_PUBLIC_SUPABASE_URL`: present
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: present
- `SUPABASE_SERVICE_ROLE_KEY`: key present but blank

Because the supported editorial storage client requires `SUPABASE_SERVICE_ROLE_KEY`, the run safely stopped before inserting review rows.

## Created Non-Live Review Rows

No non-live review rows were created.

Read-only post-attempt verification for `briefing_date = '2026-05-01'` showed:

| Field | Value |
| --- | --- |
| Rows for `2026-05-01` | `0` |
| Live rows for `2026-05-01` | `0` |
| Rows with `published_at` for `2026-05-01` | `0` |

No new public rows appeared. No `is_live` value was set. No `published_at` value was set. No prior live rows were archived.

## Public Safety Verification

Post-attempt public safety checks passed:

| Surface | Result |
| --- | --- |
| Homepage `/` | HTTP 200, last clean briefing date visible, no raw schema error |
| `/signals` | HTTP 200, Published Signals / Top 5 Core / Next 2 Context visible, no raw schema error |
| Admin route | HTTP 200 unauthenticated sign-in gate, no public schema details |
| Cron endpoint | HTTP 401 unauthorized |

Public pages did not expose missing PRD-53 column names. No newly created draft rows were visible because no draft rows were inserted.

## Admin Workflow Inspection

Authenticated admin workflow validation was not completed.

Reasons:

- `draft_only` inserted zero review rows because the supported storage client lacked `SUPABASE_SERVICE_ROLE_KEY`.
- The available admin route evidence was unauthenticated and showed the sign-in gate.
- No mutation actions were clicked or simulated.

The exact next admin validation remains: after the service-role env blocker is fixed and `draft_only` creates non-live rows, inspect `/dashboard/signals/editorial-review` with authenticated admin access and verify WITM status/failure visibility, rewrite-required state, candidate eligibility, and publish-disabled readiness state.

## Final-Slate Readiness Check

The final-slate readiness validator was run locally against the dry-run proposed seven rows with hypothetical approved editorial status, only to evaluate structural and WITM readiness. It did not create or mutate production rows.

Result: not ready.

Global failure reasons:

- Row 2 has WITM status `requires_human_rewrite`.
- Row 2 has unresolved WITM failure details.
- Row 7 has WITM status `requires_human_rewrite`.
- Row 7 has unresolved WITM failure details.

Row-level failure reasons:

| Rank | Reason |
| --- | --- |
| 2 | `witm_failed`: Row 2 has WITM status `requires_human_rewrite`. |
| 2 | `witm_failure_details`: Core WITM is attached to a retrospective or meta-story that needs selection review before publication. |
| 7 | `witm_failed`: Row 7 has WITM status `requires_human_rewrite`. |
| 7 | `witm_failure_details`: Core/Context WITM makes a structural claim without enough accessible source evidence. |

Publish remains blocked by WITM rewrite requirements even after the environment blocker is fixed and draft rows can be created.

## Cron Status

Cron remained disabled/not runnable from this validation context.

The unauthenticated cron endpoint returned HTTP `401` with an unauthorized response. No cron execution was triggered.

## Confirmation Of No Publish

No publish occurred.

Specifically:

- no supported publish action was run
- no rows were made live
- no `published_at` value was set
- no prior live rows were archived
- no published-slate audit row was created
- no cron ran
- no MVP measurement started

## Validation

| Command | Result |
| --- | --- |
| `git diff --check` | Passed. |
| `python3 scripts/validate-feature-system-csv.py` | Passed with pre-existing PRD slug warnings for PRD-32, PRD-37, and PRD-38. |
| `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name codex/prd-53-authorized-controlled-draft-only --pr-title "PRD-53 authorized controlled draft only"` | Passed. |
| `python3 scripts/release-governance-gate.py --diff-mode local --branch-name codex/prd-53-authorized-controlled-draft-only --pr-title "PRD-53 authorized controlled draft only"` | Passed. |
| `npm run lint` | Passed. |
| `npm run test` | Passed: 73 test files and 575 tests. |
| `npm run build` | Passed. |

Validation notes:

- `npm install` was run because the dedicated worktree did not have `node_modules` installed before the controlled pipeline command. It completed with npm audit warnings reporting 2 vulnerabilities; no dependency or lockfile changes were committed.
- `npm run test` emitted repeated `--localstorage-file` warnings from the test environment, but all tests passed.
- `npm run build` emitted the existing multiple-lockfile workspace-root warning and a module-type warning for `tailwind.config.ts`, but the production build passed.

## Result

```text
controlled_draft_only_blocked
```

## Exact Next Task

Fix production/local operator environment access for the supported `draft_only` path by providing a non-blank `SUPABASE_SERVICE_ROLE_KEY` to the execution environment or to the Vercel production environment that is pulled for controlled operations.

Then rerun only the authorized controlled `draft_only` step:

```text
CONTROLLED_PRODUCTION_DRAFT_ONLY_APPROVED=true
```

Do not include production publish authorization in the same prompt. Publish remains blocked until non-live rows exist, admin workflow validation is completed, and WITM rewrite-required rows are resolved or replaced through the supported workflow.
