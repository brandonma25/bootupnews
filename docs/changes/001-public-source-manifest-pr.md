# Public Source Manifest V1

## Summary

This change adds a minimum-viable public source manifest for the unauthenticated public Home path, adds Reuters World to `demoSources`, routes the public dashboard fallback through the manifest, and fixes the Politics category so it no longer borrows Tech or Finance cards when there are zero politics-classified events.

The implementation follows Option 3 from `docs/audits/source-architecture-audit.md`: a small public surface manifest on top of the existing runtime lists. `getMvpDefaultPublicSources()` and the internal default fallback behavior of `generateDailyBriefing()` remain unchanged.

## Phase-by-phase verification notes

Phase 0 fixed the misleading Politics fallback in `src/lib/homepage-model.ts` by skipping fallback allocation for the Politics section only. The chosen implementation was the smallest compatible option because it preserves fallback behavior for Tech and Finance, keeps `allocateFallbackEvents()` intact, and makes the Politics empty state explicit with "No politics stories in today's briefing." Verification: `npm run test -- src/lib/homepage-model.test.ts` passed.

Phase 1 added `src/lib/source-manifest.ts`, added `source-reuters-world` to `demoSources`, and added manifest tests. Reuters World uses the same feed URL, homepage identity, source name, and World topic identity as `horizon-reuters-world` in the Horizon donor definition. Verification: `npm run test -- src/lib/source-manifest.test.ts src/lib/source-defaults.test.ts` passed.

Phase 2 routed the public dashboard fallback path through `getSourcesForPublicSurface("public.home")` when no explicit sources are supplied. Signed-in supplied-source behavior and direct `generateDailyBriefing()` defaults were not changed. Verification: `npm run test -- src/lib/data.dashboard-fallback.test.ts src/lib/source-manifest.test.ts` passed.

Phase 3 added and updated tests for manifest ordering, Reuters World inclusion, missing manifest IDs, the public dashboard fallback source list, Politics fallback suppression, and the compatibility boundary that keeps Reuters World outside `MVP_DEFAULT_PUBLIC_SOURCE_IDS`. Verification: `npm run test -- src/lib/source-defaults.test.ts src/lib/source-manifest.test.ts src/lib/data.dashboard-fallback.test.ts src/lib/homepage-model.test.ts` passed.

Phase 4 added this PR description and `docs/adr/001-public-source-manifest.md`.

## Files changed

- `src/lib/homepage-model.ts`: skips borrowed fallback allocation for the Politics section and returns an honest Politics empty-state reason.
- `src/lib/homepage-model.test.ts`: verifies an empty Politics section does not display borrowed Tech or Finance fallback content.
- `src/lib/demo-data.ts`: adds `source-reuters-world` aligned to the Horizon Reuters World feed identity.
- `src/lib/source-manifest.ts`: introduces `PUBLIC_SURFACE_SOURCE_MANIFEST`, `PublicSurfaceKey`, and `getSourcesForPublicSurface()`.
- `src/lib/source-manifest.test.ts`: covers manifest length, Reuters World inclusion, ordering, and missing-source errors.
- `src/lib/data.ts`: uses the public manifest for the unauthenticated public dashboard fallback source list.
- `src/lib/data.dashboard-fallback.test.ts`: verifies the fallback dashboard source list now includes Reuters World via the manifest.
- `src/lib/source-defaults.test.ts`: documents that Reuters World is available in `demoSources` but remains outside the legacy MVP default helper.
- `docs/adr/001-public-source-manifest.md`: records the Option 3 decision and revisit triggers.
- `docs/changes/001-public-source-manifest-pr.md`: saved PR description and verification notes.

## Updated test assertions and why

`src/lib/data.dashboard-fallback.test.ts` now asserts the public fallback source IDs exactly: the old implicit "greater than zero" source check would not protect the manifest route or Reuters World activation. `src/lib/source-defaults.test.ts` now names Reuters World as a non-default demo source to make clear that the manifest did not mutate the legacy MVP default helper. `src/lib/homepage-model.test.ts` now asserts the Politics section remains empty when only Tech and Finance events exist, because the previous borrowed-card behavior was misleading.

## Blockers encountered

No implementation blockers were encountered. `npm install` reported one high-severity audit finding, but dependency remediation is outside this scoped change and was not modified.
