# Stash Preservation Review

Date: 2026-04-21
Branch: `codex/stash-preservation-review`

## Objective

Classify the remaining local stashes after the worktree and branch normalization pass. This review does not apply, pop, drop, move, or rewrite any stash.

## Current State

- Main worktree: `/Users/bm/Documents/daily-intelligence-aggregator-main`
- Current branch when reviewed: `codex/stash-preservation-review`
- Attached worktrees: one
- Protected local recovery bundle: `recovery-audit-20260420-163146/`
- Remaining stashes: three

## Stash Inventory

| Stash | Commit | Source label | Classification | Recommendation |
| --- | --- | --- | --- | --- |
| `stash@{0}` | `b34f620170fcc419b7dd7e280e0b8e91fae09882` | `feature/prd-43-collapsible-sidebar: pre-cleanup-main-worktree-snapshot` | Protected feature-bearing snapshot | Keep. Do not drop or apply wholesale. |
| `stash@{1}` | `95bb9c71dfaf14b2c81544dd1f9d6cdc99ef0a89` | `chore/release-governance-gate-velocity: preserve unrelated pre-source-onboarding worktree state` | Low-risk duplicate tracker-sync artifact | Candidate for retirement after explicit approval. |
| `stash@{2}` | `6571ec2245d09a16eb4107f3c0c7cef8e6cab9da` | `feature/importance-scoring-engine-v1: backup before clean PRD14 branch recreation 2026-04-17` | Protected feature-bearing historical snapshot | Keep. Do not drop or apply wholesale. |

## Stash Details

### `stash@{0}` — PRD-43 Responsive App Shell Snapshot

Observed contents:
- Tracked changes touch `docs/product/feature-system.csv`, `src/app/settings/page.tsx`, `src/components/app-shell.tsx`, `src/lib/data.ts`, `src/lib/types.ts`, and `tests/dashboard.spec.ts`.
- Untracked contents include PRD-43 app shell docs, responsive shell tracker-sync fallback, `CollapsibleSidebar`, `BottomTabBar`, `PageHeader`, avatar UI, app shell tests, generated Python cache files, and sample pipeline output.

Repo comparison:
- Current `main` does not contain the PRD-43 responsive app shell files as a canonical implemented feature.
- The stash includes generated/cache artifacts and old governance-doc paths, so applying it wholesale would risk reintroducing stale structure.

Decision:
- Preserve `stash@{0}`.
- Treat it as a historical source for future PRD-43 port-forwarding, not as an active branch or direct continuation lane.
- If PRD-43 is resumed, start a fresh scoped branch from current `main` and manually port only the still-needed files from the stash.

### `stash@{1}` — Source-Onboarding Tracker-Sync Duplicate

Observed contents:
- One untracked file: `docs/operations/tracker-sync/2026-04-19-explicit-default-source-ingestion 2.md`.

Repo comparison:
- The stash file content matches current `docs/operations/tracker-sync/2026-04-19-explicit-default-source-ingestion.md`.
- The stash path is a duplicate suffixed filename and does not appear to contain unique feature payload.

Decision:
- Mark `stash@{1}` as a safe retirement candidate.
- Do not drop it yet; retirement should happen only after explicit approval that the current canonical tracker-sync file is sufficient preservation.

### `stash@{2}` — PRD-14 Importance Scoring Historical Snapshot

Observed contents:
- Tracked changes touch package files, dashboard rendering, landing/story cards, ranking/data modules, RSS handling, Supabase schema, and Vitest configuration.
- Untracked contents include old PRD-14 importance-scoring docs, dashboard E2E coverage, `importance-classifier`, `importance-score`, fixtures, Supabase migration, and test artifacts.

Repo comparison:
- Current repo taxonomy no longer maps PRD-14 to this feature; current `main` has `docs/product/prd/prd-14-auth-and-session-routing.md`.
- Current `main` has importance-ranking records under later governance paths such as `docs/engineering/change-records/importance-ranking-v2.md` and `docs/product/prd/prd-38-importance-ranking-v2.md`.
- The stash still contains real implementation logic that may be useful as historical source material, but it conflicts with current PRD numbering and file taxonomy.

Decision:
- Preserve `stash@{2}`.
- Do not apply it wholesale.
- If importance scoring is revisited, use current PRD-38/importance-ranking taxonomy and port individual logic intentionally from the stash.

## Operational Rule

The remaining stashes are preservation refs, not active continuation lanes. Future work should not continue directly from these stash source branch names. For any resumed feature:

1. Start from current `main`.
2. Create one scoped branch for the resumed feature.
3. Port only the explicitly selected stash content.
4. Preserve evidence before any stash retirement.
5. Drop a stash only after explicit approval naming that stash.

## Next Recommendation

Review `stash@{1}` for retirement first. It is the only stash in this review that appears to contain no unique feature payload. Keep `stash@{0}` and `stash@{2}` protected until separate feature-port or archival decisions are made.
