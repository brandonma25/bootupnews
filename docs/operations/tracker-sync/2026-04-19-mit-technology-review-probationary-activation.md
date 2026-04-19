# Tracker Sync Fallback — MIT Technology Review Probationary Activation

Date: 2026-04-19

Live tracker access was not used during this local implementation pass. Apply this payload to the Google Sheets tracker if direct automation is required before merge.

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
  - Added controlled probationary runtime activation for MIT Technology Review only.
  - Preserved `MVP_DEFAULT_PUBLIC_SOURCE_IDS`.
  - Preserved `DEFAULT_DONOR_FEED_IDS`.
  - Did not add source-policy boosts or editorial preference boosts.
  - Did not activate other batch-one onboarded sources.

## Validation Evidence

- Change record: `docs/engineering/change-records/mit-technology-review-probationary-activation.md`
- Guardrail tests cover MVP defaults, donor defaults, probationary activation IDs, BBC/CNBC exclusion, and source-policy non-promotion.
