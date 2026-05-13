# Signed-In Empty Dashboard Fallback

## GitHub Source-of-Truth Metadata
- Affected object level: Signal and Surface Placement.
- PR: #54, `https://github.com/brandonma25/bootupnews/pull/54`.
- Branch: `feature/ingestion-v1`.
- Head SHA: `0c7903edd9b8c71f0ae7bbc21ff2987218fa8e26`.
- Merge SHA: `bc16e875ad9579acafad3ac768768284a528c151`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #54 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Root Cause

Signed-out requests used the Phase 1 public pipeline through `getPublicDashboardData()`, but signed-in requests switched immediately to user-scoped `topics`, `sources`, `articles`, `events`, and `article_topics` queries in `getDashboardData()`. When a signed-in user had no bootstrap rows yet, those queries succeeded with empty results and the code returned `mode: "live"` with an empty briefing instead of falling back to the working public pipeline.

## Files Changed

- `src/lib/data.ts`
- `src/lib/data.dashboard-fallback.test.ts`

## Fix Implemented

- Added explicit dashboard path observability for:
  - session presence
  - personalized query resolution
  - personalized row counts
  - fallback activation
- Added a shared pipeline-backed dashboard builder so the app can render the Phase 1 briefing in either:
  - `public_pipeline`
  - `personalized_fallback_to_public`
- Updated signed-in dashboard loading so it falls back when:
  - personalized topics are missing
  - active personalized sources are missing
  - personalized briefing generation returns zero visible items
- Preserved signed-in viewer state by returning the fallback briefing as `mode: "live"` for authenticated users.

## Fallback Behavior

- Signed-out users continue using the public Phase 1 pipeline.
- Signed-in users still attempt the personalized data path first.
- If the personalized path is empty but not fatally broken, the dashboard now shows the pipeline briefing instead of a blank state.

## Remaining Risks

- The fallback uses the public/deterministic pipeline content, so it is a safe continuity path rather than a fully personalized experience.
- Real Google sign-in and session persistence still require human validation in preview or local browser flow.
- If user-scoped rows exist but contain malformed data, additional defensive cleanup may still be needed later.

## Human Validation Still Needed

- Verify Google sign-in still succeeds and lands on populated homepage/dashboard content.
- Verify refresh preserves the signed-in populated state.
- Verify sign-out returns to the signed-out populated state without redirect loops.
