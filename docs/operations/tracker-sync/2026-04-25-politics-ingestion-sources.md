# Tracker Sync Fallback — Politics Ingestion Sources

Date: 2026-04-25

Live tracker access was not used during this local feature pass. Apply this payload to the Google Sheets tracker if direct automation is required before merge.

## Target

- Workbook: `Features Table`
- Sheet: `Sheet1`
- Lookup key: `PRD-58`
- PRD: `PRD-58`
- PRD File: `docs/product/prd/prd-58-politics-ingestion-sources.md`

## Manual Update Payload

- `Status`: `In Progress`
- `Decision`: `build`
- `Last Updated`: `2026-04-25`
- Notes:
  - Added AP Politics and three Politico politics RSS sources to the governed catalog.
  - AP Politics was validated as failing at the requested endpoint and remains catalog-only pending an upstream feed fix.
  - Added the three working Politico politics RSS sources as optional non-default supplied-source entries.
  - Added Congress.gov API as catalog-only pending a dedicated adapter and key-management path.
  - Preserved MVP public defaults, donor fallback defaults, ranking logic, clustering logic, homepage behavior, auth behavior, and schema shape.
  - Added regression coverage for politics supplied-source metadata and partial-source-failure pipeline continuity.

## Validation Evidence

- Canonical PRD: `docs/product/prd/prd-58-politics-ingestion-sources.md`
- Feature mapping: `docs/product/feature-system.csv`
- Local validation summary: `docs/engineering/testing/politics-ingestion-sources-local-validation-2026-04-25.md`
