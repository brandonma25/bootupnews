# Homepage Tabs + Signal Count Regression — Bug-Fix Record

## Summary
- Problem addressed: homepage Top Events under-rendered the published editorial signal set, and category tabs appeared empty after the politics/TLDR ingestion and SSR remediation sequence.
- Root cause: homepage semantic duplicate checks treated generic category/status tags as story identity, while the read-only homepage data path no longer had a broader `publicRankedItems` pool beyond the published Top 5.

## Fix
- Exact change:
  - Ignore generic category/status terms when comparing semantic entity and keyword overlap.
  - Preserve distinct published Top 5 signal cards even when their tags are generic editorial labels.
  - When the homepage has exactly the editorial Top 5 and no broader ranked depth pool, use that real published Top 5 as the source for category tab filtering.
  - Follow-up correction: category tabs now prefer real non-Top category depth from `publicRankedItems` before falling back to Top 5 classification.
  - Published live homepage snapshots now preserve up to 20 published live rows as read-only `depthPosts` for tabs/depth modules while keeping the public `/signals` surface capped to the current Top 5.
  - Keep Developing Now and By Category depth modules empty in that no-depth-pool case instead of duplicating Top Events as fresh additional intelligence.
- Related PRD: existing homepage category/depth behavior is governed by `docs/product/prd/prd-46-home-category-tabs.md` and `docs/product/prd/prd-57-homepage-volume-layers.md`; no new canonical PRD is required.

## Validation
- Automated checks:
  - `npm install`
  - `npm run test -- src/lib/homepage-model.test.ts`
  - `npm run test -- src/lib/homepage-model.test.ts src/lib/source-catalog.test.ts src/lib/source-defaults.test.ts src/lib/source-manifest.test.ts src/lib/pipeline/ingestion/index.test.ts src/lib/pipeline/ingestion/tldr.integration.test.ts src/lib/tldr.test.ts src/lib/rss.test.ts src/lib/signals-editorial.test.ts src/components/home/home-category-components.test.tsx src/components/home/CategoryPreviewGrid.test.tsx`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --project=chromium`
  - `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --project=webkit`
- Follow-up targeted checks:
  - `npm run test -- src/lib/homepage-model.test.ts src/lib/data.test.ts src/lib/signals-editorial.test.ts`
  - Added regression coverage for non-Top category depth, Top 5-only fallback, generic editorial tags, and broader published live snapshot depth.
- Local route/browser checks:
  - Local URL: `http://localhost:3000`
  - `HEAD /`, `HEAD /signals`, and `HEAD /dashboard/signals/editorial-review` returned `200`
  - local browser check found 5 homepage top cards and no console errors
- Human checks:
  - Preview signed-in/signed-out behavior remains required after PR deployment.

## Tracker Closeout
- Google Sheets tracker row updated and verified: not available in this local session.
- Fallback tracker-sync file, if direct Sheets update was unavailable: `docs/operations/tracker-sync/2026-04-26-homepage-tabs-signal-regression-politics-tldr.md`

## Remaining Risks / Follow-up
- If production needs separate non-Top-5 depth content, a future scoped change should read a real persisted broader candidate pool instead of running ingestion during homepage SSR or presenting fallback data as live intelligence.
