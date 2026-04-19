# Post-Cluster Surfacing Quality Fix

## Root Cause

The remaining visible quality problems were downstream of clustering:

- the public fallback briefing rebuilt cards from a thin digest shape and lost the richer cluster evidence already available after ranking
- homepage composition re-surfaced the same event across the hero, top-ranked cards, and category rails
- the public fallback data set only covered Tech and Finance, so Politics could be empty by construction

Clustering guardrails and merge logic were not the primary failure in this pass.

## Files Changed

- `src/lib/data.ts`
- `src/lib/homepage-model.ts`
- `src/lib/demo-data.ts`
- `src/lib/pipeline/index.ts`
- `src/lib/scoring/scoring-engine.ts`
- `src/components/landing/homepage.tsx`
- `src/lib/homepage-model.test.ts`
- `src/lib/data.dashboard-fallback.test.ts`

## Fix

- Exposed ranked cluster objects from the Phase 1 pipeline so the public fallback path can build cards from real cluster evidence instead of generic digest strings.
- Rebuilt public fallback briefing items from representative article data, related coverage, cluster keywords, ranking score breakdowns, and deterministic event intelligence.
- Removed the strongest duplicate surfacing pattern by excluding the featured event from the top-ranked rail and excluding top-ranked events from category rails.
- Added Politics to the public fallback topic/source mix so the homepage has a real chance to populate that section.
- Added homepage debug visibility for non-featured duplicate surface count.

## Remaining Risks

- The featured hero can still mirror a category lead in sparse states by design.
- Politics quality now depends on the added public geopolitics feed quality and live availability.
- Signed-in personalization can still look similar to signed-out fallback when the account has no meaningful personalization configured; that is continuity behavior, not a rendering bug.
