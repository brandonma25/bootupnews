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

These were the approved owner worktrees for PRD-44 through PRD-49 feature continuation during merge sequencing. They are now retired post-merge lanes.

| PRD | Canonical owner worktree | Canonical branch | Upstream | Head | Lane state |
| --- | --- | --- | --- | --- | --- |
| PRD-44 | `/Users/bm/Documents/daily-intelligence-aggregator-auth-forms` | `feature/prd-44-auth-entry-forms` | Deleted after merge | `1d40359` | Merged to `main` via PR #79 at `be5b75f`; worktree, local branch, and remote branch retired after proof and explicit approval |
| PRD-45 | `/Users/bm/Documents/daily-intelligence-aggregator-password-reset` | `feature/prd-45-password-reset-flow` | Deleted after merge | `8d450a4` | Merged to `main` via PR #80 at `c48f8ca`; worktree, local branch, and remote branch retired after proof and explicit approval |
| PRD-46 | `/Users/bm/Documents/daily-intelligence-aggregator-home-categories` | `feature/prd-46-home-category-tabs` | Deleted after merge | `67491c3` | Merged to `main` via PR #81 at `78733c3`; worktree, local branch, and remote branch retired after proof and explicit approval |
| PRD-47 | `/Users/bm/Documents/daily-intelligence-aggregator-home-states` | `feature/prd-47-home-states` | Deleted after merge | `5afa0a7` | Merged to `main` via PR #78 at `0ff8d92`; worktree, local branch, and remote branch retired after proof and explicit approval |
| PRD-48 | `/Users/bm/Documents/daily-intelligence-aggregator-history-components` | `feature/prd-48-history-components` | Deleted after merge | `219ecbb` | Merged to `main` via PR #82 at `b30d10f`; worktree, local branch, and remote branch retired after proof and explicit approval |
| PRD-49 | `/Users/bm/Documents/daily-intelligence-aggregator-account-components` | `feature/prd-49-account-components` | Deleted after merge | `863a447` | Merged to `main` via PR #83 at `25887bd`; worktree, local branch, and remote branch retired after proof and explicit approval |

Operational rule: these PRD-44 through PRD-49 branches have already merged and been retired. Codex must not recreate these old branch names or worktree paths for follow-up work. Future follow-up in these product areas should start from current `main` with a new explicitly scoped branch, unless a newer ownership map identifies an active successor lane.

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
| PRD-46 | Existing home-category-tabs branch was canonical until merge | Only one local and remote PRD-46/home-category branch exists; owner worktree is clean; `origin/main...HEAD` contained the home category tabs feature diff only; merge sequencing later added PRD-46 governance coverage, resolved the homepage conflict, synced with the PRD-45 merge commit on `main`, opened PR #81, passed GitHub checks, passed Vercel preview smoke validation, and merged through PR #81 at `78733c3` | Do not use the PRD-46 feature branch for new work after merge |
| PRD-47 | Existing home-states branch was canonical until merge | Only one local and remote PRD-47/home-state branch exists; owner worktree is clean; `origin/main...HEAD` contained the home state components feature diff only; merge sequencing later added PRD-47 governance coverage, resolved the feature-system hotspot conflict by preserving PRD-44 through PRD-47 rows, synced with the PRD-46 merge commit on `main`, refreshed PR #78, passed GitHub checks, passed Vercel preview smoke validation, and merged through PR #78 at `0ff8d92` | Do not use the PRD-47 feature branch for new work after merge |
| PRD-48 | Existing history-components branch was canonical until merge | Only one local and remote PRD-48/history branch exists; owner worktree is clean; `origin/main...HEAD` contained the history page component diff only; merge sequencing later added PRD-48 governance coverage, resolved the `src/components/ui/button.tsx` conflict by preserving current theme-token styling while retaining `asChild` support, resolved the PRD-47 `RetryButton` overlap by preserving merged styling plus PRD-48 `aria-busy`, synced with the PRD-47 merge commit on `main`, opened draft PR #82, passed GitHub checks, passed Vercel `/history` preview smoke validation, and merged through PR #82 at `b30d10f` | Do not use the PRD-48 feature branch for new work after merge |
| PRD-49 | Existing account-components branch was canonical until merge | Only one local and remote PRD-49/account branch exists; owner worktree is clean; `origin/main...HEAD` contained the account page component diff only; merge sequencing later added PRD-49 governance coverage, resolved the feature-system hotspot conflict by preserving PRD-44 through PRD-49 rows, resolved the shared `Input` overlap by keeping the already-merged auth input primitive, synced with the PRD-48 merge commit on `main`, opened draft PR #83, passed GitHub checks, passed Vercel `/settings` preview smoke validation, and merged through PR #83 at `25887bd` | Do not use the PRD-49 feature branch for new work after merge |

## Evidence and Recovery Lanes

| Artifact or branch | Location | Classification | Rule |
| --- | --- | --- | --- |
| Recovery audit bundle | `/Users/bm/Documents/daily-intelligence-aggregator-main/recovery-audit-20260420-163146/` | Protected local evidence artifact; ignored by `.gitignore` after audit so it does not make the worktree appear dirty | Preserve; do not clean without explicit approval |
| `stash@{0}` | `feature/prd-43-collapsible-sidebar: pre-cleanup-main-worktree-snapshot` | Protected historical fallback | Preserve; do not pop or drop without explicit approval |
| `stash@{1}` | `chore/release-governance-gate-velocity: preserve unrelated pre-source-onboarding worktree state` | Protected historical fallback | Preserve; do not pop or drop without explicit approval |
| `stash@{2}` | `feature/importance-scoring-engine-v1: backup before clean PRD14 branch recreation 2026-04-17` | Protected historical fallback | Preserve; do not pop or drop without explicit approval |
| `feature/prd-43-collapsible-sidebar` | Retired local branch at `f1967b5` | Stale zero-diff placeholder feature lane; stash evidence remains protected | Retired after proof and explicit approval; do not recreate for PRD-43 continuation |
| `docs/artifact3-backend-contract-audit` | Retired local branch at `f1967b5` | Stale zero-diff docs lane; recovery evidence remains protected | Retired after proof and explicit approval; do not recreate for docs work |
| `fix/settings-shell-cleanup` | Retired local and remote branch at `d8d9807` | Merged semantically adjacent non-owner lane; PR #56 was merged and local/remote refs had zero branch-only commits | Retired after proof and explicit approval; do not recreate for PRD-49 Account continuation |
| `feature/prd-43-49-mvp-ui-artifact-alignment` | Retired local branch at `3f3c83b` | Branch-contamination WIP evidence; exact patch is preserved in repo and recovery bundle | Retired after durable patch preservation and explicit approval; do not recreate for feature continuation |

## Phase 3 Pre-Retirement Audit

The purpose of this audit was to identify which names were safe retirement candidates only after explicit human approval. Later entries record candidates retired after preservation and containment proof. No feature payload, stash, or recovery artifact was retired by this section.

| Branch or worktree | Evidence | Retirement status | Rule |
| --- | --- | --- | --- |
| PRD-44 through PRD-49 post-merge feature lanes | Each former owner worktree was clean; each local and remote branch was contained in `origin/main` at `25887bd`; each branch had zero branch-only commits; PRs #79, #80, #81, #78, #82, and #83 were merged | Retired after explicit approval on 2026-04-21 | Removed the six former feature worktrees, deleted the six local branches, and deleted the six remote branches; do not recreate old branch names for follow-up work |
| `/Users/bm/Documents/daily-intelligence-aggregator-worktree-attachment-enforcement` on `docs/worktree-attachment-enforcement` | Worktree was clean; branch head `c124f56` matched `origin/main`; no remote branch ref; `origin/main...docs/worktree-attachment-enforcement` had no diff | Retired after explicit approval on 2026-04-21 | Removed zero-diff worktree and deleted local branch; do not recreate for PRD-44 through PRD-49 work |
| `codexfeature/prd-43-49-mvp-ui-artifact-alignment` | Local branch only; head `c124f56` matched `origin/main`; no remote branch ref; `origin/main...codexfeature/prd-43-49-mvp-ui-artifact-alignment` had no diff | Retired after explicit approval on 2026-04-21 | Misleading zero-diff PRD-43-49-like branch name removed; do not recreate |
| `fix/settings-shell-cleanup` | Local and remote branch at `d8d9807`; no current `origin/main...fix/settings-shell-cleanup` diff; branch was behind `origin/main`; PR #56 was merged | Retired after explicit approval on 2026-04-21 | Removed local and remote refs after containment proof |
| `/Users/bm/Documents/daily-intelligence-aggregator-ui-audit` on `feature/ui-audit-playwright-expansion` | Branch head `c124f56` matched `origin/main`; untracked `docs/engineering/testing/ui-audit-report.md` was preserved at `docs/engineering/testing/ui-audit-report.md`; no same-name remote branch existed | Retired after preservation proof and explicit approval on 2026-04-21 | Removed worktree and local branch after preserving the report; do not recreate this audit lane |
| `feature/prd-43-49-mvp-ui-artifact-alignment` | WIP branch at `3f3c83b`; `origin/main...feature/prd-43-49-mvp-ui-artifact-alignment` had package and route-deletion diffs; exact patch was preserved at `docs/engineering/change-records/2026-04-21-prd-43-49-wip-preservation.patch` | Retired after durable patch preservation and explicit approval on 2026-04-21 | Removed local branch label only; did not touch stashes or recovery bundle |
| `feature/prd-43-collapsible-sidebar` and `docs/artifact3-backend-contract-audit` | Local branches at `f1967b5`; no current diff from `origin/main`; no remote refs; stash and recovery bundle remained protected | Retired after explicit approval on 2026-04-21 | Removed local branch labels only; did not touch stashes, recovery bundle, or PRD-43-49 WIP evidence branch |

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

Phase 3 retirement proof for PRD-44 through PRD-49 post-merge lanes:
- `origin/main` was fetched and confirmed at `25887bd`.
- The six former owner worktrees were clean before retirement.
- The six local branches were all ancestors of `origin/main`.
- The six remote branches were all ancestors of `origin/main`.
- `origin/main...<branch>` showed zero branch-only commits for each retired branch.
- The following worktree paths were absent after retirement:
  - `/Users/bm/Documents/daily-intelligence-aggregator-auth-forms`
  - `/Users/bm/Documents/daily-intelligence-aggregator-password-reset`
  - `/Users/bm/Documents/daily-intelligence-aggregator-home-categories`
  - `/Users/bm/Documents/daily-intelligence-aggregator-home-states`
  - `/Users/bm/Documents/daily-intelligence-aggregator-history-components`
  - `/Users/bm/Documents/daily-intelligence-aggregator-account-components`
- The following local branches and remote branch refs were absent after retirement:
  - `feature/prd-44-auth-entry-forms`
  - `feature/prd-45-password-reset-flow`
  - `feature/prd-46-home-category-tabs`
  - `feature/prd-47-home-states`
  - `feature/prd-48-history-components`
  - `feature/prd-49-account-components`
- No recovery artifact, stash entry, stale evidence branch, or non-PRD-44-through-PRD-49 worktree was touched.

## Docs and Governance Lanes

| Worktree | Branch | Classification | Rule |
| --- | --- | --- | --- |
| `/Users/bm/Documents/daily-intelligence-aggregator-main` | `codex/update-worktree-attachment-rules` | Current remediation documentation lane | Use only for remediation docs and ownership records |
| `/Users/bm/Documents/daily-intelligence-aggregator-docs-worktree-attachment-rules` | `codex/docs-worktree-attachment-rules` | Retired superseded governance lane | PR #77 was closed as superseded; diff archived; worktree, local branch, and remote branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-worktree-attachment-enforcement` | `docs/worktree-attachment-enforcement` | Retired zero-diff governance placeholder | Removed after explicit approval; do not recreate for PRD-44 through PRD-49 feature work |
| `/Users/bm/Documents/daily-intelligence-aggregator-worktree-branch-protocol` | `docs/prd-51-worktree-branch-protocol` | Retired PRD-51 worktree branch protocol docs lane | PR #74 was already merged; worktree, local branch, and remote branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-main-docs-sequential` | `docs/sequential-prompt-execution-protocol` | Retired sequential prompt protocol docs lane | PR #63 was already merged; worktree, local branch, and remote branch retired |

## Other Worktree Lanes

| Worktree | Branch | Classification | Rule |
| --- | --- | --- | --- |
| `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-followup` | `fix/prd-50-artifact10-production-parity-followup` | Retired scoped fix lane | Dirty diff archived; worktree and local branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-repair` | `fix/prd-50-artifact-10-parity-repair` | Retired scoped fix lane | PR #75 was already merged; worktree, local branch, and remote branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-auth-callback-fix` | `fix/auth-callback-provider-error-redirect` | Retired scoped auth fix lane | PR #72 was already merged; worktree, leftover generated folder, local branch, and remote branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-global-style-spec` | `feature/prd-50-global-style-spec` | Retired scoped feature lane | PR #73 was already merged; worktree, local branch, and remote branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-ui-audit` | `feature/ui-audit-playwright-expansion` | Retired UI audit evidence lane | UI audit report preserved; worktree and local branch retired; no same-name remote branch existed |

## Phase 3 Remaining Attached Worktree Audit

This audit was run after PRD-44 through PRD-49 post-merge retirement. It first identified remaining attached worktrees; later entries in this section record approval-gated retirements completed after preservation proof.

| Worktree | Branch | State | Retirement readiness | Rule |
| --- | --- | --- | --- | --- |
| `/Users/bm/Documents/daily-intelligence-aggregator-main` | `codex/update-worktree-attachment-rules` | Active remediation docs lane; branch has ownership-map and branch-contamination records not yet merged to `main`; untracked `recovery-audit-20260420-163146/` remains protected evidence | Not a retirement candidate | Keep as the current remediation documentation lane until its records are merged or explicitly superseded; preserve the recovery audit bundle |
| `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-followup` | `fix/prd-50-artifact10-production-parity-followup` | Dirty tracked local work was archived at `docs/engineering/change-records/2026-04-21-artifact10-followup-dirty-state.patch`; local branch had zero committed branch-only commits against `origin/main`; dirty test diff was already present in `origin/main`; dirty button diff was stale relative to current `origin/main` because it would remove existing `asChild` support while retaining primary white text styling that already exists on `main` | Retired after proof and explicit approval on 2026-04-21 | Worktree and local branch retired; no same-name remote branch existed |
| `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-repair` | `fix/prd-50-artifact-10-parity-repair` | PR #75 merged; local and remote branch refs were contained in `origin/main`; generated `scripts/__pycache__/` state was removed after the dirty follow-up patch was archived | Retired after proof and explicit approval on 2026-04-21 | Worktree, local branch, and remote branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-auth-callback-fix` | `fix/auth-callback-provider-error-redirect` | PR #72 merged; worktree was clean; local and remote branch refs had zero branch-only commits against `origin/main`; Git unregistered the worktree, then left a non-repo folder containing generated install/build/test artifacts | Retired after proof and explicit approval on 2026-04-21 | Worktree registration, leftover folder, local branch, and remote branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-docs-worktree-attachment-rules` | `codex/docs-worktree-attachment-rules` | Draft PR #77 was closed as superseded; the one branch-only governance-protocol diff was archived at `docs/engineering/change-records/2026-04-21-pr-77-worktree-attachment-rule.patch`; the branch was behind `main` and included mandatory new-worktree language that conflicted with the current owning-worktree rule for existing branch continuation | Retired after proof on 2026-04-21 | Worktree, local branch, and remote branch retired; do not recreate or merge this stale governance lane as written |
| `/Users/bm/Documents/daily-intelligence-aggregator-global-style-spec` | `feature/prd-50-global-style-spec` | PR #73 merged; worktree was clean; local and remote branch refs had zero branch-only commits against `origin/main` | Retired after proof and explicit approval on 2026-04-21 | Worktree, local branch, and remote branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-main-docs-sequential` | `docs/sequential-prompt-execution-protocol` | PR #63 merged; worktree was clean; local and remote branch refs had zero branch-only commits against `origin/main` | Retired after proof and explicit approval on 2026-04-21 | Worktree, local branch, and remote branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-ui-audit` | `feature/ui-audit-playwright-expansion` | Untracked `docs/engineering/testing/ui-audit-report.md` was preserved in the remediation docs lane; branch itself was contained in `origin/main`; no same-name remote branch existed | Retired after preservation proof and explicit approval on 2026-04-21 | Worktree and local branch retired |
| `/Users/bm/Documents/daily-intelligence-aggregator-worktree-branch-protocol` | `docs/prd-51-worktree-branch-protocol` | PR #74 merged; worktree was clean; local and remote branch refs had zero branch-only commits against `origin/main` | Retired after proof and explicit approval on 2026-04-21 | Worktree, local branch, and remote branch retired |

Immediate priority after this audit:
1. Merge or otherwise close the current remediation docs lane when ready; all sibling cleanup candidates from this audit have been resolved or preserved.

### UI Audit Evidence Lane Retirement Audit

The UI audit lane contained no branch-only commits, but it did contain one untracked validation report. The report was preserved before cleanup.

Findings:
- `/Users/bm/Documents/daily-intelligence-aggregator-ui-audit` was on `feature/ui-audit-playwright-expansion`.
- The worktree had untracked `docs/engineering/testing/ui-audit-report.md`.
- The report was preserved verbatim at `docs/engineering/testing/ui-audit-report.md` on the remediation docs branch.
- `origin/main...feature/ui-audit-playwright-expansion` had zero branch-only commits before retirement.
- `feature/ui-audit-playwright-expansion` was an ancestor of `origin/main`.
- No same-name remote branch `origin/feature/ui-audit-playwright-expansion` existed.

Retirement proof:
- The worktree path `/Users/bm/Documents/daily-intelligence-aggregator-ui-audit` was absent after cleanup.
- Local branch `feature/ui-audit-playwright-expansion` was absent after cleanup.
- Remote branch `origin/feature/ui-audit-playwright-expansion` was absent after cleanup.
- No feature branch, recovery artifact, stash entry, or unrelated worktree was touched.

### PRD-51 Worktree Branch Protocol Lane Retirement Audit

The PRD-51 worktree branch protocol lane was the final clean post-merge cleanup candidate. It was retired only after merge and containment proof.

Findings:
- PR #74 was merged to `main`: `https://github.com/brandonma25/daily-intelligence-aggregator/pull/74`.
- `/Users/bm/Documents/daily-intelligence-aggregator-worktree-branch-protocol` was clean before removal.
- `origin/main...docs/prd-51-worktree-branch-protocol` had zero branch-only commits before retirement.
- `origin/main...origin/docs/prd-51-worktree-branch-protocol` had zero remote branch-only commits before retirement.
- The local branch was behind its remote, and both refs were contained in current `origin/main`.

Retirement proof:
- The worktree path `/Users/bm/Documents/daily-intelligence-aggregator-worktree-branch-protocol` was absent after cleanup.
- Local branch `docs/prd-51-worktree-branch-protocol` was absent after cleanup.
- Remote branch `origin/docs/prd-51-worktree-branch-protocol` was absent after cleanup.
- No feature branch, recovery artifact, stash entry, UI audit report, or unrelated worktree was touched.

### Sequential Prompt Docs Lane Retirement Audit

The sequential prompt execution protocol lane was a clean post-merge cleanup candidate. It was retired only after merge and containment proof.

Findings:
- PR #63 was merged to `main`: `https://github.com/brandonma25/daily-intelligence-aggregator/pull/63`.
- `/Users/bm/Documents/daily-intelligence-aggregator-main-docs-sequential` was clean before removal.
- `origin/main...docs/sequential-prompt-execution-protocol` had zero branch-only commits before retirement.
- `origin/main...origin/docs/sequential-prompt-execution-protocol` had zero remote branch-only commits before retirement.
- The local branch was behind its remote, and both refs were contained in current `origin/main`.

Retirement proof:
- The worktree path `/Users/bm/Documents/daily-intelligence-aggregator-main-docs-sequential` was absent after cleanup.
- Local branch `docs/sequential-prompt-execution-protocol` was absent after cleanup.
- Remote branch `origin/docs/sequential-prompt-execution-protocol` was absent after cleanup.
- No feature branch, recovery artifact, stash entry, UI audit report, or unrelated worktree was touched.

### PRD-50 Global Style Spec Lane Retirement Audit

The PRD-50 global style spec lane was a clean post-merge cleanup candidate. It was retired only after merge and containment proof.

Findings:
- PR #73 was merged to `main`: `https://github.com/brandonma25/daily-intelligence-aggregator/pull/73`.
- `/Users/bm/Documents/daily-intelligence-aggregator-global-style-spec` was clean before removal.
- `origin/main...feature/prd-50-global-style-spec` had zero branch-only commits before retirement.
- `origin/main...origin/feature/prd-50-global-style-spec` had zero remote branch-only commits before retirement.
- The branch was tracked against `origin/feature/prd-50-global-style-spec` and had no local divergence.

Retirement proof:
- The worktree path `/Users/bm/Documents/daily-intelligence-aggregator-global-style-spec` was absent after cleanup.
- Local branch `feature/prd-50-global-style-spec` was absent after cleanup.
- Remote branch `origin/feature/prd-50-global-style-spec` was absent after cleanup.
- No feature branch, recovery artifact, stash entry, UI audit report, or unrelated worktree was touched.

### Auth Callback Fix Lane Retirement Audit

The auth-callback fix lane was a clean post-merge cleanup candidate. It was retired only after merge and containment proof.

Findings:
- PR #72 was merged to `main`: `https://github.com/brandonma25/daily-intelligence-aggregator/pull/72`.
- `/Users/bm/Documents/daily-intelligence-aggregator-auth-callback-fix` was clean before removal.
- `origin/main...fix/auth-callback-provider-error-redirect` had zero branch-only commits before retirement.
- `origin/main...origin/fix/auth-callback-provider-error-redirect` had zero remote branch-only commits before retirement.
- The branch was tracked against `origin/main` and was behind current `main`, not ahead of it.
- `git worktree remove` unregistered the worktree but left a non-repo directory containing generated install/build/test artifacts such as `.next`, `node_modules`, `playwright-report`, and `test-results`; that leftover directory was removed after containment proof.

Retirement proof:
- The worktree path `/Users/bm/Documents/daily-intelligence-aggregator-auth-callback-fix` was absent after cleanup.
- Local branch `fix/auth-callback-provider-error-redirect` was absent after cleanup.
- Remote branch `origin/fix/auth-callback-provider-error-redirect` was absent after cleanup.
- No feature branch, recovery artifact, stash entry, UI audit report, or unrelated worktree was touched.

### PR #77 Worktree Attachment Rule Lane Retirement Audit

PR #77 was a draft governance-doc PR on `codex/docs-worktree-attachment-rules`. It changed only `docs/engineering/protocols/engineering-protocol.md`, had previously green checks, and became stale behind `main`.

Findings:
- The PR's useful historical diff is archived at `docs/engineering/change-records/2026-04-21-pr-77-worktree-attachment-rule.patch`.
- The PR's strict attachment-proof idea is already represented in current repo rules through `AGENTS.md` and the current `engineering-protocol.md` local repo/worktree discipline section.
- The PR text also required creating a dedicated clean worktree before any coding. That language conflicts with the newer rule that work on an existing branch must happen inside that branch's owning worktree, and would increase the risk of new worktree proliferation during continuation prompts.
- The worktree at `/Users/bm/Documents/daily-intelligence-aggregator-docs-worktree-attachment-rules` was clean before removal.

Retirement proof:
- PR #77 was closed as superseded: `https://github.com/brandonma25/daily-intelligence-aggregator/pull/77`.
- The worktree path `/Users/bm/Documents/daily-intelligence-aggregator-docs-worktree-attachment-rules` was absent after cleanup.
- Local branch `codex/docs-worktree-attachment-rules` was absent after cleanup.
- Remote branch `origin/codex/docs-worktree-attachment-rules` was absent after cleanup.
- No feature branch, recovery artifact, stash entry, UI audit report, or unrelated worktree was touched.

### Artifact 10 Dirty Diff Decision Audit

This audit was run before any Artifact 10 cleanup. No Artifact 10 files, worktrees, branches, generated files, stash entries, or recovery artifacts were changed.

Findings:
- `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-followup` is on `fix/prd-50-artifact10-production-parity-followup` with dirty tracked changes in `src/components/landing/homepage.test.tsx` and `src/components/ui/button.tsx`.
- The follow-up branch has zero committed branch-only commits against `origin/main`; only dirty worktree state remains.
- The dirty `src/components/landing/homepage.test.tsx` assertions are already present in `origin/main`.
- The dirty `src/components/ui/button.tsx` change is stale relative to `origin/main`: it preserves primary white text styling that already exists on `main`, but it would remove the current `asChild` support and simplified prop handling from `main`.
- `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-repair` is on `fix/prd-50-artifact-10-parity-repair`, is behind its remote, and only has untracked generated `scripts/__pycache__/` state in the worktree.
- The exact dirty follow-up diff is archived at `docs/engineering/change-records/2026-04-21-artifact10-followup-dirty-state.patch`.

Decision:
- The Artifact 10 follow-up dirty diff is not currently classified as feature payload requiring preservation by commit.
- Artifact 10 cleanup was allowed only after the dirty diff was archived, branch containment was rechecked, and explicit human approval was given.
- The stale dirty follow-up diff and generated `scripts/__pycache__/` state were discarded during cleanup; the archived patch remains the preservation artifact.

Retirement proof:
- `origin/main...fix/prd-50-artifact10-production-parity-followup` had zero branch-only commits before retirement.
- `origin/main...fix/prd-50-artifact-10-parity-repair` had zero branch-only commits before retirement.
- `origin/main...origin/fix/prd-50-artifact-10-parity-repair` had zero remote branch-only commits before retirement.
- The worktree paths `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-followup` and `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-repair` were absent after cleanup.
- Local branches `fix/prd-50-artifact10-production-parity-followup` and `fix/prd-50-artifact-10-parity-repair` were absent after cleanup.
- Remote branch `origin/fix/prd-50-artifact-10-parity-repair` was absent after cleanup.
- No PRD-44 through PRD-49 feature branch, recovery artifact, stash entry, UI audit report, or unrelated worktree was touched.

## Continuation Rules

1. PRD-44 through PRD-49 original feature branches are retired and must not be reused.
2. If follow-up work is needed in a PRD-44 through PRD-49 product area, start from current `main` with a new explicitly scoped branch unless a newer ownership map identifies an active successor branch.
3. If another branch name appears to match the same PRD, treat it as blocked until this ownership map or a newer ownership map identifies it as canonical.
4. Rebuild branches are allowed only after the retired feature lane has been compared against `main` and a human explicitly approves rebuild over follow-up-from-main.
5. Retirement is allowed only after preservation evidence, remote branch state, and explicit human approval are all present.

## Final Remediation Step: Hotspot Feature Merge Sequencing

Do not merge the pushed PRD-44 through PRD-49 feature branches before the canonical-lane remediation is complete. These branches each represent protected feature work and may also touch the serialized governance hotspot `docs/product/feature-system.csv`, so merging them before the worktree/branch ownership cleanup is finished would preserve the same ambiguity this remediation is trying to remove.

Merge-sequencing progress:
- PRD-44 has been processed first on the canonical owner branch and merged to `main` through PR #79 at `be5b75f` after green GitHub checks, Vercel preview smoke validation for `/login` and `/signup`, and human Google Auth validation. The former PRD-44 owner worktree and branch should be treated as post-merge cleanup candidates, not active feature continuation lanes.
- PRD-45 has been processed second on the canonical owner branch and merged to `main` through PR #80 at `c48f8ca` after green GitHub checks, Vercel preview smoke validation for `/forgot-password` and `/reset-password`, and human reset-email delivery validation. The former PRD-45 owner worktree and branch should be treated as post-merge cleanup candidates, not active feature continuation lanes.
- PRD-46 has been processed third on the canonical owner branch and merged to `main` through PR #81 at `78733c3` after green GitHub checks, Vercel preview smoke validation for Top Events plus Tech News, Finance, and Politics tab switching, and human Home category-tab validation. The former PRD-46 owner worktree and branch should be treated as post-merge cleanup candidates, not active feature continuation lanes.
- PRD-47 has been processed fourth on the canonical owner branch and merged to `main` through PR #78 at `0ff8d92` after green GitHub checks, Vercel preview smoke validation for the public Home route, focused Home State component tests, production build, local release-governance validation, and local feature-system CSV validation. The former PRD-47 owner worktree and branch should be treated as post-merge cleanup candidates, not active feature continuation lanes.
- PRD-48 has been processed fifth on the canonical owner branch and merged to `main` through PR #82 at `b30d10f` after green GitHub checks, Vercel `/history` preview smoke validation, focused History and Home State component tests, production build, local release-governance validation, and local feature-system CSV validation. The former PRD-48 owner worktree and branch should be treated as post-merge cleanup candidates, not active feature continuation lanes.
- PRD-49 has been processed sixth on the canonical owner branch and merged to `main` through PR #83 at `25887bd` after green GitHub checks, Vercel `/settings` preview smoke validation, focused Account and auth-form regression tests, production build, local release-governance validation, and local feature-system CSV validation. The former PRD-49 owner worktree and branch should be treated as post-merge cleanup candidates, not active feature continuation lanes.

Result: PRD-44 through PRD-49 have all been merged to `main` from their canonical owner worktrees. No feature-bearing worktree or branch was deleted during merge sequencing.

After canonical-lane decisions are complete for PRD-44 through PRD-49:

1. Process feature branches one at a time from the owning worktree listed in this map.
2. Do not batch-merge PRD-44 through PRD-49.
3. Do not create replacement branches merely to satisfy a governance-gate failure when the canonical owner branch exists.
4. For any PRD feature PR that changes `docs/product/feature-system.csv`, add or update a feature-specific governance-facing document, usually a concise `docs/engineering/change-records/...` note, in that same owner branch.
5. Re-run the release governance gate and required validation for that branch before recommending merge.
6. Merge and clean up one canonical feature lane before starting the next feature merge lane.

Example: the PRD-47 failure in GitHub Actions job `72159412287` should be fixed on `feature/prd-47-home-states` in `/Users/bm/Documents/daily-intelligence-aggregator-home-states` by adding a PRD-47-specific governance change record for the `docs/product/feature-system.csv` hotspot update, not by merging all feature branches first and not by creating a new replacement branch.

## Phase 1 Result

PRD-44 through PRD-49 had one stated owner worktree and one stated canonical branch per PRD, and all six canonical feature branches merged to `main` through PRs #79, #80, #81, #78, #82, and #83. After post-merge proof and explicit approval, the six former feature worktrees, six local branches, and six remote branches were retired. The empty PRD-44 rebuild placeholder has been retired. The zero-diff `docs/worktree-attachment-enforcement` and `codexfeature/prd-43-49-mvp-ui-artifact-alignment` placeholder lanes have also been retired after explicit approval. The later non-PRD-44-through-PRD-49 attached worktree cleanup retired Artifact 10, auth-callback, PRD-50 global style, sequential docs, PRD-51 protocol, and UI audit lanes after preservation and containment proof. Remaining ambiguity is concentrated in protected recovery artifacts and stale evidence branches, not attached sibling worktrees.

Next phase: do not retire additional remote, local, worktree, stash, or recovery artifacts without a separate proof-and-approval pass. Protected recovery bundles are intentionally local-only and ignored by `.gitignore`; the remaining practical path is an explicit preservation or retirement decision for `stash@{0}`, `stash@{1}`, and `stash@{2}`.

## Phase 4 Stale Evidence Branch Audit

This audit was run after attached sibling worktrees had been reduced to the single remediation docs worktree. It did not delete, clean, pop, drop, or rewrite any stale branch, stash, recovery artifact, or feature-bearing evidence.

Global state:
- `main` and `origin/main` were aligned at audit time.
- `git worktree list` showed only `/Users/bm/Documents/daily-intelligence-aggregator-main` attached.
- The main worktree still had protected untracked `recovery-audit-20260420-163146/`.

| Evidence lane | Current state | Risk classification | Recommendation |
| --- | --- | --- | --- |
| `recovery-audit-20260420-163146/` | Untracked protected bundle containing worktree status files, tracked patches, untracked archives, `stash-0.patch`, `3f3c83b-preservation.patch`, `contamination-branches.bundle`, and workspace/worktree inventories | Protected evidence artifact | Preserve until an explicit evidence-retention decision is made; do not clean as incidental untracked state |
| `stash@{0}` | `pre-cleanup-main-worktree-snapshot` from `feature/prd-43-collapsible-sidebar`; `--include-untracked` stat spans app shell, PRD-43 responsive app shell docs/components, generated cache files, and related tests | Protected historical fallback | Preserve until recovery bundle and PRD-43 evidence are explicitly retired or archived elsewhere |
| `stash@{1}` | `preserve unrelated pre-source-onboarding worktree state`; `--include-untracked` stat includes one source-onboarding change record | Protected historical fallback | Preserve until source-onboarding history is explicitly reviewed |
| `stash@{2}` | `backup before clean PRD14 branch recreation 2026-04-17`; `--include-untracked` stat spans importance-scoring docs, tests, data/ranking changes, Supabase files, and test artifacts | Protected historical fallback | Preserve until PRD-14 evidence is explicitly reviewed |
| `feature/prd-43-collapsible-sidebar` | Local-only branch at `f1967b5`; `origin/main...feature/prd-43-collapsible-sidebar` had zero branch-only commits and no diff; no same-name remote branch existed | Retired zero-diff evidence branch label | Local branch was deleted after proof and explicit approval; related `stash@{0}` remains protected |
| `docs/artifact3-backend-contract-audit` | Local-only branch at `f1967b5`; `origin/main...docs/artifact3-backend-contract-audit` had zero branch-only commits and no diff; no same-name remote branch existed | Retired zero-diff evidence branch label | Local branch was deleted after proof and explicit approval; recovery bundle remains protected |
| `fix/settings-shell-cleanup` | Local and remote branch at `d8d9807`; PR #56 was merged; `origin/main...fix/settings-shell-cleanup` and `origin/main...origin/fix/settings-shell-cleanup` had zero branch-only commits and no diff | Retired stale merged branch | Local and remote refs were deleted after proof and explicit approval |
| `feature/prd-43-49-mvp-ui-artifact-alignment` | Local-only branch at `3f3c83b`; one branch-only commit modified `package-lock.json`, `package.json`, and deleted `src/app/settings/page.tsx`, `src/app/sources/page.tsx`, and `src/app/topics/page.tsx`; exact patch is preserved at `docs/engineering/change-records/2026-04-21-prd-43-49-wip-preservation.patch` and `recovery-audit-20260420-163146/3f3c83b-preservation.patch` | Retired branch-contamination evidence label | Local branch was deleted after durable patch preservation and explicit approval |

### PRD-43-49 WIP Evidence Branch Retirement Audit

The PRD-43-49 WIP alignment branch was the final local branch label carrying branch-only evidence. It was retired only after the exact branch commit patch was preserved in tracked repo documentation.

Findings:
- `feature/prd-43-49-mvp-ui-artifact-alignment` pointed at `3f3c83b`.
- No same-name remote branch existed.
- `origin/main...feature/prd-43-49-mvp-ui-artifact-alignment` had one branch-only commit before retirement.
- The branch-only diff modified `package-lock.json` and `package.json`, and deleted `src/app/settings/page.tsx`, `src/app/sources/page.tsx`, and `src/app/topics/page.tsx`.
- `git show --stat --patch --format=fuller feature/prd-43-49-mvp-ui-artifact-alignment` matched `recovery-audit-20260420-163146/3f3c83b-preservation.patch`.
- That exact patch was copied into tracked docs at `docs/engineering/change-records/2026-04-21-prd-43-49-wip-preservation.patch` before branch deletion.

Retirement proof:
- Local branch `feature/prd-43-49-mvp-ui-artifact-alignment` was absent after cleanup.
- Remote branch `origin/feature/prd-43-49-mvp-ui-artifact-alignment` was absent after cleanup.
- `stash@{0}`, `stash@{1}`, `stash@{2}`, and `recovery-audit-20260420-163146/` remained present after cleanup.
- No worktree, stash, recovery artifact, or unrelated branch was touched.

### Zero-Diff Evidence Branch Label Retirement Audit

The PRD-43 collapsible sidebar and Artifact 3 backend contract audit branch labels were stale local-only refs pointing at an ancestor of `origin/main`. They were retired only after containment proof.

Findings:
- `feature/prd-43-collapsible-sidebar` and `docs/artifact3-backend-contract-audit` both pointed at `f1967b5`.
- Neither branch had a same-name remote branch.
- `origin/main...feature/prd-43-collapsible-sidebar` had zero branch-only commits and no diff before retirement.
- `origin/main...docs/artifact3-backend-contract-audit` had zero branch-only commits and no diff before retirement.
- `stash@{0}`, `stash@{1}`, `stash@{2}`, `recovery-audit-20260420-163146/`, and `feature/prd-43-49-mvp-ui-artifact-alignment` remained present after retirement.

Retirement proof:
- Local branch `feature/prd-43-collapsible-sidebar` was absent after cleanup.
- Local branch `docs/artifact3-backend-contract-audit` was absent after cleanup.
- No remote branch was deleted because neither branch had a same-name remote ref.
- No stash, recovery artifact, worktree, feature-bearing branch, or unrelated branch was touched.

### Settings Shell Cleanup Branch Retirement Audit

The settings shell cleanup lane was a stale merged branch with both local and remote refs. It was retired only after merge and containment proof.

Findings:
- PR #56 was merged to `main`: `https://github.com/brandonma25/daily-intelligence-aggregator/pull/56`.
- `origin/main...fix/settings-shell-cleanup` had zero branch-only commits before retirement.
- `origin/main...origin/fix/settings-shell-cleanup` had zero remote branch-only commits before retirement.
- `git diff --name-status origin/main...fix/settings-shell-cleanup` showed no file diff before retirement.

Retirement proof:
- Local branch `fix/settings-shell-cleanup` was absent after cleanup.
- Remote branch `origin/fix/settings-shell-cleanup` was absent after cleanup.
- No worktree, recovery artifact, stash entry, feature-bearing branch, or unrelated branch was touched.

Operational conclusion:
- Attached worktree ambiguity is currently resolved.
- Branch ambiguity now comes from stale local/remote refs and protected evidence, not from sibling worktree ownership.
- Future feature work should not reuse any stale evidence branch listed here.
- No branch labels from this audit remain as active continuation lanes; stashes and recovery artifacts should remain protected until a separate preservation decision.

## Phase 5 Protected Artifact Status Normalization

This pass normalized the remaining protected recovery artifact without deleting, moving, applying, popping, or dropping any preserved work.

Findings:
- `recovery-audit-20260420-163146/` contains status snapshots, tracked patches, untracked-file archives, `stash-0.patch`, `3f3c83b-preservation.patch`, `contamination-branches.bundle`, and workspace/worktree inventories.
- The bundle verified successfully and contains refs for `feature/prd-43-49-mvp-ui-artifact-alignment`, `fix/branch-contamination-reconstruction`, `chore/branch-contamination-email-deps`, `chore/branch-contamination-route-deletions`, and `codexfeature/prd-43-49-mvp-ui-artifact-alignment`.
- The PRD-44 through PRD-49 untracked archives contain the expected PRD docs, tracker-sync notes, component files, and tests from their former feature lanes.
- `stash@{0}` preserves a PRD-43/sidebar and governance-doc snapshot with app-shell, responsive shell, tests, docs, generated cache files, and sample output.
- `stash@{1}` preserves one source-onboarding tracker-sync fallback document.
- `stash@{2}` preserves PRD-14 importance-scoring work, including docs, tests, ranking/data changes, Supabase files, and test artifacts.

Normalization decision:
- Add `/recovery-audit-*/` to `.gitignore` so local recovery bundles stop making the current worktree look dirty.
- Keep `recovery-audit-20260420-163146/` in place as protected local evidence.
- Keep `stash@{0}`, `stash@{1}`, and `stash@{2}` intact.
- Do not apply, pop, drop, move, delete, or rewrite any protected artifact without a separate explicit approval.

Operational conclusion:
- Recovery evidence no longer needs to appear as branch/worktree dirt in normal `git status`.
- The remaining stashes are preservation refs, not active continuation lanes.
- Future feature continuation should be based on the current owning branch/worktree for that feature, not on these historical stashes.

## Phase 6 Stash Preservation Review

The remaining stashes were reviewed in `docs/engineering/change-records/2026-04-21-stash-preservation-review.md`.

Current classification:
- `stash@{0}` remains protected PRD-43 responsive-shell source material; do not drop or apply wholesale.
- `stash@{1}` is a low-risk retirement candidate because its single tracker-sync file matches the current canonical tracker-sync file.
- `stash@{2}` remains protected historical importance-scoring source material; do not drop or apply wholesale.

Operational conclusion:
- No stash was applied, popped, dropped, moved, or rewritten.
- `stash@{1}` should be the first stash considered for retirement, but only after explicit approval naming that stash.
- `stash@{0}` and `stash@{2}` should remain protected until separate feature-port or archival decisions are made.
