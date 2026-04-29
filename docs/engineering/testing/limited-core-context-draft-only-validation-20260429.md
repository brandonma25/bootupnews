# Limited Core/Context Draft-Only Validation - 2026-04-29

## Executive Summary

- Effective change type: remediation / controlled validation.
- Canonical PRD required: no.
- Source of truth: PR #141 controlled-runner cap remediation plus the post-PR139 production dry-run validation.
- Result: blocked from admin-review promotion because the `unsupported_structural_claim` failure metadata was not preserved on the flagged Core row after draft persistence.
- Authorized write performed: exactly seven non-live draft review rows were inserted into `signal_posts`.
- No Depth rows were inserted.
- No public publish occurred.
- No live rows were created.
- No existing live rows were modified.
- Public homepage and `/signals` remained safe; live public rows still resolve to the April 26 published briefing.

Readiness label:

```text
block_admin_review_due_to_missing_witm_failure_metadata
```

## Source of Truth

- PR #141: `chore(validation): align controlled draft cap with Core/Context slate`
- PR #141 merge commit: `efb1eea94d0452863b487c5e5b796635380597b8`
- Production deployment URL: `https://bootup-d58ldcsvq-brandonma25s-projects.vercel.app`
- Production alias checked: `https://daily-intelligence-aggregator-ybs9.vercel.app`
- Prior post-PR139 dry-run run ID: `post-pr139-context-witm-remediation-dryrun-20260429T0546Z`
- Prior artifact:
  `/Users/bm/dev/worktrees/daily-intelligence-aggregator-post-pr139-context-witm-post-deploy-validation/.pipeline-runs/controlled-pipeline-dry_run-post-pr139-context-witm-remediation-dryrun-20260429T0546Z-2026-04-29T05-47-11-859Z.json`

## Why No Canonical PRD Is Required

This was remediation / controlled validation under existing Boot Up product governance. The product target is the curated Top 5 Core Signals plus Next 2 Context Signals. The work validated an existing controlled `draft_only` path after PR #141 aligned the controlled-runner cap with that seven-row product target. No new user-facing feature, source expansion, schema change, ranking threshold change, WITM threshold change, URL/domain/env migration, or public behavior change was introduced.

## PR #141 Merge And Deploy

- PR status: merged.
- Merge commit: `efb1eea94d0452863b487c5e5b796635380597b8`.
- Final PR checks observed green before merge:
  - `feature-system-csv-validation`
  - `release-governance-gate`
  - `pr-lint`
  - `pr-unit-tests`
  - `pr-build`
  - `pr-e2e-chromium`
  - `pr-e2e-webkit`
  - `pr-summary`
  - Vercel
  - Vercel Preview Comments
- Production deployment status: READY.
- Branch deletion: remote branch remained present after merge because local worktree safety blocked branch cleanup. No force deletion was attempted.

## Production Baseline

Before the write-mode validation:

- `/` on production alias returned HTTP `200`.
- `/signals` on production alias returned HTTP `200`.
- PR #141 deployment homepage returned HTTP `200`.
- Existing live published rows count: `20`.
- Existing live published rows for `2026-04-29`: `0`.
- Existing `signal_posts` rows for `2026-04-29`: `0`.
- Existing matching rows by selected title/source URL: `0`.
- Existing `pipeline_article_candidates` rows for limited Core/Context run IDs: `0`.

## Pre-Write Dry Run

- Run ID: `pre-limited-core-context-draft-only-dryrun-20260429T20260429T0642Z`
- Artifact:
  `/Users/bm/dev/worktrees/daily-intelligence-aggregator-limited-core-context-draft-only-validation-20260429/.pipeline-runs/controlled-pipeline-dry_run-pre-limited-core-context-draft-only-dryrun-20260429T20260429T0642Z-2026-04-29T06-43-02-895Z.json`
- Mode: `dry_run`
- `insertedCount`: `0`
- Active/public source count: `39`
- Candidate count: `90`
- Story cluster count: `90`
- Selected distribution: `5 Core / 2 Context / 13 Depth`
- Core WITM: `4 passed / 1 requires_human_rewrite`
- Context WITM: `2 passed / 0 requires_human_rewrite`
- `candidate_pool_insufficient`: `false`
- Remaining Core caveat: `unsupported_structural_claim` on `Economic Letter Countdown: Most Read Topics from 2025`
- Reuters Business still reported `rss_retry_exhausted`.

## Draft-Only Command

Exact command shape used, with credential loading redacted:

```bash
PIPELINE_RUN_MODE=draft_only \
PIPELINE_TARGET_ENV=production \
ALLOW_PRODUCTION_PIPELINE_TEST=true \
PIPELINE_CRON_DISABLED_CONFIRMED=true \
BRIEFING_DATE_OVERRIDE=2026-04-29 \
PIPELINE_TEST_RUN_ID=limited-core-context-draft-only-20260429T20260429T0645Z \
PIPELINE_DRAFT_TIER_ALLOWLIST=core,context \
PIPELINE_DRAFT_MAX_ROWS=7 \
PIPELINE_REPLAY_ARTIFACT_PATH=<pre-write-dry-run-artifact> \
PIPELINE_REPLAY_EXPECTED_RUN_ID=pipeline-1777444977251 \
npm run pipeline:controlled-test
```

Operational note: Vercel env pull returned the service-role value as an empty protected value, so the production Supabase service-role key was loaded through the authenticated Supabase CLI into a temporary local env file. Secret values were not printed, were not committed, and no remote Vercel or Supabase settings were changed.

## Draft-Only Result

- Run ID: `limited-core-context-draft-only-20260429T20260429T0645Z`
- Artifact:
  `/Users/bm/dev/worktrees/daily-intelligence-aggregator-limited-core-context-draft-only-validation-20260429/.pipeline-runs/controlled-pipeline-draft_only-limited-core-context-draft-only-20260429T20260429T0645Z-2026-04-29T06-45-18-768Z.json`
- Mode: `draft_only`
- Table affected: `signal_posts`
- `insertedCount`: `7`
- Inserted rows all had:
  - `editorial_status=needs_review`
  - `is_live=false`
  - `published_at=null`
  - source attribution present
  - source URL present
  - AI why-it-matters text present
- Table not affected: `pipeline_article_candidates`
- `pipeline_article_candidates` limited-run count after validation: `0`

## Inserted Rows

| Rank | Tier | Title | Source | WITM status in source artifact | WITM status after DB readback |
| --- | --- | --- | --- | --- | --- |
| 1 | Core | Scoop: White House workshops plan to bring back Anthropic | Axios | passed | passed |
| 2 | Core | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | requires_human_rewrite / `unsupported_structural_claim` | passed |
| 3 | Core | Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism | Heatmap | passed | passed |
| 4 | Core | A Closer Look at Emerging Market Resilience During Recent Shocks | Liberty Street Economics | passed | passed |
| 5 | Core | The R*-Labor Share Nexus | Liberty Street Economics | passed | passed |
| 6 | Context | Trumps Shady Wind Deals Arent Over Yet | Heatmap | passed | passed |
| 7 | Context | Monetary Policy in a Slow (to No) Growth Labor Market | SF Fed Research and Insights | passed | passed |

## Blocker

The selected slate was safe enough to insert as non-live review drafts, but the failure metadata preservation gate did not pass.

Expected:

- `Economic Letter Countdown: Most Read Topics from 2025` remains `requires_human_rewrite`.
- `why_it_matters_validation_failures` includes `unsupported_structural_claim`.
- Admin review can see that the row requires selection/editorial review before publication.

Observed after DB readback:

- `why_it_matters_validation_status=passed`
- `why_it_matters_validation_failures=[]`
- `why_it_matters_validation_details=[]`

This means replay/draft persistence recomputed or normalized WITM validation instead of preserving the dry-run artifact's review-required metadata. No corrective production mutation was attempted.

## Admin Review Visibility

- Database readback confirms seven inserted rows are present in the review queue state through `editorial_status=needs_review`.
- Unauthenticated admin route check returned HTTP `200`, but private admin rows were not rendered to the unauthenticated request.
- Admin review promotion is blocked because the flagged Core row's failure metadata is not visible in the stored draft row.

## Public Surface Verification

After the write-mode validation:

- `/` on production alias returned HTTP `200`.
- `/signals` on production alias returned HTTP `200`.
- PR #141 deployment homepage returned HTTP `200`.
- No inserted draft title appeared in public homepage or `/signals` HTML.
- Live published rows count remained `20`.
- Live published rows for `2026-04-29` remained `0`.
- Latest live public briefing date remained `2026-04-26`.
- Public live rows remained the April 26 clean briefing.

The raw HTML hashes changed between before/after requests, but the live DB source and inserted-title scan confirm the draft rows did not become publicly visible.

## Write-Scope Confirmation

- Only authorized non-live draft review rows were inserted.
- No live rows were created.
- No publish occurred.
- No public surface changed to show draft rows.
- No existing live rows were modified.
- No Depth rows were inserted.
- No `pipeline_article_candidates` rows were inserted.
- No source-governance or source-list files were changed.
- No active/public source counts were changed.
- No URL/domain/env migration work occurred.
- No Vercel settings or environment variables were changed.
- No cron was run.
- No `/api/cron/fetch-news` call was made.

## Next Recommended Gate

Do not proceed to admin review until draft persistence preserves source-artifact WITM failure metadata.

Recommended next remediation:

```text
remediate draft/replay persistence so WITM validation status, failures, and details from controlled dry-run artifacts remain visible on draft_only rows
```

After that remediation merges and deploys, run a narrow non-write replay/draft persistence test first. Then decide whether to retry the limited Core/Context-only draft insertion or repair the existing seven non-live drafts through an explicitly authorized metadata correction.
