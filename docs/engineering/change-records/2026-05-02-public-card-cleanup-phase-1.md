# Public Card Cleanup — Phase 1

Date: 2026-05-02
Branch: `feature/public-card-cleanup-phase-1`
Change type: remediation / display-layer cleanup
Source of truth: live production audit of `bootupnews.vercel.app` on 2026-05-02

## Problem

The public homepage and `/signals` surface were leaking internal diagnostics and rendering duplicated content per signal card. A live audit on 2026-05-02 found:

- The story headline appeared three times per Top Event card: as the `<h2>` title, as the gray subtitle, and as the third bullet in the key-points list. When `event.summary === event.title` and the third key point fell back to the same string, the same headline was rendered three times.
- Supporting-coverage rows rendered as `Source: Title` even when the supplied source name and article title were identical, producing strings like `Politico Congress: Politico Congress` and `Liberty Street Economics: Liberty Street Economics`.
- `Lead coverage is anchored by [source].` and `Previously published at rank #N for the homepage briefing.` were rendered as user-facing bullets despite being internal versioning artifacts.
- The Top Event chip strip rendered `1 source` and `Developing` chips that carried no reader signal because every event has the same values.
- Below the card body, `Meaningful impact` and `current briefing cycle` MetaPills exposed internal ranking labels with no reader meaning.
- The `/signals` page rendered a `Score N` badge with the raw integer importance score.
- The By Category section subhead read `Fresh coverage across the core lenses the homepage already uses.` — internal phrasing leaked into the public surface.

## Root cause

The public homepage card was built on top of `mapHomepageSignalPostToBriefingItem` in `src/lib/data.ts`, which generated three deterministic key-point bullets for every signal post regardless of whether the underlying values were informative or duplicate. The chip and MetaPill rows in `src/components/landing/homepage.tsx` rendered every label provided by the event-intelligence layer instead of selecting only labels that carry user-visible signal. The `/signals` route in `src/app/signals/page.tsx` rendered the raw importance score as a badge alongside the editorial tags. The By Category subhead in `src/components/home/CategoryPreviewGrid.tsx` was authored as internal-team copy and never rewritten for public reading.

## Change made

- Reduced `buildHomepageSignalKeyPoints` to surface at most one bullet (the post summary or selection reason) and only when it does not duplicate the title; the rank and lead-coverage bullets are no longer emitted.
- Added title-deduplication filtering to the homepage Top Event card so any incoming key point that equals the title is dropped before render.
- Hid the gray subtitle paragraph when `event.summary` equals `event.title`.
- Removed the `sourceLabel` and `confidenceLabel` chips (`1 source`, `Developing`) from the Top Event chip strip, keeping only the topic badge.
- Removed the `impactLabel` and `recencyLabel` MetaPills (`Meaningful impact`, `current briefing cycle`) from the Top Event meta row, keeping only the read-time pill.
- Hid the `: {title}` suffix in supporting-coverage rows when the article title equals the source name.
- Removed the `Score N` badge from `/signals` published-slate cards.
- Rewrote the By Category subhead to `More from today's briefing, by category.`

## Files modified

- `src/lib/data.ts`
- `src/components/landing/homepage.tsx`
- `src/components/home/CategoryPreviewGrid.tsx`
- `src/app/signals/page.tsx`
- `docs/engineering/change-records/2026-05-02-public-card-cleanup-phase-1.md` (this file)

## Validation

- `npm run lint` passed
- `npm run test` passed: 77 test files, 586 tests
- `npm run build` passed
- `python3 scripts/validate-feature-system-csv.py` passed with the existing PRD slug warnings for PRD-32, PRD-37, PRD-38

## Safety / scope boundaries

- No schema migration.
- No source manifest changes.
- No ranking, classification, or WITM template changes.
- No auth, session, or routing changes.
- No publish, cron, or pipeline write-mode changes.
- No editorial copy authored or published.
- No production data writes.

## Remaining work / next phases

- Phase 2: Replace the homepage `Last updated [date] — Today's briefing is being prepared.` banner with a date-anchored "Last published" label so day-old content is no longer presented as today's briefing while cron remains disabled.
- Phase 3: Add visible auth entry points from the homepage and verify `/briefing/[date]` deep links resolve for the date currently advertised on the homepage.
- Phase 4: Diagnose why the By Category > Tech section renders an empty state despite five active tech sources in the manifest.
