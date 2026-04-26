# Homepage Tabs + Signal Count Regression After Politics/TLDR

## Symptom
- Production homepage showed only 3 visible Top Event signal cards.
- Production homepage category/depth sections showed empty states even though published signals existed.
- Production `/signals` showed 5 published signal cards from the editorial layer.

## Suspected Cause
- Recent politics/TLDR ingestion and homepage SSR isolation work changed the shape of the published signal set and the homepage read model.
- The homepage model was likely filtering or suppressing valid published signals after loading them, rather than failing to load the rows.

## Confirmed Cause
- `/signals` reads `signal_posts` directly through `getPublishedSignalPosts()` and displayed all 5 published rows.
- `/` loads the same published rows, maps them into `BriefingItem` records, and then applies homepage semantic duplicate suppression plus category/depth exclusion.
- Generic editorial tags and display entities such as `Tech`, `Finance`, `Politics`, `context`, and `Watch` were being treated as story identity signals. Distinct published items in the same category were suppressed as semantic duplicates.
- The read-only homepage SSR path set `publicRankedItems` to the same 5 published signal posts. Category tabs then excluded already-surfaced Top Events, leaving no separate depth pool for tab content.
- Follow-up finding: PR #114 fixed the empty-tab case by globally falling back to classifying the Top 5 whenever the depth pool did not contain distinct IDs. That fallback was correct for a pure Top 5-only read model, but the tab model needed a narrower precedence rule: use real non-Top category depth first, and only classify the Top 5 when no broader category-eligible tab pool exists.

## Files Changed
- `src/lib/homepage-model.ts`
- `src/lib/homepage-model.test.ts`
- `src/lib/data.ts`
- `src/lib/data.test.ts`
- `src/lib/signals-editorial.ts`
- `src/lib/signals-editorial.test.ts`
- `docs/bugs/homepage-tabs-signal-regression-politics-tldr.md`
- `docs/engineering/bug-fixes/homepage-tabs-signal-regression-politics-tldr.md`
- `docs/operations/tracker-sync/2026-04-26-homepage-tabs-signal-regression-politics-tldr.md`

## Validation Performed
- `npm install`
- `npm run test -- src/lib/homepage-model.test.ts`
- `npm run test -- src/lib/homepage-model.test.ts src/lib/source-catalog.test.ts src/lib/source-defaults.test.ts src/lib/source-manifest.test.ts src/lib/pipeline/ingestion/index.test.ts src/lib/pipeline/ingestion/tldr.integration.test.ts src/lib/tldr.test.ts src/lib/rss.test.ts src/lib/signals-editorial.test.ts src/components/home/home-category-components.test.tsx src/components/home/CategoryPreviewGrid.test.tsx`
- `npm run lint`
- `npm run test`
- `npm run build`
- Dev Server Rule:
  - checked port `3000` and Next.js dev processes
  - started `npm run dev`
  - Local URL: `http://localhost:3000`
- Local route probes:
  - `HEAD /` returned `200`
  - `HEAD /signals` returned `200`
  - `HEAD /dashboard/signals/editorial-review` returned `200`
- Local browser check:
  - homepage rendered 5 top event cards in local fallback mode
  - browser console error log count was `0`
  - fallback content remained explicitly labeled as placeholder/non-live copy
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --project=chromium`
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --project=webkit`
- Follow-up targeted regression coverage:
  - homepage model uses non-homepage category depth when a broader ranked pool exists
  - homepage model classifies Top 5 into tabs only when no broader tab pool exists
  - published live signal snapshots preserve additional published rows for homepage depth while `/signals` remains capped to Top 5
  - public homepage data maps snapshot `depthPosts` into `publicRankedItems`

## Production / Preview Risk
- No schema or database migration is required.
- The fix keeps homepage SSR on persisted read models only.
- The fix does not activate or remove politics/TLDR ingestion.
- Preview validation is still required for signed-in/signed-out rendering, SSR, and cookie-sensitive behavior.
