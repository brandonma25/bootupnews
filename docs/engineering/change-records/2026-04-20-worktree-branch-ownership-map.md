# Worktree Branch Ownership Map

## Purpose

This change record is the Phase 1 ownership map for the PRD-44 through PRD-49 cleanup. Its purpose is to make branch and worktree ownership explicit before any canonical-lane merge, rebuild, or retirement decision.

No feature branch, rebuild branch, stash, recovery artifact, or worktree is retired by this document.

## Branch Decision

- Documentation lane: `codex/update-worktree-attachment-rules`
- Workspace: `/Users/bm/Documents/daily-intelligence-aggregator-main`
- Scope: branch/worktree ownership inventory and operational routing rules
- Excluded: feature implementation, branch deletion, worktree deletion, stash changes, merges, rebases, force pushes, and cleanup

## Current Canonical Feature Lanes

These are the only currently approved owner worktrees for PRD-44 through PRD-49 feature continuation.

| PRD | Canonical owner worktree | Canonical branch | Upstream | Head | Lane state |
| --- | --- | --- | --- | --- | --- |
| PRD-44 | `/Users/bm/Documents/daily-intelligence-aggregator-auth-forms` | `feature/prd-44-auth-entry-forms` | `origin/feature/prd-44-auth-entry-forms` | `1d40359` | Merged to `main` via PR #79 at `be5b75f`; retained only until post-merge cleanup |
| PRD-45 | `/Users/bm/Documents/daily-intelligence-aggregator-password-reset` | `feature/prd-45-password-reset-flow` | `origin/feature/prd-45-password-reset-flow` | `8d450a4` | Merged to `main` via PR #80 at `c48f8ca`; retained only until post-merge cleanup |
| PRD-46 | `/Users/bm/Documents/daily-intelligence-aggregator-home-categories` | `feature/prd-46-home-category-tabs` | `origin/feature/prd-46-home-category-tabs` | `67491c3` | Canonical prepared for merge sequencing after PRD-45 merge; draft PR #81 open for preview and human Home category-tab validation |
| PRD-47 | `/Users/bm/Documents/daily-intelligence-aggregator-home-states` | `feature/prd-47-home-states` | `origin/feature/prd-47-home-states` | `6f66612` | Canonical prepared for merge sequencing; governance coverage added and branch synced with `origin/main` |
| PRD-48 | `/Users/bm/Documents/daily-intelligence-aggregator-history-components` | `feature/prd-48-history-components` | `origin/feature/prd-48-history-components` | `e2b8efb` | Canonical prepared for merge sequencing; governance coverage added, `button.tsx` conflict resolved, and branch synced with `origin/main`; merge after PRD-47 |
| PRD-49 | `/Users/bm/Documents/daily-intelligence-aggregator-account-components` | `feature/prd-49-account-components` | `origin/feature/prd-49-account-components` | `0138e04` | Canonical prepared for merge sequencing; governance coverage added and branch synced with `origin/main`; merge after PRD-48 |

Operational rule: if a prompt names one of these PRDs and asks to continue the same branch, Codex must use the listed owner worktree directly. Codex must not open the main worktree and must not propose a different branch unless the listed owner worktree is unavailable or the branch has already merged.

## Rebuild and Duplicate Lanes

| Lane | Worktree | Branch | Upstream | Head | Classification | Rule |
| --- | --- | --- | --- | --- | --- | --- |
| PRD-44 rebuild placeholder | `/Users/bm/Documents/daily-intelligence-aggregator-prd-44-auth-entry-forms-rebuild` | `feature/prd-44-auth-entry-forms-rebuild` | `origin/main` | `c124f56` | Retired duplicate rebuild lane with no PRD-44 feature payload | Retired after proof and explicit approval; do not recreate for PRD-44 continuation |

The PRD-44 rebuild lane was not canonical because the original PRD-44 branch contains the preserved feature commit and the rebuild branch matched `origin/main`. After explicit human approval, the clean duplicate rebuild worktree was removed and the local rebuild branch was deleted. No remote rebuild branch existed.

Retirement proof:
- Rebuild worktree status was clean.
- Rebuild `HEAD` matched `origin/main` at `c124f56`.
- `origin/main...feature/prd-44-auth-entry-forms-rebuild` had no unique commits and no diff.
- `origin/feature/prd-44-auth-entry-forms-rebuild` did not exist.
- Canonical PRD-44 branch `feature/prd-44-auth-entry-forms` remained preserved and tracks `origin/feature/prd-44-auth-entry-forms`; during merge sequencing it advanced to `1d40359` with governance coverage and `origin/main` sync.

## Phase 2 Canonical Lane Decisions

| PRD | Decision | Evidence | Action |
| --- | --- | --- | --- |
| PRD-44 | Original branch was canonical until merge | Original branch has the preserved feature commit `4cc21d1`; rebuild lane matched `origin/main` and had no unique payload; merge sequencing later added PRD-44 governance coverage, synced with `origin/main`, and merged through PR #79 at `be5b75f` | Retired the empty rebuild worktree and local rebuild branch after explicit approval; do not use the PRD-44 feature branch for new work after merge |
| PRD-45 | Existing password-reset branch was canonical until merge | Only one local and remote PRD-45/password-reset branch exists; owner worktree is clean; `origin/main...HEAD` contained the password-reset feature diff only; merge sequencing later added PRD-45 governance coverage, synced with the PRD-44 merge commit on `main`, and merged through PR #80 at `c48f8ca` | Do not use the PRD-45 feature branch for new work after merge |
| PRD-46 | Existing home-category-tabs branch is canonical | Only one local and remote PRD-46/home-category branch exists; owner worktree is clean; `origin/main...HEAD` contains the home category tabs feature diff only; merge sequencing later added PRD-46 governance coverage, resolved the homepage conflict, synced with the PRD-45 merge commit on `main`, and opened PR #81 | No retirement needed; continue PRD-46 only in the home-categories owner worktree until PR #81 merges |
| PRD-47 | Existing home-states branch is canonical | Only one local and remote PRD-47/home-state branch exists; owner worktree is clean; `origin/main...HEAD` contains the home state components feature diff only; merge sequencing later added PRD-47 governance coverage and synced with `origin/main` | No retirement needed; continue PRD-47 only in the home-states owner worktree |
| PRD-48 | Existing history-components branch is canonical | Only one local and remote PRD-48/history branch exists; owner worktree is clean; `origin/main...HEAD` contains the history page component diff only; merge sequencing later added PRD-48 governance coverage, resolved the `src/components/ui/button.tsx` conflict by preserving current theme-token styling while retaining `asChild` support, and synced with `origin/main` | No retirement needed; continue PRD-48 only in the history-components owner worktree; merge after PRD-47 because of shared `RetryButton` and `feature-system.csv` overlap |
| PRD-49 | Existing account-components branch is canonical | Only one local and remote PRD-49/account branch exists; owner worktree is clean; `origin/main...HEAD` contains the account page component diff only; merge sequencing later added PRD-49 governance coverage and synced with `origin/main` | No retirement needed; continue PRD-49 only in the account-components owner worktree; merge after PRD-48 because of shared `Skeleton` and `feature-system.csv` overlap |

## Evidence and Recovery Lanes

| Artifact or branch | Location | Classification | Rule |
| --- | --- | --- | --- |
| Recovery audit bundle | `/Users/bm/Documents/daily-intelligence-aggregator-main/recovery-audit-20260420-163146/` | Protected evidence artifact | Preserve; do not clean without explicit approval |
| `stash@{0}` | `feature/prd-43-collapsible-sidebar: pre-cleanup-main-worktree-snapshot` | Protected historical fallback | Preserve; do not pop or drop without explicit approval |
| `feature/prd-43-collapsible-sidebar` | Local branch at `f1967b5` | Stale evidence / placeholder feature lane | Do not use for PRD-44 through PRD-49 continuation |
| `docs/artifact3-backend-contract-audit` | Local branch at `f1967b5` | Stale evidence / docs lane | Do not use for PRD-44 through PRD-49 continuation |
| `fix/settings-shell-cleanup` | Local and remote branch at `d8d9807` | Semantically adjacent non-owner lane; no current `origin/main...fix/settings-shell-cleanup` diff found during PRD-49 audit | Do not use for PRD-49 Account continuation |

## Phase 3 Pre-Retirement Audit

The purpose of this audit is to identify which names are safe retirement candidates only after explicit human approval. No feature payload, stash, or recovery artifact is retired by this section.

| Branch or worktree | Evidence | Retirement status | Rule |
| --- | --- | --- | --- |
| `/Users/bm/Documents/daily-intelligence-aggregator-worktree-attachment-enforcement` on `docs/worktree-attachment-enforcement` | Worktree was clean; branch head `c124f56` matched `origin/main`; no remote branch ref; `origin/main...docs/worktree-attachment-enforcement` had no diff | Retired after explicit approval on 2026-04-21 | Removed zero-diff worktree and deleted local branch; do not recreate for PRD-44 through PRD-49 work |
| `codexfeature/prd-43-49-mvp-ui-artifact-alignment` | Local branch only; head `c124f56` matched `origin/main`; no remote branch ref; `origin/main...codexfeature/prd-43-49-mvp-ui-artifact-alignment` had no diff | Retired after explicit approval on 2026-04-21 | Misleading zero-diff PRD-43-49-like branch name removed; do not recreate |
| `fix/settings-shell-cleanup` | Local and remote branch at `d8d9807`; no current `origin/main...fix/settings-shell-cleanup` diff; branch is behind `origin/main` | Candidate for retirement after approval and PR/merge confirmation | Semantically adjacent to Account/settings work; remove local and remote refs only after explicit approval |
| `/Users/bm/Documents/daily-intelligence-aggregator-ui-audit` on `feature/ui-audit-playwright-expansion` | Branch head `c124f56` matches `origin/main`, but the worktree has untracked `docs/engineering/testing/ui-audit-report.md` | Not a retirement candidate yet | Preserve until the untracked report is reviewed, preserved, or explicitly discarded |
| `feature/prd-43-49-mvp-ui-artifact-alignment` | Protected WIP branch at `3f3c83b`; `origin/main...feature/prd-43-49-mvp-ui-artifact-alignment` still has package and route-deletion diffs | Not a retirement candidate yet | Preserve as branch-contamination evidence until a separate evidence-retention decision is made |
| `feature/prd-43-collapsible-sidebar` and `docs/artifact3-backend-contract-audit` | Local branches at `f1967b5`; no current diff from `origin/main`, but already classified as stale evidence lanes | Not a retirement candidate yet | Preserve until the recovery audit bundle and stash retention strategy are resolved |

Phase 3 retirement proof for `docs/worktree-attachment-enforcement`:
- The worktree path `/Users/bm/Documents/daily-intelligence-aggregator-worktree-attachment-enforcement` was absent after `git worktree remove`.
- The local branch `docs/worktree-attachment-enforcement` was deleted.
- No remote branch `origin/docs/worktree-attachment-enforcement` existed before retirement.
- No PRD-44 through PRD-49 feature branch, recovery artifact, stash entry, or protected evidence lane was touched.

Phase 3 retirement proof for `codexfeature/prd-43-49-mvp-ui-artifact-alignment`:
- The branch was local-only and had no owning worktree.
- The branch head `c124f56` matched `origin/main`.
- No remote branch `origin/codexfeature/prd-43-49-mvp-ui-artifact-alignment` existed before retirement.
- The local branch `codexfeature/prd-43-49-mvp-ui-artifact-alignment` was deleted.
- No PRD-44 through PRD-49 feature branch, recovery artifact, stash entry, or protected evidence lane was touched.

## Docs and Governance Lanes

| Worktree | Branch | Classification | Rule |
| --- | --- | --- | --- |
| `/Users/bm/Documents/daily-intelligence-aggregator-main` | `codex/update-worktree-attachment-rules` | Current remediation documentation lane | Use only for remediation docs and ownership records |
| `/Users/bm/Documents/daily-intelligence-aggregator-docs-worktree-attachment-rules` | `codex/docs-worktree-attachment-rules` | Worktree attachment rules lane | Do not use for feature work |
| `/Users/bm/Documents/daily-intelligence-aggregator-worktree-attachment-enforcement` | `docs/worktree-attachment-enforcement` | Retired zero-diff governance placeholder | Removed after explicit approval; do not recreate for PRD-44 through PRD-49 feature work |
| `/Users/bm/Documents/daily-intelligence-aggregator-worktree-branch-protocol` | `docs/prd-51-worktree-branch-protocol` | Branch protocol docs lane | Do not use for PRD-44 through PRD-49 feature work |
| `/Users/bm/Documents/daily-intelligence-aggregator-main-docs-sequential` | `docs/sequential-prompt-execution-protocol` | Sequential prompt protocol docs lane | Do not use for PRD-44 through PRD-49 feature work |

## Other Active Worktrees

| Worktree | Branch | Classification | Rule |
| --- | --- | --- | --- |
| `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-followup` | `fix/prd-50-artifact10-production-parity-followup` | Scoped fix lane | Keep separate from PRD-44 through PRD-49 |
| `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-repair` | `fix/prd-50-artifact-10-parity-repair` | Scoped fix lane | Keep separate from PRD-44 through PRD-49 |
| `/Users/bm/Documents/daily-intelligence-aggregator-auth-callback-fix` | `fix/auth-callback-provider-error-redirect` | Scoped auth fix lane | Keep separate from PRD-44 auth entry forms unless explicitly coordinating |
| `/Users/bm/Documents/daily-intelligence-aggregator-global-style-spec` | `feature/prd-50-global-style-spec` | Scoped feature lane | Keep separate from PRD-44 through PRD-49 |
| `/Users/bm/Documents/daily-intelligence-aggregator-ui-audit` | `feature/ui-audit-playwright-expansion` | Audit / testing lane at current `main` | Do not use for PRD-44 through PRD-49 feature work |

## Continuation Rules

1. For PRD-44, continue only in `/Users/bm/Documents/daily-intelligence-aggregator-auth-forms` on `feature/prd-44-auth-entry-forms`.
2. For PRD-45, continue only in `/Users/bm/Documents/daily-intelligence-aggregator-password-reset` on `feature/prd-45-password-reset-flow`.
3. For PRD-46, continue only in `/Users/bm/Documents/daily-intelligence-aggregator-home-categories` on `feature/prd-46-home-category-tabs`.
4. For PRD-47, continue only in `/Users/bm/Documents/daily-intelligence-aggregator-home-states` on `feature/prd-47-home-states`.
5. For PRD-48, continue only in `/Users/bm/Documents/daily-intelligence-aggregator-history-components` on `feature/prd-48-history-components`.
6. For PRD-49, continue only in `/Users/bm/Documents/daily-intelligence-aggregator-account-components` on `feature/prd-49-account-components`.
7. If Codex is not already in the listed owner worktree, it must use `git -C <owner-worktree>` for inspection or tell the user to open that owner worktree before implementation.
8. If another branch name appears to match the same PRD, treat it as blocked until this ownership map or a newer ownership map identifies it as canonical.
9. Rebuild branches are allowed only after the canonical feature lane has been compared and a human explicitly approves rebuild over continuation.
10. Retirement is allowed only after preservation evidence, remote branch state, and explicit human approval are all present.

## Final Remediation Step: Hotspot Feature Merge Sequencing

Do not merge the pushed PRD-44 through PRD-49 feature branches before the canonical-lane remediation is complete. These branches each represent protected feature work and may also touch the serialized governance hotspot `docs/product/feature-system.csv`, so merging them before the worktree/branch ownership cleanup is finished would preserve the same ambiguity this remediation is trying to remove.

Merge-sequencing progress:
- PRD-44 has been processed first on the canonical owner branch and merged to `main` through PR #79 at `be5b75f` after green GitHub checks, Vercel preview smoke validation for `/login` and `/signup`, and human Google Auth validation. The former PRD-44 owner worktree and branch should be treated as post-merge cleanup candidates, not active feature continuation lanes.
- PRD-45 has been processed second on the canonical owner branch and merged to `main` through PR #80 at `c48f8ca` after green GitHub checks, Vercel preview smoke validation for `/forgot-password` and `/reset-password`, and human reset-email delivery validation. The former PRD-45 owner worktree and branch should be treated as post-merge cleanup candidates, not active feature continuation lanes.
- PRD-46 has been processed third on the canonical owner branch. After PRD-45 merged, the branch was synced to `origin/main` at merge-base `c48f8ca`, resolved the `docs/product/feature-system.csv` hotspot conflict by preserving PRD-44, PRD-45, and PRD-46 rows, passes focused Home Category tests, passes `npm run build`, passes `scripts/release-governance-gate.py` locally for the PRD-46 diff, and has draft PR #81 open at `https://github.com/brandonma25/daily-intelligence-aggregator/pull/81` for preview and human Home category-tab validation before merge.
- PRD-47 has been processed fourth on the canonical owner branch. The local owner worktree was fast-forwarded to the existing remote merge commit, the branch now includes `docs/engineering/change-records/prd-47-home-state-components-governance-coverage.md`, contains `origin/main` at merge-base `c124f56`, and passes `scripts/release-governance-gate.py` locally for the PRD-47 diff.
- PRD-48 has been processed fifth on the canonical owner branch. The branch now includes `docs/engineering/change-records/prd-48-history-page-components-governance-coverage.md`, contains `origin/main` at merge-base `c124f56`, resolves the `src/components/ui/button.tsx` merge conflict by keeping current theme-token button styling while retaining PRD-48 `asChild` support, passes focused History component tests, passes `npm run build`, and passes `scripts/release-governance-gate.py` locally for the PRD-48 diff.
- PRD-49 has been processed sixth on the canonical owner branch. The branch now includes `docs/engineering/change-records/prd-49-account-page-components-governance-coverage.md`, contains `origin/main` at merge-base `c124f56`, passes focused Account component tests, passes `npm run build`, and passes `scripts/release-governance-gate.py` locally for the PRD-49 diff.

After canonical-lane decisions are complete for PRD-44 through PRD-49:

1. Process feature branches one at a time from the owning worktree listed in this map.
2. Do not batch-merge PRD-44 through PRD-49.
3. Do not create replacement branches merely to satisfy a governance-gate failure when the canonical owner branch exists.
4. For any PRD feature PR that changes `docs/product/feature-system.csv`, add or update a feature-specific governance-facing document, usually a concise `docs/engineering/change-records/...` note, in that same owner branch.
5. Re-run the release governance gate and required validation for that branch before recommending merge.
6. Merge and clean up one canonical feature lane before starting the next feature merge lane.

Example: the PRD-47 failure in GitHub Actions job `72159412287` should be fixed on `feature/prd-47-home-states` in `/Users/bm/Documents/daily-intelligence-aggregator-home-states` by adding a PRD-47-specific governance change record for the `docs/product/feature-system.csv` hotspot update, not by merging all feature branches first and not by creating a new replacement branch.

## Phase 1 Result

PRD-44 through PRD-49 now have one stated owner worktree and one stated canonical branch per PRD. The empty PRD-44 rebuild placeholder has been retired. The zero-diff `docs/worktree-attachment-enforcement` and `codexfeature/prd-43-49-mvp-ui-artifact-alignment` placeholder lanes have also been retired after explicit approval. Remaining ambiguity is concentrated in protected recovery artifacts, stale evidence branches, known shared-file merge sequencing, and approval-gated zero-diff placeholder lanes.

Next phase: do not retire additional remote or evidence-bearing lanes without a separate proof-and-approval pass. The remaining practical path is to merge PRD-44 through PRD-49 one at a time from their canonical owner worktrees, preserving the order documented above and rechecking each branch after the prior feature lands.
