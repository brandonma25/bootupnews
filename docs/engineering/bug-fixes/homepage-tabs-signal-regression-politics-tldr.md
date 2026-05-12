# Homepage Tabs + Signal Count Regression — Bug-Fix Record

## Summary
- Problem addressed: homepage Top Events under-rendered the published editorial signal set, and category tabs appeared empty after the politics/TLDR ingestion and SSR remediation sequence.
- Root cause: homepage semantic duplicate checks treated generic category/status tags as story identity, while the read-only homepage data path no longer had a broader `publicRankedItems` pool beyond the published Top 5.
- Affected object level: Signal, Card, and Surface Placement.

## Fix
- Exact change:
  - Ignore generic category/status terms when comparing semantic entity and keyword overlap.
  - Preserve distinct published Top 5 signal cards even when their tags are generic editorial labels.
  - When the homepage has exactly the editorial Top 5 and no broader ranked depth pool, use that real published Top 5 as the source for category tab filtering.
  - Follow-up correction: category tabs now prefer real non-Top category depth from `publicRankedItems` before falling back to Top 5 classification.
  - Published live homepage snapshots now preserve up to 20 published live rows as read-only `depthPosts` for tabs/depth modules while keeping the public `/signals` surface capped to the current Top 5.
  - Keep Developing Now and By Category depth modules empty in that no-depth-pool case instead of duplicating Top Events as fresh additional intelligence.
  - Second follow-up correction: widen `signal_posts` rank storage to a bounded public depth pool and publish non-Top rows as category-depth rows when the approved Top 5 set is published. This preserves the Top 5 editorial contract while giving homepage tabs real non-Top public depth.
- Related PRD: existing homepage category/depth behavior is governed by `docs/product/prd/prd-46-home-category-tabs.md` and `docs/product/prd/prd-57-homepage-volume-layers.md`; no new canonical PRD is required.
- Migration/change-record evidence was preserved as operational evidence. The durable public interpretation is captured in the relevant PR, product source-of-truth docs, or DECISIONS.md.
- PR: #114, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/114`
- Branch: `bugfix/homepage-tabs-signal-regression`
- Head SHA: `f3d4448c8078be9fef374d762420e2cafd71e3fb`
- Merge SHA: `c6e0fb6f745f6a19e2a18e2fa40f4e38d0b02d45`
- GitHub source-of-truth status: canonical record consolidated here on 2026-05-04; deprecated legacy redirect was removed on 2026-05-04.
- External references reviewed, if any: PR #114 metadata and the legacy bug report.
- Google Sheet / Work Log reference, if historically relevant: Operational closeout and tracker-sync evidence should live in PR metadata, GitHub history, or private archive records rather than public documentation links.
- Branch cleanup status: branch is still present locally at `/Users/bm/dev/worktrees/daily-intel-homepage-tabs-signal-regression`; no deletion was performed in this branch.

## Data-Flow Diagnosis
| Stage | Result |
| --- | --- |
| Ingestion candidate depth | Manifest-provenance pipeline test fetches 7 raw items without the non-manifest five-source cap. |
| Normalization | 7 normalized articles are retained. |
| Deduplication | 7 deduped articles are retained in the regression fixture. |
| Clustering/ranking | More than 5 ranked clusters are produced when source data supports it. |
| Digest/Top Events | Digest remains intentionally capped at 5. |
| Publication/public read model before fix | `signal_posts` rank constraint and candidate persistence limited public signal rows to ranks 1-5. |
| Homepage public pool before fix | Preview debug showed 5 ranked events, so tab-eligible non-Top depth was 0. |
| Homepage public pool after fix | The table can store ranks 1-20; `/signals` still reads only Top 5; homepage snapshot can read up to 20 published live rows. |

## Validation
- Automated checks:
  - `npm install`
  - `npm run test -- src/lib/homepage-model.test.ts`
  - `npm run test -- src/lib/homepage-model.test.ts src/lib/source-catalog.test.ts src/lib/source-defaults.test.ts src/lib/source-manifest.test.ts src/lib/pipeline/ingestion/index.test.ts src/lib/pipeline/ingestion/tldr.integration.test.ts src/lib/tldr.test.ts src/lib/rss.test.ts src/lib/signals-editorial.test.ts src/components/home/home-category-components.test.tsx src/components/home/CategoryPreviewGrid.test.tsx`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `PLAYWRIGHT_BASE_URL=[REDACTED_ENV_VALUE] npx playwright test --project=chromium`
  - `PLAYWRIGHT_BASE_URL=[REDACTED_ENV_VALUE] npx playwright test --project=webkit`
  - Follow-up targeted checks:
  - `npm run test -- src/lib/homepage-model.test.ts src/lib/data.test.ts src/lib/signals-editorial.test.ts`
  - Added regression coverage for non-Top category depth, Top 5-only fallback, generic editorial tags, and broader published live snapshot depth.
  - Second follow-up targeted check:
  - `npm run test -- src/lib/signals-editorial.test.ts src/lib/pipeline/index.test.ts src/lib/homepage-model.test.ts src/lib/data.test.ts`
  - Added regression coverage for ranked cluster depth beyond the digest Top 5, bounded signal-post depth persistence, depth publication, and `/signals` staying capped to Top 5.
- Local route/browser checks:
  - Local URL: `http://localhost:3000`
  - `HEAD /`, `HEAD /signals`, and `HEAD /dashboard/signals/editorial-review` returned `200`
  - local browser check found 5 homepage top cards and no console errors
- Human checks:
  - Preview signed-in/signed-out behavior remains required after PR deployment.

## Remaining Risks / Follow-up
- If production needs separate non-Top-5 depth content, a future scoped change should read a real persisted broader candidate pool instead of running ingestion during homepage SSR or presenting fallback data as live intelligence.
- Existing previews with only five stored rows will continue to show only five until the migration is applied and a new signal snapshot with more than five candidates is persisted/published.
