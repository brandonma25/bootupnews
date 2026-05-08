# Deprecated Folder Removal And Backfill Closeout

## 1. Objective

Complete the hard consolidation of deprecated duplicate documentation folders after GitHub repo documentation became canonical. This branch verifies that `docs/bugs/` and `docs/changes/` contain only redirect-only legacy records, removes those duplicate files, rewrites active references to canonical paths, and performs a final remediation-document backfill scan for recent merged PRs.

## 2. Baseline

- PR #191 is merged and made GitHub repo documentation canonical for bug-fix, remediation, validation, release, governance, PRD/feature, and branch-cleanup history.
- PR #192 is merged and added canonical bug-fix records for PR #141 and PR #143.
- Google Sheet and Google Work Log records are historical references only and were not used as canonical inputs.

## 3. Deprecated Folder Audit Result

All tracked files under `docs/bugs/` and `docs/changes/` were redirect-only legacy records. No unique durable content remained in those files after the PR #191 and PR #192 consolidations.

| Legacy file path | Canonical replacement path | Redirect-only? | Active repo references found? | Action |
| --- | --- | --- | --- | --- |
| `docs/bugs/editorial-history-ordering.md` | `docs/engineering/bug-fixes/editorial-history-ordering.md` | yes | Active canonical references were rewritten; historical tracker-sync reference retained by scope. | delete legacy file |
| `docs/bugs/homepage-tabs-signal-regression-politics-tldr.md` | `docs/engineering/bug-fixes/homepage-tabs-signal-regression-politics-tldr.md` | yes | Active canonical references were rewritten. | delete legacy file |
| `docs/bugs/2026-04-26-regression-static-stories-editorial-page.md` | `docs/engineering/bug-fixes/2026-04-26-static-stories-editorial-page-regression.md` | yes | Active canonical references were rewritten; historical tracker-sync reference retained by scope. | delete legacy file |
| `docs/changes/001-public-source-manifest-pr.md` | `docs/product/prd/prd-54-public-source-manifest.md`, `docs/adr/001-public-source-manifest.md`, `docs/engineering/change-records/public-source-manifest-governance.md` | yes | No blocking active references. | delete legacy file |
| `docs/changes/002-manifest-ingestion-unblock-pr.md` | `docs/engineering/change-records/manifest-ingestion-unblock.md` | yes | Active canonical references were rewritten. | delete legacy file |
| `docs/changes/003-reuters-verification-blocker.md` | `docs/engineering/testing/2026-04-23-reuters-world-preview-verification-blocker.md` | yes | Active canonical references were rewritten. | delete legacy file |
| `docs/changes/004-bbc-world-verification-success.md` | `docs/engineering/testing/2026-04-23-bbc-world-preview-verification-success.md` | yes | Active canonical references were rewritten. | delete legacy file |
| `docs/changes/005-category-1-supply-expansion-pr.md` | `docs/engineering/change-records/category-1-public-source-supply-expansion.md`, `docs/engineering/testing/2026-04-23-bbc-world-preview-verification-success.md`, `docs/product/prd/prd-54-public-source-manifest.md` | yes | No blocking active references. | delete legacy file |
| `docs/changes/006-homepage-volume-layers-pr.md` | `docs/product/prd/prd-57-homepage-volume-layers.md`, `docs/engineering/change-records/homepage-volume-layers-governance-coverage.md` | yes | No blocking active references. | delete legacy file |

General governance references that forbid new `docs/bugs/` and `docs/changes/` records remain valid and were left in place. Historical `docs/operations/tracker-sync/` references were not edited because tracker-sync files are non-canonical historical compatibility records and are outside this branch's scope.

## 4. Files Deleted Or Retained

Deleted:

- `docs/bugs/2026-04-26-regression-static-stories-editorial-page.md`
- `docs/bugs/editorial-history-ordering.md`
- `docs/bugs/homepage-tabs-signal-regression-politics-tldr.md`
- `docs/changes/001-public-source-manifest-pr.md`
- `docs/changes/002-manifest-ingestion-unblock-pr.md`
- `docs/changes/003-reuters-verification-blocker.md`
- `docs/changes/004-bbc-world-verification-success.md`
- `docs/changes/005-category-1-supply-expansion-pr.md`
- `docs/changes/006-homepage-volume-layers-pr.md`

Retained:

- No tracked files remain under `docs/bugs/` or `docs/changes/`.
- `docs/operations/tracker-sync/` was retained untouched as historical compatibility.

## 5. Reference Rewrites Performed

- Updated canonical bug-fix records that still described legacy `docs/bugs/` redirects as live files.
- Updated canonical testing records for Reuters and BBC preview validation to identify themselves as the durable records after `docs/changes/` removal.
- Updated the manifest ingestion unblock change record to identify itself as the durable record after `docs/changes/` removal.
- Updated the PR #191 audit to mark `docs/bugs/` and `docs/changes/` as removed deprecated folders instead of retained redirect lanes.
- Updated an active file-changed reference in the editorial panel default-collapse bug-fix record from the deprecated `docs/bugs/` path to the canonical `docs/engineering/bug-fixes/` path.

## 6. Final Missing-Remediation-Doc Scan Result

Reviewed merged PRs #89 through #192 whose title or body matched remediation terms including fix, bug, hotfix, remediation, regression, repair, blocked, schema alignment, migration repair, and validation blocker.

Scan result:

- 80 merged PRs matched the remediation-term query.
- 68 had direct metadata hits in canonical documentation lanes.
- 12 required manual lane review because the existing record did not include the PR number, branch, head SHA, or merge SHA.

No genuinely missing canonical remediation records were found. Likely remediation or validation PRs were already covered by one of the canonical lanes:

- `docs/engineering/bug-fixes/`
- `docs/engineering/change-records/`
- `docs/engineering/testing/`
- `docs/operations/controlled-cycles/`
- `docs/operations/launch-readiness/`
- `docs/product/prd/`

Manual lane-review outcomes:

| PR | Existing lane outcome | Missing canonical record? |
| --- | --- | --- |
| #91 | Documentation upload only; no meaningful remediation record required. | no |
| #95 | Covered by `docs/engineering/change-records/worktree-ownership-hardening-2026-04-22.md`. | no |
| #103 | Redeploy-only PR with no changed files; no durable repo-doc remediation record required. | no |
| #116 | Terminology/audit documentation update; canonical docs were the changed files. | no |
| #124 | Covered by scheduled-fetch and why-it-matters quality-gate change records. | no |
| #132 | Covered by `docs/engineering/change-records/witm-template-quality-remediation.md`. | no |
| #133 | Covered by `docs/engineering/change-records/phase-b-core-context-draft-selector.md`. | no |
| #134 | Covered by `docs/engineering/change-records/phase-b-artifact-replay-remediation.md`. | no |
| #135 | Covered by `docs/engineering/testing/2026-04-29-phase-c-track-a-admin-workflow-safety.md`. | no |
| #136 | Covered by `docs/engineering/change-records/batch-2a-source-governance.md`. | no |
| #140 | Covered by `docs/engineering/testing/post-pr139-context-witm-post-deploy-validation.md`. | no |
| #147 | Covered by `docs/engineering/testing/editor-decision-packet-core-context-drafts-20260429.md`. | no |

The scan confirmed that PR #191 and PR #192 closed the known public-card, PR #141, and PR #143 gaps. Some older pre-template records could be enriched with PR number, branch, or SHA metadata in a future pass, but they do not represent missing canonical records.

## 7. New Records Created

- `docs/engineering/change-records/2026-05-04-deprecated-folder-removal-and-backfill-closeout.md`

No new bug-fix records were needed in this branch.

## 8. Remaining Follow-Ups

- None required for `docs/bugs/` or `docs/changes/`; tracked legacy files were removed.
- Optional future cleanup: enrich older pre-template canonical records with PR/branch/SHA metadata where useful.
- Completed follow-up: dormant Google tracker sync scripts/workflows were decommissioned in `docs/engineering/change-records/2026-05-04-google-sheets-sync-decommission.md`.

## 9. Explicit Non-Actions

- No Google tracker updates.
- No Google Work Log updates.
- No tracker-sync fallback files.
- No runtime code changes.
- No workflow or script changes.
- No production validation.
- No branch deletion.
