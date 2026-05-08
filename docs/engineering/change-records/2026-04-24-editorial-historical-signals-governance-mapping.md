# Change Record — Editorial Historical Signals Governance Mapping

- Date: 2026-04-24
- Branch: `feature/editorial-historical-signals`
- Canonical feature record: `PRD-56`

## What Changed

- Added `PRD-56` as the canonical feature record for the historical signals archive expansion.
- Updated `docs/product/feature-system.csv` to map the new feature row to `docs/product/prd/prd-56-editorial-historical-signals-archive.md`.
- Restored `PRD-53` to the original admin editorial layer scope so the historical archive work has its own explicit governance identity.
- Expanded the implementation summary so the governed scope explicitly includes pipeline-time daily snapshot persistence, not only admin archive browsing.

## Why

The implementation adds a new schema migration, pipeline-time daily snapshot persistence, and new admin archive behavior. The release governance gate classifies that surface as `new-feature-or-system`, which requires a canonical PRD and hotspot-supporting governance documentation when `docs/product/feature-system.csv` changes.

Separating the archive expansion into `PRD-56` keeps the original editorial workflow scope in `PRD-53` intact and gives the historical archive work a stable feature identity for CI, tracker updates, and future follow-up changes.

## Operational Notes

- Apply `supabase/migrations/20260424083000_signal_posts_historical_archive.sql` before promoting the app code.
- The archive now grows when briefing generation persists a new Top 5 snapshot for a new `briefing_date`; production will still show only the explicitly live published set until editors publish the newer day.
