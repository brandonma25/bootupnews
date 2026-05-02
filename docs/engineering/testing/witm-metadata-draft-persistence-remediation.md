# WITM Metadata Draft Persistence Remediation

## Executive Summary

- Effective change type: remediation / alignment.
- Canonical PRD required: no.
- Source of truth: PR #142 limited Core/Context draft-only validation result, PR #141 controlled-runner cap remediation, and the post-PR139 controlled dry-run artifact.
- Scope: preserve WITM validation metadata that already exists in controlled dry-run artifacts when those artifacts are replayed into `draft_only` persistence.
- Result: code remediation and tests preserve pass/rewrite status, failure reasons, and validation details through replay, draft row construction, and `signal_posts` insert mapping.
- No `draft_only` rerun occurred.
- No production rows were inserted, updated, deleted, published, or made live by this remediation.

## Source of Truth

- PR #142 validation report: `docs/engineering/testing/limited-core-context-draft-only-validation-20260429.md`
- PR #141 controlled-runner cap remediation: `efb1eea94d0452863b487c5e5b796635380597b8`
- Post-PR139 dry-run artifact:
  `/Users/bm/dev/worktrees/daily-intelligence-aggregator-post-pr139-context-witm-post-deploy-validation/.pipeline-runs/controlled-pipeline-dry_run-post-pr139-context-witm-remediation-dryrun-20260429T0546Z-2026-04-29T05-47-11-859Z.json`
- Product standard: Boot Up is a curated 7-story briefing, Top 5 Core plus Next 2 Context, with explicit structural why-it-matters reasoning.

## Why No Canonical PRD Is Required

This is remediation / alignment under existing product and operations governance. The change does not add a new product capability, source, public surface, schema, ranking threshold, WITM threshold, source-accessibility gate, URL/domain setting, or admin workflow. It preserves metadata that the existing controlled pipeline already generated and that the existing admin review surface needs to make non-live draft rows reviewable.

## Limited Draft-Only Result Summary

The prior limited Core/Context `draft_only` validation inserted exactly seven non-live review rows into `signal_posts`:

- 5 Core rows.
- 2 Context rows.
- All rows had `editorial_status=needs_review`.
- All rows had `is_live=false`.
- All rows had `published_at=null`.
- No Depth rows were inserted.
- No publish occurred.
- No cron ran.
- No public homepage or `/signals` content changed.
- `pipeline_article_candidates` was not affected.

The validation remained blocked because one Core row lost expected WITM failure metadata after persistence.

## Metadata Loss Blocker

Expected from the dry-run artifact:

| Rank | Tier | Title | Source | Expected status | Expected failure |
| --- | --- | --- | --- | --- | --- |
| 2 | Core | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | `requires_human_rewrite` | `unsupported_structural_claim` |

Observed in the persisted draft row:

- `why_it_matters_validation_status=passed`
- `why_it_matters_validation_failures=[]`
- `why_it_matters_validation_details=[]`

This made the row appear cleaner than the controlled source artifact allowed. The row was still non-live and unpublished, but it was not safe to promote into admin review until the metadata preservation bug was remediated.

## Root Cause

The metadata was not missing from the dry-run artifact and the database schema already had fields for it:

- `why_it_matters_validation_status`
- `why_it_matters_validation_failures`
- `why_it_matters_validation_details`

The loss occurred in the replay and draft persistence mapping:

1. `src/lib/pipeline/controlled-runner.ts` converted `ControlledPipelineSignalReport` rows into `BriefingItem` values without carrying `validationStatus`, `validationFailures`, or `validationDetails`.
2. `src/lib/signals-editorial.ts` then recomputed WITM validation from text while building draft candidates.
3. `persistSignalPostCandidates()` recomputed validation again before insert, which converted the artifact's review-required row into a passing row because the text alone passed the deterministic validator.

## Code Remediation

The remediation preserves explicit artifact metadata rather than deriving it again later:

- `BriefingItem` now supports optional `whyItMattersValidation`.
- Controlled replay maps `validationStatus`, `validationFailures`, and `validationDetails` into `BriefingItem.whyItMattersValidation`.
- Replay artifacts now fail closed if selected Core/Context rows omit validation metadata.
- Controlled report generation uses supplied `whyItMattersValidation` when present.
- Draft candidate construction uses supplied `whyItMattersValidation` when present and falls back to deterministic validation only when no supplied metadata exists.
- `signal_posts` insert mapping writes the already-derived `EditorialSignalPost` WITM status, failures, and details instead of re-flagging from text.
- Persistence still forces `editorial_status=needs_review`, `is_live=false`, and `published_at=null`.

## Files Changed

- `src/lib/types.ts`
- `src/lib/signals-editorial.ts`
- `src/lib/signals-editorial.test.ts`
- `src/lib/pipeline/controlled-execution.ts`
- `src/lib/pipeline/controlled-runner.ts`
- `src/lib/pipeline/controlled-runner.test.ts`
- `docs/engineering/testing/witm-metadata-draft-persistence-remediation.md`

## Tests Added

- Draft-only persistence preserves supplied passing WITM validation metadata.
- Draft-only persistence preserves supplied `requires_human_rewrite` metadata.
- `unsupported_structural_claim` survives draft row mapping into `signal_posts`.
- Empty supplied failure arrays do not silently convert rewrite-required rows into passing rows.
- Replay draft-only mode preserves WITM metadata from the source artifact.
- Replay report output preserves the same WITM metadata.
- Depth rows remain excluded from the limited Core/Context replay path.

Existing PR #141 cap behavior remains covered by controlled-execution tests: `PIPELINE_DRAFT_MAX_ROWS=7` is valid only for exact `core,context` draft-only allowlist, while 4/5/6, greater than 7, depth-including allowlists, and publish/normal mode remain rejected.

## Existing Seven-Row State

Read-only database inspection confirmed the existing limited draft-only rows:

| Row ID | Rank | Tier | Title | Persisted status | Expected status |
| --- | --- | --- | --- | --- | --- |
| `c402254d-d34b-45a2-a8d7-3ef56c4febd8` | 1 | Core | Scoop: White House workshops plan to bring back Anthropic | `passed` | `passed` |
| `e52bdbe4-cbf9-42ce-bb0e-e57c5011ba39` | 2 | Core | Economic Letter Countdown: Most Read Topics from 2025 | `passed` | `requires_human_rewrite` |
| `25f9fa0a-d2c0-445f-9f3f-4c47b2c452eb` | 3 | Core | Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism | `passed` | `passed` |
| `d54873ce-b024-4487-b12f-ab76c5dcc888` | 4 | Core | A Closer Look at Emerging Market Resilience During Recent Shocks | `passed` | `passed` |
| `d3e7afa2-bfe4-4232-8669-ae75b7a6380b` | 5 | Core | The R*-Labor Share Nexus | `passed` | `passed` |
| `ee0a7572-caa0-4256-aa32-3b16056b7263` | 6 | Context | Trumps Shady Wind Deals Arent Over Yet | `passed` | `passed` |
| `ff606539-f435-424f-bdd6-cb6f3833467d` | 7 | Context | Monetary Policy in a Slow (to No) Growth Labor Market | `passed` | `passed` |

All seven rows are Core/Context only, `needs_review`, non-live, and unpublished. No Depth row from the run was found.

## Dry-Run-Only Metadata Repair Plan

This remediation does not execute the repair. The next separately approved operation should be a metadata-only update plan for the existing non-live draft row.

Proposed target row:

- `id = e52bdbe4-cbf9-42ce-bb0e-e57c5011ba39`
- `briefing_date = 2026-04-29`
- `rank = 2`
- `title = Economic Letter Countdown: Most Read Topics from 2025`
- `editorial_status = needs_review`
- `is_live = false`
- `published_at IS NULL`

Proposed metadata-only update:

- Set `why_it_matters_validation_status` to `requires_human_rewrite`.
- Set `why_it_matters_validation_failures` to `["unsupported_structural_claim"]`.
- Set `why_it_matters_validation_details` to `["unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication."]`.

No update is proposed for the other six rows because their persisted passing status matches the source artifact.

Required repair safeguards:

- Affect only the existing non-live `2026-04-29` Core/Context draft row listed above.
- Do not create rows.
- Do not delete rows.
- Do not publish rows.
- Do not change `is_live`.
- Do not change `published_at`.
- Do not change `editorial_status`.
- Do not touch Depth rows.
- Do not touch existing live rows.
- Do not change public homepage or `/signals` content.

## Validation

Completed before PR:

- `git diff --check` passed.
- `npm run lint` passed.
- `npm run test -- src/lib/signals-editorial.test.ts src/lib/pipeline/controlled-runner.test.ts src/lib/pipeline/controlled-execution.test.ts` passed: 3 files / 71 tests.
- `npm run test` passed: 72 files / 529 tests.
- `npm run build` passed. Existing workspace-root and module-type warnings remained out of scope.
- `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings.
- `python3 scripts/release-governance-gate.py --branch-name codex/preserve-witm-metadata-draft-persistence --pr-title "chore(remediation): preserve WITM metadata in draft persistence"` passed. The gate classified the change as `material-feature-change` with documented coverage.

## Explicit No-Write Confirmation

- No `draft_only` rerun occurred.
- No `signal_posts` inserts occurred during this remediation.
- No `signal_posts` updates occurred during this remediation.
- No `pipeline_article_candidates` inserts occurred.
- No production rows were updated.
- No rows were deleted or reinserted.
- No rows were published.
- No live rows were created.
- No existing live rows were modified.
- No cron ran.
- No `/api/cron/fetch-news` call was made.
- No source-governance or source-list files were changed.
- No URL/domain/env migration work occurred.
- No Vercel settings or environment variables were changed.
- No secrets were printed or committed.

## Recommended Next Gate

After this remediation is reviewed, merged, and deployed, run a separately authorized metadata-only repair for the existing seven non-live draft rows, scoped to the single flagged Core row if the six passing rows still match the source artifact. Do not rerun `draft_only`.
