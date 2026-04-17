# Repo Consolidation — Main Sync Summary

## Objective
- Consolidate clearly scoped, production-relevant branches into a single review branch based on `origin/main`.

## Consolidated In This Branch
- `feature/playwright-e2e-foundation`
  Added local Playwright config and starter homepage/dashboard smoke coverage.
- `chore/add-ci-workflow`
  Added a GitHub Actions workflow for lint, build, and test.
- `feature/why-this-matters-final-merge-fix`
  Added follow-up precision/routing fixes for the `why-it-matters` generation path.
- `feature/signal-filtering-layer`
  Added the PRD 13 signal-filtering layer, tests, docs, and a schema migration.
- Stabilization pass
  Fixed the post-consolidation lint blocker in `app-shell`, aligned stale data-layer tests with the consolidated implementation, and reran the full local validation workflow.

## Intentionally Excluded
- `feature/auth-preview-host-fix`
  Auth and preview-host behavior still require preview validation and human verification before merge-to-main.
- `feature/dashboard-state-system`
  Open branch remains stale relative to current main and was not clearly safer than the current shipped dashboard path.
- `feature/repo-operating-system-consolidation`
  Superseded by already-merged protocol/docs work.
- `feature/importance-scoring-engine-v1`
  Current feature work is still uncommitted in another worktree and was not safe to consolidate.

## Current Merge Readiness
- This branch is now locally stable:
  - build passes
  - lint passes
  - unit tests pass
  - local Playwright passes
- Intentionally excluded branches remain excluded:
  - `feature/auth-preview-host-fix`
  - `feature/importance-scoring-engine-v1`
- Main branch update in this pass:
  - not yet performed in this document
- Preview validation remains the only repo-process question left for a final merge-to-main decision.
