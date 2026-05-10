# WITM Metadata Targeted Repair Validation - 2026-04-29

## Executive Summary

- Effective change type: remediation / controlled validation.
- Canonical PRD required: no.
- Source of truth: PR #143, PR #142 limited Core/Context draft-only validation, and the post-PR139 dry-run artifact.
- Result: one metadata-only repair was applied to the existing non-live Core draft row that had lost WITM failure metadata.
- Readiness label: `proceed_to_admin_review_of_limited_core_context_drafts`.
- No `draft_only` rerun occurred.
- No rows were inserted, deleted, published, or made live.
- No Depth rows were touched.
- Public homepage and `/signals` did not expose the draft rows.

## Source Of Truth

- PR #143: `chore(remediation): preserve WITM metadata in draft persistence`
  `https://github.com/brandonma25/daily-intelligence-aggregator/pull/143`
- PR #143 merge commit: `a25328a8378f73082e0e10cc35989c11c1c7c0c8`
- PR #142 limited Core/Context draft-only validation report.
- Post-PR139 dry-run artifact:
  `/Users/bm/dev/worktrees/daily-intelligence-aggregator-post-pr139-context-witm-post-deploy-validation/.pipeline-runs/controlled-pipeline-dry_run-post-pr139-context-witm-remediation-dryrun-20260429T0546Z-2026-04-29T05-47-11-859Z.json`

## Why No Canonical PRD Is Required

This was remediation / controlled validation. It repaired existing review metadata for the already-approved limited Core/Context draft validation path. It did not introduce a new product capability, source, source-governance change, schema migration, ranking threshold, WITM threshold, public UI behavior, URL/domain/env change, or publish behavior.

## PR #143 Merge And Deployment

- PR #143 started as draft, passed required checks, was marked ready, and was merged.
- Required checks observed green before merge:
  - `feature-system-csv-validation`
  - `release-governance-gate`
  - `pr-lint`
  - `pr-unit-tests`
  - `pr-build`
  - `pr-e2e-chromium`
  - `pr-e2e-webkit`
  - `pr-summary`
  - Vercel
- Merge commit: `a25328a8378f73082e0e10cc35989c11c1c7c0c8`
- Production deployment status: READY.
- Deployment URL: `https://bootup-3edo9xd4n-brandonma25s-projects.vercel.app`
- Production alias checked: `https://bootupnews.vercel.app`
- Deployment ID: `dpl_GcfxvqMioen2pjVra3hpB2k5kb4A`
- The PR #143 source branch was not deleted because the local branch is still attached to a worktree.

## Production Baseline

Before the metadata repair:

- `/` returned HTTP `200`.
- `/signals` returned HTTP `200`.
- PR #143 deployment `/` returned HTTP `200`.
- PR #143 deployment `/signals` returned HTTP `200`.
- Existing `signal_posts` rows for `2026-04-29`: `7`.
- Existing live/published rows for `2026-04-29`: `0`.
- Matching `pipeline_article_candidates` rows for the limited validation / WITM metadata repair run identifiers: `0`.

## Existing Seven-Row State Before Repair

Read-only inspection identified exactly seven existing `2026-04-29` draft rows matching the limited Core/Context validation:

| Row ID | Rank | Title | Source | Status before repair | Failures before repair |
| --- | --- | --- | --- | --- | --- |
| `c402254d-d34b-45a2-a8d7-3ef56c4febd8` | 1 | Scoop: White House workshops plan to bring back Anthropic | Axios | `passed` | `[]` |
| `e52bdbe4-cbf9-42ce-bb0e-e57c5011ba39` | 2 | Economic Letter Countdown: Most Read Topics from 2025 | SF Fed Research and Insights | `passed` | `[]` |
| `25f9fa0a-d2c0-445f-9f3f-4c47b2c452eb` | 3 | Democrats Need a Critical Minerals Policy Beyond Anti-Trumpism | Heatmap | `passed` | `[]` |
| `d54873ce-b024-4487-b12f-ab76c5dcc888` | 4 | A Closer Look at Emerging Market Resilience During Recent Shocks | Liberty Street Economics | `passed` | `[]` |
| `d3e7afa2-bfe4-4232-8669-ae75b7a6380b` | 5 | The R*-Labor Share Nexus | Liberty Street Economics | `passed` | `[]` |
| `ee0a7572-caa0-4256-aa32-3b16056b7263` | 6 | Trumps Shady Wind Deals Arent Over Yet | Heatmap | `passed` | `[]` |
| `ff606539-f435-424f-bdd6-cb6f3833467d` | 7 | Monetary Policy in a Slow (to No) Growth Labor Market | SF Fed Research and Insights | `passed` | `[]` |

All seven rows were:

- `editorial_status=needs_review`
- `is_live=false`
- `published_at=null`
- Core/Context rows from the controlled source artifact
- not public

No Depth row was present in the `2026-04-29` draft set.

## Metadata Missing Before Repair

The dry-run artifact expected the rank 2 Core row to remain review-required:

- Title: `Economic Letter Countdown: Most Read Topics from 2025`
- Source: `SF Fed Research and Insights`
- Expected status: `requires_human_rewrite`
- Expected failure: `unsupported_structural_claim`
- Expected detail: `unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication.`

Persisted state before repair was incorrect:

- `why_it_matters_validation_status=passed`
- `why_it_matters_validation_failures=[]`
- `why_it_matters_validation_details=[]`

The other six rows matched the source artifact with passing WITM metadata.

## Repair Diff

Only one row required metadata repair:

- Row ID: `e52bdbe4-cbf9-42ce-bb0e-e57c5011ba39`
- Date: `2026-04-29`
- Rank: `2`
- Title: `Economic Letter Countdown: Most Read Topics from 2025`
- Source: `SF Fed Research and Insights`
- Source URL:
  `https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2025/12/19/economic-letter-countdown-most-read-topics-2025/`

Fields updated:

- `why_it_matters_validation_status`
- `why_it_matters_validation_failures`
- `why_it_matters_validation_details`

Before:

```json
{
  "why_it_matters_validation_status": "passed",
  "why_it_matters_validation_failures": [],
  "why_it_matters_validation_details": []
}
```

After:

```json
{
  "why_it_matters_validation_status": "requires_human_rewrite",
  "why_it_matters_validation_failures": ["unsupported_structural_claim"],
  "why_it_matters_validation_details": [
    "unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication."
  ]
}
```

## Update Command

The update used the existing service-role database path with credentials loaded locally and not printed. The command shape was:

```text
update signal_posts
set
  why_it_matters_validation_status = 'requires_human_rewrite',
  why_it_matters_validation_failures = ['unsupported_structural_claim'],
  why_it_matters_validation_details = [
    'unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication.'
  ]
where
  id = 'e52bdbe4-cbf9-42ce-bb0e-e57c5011ba39'
  and briefing_date = '2026-04-29'
  and rank = 2
  and title = 'Economic Letter Countdown: Most Read Topics from 2025'
  and source_name = 'SF Fed Research and Insights'
  and source_url = 'https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2025/12/19/economic-letter-countdown-most-read-topics-2025/'
  and editorial_status = 'needs_review'
  and is_live = false
  and published_at is null
returning id, validation metadata, editorial_status, is_live, published_at;
```

Affected row count: `1`.

## Post-Repair Verification

After the repair:

- Selected draft rows for `2026-04-29`: `7`.
- All rows for `2026-04-29`: `7`.
- Live rows for `2026-04-29`: `0`.
- Published rows for `2026-04-29`: `0`.
- Matching `pipeline_article_candidates` rows: `0`.
- All seven rows remain `editorial_status=needs_review`.
- All seven rows remain `is_live=false`.
- All seven rows remain `published_at=null`.
- The rank 2 Core row now has `why_it_matters_validation_status=requires_human_rewrite`.
- The rank 2 Core row has `why_it_matters_validation_failures=["unsupported_structural_claim"]`.
- The rank 2 Core row has the retrospective/meta-story selection review detail.
- The other six rows remain `passed`.
- No row was inserted.
- No row was deleted.
- No live row was created or modified.
- No Depth row was touched.
- No `pipeline_article_candidates` row was inserted or updated.

## Admin Review Visibility

Admin review visibility was verified through the database-backed review queue state:

- The seven rows are query-accessible as `needs_review` draft rows.
- The flagged Core row is distinguishable from the six passing rows through `requires_human_rewrite`.
- `unsupported_structural_claim` is visible in the stored failure metadata.
- No row is public.
- No row is live.
- No row has `published_at` set.
- Unauthenticated `/dashboard/signals/editorial-review` returned HTTP `200`, but private draft rows were not rendered to the unauthenticated response. No authenticated admin UI action was performed.
- Publish remains a separate action and was not triggered.

## Public Surface Verification

After the metadata repair:

- `/` returned HTTP `200`.
- `/signals` returned HTTP `200`.
- The inserted draft titles were absent from both public responses checked:
  - `Economic Letter Countdown`
  - `Scoop: White House workshops`
  - `Trumps Shady Wind Deals`
- Live published row count remained `20`.
- Latest live public briefing date remained `2026-04-26`.
- Live rows remained the April 26 published set.

The raw HTML hashes changed between before/after requests because the pages are dynamically rendered, so public-content safety was verified by live-row readback and draft-title absence rather than byte-for-byte HTML equality.

## Explicit Scope Confirmation

- No `draft_only` rerun occurred.
- No `signal_posts` rows were inserted.
- No `pipeline_article_candidates` rows were inserted.
- No rows were deleted or reinserted.
- No live rows were created.
- No existing live rows were modified.
- No publish occurred.
- No cron ran.
- No Depth rows were touched.
- No public homepage content was mutated to expose draft rows.
- No public `/signals` content was mutated to expose draft rows.
- No source-governance or source-list files were changed.
- No active/public source counts changed.
- No URL/domain/env migration occurred.
- No Vercel settings or environment variables were changed.
- No GitHub settings were changed beyond normal PR merge/report handling.
- No secrets were printed or committed.

## Recommended Next Gate

Proceed to admin review of the limited Core/Context drafts. The flagged Core row should remain review-required and should not be published unless an editor rewrites, replaces, or rejects it.

Readiness label:

```text
proceed_to_admin_review_of_limited_core_context_drafts
```

