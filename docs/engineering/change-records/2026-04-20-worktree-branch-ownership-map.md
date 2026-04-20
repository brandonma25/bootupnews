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
| PRD-44 | `/Users/bm/Documents/daily-intelligence-aggregator-auth-forms` | `feature/prd-44-auth-entry-forms` | `origin/feature/prd-44-auth-entry-forms` | `4cc21d1` | Canonical original feature lane |
| PRD-45 | `/Users/bm/Documents/daily-intelligence-aggregator-password-reset` | `feature/prd-45-password-reset-flow` | `origin/feature/prd-45-password-reset-flow` | `bdc438b` | Canonical confirmed; no duplicate PRD-45 lane found |
| PRD-46 | `/Users/bm/Documents/daily-intelligence-aggregator-home-categories` | `feature/prd-46-home-category-tabs` | `origin/feature/prd-46-home-category-tabs` | `b40e9cf` | Canonical confirmed; no duplicate PRD-46 lane found |
| PRD-47 | `/Users/bm/Documents/daily-intelligence-aggregator-home-states` | `feature/prd-47-home-states` | `origin/feature/prd-47-home-states` | `0fba112` | Canonical confirmed; no duplicate PRD-47 lane found |
| PRD-48 | `/Users/bm/Documents/daily-intelligence-aggregator-history-components` | `feature/prd-48-history-components` | `origin/feature/prd-48-history-components` | `d800e07` | Canonical confirmed; shared `RetryButton` overlap with PRD-47 requires sequential merge handling |
| PRD-49 | `/Users/bm/Documents/daily-intelligence-aggregator-account-components` | `feature/prd-49-account-components` | `origin/feature/prd-49-account-components` | `84d1c3c` | Canonical confirmed; shared `Skeleton` overlap with PRD-48 requires sequential merge handling |

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
- Canonical PRD-44 branch `feature/prd-44-auth-entry-forms` remained preserved at `4cc21d1` and tracks `origin/feature/prd-44-auth-entry-forms`.

## Phase 2 Canonical Lane Decisions

| PRD | Decision | Evidence | Action |
| --- | --- | --- | --- |
| PRD-44 | Original branch is canonical | Original branch has the preserved feature commit `4cc21d1`; rebuild lane matched `origin/main` and had no unique payload | Retired the empty rebuild worktree and local rebuild branch after explicit approval |
| PRD-45 | Existing password-reset branch is canonical | Only one local and remote PRD-45/password-reset branch exists; owner worktree is clean; `origin/main...HEAD` contains the password-reset feature diff only | No retirement needed; continue PRD-45 only in the password-reset owner worktree |
| PRD-46 | Existing home-category-tabs branch is canonical | Only one local and remote PRD-46/home-category branch exists; owner worktree is clean; `origin/main...HEAD` contains the home category tabs feature diff only | No retirement needed; continue PRD-46 only in the home-categories owner worktree |
| PRD-47 | Existing home-states branch is canonical | Only one local and remote PRD-47/home-state branch exists; owner worktree is clean; `origin/main...HEAD` contains the home state components feature diff only | No retirement needed; continue PRD-47 only in the home-states owner worktree |
| PRD-48 | Existing history-components branch is canonical | Only one local and remote PRD-48/history branch exists; owner worktree is clean; `origin/main...HEAD` contains the history page component diff only | No retirement needed; continue PRD-48 only in the history-components owner worktree; resolve shared `RetryButton` and `feature-system.csv` overlap during sequential merge after remediation |
| PRD-49 | Existing account-components branch is canonical | Only one local and remote PRD-49/account branch exists; owner worktree is clean; `origin/main...HEAD` contains the account page component diff only | No retirement needed; continue PRD-49 only in the account-components owner worktree; resolve shared `Skeleton` and `feature-system.csv` overlap during sequential merge after remediation |

## Evidence and Recovery Lanes

| Artifact or branch | Location | Classification | Rule |
| --- | --- | --- | --- |
| Recovery audit bundle | `/Users/bm/Documents/daily-intelligence-aggregator-main/recovery-audit-20260420-163146/` | Protected evidence artifact | Preserve; do not clean without explicit approval |
| `stash@{0}` | `feature/prd-43-collapsible-sidebar: pre-cleanup-main-worktree-snapshot` | Protected historical fallback | Preserve; do not pop or drop without explicit approval |
| `feature/prd-43-collapsible-sidebar` | Local branch at `f1967b5` | Stale evidence / placeholder feature lane | Do not use for PRD-44 through PRD-49 continuation |
| `docs/artifact3-backend-contract-audit` | Local branch at `f1967b5` | Stale evidence / docs lane | Do not use for PRD-44 through PRD-49 continuation |
| `fix/settings-shell-cleanup` | Local and remote branch at `d8d9807` | Semantically adjacent non-owner lane; no current `origin/main...fix/settings-shell-cleanup` diff found during PRD-49 audit | Do not use for PRD-49 Account continuation |

## Phase 3 Pre-Retirement Audit

No branch, worktree, stash, recovery artifact, or feature payload was retired in this pass. The purpose of this audit is to identify which names are safe retirement candidates only after explicit human approval.

| Branch or worktree | Evidence | Retirement status | Rule |
| --- | --- | --- | --- |
| `/Users/bm/Documents/daily-intelligence-aggregator-worktree-attachment-enforcement` on `docs/worktree-attachment-enforcement` | Worktree is clean; branch head `c124f56` matches `origin/main`; no remote branch ref; `origin/main...docs/worktree-attachment-enforcement` has no diff | Candidate for retirement after approval | Safe-looking docs placeholder; remove only after explicit approval |
| `codexfeature/prd-43-49-mvp-ui-artifact-alignment` | Local branch only; head `c124f56` matches `origin/main`; no remote branch ref; `origin/main...codexfeature/prd-43-49-mvp-ui-artifact-alignment` has no diff | Candidate for retirement after approval | Misleading PRD-43-49-like branch name; remove only after explicit approval |
| `fix/settings-shell-cleanup` | Local and remote branch at `d8d9807`; no current `origin/main...fix/settings-shell-cleanup` diff; branch is behind `origin/main` | Candidate for retirement after approval and PR/merge confirmation | Semantically adjacent to Account/settings work; remove local and remote refs only after explicit approval |
| `/Users/bm/Documents/daily-intelligence-aggregator-ui-audit` on `feature/ui-audit-playwright-expansion` | Branch head `c124f56` matches `origin/main`, but the worktree has untracked `docs/engineering/testing/ui-audit-report.md` | Not a retirement candidate yet | Preserve until the untracked report is reviewed, preserved, or explicitly discarded |
| `feature/prd-43-49-mvp-ui-artifact-alignment` | Protected WIP branch at `3f3c83b`; `origin/main...feature/prd-43-49-mvp-ui-artifact-alignment` still has package and route-deletion diffs | Not a retirement candidate yet | Preserve as branch-contamination evidence until a separate evidence-retention decision is made |
| `feature/prd-43-collapsible-sidebar` and `docs/artifact3-backend-contract-audit` | Local branches at `f1967b5`; no current diff from `origin/main`, but already classified as stale evidence lanes | Not a retirement candidate yet | Preserve until the recovery audit bundle and stash retention strategy are resolved |

## Docs and Governance Lanes

| Worktree | Branch | Classification | Rule |
| --- | --- | --- | --- |
| `/Users/bm/Documents/daily-intelligence-aggregator-main` | `codex/update-worktree-attachment-rules` | Current remediation documentation lane | Use only for remediation docs and ownership records |
| `/Users/bm/Documents/daily-intelligence-aggregator-docs-worktree-attachment-rules` | `codex/docs-worktree-attachment-rules` | Worktree attachment rules lane | Do not use for feature work |
| `/Users/bm/Documents/daily-intelligence-aggregator-worktree-attachment-enforcement` | `docs/worktree-attachment-enforcement` | Governance placeholder at current `main` | Do not use for PRD-44 through PRD-49 feature work |
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

After canonical-lane decisions are complete for PRD-44 through PRD-49:

1. Process feature branches one at a time from the owning worktree listed in this map.
2. Do not batch-merge PRD-44 through PRD-49.
3. Do not create replacement branches merely to satisfy a governance-gate failure when the canonical owner branch exists.
4. For any PRD feature PR that changes `docs/product/feature-system.csv`, add or update a feature-specific governance-facing document, usually a concise `docs/engineering/change-records/...` note, in that same owner branch.
5. Re-run the release governance gate and required validation for that branch before recommending merge.
6. Merge and clean up one canonical feature lane before starting the next feature merge lane.

Example: the PRD-47 failure in GitHub Actions job `72159412287` should be fixed on `feature/prd-47-home-states` in `/Users/bm/Documents/daily-intelligence-aggregator-home-states` by adding a PRD-47-specific governance change record for the `docs/product/feature-system.csv` hotspot update, not by merging all feature branches first and not by creating a new replacement branch.

## Phase 1 Result

PRD-44 through PRD-49 now have one stated owner worktree and one stated canonical branch per PRD. The empty PRD-44 rebuild placeholder has been retired. Phase 3 has identified retirement candidates without deleting them. Remaining ambiguity is concentrated in protected recovery artifacts, stale evidence branches, known shared-file merge sequencing, and approval-gated zero-diff placeholder lanes.

Next phase: if human approval is granted, retire only one zero-diff placeholder lane at a time, starting with `docs/worktree-attachment-enforcement` or `codexfeature/prd-43-49-mvp-ui-artifact-alignment`. Otherwise, follow the hotspot feature merge sequencing rule above before merging any PRD-44 through PRD-49 feature branch. Each feature branch should be handled from its canonical owner worktree, one at a time, with feature-specific governance coverage for `docs/product/feature-system.csv` hotspot updates.
