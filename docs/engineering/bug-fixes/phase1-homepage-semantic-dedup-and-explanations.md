# Homepage Semantic Dedup And Explanation Quality

## Root Cause

The homepage was still allowing repeated story families because the rail selection logic mainly avoided exact item reuse, not semantically similar events. The homepage model also generated low-quality user-facing copy itself:

- `Why this ranks here` used generic template language
- the visible timeline block was built from weak keyword and sibling heuristics
- fallback briefing copy still carried wording that sounded like internal clustering output

## What Changed

- Added deterministic semantic suppression across homepage rails so the featured story does not reappear downstream and near-duplicate event families are less likely to surface twice.
- Rewrote homepage `Why this ranks here` language to describe real user-meaningful reasons such as source confirmation, recency, and likely impact.
- Removed the low-value `Trigger / Earlier / Shift` timeline block from homepage cards.
- Cleaned public fallback briefing key points and ranking signals so they no longer expose clustering/debug-flavored phrases.

## Files Changed

- `src/lib/homepage-model.ts`
- `src/components/landing/homepage.tsx`
- `src/lib/data.ts`
- `src/lib/homepage-model.test.ts`
- `src/components/landing/homepage.test.tsx`
- `src/lib/data.dashboard-fallback.test.ts`

## Debug Visibility

Developer-only debug now tracks:

- `surfacedDuplicateCount`
- `semanticDuplicateSuppressedCount`
- `hiddenLowQualityTimelineSignalsCount`

These remain in debug surfaces only and are not shown in normal user-facing cards.

## Remaining Limitations

- Live feed quality can still produce many singleton clusters, so semantic variety is bounded by the raw candidate mix.
- The featured hero can still consume the strongest event from a category, leaving that category intentionally empty rather than repeating the same story lower on the page.
- Signed-in users without personalization bootstrap rows still see the public fallback briefing, so signed-in and signed-out views can remain similar until personalized data exists.
