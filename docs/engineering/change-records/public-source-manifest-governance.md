# Public Source Manifest Governance Mapping

- Date: 2026-04-23
- Branch: `feature/public-source-manifest-v1`
- PRD: `docs/product/prd/prd-54-public-source-manifest.md`

## Summary

This change records the governance mapping added after the release governance gate classified `src/lib/source-manifest.ts` as a new public source-selection surface. The implementation remains scoped to the existing public source manifest work, but the feature is now represented by canonical PRD-54 and a matching `docs/product/feature-system.csv` row.

## System Changes

- Adds PRD-54 for the public source manifest.
- Maps PRD-54 in `docs/product/feature-system.csv` with build order 54.
- Preserves the existing ADR and source audit documents as supporting architecture evidence rather than using them as substitutes for the canonical PRD.

## Governance Notes

- The feature registry is a serialized hotspot file, so this record exists to document the hotspot edit required by CI.
- The source activation and architecture audits remain unchanged.
- This remediation does not expand runtime behavior beyond the manifest-aware ingestion work already present on the branch.
