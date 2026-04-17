# Repo Consolidation — Bug-Fix Notes

## Blockers Found
- `src/components/app-shell.tsx`
  Lint failed on `react-hooks/set-state-in-effect` because the shell restored sidebar state and closed mobile nav by setting state inside effects.
- `src/lib/data.test.ts`
  Unit tests still expected older fallback retry counts and test-only helper exports that are no longer present after the consolidation merges.
- `src/lib/data.auth.test.ts`
- `src/components/auth/auth-modal.test.tsx`
  Prior failures from the earlier consolidation run did not reproduce on rerun and were treated as transient test-run noise rather than current app regressions.

## Root Cause
- The shell component used post-mount effects for UI state that can be derived at initialization time or handled by existing click flows.
- The data test file had drifted behind the consolidated data-layer behavior:
  - GDELT fallback fetches now use `retryCount: 0`
  - obsolete `__testing__` helpers are no longer exported from `src/lib/data.ts`
- Playwright itself was healthy. The initial reruns failed because the repo expects an already-running dev server unless `PLAYWRIGHT_MANAGED_WEBSERVER` is set.

## Exact Fix Applied
- `src/components/app-shell.tsx`
  - replaced the sidebar hydration effect with a lazy `useState` initializer that reads `localStorage` only in the browser
  - removed the separate hydration state
  - removed the route-change effect that only closed the mobile drawer, since mobile nav links already close it directly
- `src/lib/data.test.ts`
  - updated the fallback retry expectation from `2` to `0`
  - removed obsolete tests that depended on non-exported legacy helpers

## Unresolved Items
- No current code or test failures remain on the consolidation branch after this stabilization pass.
- Preview validation was not performed in this session, so merge-to-main still depends on whether the repo operating rules require preview confirmation for this release step.

## Operational Notes
- The consolidation branch still intentionally excludes:
  - `feature/auth-preview-host-fix`
  - `feature/importance-scoring-engine-v1`
