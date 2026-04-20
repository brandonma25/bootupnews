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
| Recovery audit bundle | `/Users/bm/Documents/daily-intelligence-aggregator-main/recovery-audit-20260420-163146/` | Protected evidence artifact | Preserve; do not clean without explicit approval |
| `stash@{0}` | `feature/prd-43-collapsible-sidebar: pre-cleanup-main-worktree-snapshot` | Protected historical fallback | Preserve; do not pop or drop without explicit approval |
| `feature/prd-43-collapsible-sidebar` | Local branch at `f1967b5` | Stale evidence / placeholder feature lane | Do not use for PRD-44 through PRD-49 continuation |
| `docs/artifact3-backend-contract-audit` | Local branch at `f1967b5` | Stale evidence / docs lane | Do not use for PRD-44 through PRD-49 continuation |
| `fix/settings-shell-cleanup` | Local and remote branch at `d8d9807` | Semantically adjacent non-owner lane; no current `origin/main...fix/settings-shell-cleanup` diff found during PRD-49 audit | Do not use for PRD-49 Account continuation |

## Phase 3 Pre-Retirement Audit

The purpose of this audit is to identify which names are safe retirement candidates only after explicit human approval. No feature payload, stash, or recovery artifact is retired by this section.

| Branch or worktree | Evidence | Retirement status | Rule |
| --- | --- | --- | --- |
| PRD-44 through PRD-49 post-merge feature lanes | Each former owner worktree was clean; each local and remote branch was contained in `origin/main` at `25887bd`; each branch had zero branch-only commits; PRs #79, #80, #81, #78, #82, and #83 were merged | Retired after explicit approval on 2026-04-21 | Removed the six former feature worktrees, deleted the six local branches, and deleted the six remote branches; do not recreate old branch names for follow-up work |
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

## Phase 3 Remaining Attached Worktree Audit

This audit was run after PRD-44 through PRD-49 post-merge retirement. No additional worktree, branch, stash, recovery artifact, or evidence lane was retired by this section.

| Worktree | Branch | State | Retirement readiness | Rule |
| --- | --- | --- | --- | --- |
| `/Users/bm/Documents/daily-intelligence-aggregator-main` | `codex/update-worktree-attachment-rules` | Active remediation docs lane; branch has ownership-map and branch-contamination records not yet merged to `main`; untracked `recovery-audit-20260420-163146/` remains protected evidence | Not a retirement candidate | Keep as the current remediation documentation lane until its records are merged or explicitly superseded; preserve the recovery audit bundle |
| `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-followup` | `fix/prd-50-artifact10-production-parity-followup` | Dirty tracked local work in `src/components/landing/homepage.test.tsx` and `src/components/ui/button.tsx`; local branch has zero committed branch-only commits against `origin/main`; the dirty test diff is already present in `origin/main`; the dirty button diff is stale relative to current `origin/main` because it would remove existing `asChild` support while retaining primary white text styling that already exists on `main` | Blocked pending explicit discard-or-archive approval | Treat as stale dirty follow-up state, not current feature payload; do not clean, remove, or branch-delete until the dirty diff is explicitly archived or discarded |
| `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-repair` | `fix/prd-50-artifact-10-parity-repair` | PR #75 merged; branch is contained in `origin/main`; worktree has untracked `scripts/__pycache__/`; remote branch still exists and is shared as the upstream for the follow-up lane | Blocked until Artifact 10 follow-up is resolved | Do not retire independently while the follow-up worktree still has dirty state and tracks the same remote branch name |
| `/Users/bm/Documents/daily-intelligence-aggregator-auth-callback-fix` | `fix/auth-callback-provider-error-redirect` | PR #72 merged; worktree clean; branch contained in `origin/main`; remote branch still exists | Candidate after approval | Safe-looking post-merge cleanup candidate, but delete only after explicit approval |
| `/Users/bm/Documents/daily-intelligence-aggregator-docs-worktree-attachment-rules` | `codex/docs-worktree-attachment-rules` | Draft PR #77 is still open; worktree clean; branch has one branch-only governance-protocol change against `origin/main`; checks were green on the PR | Not a retirement candidate | Resolve PR #77 intentionally, either by merging after review or closing/superseding after comparing with current remediation docs |
| `/Users/bm/Documents/daily-intelligence-aggregator-global-style-spec` | `feature/prd-50-global-style-spec` | PR #73 merged; worktree clean; local and remote branch are contained in `origin/main` | Candidate after approval | Safe-looking post-merge cleanup candidate, but delete only after explicit approval |
| `/Users/bm/Documents/daily-intelligence-aggregator-main-docs-sequential` | `docs/sequential-prompt-execution-protocol` | PR #63 merged; worktree clean; local branch is behind its remote but both are contained in `origin/main` | Candidate after approval | Safe-looking post-merge cleanup candidate, but delete only after explicit approval |
| `/Users/bm/Documents/daily-intelligence-aggregator-ui-audit` | `feature/ui-audit-playwright-expansion` | Worktree has untracked `docs/engineering/testing/ui-audit-report.md`; branch itself is contained in `origin/main`; no same-name remote branch currently exists | Blocked | Preserve until the untracked UI audit report is reviewed, moved, committed, or explicitly discarded |
| `/Users/bm/Documents/daily-intelligence-aggregator-worktree-branch-protocol` | `docs/prd-51-worktree-branch-protocol` | PR #74 merged; worktree clean; local branch is behind its remote but both are contained in `origin/main` | Candidate after approval | Safe-looking post-merge cleanup candidate, but delete only after explicit approval |

Immediate priority after this audit:
1. Preserve or decide the dirty Artifact 10 follow-up diff before touching either Artifact 10 worktree.
2. Resolve the still-open draft PR #77 governance-doc lane.
3. Ask for explicit approval before retiring the clean merged candidates: auth callback fix, PRD-50 global style spec, sequential prompt docs, and PRD-51 worktree branch protocol.
4. Preserve or decide the untracked UI audit report before retiring the UI audit worktree.

### Artifact 10 Dirty Diff Decision Audit

This audit was run before any Artifact 10 cleanup. No Artifact 10 files, worktrees, branches, generated files, stash entries, or recovery artifacts were changed.

Findings:
- `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-followup` is on `fix/prd-50-artifact10-production-parity-followup` with dirty tracked changes in `src/components/landing/homepage.test.tsx` and `src/components/ui/button.tsx`.
- The follow-up branch has zero committed branch-only commits against `origin/main`; only dirty worktree state remains.
- The dirty `src/components/landing/homepage.test.tsx` assertions are already present in `origin/main`.
- The dirty `src/components/ui/button.tsx` change is stale relative to `origin/main`: it preserves primary white text styling that already exists on `main`, but it would remove the current `asChild` support and simplified prop handling from `main`.
- `/Users/bm/Documents/daily-intelligence-aggregator-artifact10-repair` is on `fix/prd-50-artifact-10-parity-repair`, is behind its remote, and only has untracked generated `scripts/__pycache__/` state in the worktree.

Decision:
- The Artifact 10 follow-up dirty diff is not currently classified as feature payload requiring preservation by commit.
- Artifact 10 cleanup remains blocked until there is explicit approval to archive or discard the stale dirty diff and to remove the generated `scripts/__pycache__/` state.
- If maximum caution is desired, create a patch artifact from the dirty follow-up diff before cleanup. Otherwise, discard the stale follow-up diff and retire both Artifact 10 worktrees and branch refs in a separate explicit cleanup pass.

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

PRD-44 through PRD-49 had one stated owner worktree and one stated canonical branch per PRD, and all six canonical feature branches merged to `main` through PRs #79, #80, #81, #78, #82, and #83. After post-merge proof and explicit approval, the six former feature worktrees, six local branches, and six remote branches were retired. The empty PRD-44 rebuild placeholder has been retired. The zero-diff `docs/worktree-attachment-enforcement` and `codexfeature/prd-43-49-mvp-ui-artifact-alignment` placeholder lanes have also been retired after explicit approval. Remaining ambiguity is concentrated in protected recovery artifacts, stale evidence branches, and approval-gated zero-diff placeholder lanes.

Next phase: do not retire additional remote, local, worktree, or evidence-bearing lanes without a separate proof-and-approval pass. The remaining practical path is a focused audit of still-attached non-PRD-44-through-PRD-49 worktrees and stale evidence lanes, especially protected recovery artifacts and unrelated scoped branches.
