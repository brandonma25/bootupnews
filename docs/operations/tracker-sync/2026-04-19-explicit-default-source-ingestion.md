# Tracker Sync Fallback — Explicit Default Source Ingestion

Date: 2026-04-19

## Reason

Direct live Google Sheets verification was not completed in this local Codex session. This fallback records the manual tracker update payload required by the repository closeout rules.

## Work Summary

- Branch: `chore/source-catalog-cleanup-bbc-cnbc`
- Commit: `795aadd947e6a4a490dccb07eeb112187fda66ca`
- Scope: Source-governance refactor to make MVP default public ingestion explicit instead of inferred from `demoSources` array order and ingestion slicing.
- Documentation: `docs/engineering/change-records/source-onboarding-model.md`

## Manual Tracker Update Payload

- Area: Source system / ingestion governance
- Status: In Review
- Decision: keep
- PRD File: Not applicable; this is a scoped architecture cleanup on the existing source-governance branch.
- Notes: Public MVP defaults are now controlled by `MVP_DEFAULT_PUBLIC_SOURCE_IDS`; donor fallback defaults are now controlled by `DEFAULT_DONOR_FEED_IDS`. BBC/CNBC remain excluded from catalog recommendations and source preference/default treatment.
