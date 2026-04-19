# Tracker Sync Fallback — Source Onboarding Batch 1

Date: 2026-04-19

Live tracker access was not used during this local source-onboarding pass. Apply this payload to the Google Sheets tracker if direct automation is required before merge.

## Target

- Workbook: `Features Table`
- Sheet: `Sheet1`
- Lookup key: `Record ID = 42`
- PRD: `PRD-42`
- PRD File: `docs/product/prd/prd-42-source-governance-and-defaults.md`

## Manual Update Payload

- `Status`: `In Review`
- `Decision`: `keep`
- `Last Updated`: `2026-04-19`
- Notes:
  - Added validated batch-one optional/probationary source catalog entries.
  - Preserved explicit MVP default public ingestion set.
  - Did not add source-tier boosts.
  - Did not reintroduce BBC or CNBC.
  - Deferred invalid, mismatched, or unreachable candidate feeds.

## Validation Evidence

- Source validation documented in `docs/engineering/change-records/source-onboarding-batch-1.md`.
- Runtime defaults remain governed by `MVP_DEFAULT_PUBLIC_SOURCE_IDS` in `src/lib/demo-data.ts`.
