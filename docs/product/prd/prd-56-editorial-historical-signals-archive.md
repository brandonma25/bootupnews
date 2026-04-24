# PRD-56 — Editorial historical signals archive

- PRD ID: `PRD-56`
- Canonical file: `docs/product/prd/prd-56-editorial-historical-signals-archive.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Expand the briefing generation pipeline so each run persists a dated daily Top 5 snapshot in `signal_posts`, while the editorial workflow can browse and manage those snapshots over time and homepage/public signals stay pinned to the explicitly live published set.

## User Problem

The current Top 5 persistence path behaves like a rolling overwrite and can lag behind the real briefing pipeline because rows are materialized lazily from the editorial layer. Editors need the pipeline itself to preserve each day’s Top 5 snapshot so historical rows accumulate reliably without flooding homepage or public surfaces with archived sets.

## Scope

- Expand `signal_posts` into a dated daily archive keyed by `briefing_date` plus `rank`.
- Persist the daily Top 5 snapshot during briefing generation instead of waiting for the editorial page to seed rows.
- Add `is_live` so only one published Top 5 set powers homepage and public `/signals`.
- Preserve the existing admin editorial route and actions while adding scope-aware browsing for current, historical, and all-date views.
- Add admin filters for status, briefing date, text search, and pagination.
- Keep published historical rows editable in admin.
- Keep homepage and public signals limited to the live published Top 5 set.

## Non-Goals

- Do not reconstruct historical days that were never previously persisted.
- Do not expose historical rows on homepage or public `/signals`.
- Do not weaken admin auth, session checks, or server-only Supabase access rules.
- Do not replace the existing Top 5 publish workflow.

## Implementation Shape / System Impact

- `public.signal_posts` stores daily Top 5 snapshots, using unique `(briefing_date, rank)` instead of a globally unique `rank`.
- `src/app/actions.ts` persists the current daily Top 5 snapshot when briefing generation succeeds so the archive follows the real pipeline.
- A partial unique live-rank index ensures only one live published row exists for each homepage slot.
- `src/lib/signals-editorial.ts` owns idempotent daily snapshot persistence, loads current, historical, or all-date sets from the dated archive, and supports date/query/status filters plus pagination.
- Publishing flips the previous live set off and marks the new published Top 5 as live.
- `src/lib/homepage-editorial-overrides.ts` and the public `/signals` data path read only `is_live = true` and `editorial_status = 'published'`.

## Dependencies / Risks

- Depends on PRD-53 editorial workflow foundations already being present.
- Requires the Supabase migration `20260424083000_signal_posts_historical_archive.sql` before app code promotion.
- Historical archive growth is forward-only unless a real backfill source is introduced later.
- If snapshot persistence fails during briefing generation, the generation flow should fail rather than silently leaving homepage/editorial state stale.
- Preview validation remains required for SSR, env, and auth-sensitive behavior before merge.

## Acceptance Criteria

- Admins can browse the latest dated Top 5 set as the current working set.
- Running briefing generation adds five rows for a new `briefing_date` without overwriting prior dates.
- Admins can browse older dated sets through the historical scope without loading an unbounded dataset.
- Status, search, briefing-date, and pagination filters work together on the editorial page.
- Re-running the same `briefing_date` does not overwrite existing rows or erase editorial overrides.
- Publishing a new Top 5 set does not expose historical rows on homepage or public `/signals`.
- Homepage and public `/signals` remain capped to the explicitly live published Top 5 set.
- Existing production rows migrate safely into the new dated model without destructive data loss.

## Evidence and Confidence

- Repo evidence used:
  - `src/app/actions.ts`
  - `src/lib/signals-editorial.ts`
  - `src/app/dashboard/signals/editorial-review/page.tsx`
  - `src/lib/homepage-editorial-overrides.ts`
  - `supabase/migrations/20260424083000_signal_posts_historical_archive.sql`
- Confidence: High for local schema-aware behavior and migration shape; medium for production archive growth because historical expansion depends on future persisted snapshots or a later backfill source.

## Closeout Checklist

- Scope completed: yes
- Tests run: `npm run lint`; `npm run test -- src/app/dashboard/signals/editorial-review/page.test.tsx src/lib/signals-editorial.test.ts src/lib/homepage-editorial-overrides.test.ts src/app/signals/page.test.tsx`; `npm run build`
- Local validation complete: yes
- Preview validation complete, if applicable: pending
- Production sanity check complete, only after preview is good: pending
- PRD summary stored in repo: yes
- Bug-fix report stored in repo, if applicable: no
- Google Sheets tracker updated and verified: no direct Sheets update performed
- If direct Sheets update is unavailable, fallback tracker-sync file created in `docs/operations/tracker-sync/` with exact manual update payload: yes
