# GitHub Source-of-Truth Remediation Docs Audit

## 1. Summary

This branch retires the Google tracker as the active source of truth and makes GitHub repo documentation canonical for remediation, bug-fix, branch-cleanup, validation, release, and governance history.

The cleanup consolidates the highest-risk duplicate bug docs, deprecates `docs/bugs/` and `docs/changes/`, backfills the public-card cleanup remediation record, updates the bug-fix template and governance rules, and creates a branch cleanup reconciliation record for suspected deleted branches.

## 2. Why This Cleanup Exists

The repo had competing documentation lanes:

- `docs/engineering/bug-fixes/`
- `docs/bugs/`
- `docs/changes/`
- `docs/engineering/change-records/`
- `docs/operations/tracker-sync/`

Several standing docs also told agents to update or fall back to Google Sheets during closeout. That conflicted with the new operating decision that GitHub repo docs are canonical and Google Sheet / Google Work Log records are historical references only.

## 3. New Source-Of-Truth Decision

- GitHub repo docs are canonical for bug-fix history, remediation history, branch-cleanup history, PRD/feature governance metadata, validation records, and release/governance records.
- `docs/product/feature-system.csv` remains the repo-side feature/PRD control file.
- Google Sheet / Google Work Log records are retired as tracker source-of-truth systems and may be used only as historical reference inputs.
- Agents must not update Google Sheets, claim tracker updates, or create routine tracker-sync fallback files.
- `docs/operations/tracker-sync/` remains historical compatibility only unless a user explicitly asks for a Google-reference reconciliation artifact.

## 4. Current Folder Inventory

| Folder | Classification | Notes |
| --- | --- | --- |
| `docs/engineering/bug-fixes/` | canonical bug-fix record lane | Canonical for meaningful defects, regressions, hotfixes, and remediations with root cause. Thin records were found and upgraded where high-priority. |
| `docs/engineering/bug-fixes/phase1/` | canonical bug-fix record lane | Existing Phase 1 remediation records; left as-is. |
| `docs/engineering/bug-fixes/templates/` | operating template lane | Template updated with PR/branch/SHA/source-of-truth metadata. |
| `docs/bugs/` | deprecated/non-canonical record lane | Three legacy duplicate bug reports now redirect to canonical bug-fix records. |
| `docs/changes/` | deprecated/non-canonical PR note lane | Six legacy PR/change notes now redirect to canonical PRD, ADR, change-record, or testing records. |
| `docs/engineering/change-records/` | structural change record lane | Canonical for audits, migrations, source-of-truth cleanup, repo-structure cleanup, and governance records. |
| `docs/engineering/testing/` | validation/testing record lane | Canonical for meaningful validation reports and test evidence. Reuters/BBC preview notes were moved here from `docs/changes/`. |
| `docs/engineering/incidents/` | incident lane | Folder was absent in this checkout; routing rules still reserve it for governance/process/release/workflow failures. |
| `docs/operations/tracker-sync/` | tracker fallback, deprecated/non-canonical | Historical compatibility only. Existing files were not deleted in this branch. |
| `docs/operations/branch-cleanup/` | branch cleanup reconciliation lane | New canonical lane for bulk branch deletion and deleted-branch recovery metadata. |
| `docs/operations/controlled-cycles/` | validation/operations record lane | Existing controlled-cycle records remain operational evidence. |
| `docs/operations/launch-readiness/` | validation/operations record lane | Existing launch-readiness records remain operational evidence. |

## 5. Canonical Folder Routing Table

| Work type | Canonical path |
| --- | --- |
| Defects, regressions, hotfixes, remediations with root cause | `docs/engineering/bug-fixes/` |
| Audits, migrations, repo-structure cleanup, source-of-truth cleanup | `docs/engineering/change-records/` |
| Validation/test records | `docs/engineering/testing/` |
| Governance/process/release/workflow failures | `docs/engineering/incidents/` |
| Operating rules/templates/checklists | `docs/engineering/protocols/` |
| Branch cleanup reconciliation | `docs/operations/branch-cleanup/` |
| PRD/feature governance metadata | `docs/product/prd/` plus `docs/product/feature-system.csv` |

## 6. Deprecated / Non-Canonical Folders

| Folder | Decision | Required future behavior |
| --- | --- | --- |
| `docs/bugs/` | Deprecated | Do not create new records. Migrate durable history into `docs/engineering/bug-fixes/` and leave redirects only. |
| `docs/changes/` | Deprecated | Do not create new records. Route PR notes to PR bodies, PRDs, change-records, testing records, or briefs. |
| `docs/operations/tracker-sync/` | Historical compatibility only | Do not create routine fallback files. Use only for explicit Google-reference reconciliation requests. |

## 7. Duplicate Docs Found

| Legacy doc | Canonical doc | Classification | Branch action |
| --- | --- | --- | --- |
| `docs/bugs/editorial-history-ordering.md` | `docs/engineering/bug-fixes/editorial-history-ordering.md` | duplicate legacy bug report | Legacy file replaced with redirect; canonical metadata upgraded. |
| `docs/bugs/homepage-tabs-signal-regression-politics-tldr.md` | `docs/engineering/bug-fixes/homepage-tabs-signal-regression-politics-tldr.md` | duplicate legacy bug report | Legacy file replaced with redirect; canonical metadata upgraded. |
| `docs/bugs/2026-04-26-regression-static-stories-editorial-page.md` | `docs/engineering/bug-fixes/2026-04-26-static-stories-editorial-page-regression.md` | duplicate legacy bug report / thin canonical record | Legacy detail merged into canonical file; legacy file replaced with redirect. |
| `docs/changes/001-public-source-manifest-pr.md` | `docs/product/prd/prd-54-public-source-manifest.md`, `docs/adr/001-public-source-manifest.md`, `docs/engineering/change-records/public-source-manifest-governance.md` | PR note / change note | Legacy file replaced with redirect. |
| `docs/changes/002-manifest-ingestion-unblock-pr.md` | `docs/engineering/change-records/manifest-ingestion-unblock.md` | PR note / structural change record | Canonical change-record added; legacy file replaced with redirect. |
| `docs/changes/003-reuters-verification-blocker.md` | `docs/engineering/testing/2026-04-23-reuters-world-preview-verification-blocker.md` | validation/testing record | Canonical testing record added; legacy file replaced with redirect. |
| `docs/changes/004-bbc-world-verification-success.md` | `docs/engineering/testing/2026-04-23-bbc-world-preview-verification-success.md` | validation/testing record | Canonical testing record added; legacy file replaced with redirect. |
| `docs/changes/005-category-1-supply-expansion-pr.md` | `docs/engineering/change-records/category-1-public-source-supply-expansion.md`, `docs/engineering/testing/2026-04-23-bbc-world-preview-verification-success.md`, `docs/product/prd/prd-54-public-source-manifest.md` | PR note / structural change record | Legacy file replaced with redirect. |
| `docs/changes/006-homepage-volume-layers-pr.md` | `docs/product/prd/prd-57-homepage-volume-layers.md`, `docs/engineering/change-records/homepage-volume-layers-governance-coverage.md` | PR note / change note | Legacy file replaced with redirect. |

## 8. Thin Docs Found

| File | Classification | Action |
| --- | --- | --- |
| `docs/engineering/bug-fixes/2026-04-26-static-stories-editorial-page-regression.md` | thin/incomplete bug-fix record | Expanded with problem, root cause, fix, validation, PR/branch/SHA metadata, remaining risk, and follow-up. |
| `docs/engineering/bug-fixes/final-slate-composer-live-row-actions.md` | canonical bug-fix record missing new metadata fields | Updated with PR #190, branch, head SHA, merge SHA, GitHub source-of-truth status, external reference, Google-reference, and branch cleanup fields. |
| `docs/product/prd/prd-54-public-source-manifest.md` | PRD closeout still referenced Google tracker | Updated closeout language to GitHub documentation closeout. |
| `docs/product/prd/prd-57-homepage-volume-layers.md` | PRD closeout still referenced Google tracker | Updated closeout language to GitHub documentation closeout. |

## 9. Missing Canonical Records Found

| Work | Finding | Action |
| --- | --- | --- |
| PR #180, #181, #187, #189 public-card cleanup sequence | Product-facing remediation lacked one durable canonical bug-fix/remediation record. | Added `docs/engineering/bug-fixes/public-card-cleanup-remediation-2026-05-02.md`. |
| PR #190 final slate composer buttons | Canonical bug-fix record existed but lacked new source-of-truth metadata fields. | Updated `docs/engineering/bug-fixes/final-slate-composer-live-row-actions.md`. |
| PR #141 controlled draft cap and PR #143 WITM metadata persistence | Meaningful remediation exists, but current canonical records live under `docs/engineering/testing/` rather than `docs/engineering/bug-fixes/`. | Left existing records as-is in this branch; remaining follow-up is to decide whether these code remediations need bug-fix records or whether testing/remediation records are sufficient. |
| PR #148 public Context visibility remediation | Canonical bug-fix record exists. | Left as-is. |
| PR #162 public schema preflight fallback | Canonical bug-fix record exists. | Left as-is. |
| PRs #149-#174 PRD-53 controlled-cycle/schema/migration work | Records are split across `docs/engineering/change-records/` and `docs/operations/controlled-cycles/`. | Branch cleanup record flags #166-#149 grouped items for future consolidation review if needed. |
| PRs #175-#179 MVP measurement / launch readiness | Change-record and operations records exist. | Left as-is. |

## 10. Required Migrations / Consolidations

Completed in this branch:

- `docs/bugs/` high-priority duplicates now redirect to canonical bug-fix records.
- `docs/changes/` files now redirect to canonical PRD, ADR, change-record, or testing records.
- Durable Reuters/BBC preview verification details were moved to `docs/engineering/testing/`.
- Durable manifest ingestion unblock details were moved to `docs/engineering/change-records/`.
- Public-card cleanup phases were consolidated into one canonical bug-fix/remediation record.

Remaining:

- Decide whether PR #141 and PR #143 should receive dedicated bug-fix records or remain as testing/remediation records.
- Audit PRD-53 controlled-cycle records for possible consolidation if future branch cleanup or release reconstruction requires finer mapping.
- Separately audit and decommission Google Sheets sync scripts/workflows if the team wants runtime automation removed, not just governance retired.

## 11. Branch Cleanup Risk Due To Earlier Deletion Of Approximately 30 Branches

The exact deleted-branch event list was not recoverable as one authoritative source. Reconstruction from PR #141 through #190 found many merged PR head refs missing from `origin`, while PR metadata still preserved branch names, head SHAs, merge SHAs, merge state, and URLs.

Risk:

- Without a branch cleanup ledger, deleted branches remain recoverable only through PR metadata and local worktree remnants.
- Some remediation branches may have been deleted before their canonical doc path was clearly established.

Mitigation completed:

- Added `docs/operations/branch-cleanup/2026-05-04-branch-cleanup-reconciliation.md`.
- Added future branch deletion capture requirements to `AGENTS.md` and `docs/engineering/protocols/engineering-protocol.md`.

## 12. Exact Follow-Up Actions Completed In This Branch

- Updated `AGENTS.md` to make GitHub repo documentation canonical and retire Google tracker closeout.
- Updated `docs/product/documentation-rules.md`.
- Updated `docs/engineering/protocols/bug-tracking-governance.md`.
- Updated `docs/engineering/bug-fixes/templates/bug-fix-record-template.md`.
- Updated related standing templates and protocols that still required Google tracker closeout.
- Deprecated `docs/bugs/` and `docs/changes/` as active lanes.
- Consolidated high-priority legacy bug reports.
- Added canonical records for public-card cleanup, manifest ingestion unblock, Reuters preview blocker, BBC preview success, and branch cleanup reconciliation.
- Updated PRD-24 / `docs/product/feature-system.csv` to mark GitHub Sheets governance automation deprecated as an active source-of-truth workflow.

## 13. Remaining Actions, If Any

- Separate non-docs branch: audit whether `.github/workflows/github-sheets-status-sync.yml`, `scripts/github-sheets-sync.mjs`, and related tests should be disabled, deleted, or retained as dormant compatibility artifacts.
- Decide whether to create dedicated bug-fix records for PR #141 and PR #143.
- Consider adding a short `docs/engineering/incidents/README.md` if incident records are created later; the folder is reserved but absent in this checkout.
- Continue to avoid Google Sheet updates and routine tracker-sync fallback creation unless the user explicitly requests a historical Google-reference reconciliation artifact.
