# Summary

This change extends the governed ingestion system with politics-source coverage under `PRD-58` while preserving the repo's source-governance boundary between catalog support, optional supplied-source runtime use, and default ingestion.

## Scope

- Added three runtime-usable optional politics RSS sources:
  - `Politico Politics News`
  - `Politico Congress`
  - `Politico Defense`
- Added `AP Politics` to the catalog, but kept it out of runtime ingestion after live validation showed the requested URL currently returns AP's HTML unavailable page rather than parseable RSS.
- Added `Congress.gov API` as a catalog-only API source pending a dedicated adapter and safe credential path.
- Registered the canonical feature mapping in `docs/product/feature-system.csv`.

## Governance Notes

- Default public ingestion source IDs were not changed.
- Donor fallback default IDs were not changed.
- No ranking, clustering, homepage, auth, or schema behavior was changed.
- Congress.gov remains explicitly non-runtime until a future adapter PR establishes a safe article-compatible contract.
- AP Politics remains catalog-only until the upstream endpoint exposes valid RSS again or a different validated endpoint is approved.

## Evidence

- PRD: `docs/product/prd/prd-58-politics-ingestion-sources.md`
- Validation report: `docs/engineering/testing/politics-ingestion-sources-local-validation-2026-04-25.md`
- Tracker fallback: `docs/operations/tracker-sync/2026-04-25-politics-ingestion-sources.md`
