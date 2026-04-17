# Bug Fix: PRD 13 Signal Filtering Layer

## Summary
- Added a dedicated signal-filtering module that evaluates article quality before downstream clustering and ranking.
- Stored machine-readable filter metadata on raw articles so filtering behavior is inspectable and tunable.
- Added fallback promotion logic so low-volume runs degrade gracefully instead of collapsing into empty briefing states.

## Changed Behavior
- Weak commentary, filler, promotional content, and repetitive follow-ups are now suppressed or rejected earlier.
- Tier 1 sources pass with lighter requirements than Tier 2 or Tier 3 sources.
- Non-tier1 but important stories can still survive via explicit fallback promotion rules.

## Files and Systems Touched
- `src/lib/signal-filtering.ts`
- `src/lib/data.ts`
- `supabase/schema.sql`
- `src/lib/signal-filtering.test.ts`

## Remaining Gaps
- Source tier mappings are intentionally conservative and will need tuning as more feeds are added.
- Existing unrelated lint/test debt remains in the repository and is documented in the validation notes.
