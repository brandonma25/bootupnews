# Change Record — Editorial Historical Signals Governance Mapping

- Date: 2026-04-24
- Branch: `feature/editorial-historical-signals`
- Canonical feature record: `PRD-56`

## What Changed

- Added `PRD-56` as the canonical feature record for the historical signals archive expansion.
- Updated `docs/product/feature-system.csv` to map the new feature row to `docs/product/prd/prd-56-editorial-historical-signals-archive.md`.
- Restored `PRD-53` to the original admin editorial layer scope so the historical archive work has its own explicit governance identity.

## Why

The implementation adds a new schema migration plus new admin archive behavior. The release governance gate classifies that surface as `new-feature-or-system`, which requires a canonical PRD and hotspot-supporting governance documentation when `docs/product/feature-system.csv` changes.

Separating the archive expansion into `PRD-56` keeps the original editorial workflow scope in `PRD-53` intact and gives the historical archive work a stable feature identity for CI, tracker updates, and future follow-up changes.

## Operational Notes

- Apply `supabase/migrations/20260424083000_signal_posts_historical_archive.sql` before promoting the app code.
- Production will still show only the currently persisted 5 rows until future daily snapshots accumulate or a later backfill source is introduced.
