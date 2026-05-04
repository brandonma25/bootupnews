# Editorial History Ordering Bug Fix

## Summary
- Date: 2026-04-26
- Branch: `fix/editorial-history-ordering`
- PR: #111, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/111`
- Head SHA: `d2d399acf28e209130e035e978b03ff8feceb5be`
- Merge SHA: `bdefaedec1bfb8f2eab8c9ff32ecbb73766fe93c`
- GitHub source-of-truth status: canonical record consolidated here on 2026-05-04; deprecated legacy redirect was removed on 2026-05-04.
- Area: `/dashboard/signals/editorial-review`
- Data source: `signal_posts`
- Affected object level: Surface Placement.

## Problem
Editorial history cards were not consistently rendered in reverse chronological order. Older signal dates could appear above newer signal dates after the older rows were edited or published.

## Root Cause
The server query ordered stored editorial rows by `briefing_date`, but the page then sorted the transformed posts by `updatedAt`. Because `updated_at` changes during editorial edits, it was not a stable history date and could reorder archived days incorrectly.

## Fix
- Added explicit query tie-breakers after `briefing_date`.
- Added a shared defensive sort for editorial history posts after transformation.
- Updated the page render path to use the shared sort instead of sorting by `updatedAt`.
- Added tests for reverse date ordering and same-day stable tie-breaking.

## Sorting Contract
Primary field: `briefing_date` / `briefingDate`, because that is the editorial history signal date displayed on each card.

Tie-breakers:
1. `published_at` / `publishedAt` descending
2. `signal_score` / `signalScore` descending
3. `created_at` / `createdAt` descending
4. `updated_at` / `updatedAt` descending
5. `id` ascending

## Validation
- `npm install`
- `npm run test -- src/lib/signals-editorial.test.ts`
- `npm run test -- src/app/dashboard/signals/editorial-review/page.test.tsx`
- `npm run lint`
- `npm run test -- src/lib/signals-editorial.test.ts src/app/dashboard/signals/editorial-review/page.test.tsx`
- `npm run build`
- `npm run test -- src/components/landing/homepage.test.tsx src/lib/homepage-model.test.ts src/app/page.test.tsx`
- `python3 scripts/release-governance-gate.py`
- Dev server local route probe for `/dashboard/signals/editorial-review` returned `200 OK`.

## Notes
- No database schema change was required.
- Homepage ranking logic was not changed.
- Ingestion, clustering, scoring, and editorial approval logic were not changed.
- Signed-in admin visual validation remains a preview/human check.
- Google Sheet / Work Log reference, if historically relevant: historical tracker-sync reference only, `docs/operations/tracker-sync/2026-04-26-editorial-history-ordering.md`.
- Branch cleanup status: branch deletion state not independently recoverable in this cleanup; PR metadata preserves branch and SHA.
