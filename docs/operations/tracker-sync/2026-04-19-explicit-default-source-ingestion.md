# Tracker Sync Fallback — Explicit Default Source Ingestion

Date: 2026-04-19

## Reason

Direct live Google Sheets verification was not completed in this local Codex session. This fallback records the manual tracker update payload required by the repository closeout rules.

## Work Summary

- Branch: `chore/source-catalog-cleanup-bbc-cnbc`
- Commit: `97ff1219b0184f8630972a227a0ca922d6b570f8`
- Governed feature: `PRD-42` / `docs/product/prd/prd-42-source-governance-and-defaults.md`
- Scope: Source-governance refactor to make MVP default public ingestion explicit instead of inferred from `demoSources` array order and ingestion slicing.
- Documentation: `docs/engineering/change-records/source-onboarding-model.md`

## Manual Tracker Update Payload

- Area: Source system / ingestion governance
- Status: In Review
- Decision: keep
- PRD File: `docs/product/prd/prd-42-source-governance-and-defaults.md`
- Notes: Public MVP defaults are now controlled by `MVP_DEFAULT_PUBLIC_SOURCE_IDS`; donor fallback defaults are now controlled by `DEFAULT_DONOR_FEED_IDS`. BBC/CNBC remain excluded from catalog recommendations and source preference/default treatment.
