# Homepage Volume Layers Governance Coverage

- Date: 2026-04-24
- Branch: `feature/prd-55-homepage-volume-layers`
- PRD: `docs/product/prd/prd-57-homepage-volume-layers.md`

## Summary

This change record documents the governance coverage for the homepage volume layers work after the release governance gate classified the branch as a new feature or system touching the `docs/product/feature-system.csv` hotspot. The implementation remains mapped to canonical PRD-57, with supporting remediation notes for the later route-demotion and homepage-depth fixes.

## System Changes

- Adds the canonical homepage volume layers PRD at `docs/product/prd/prd-57-homepage-volume-layers.md`.
- Registers PRD-57 in `docs/product/feature-system.csv`.
- Adds the governed homepage depth surfaces for `Developing Now` and `By Category`.
- Preserves homepage depth remediation notes in `docs/engineering/bug-fixes/` for the truncated-ranked-pool fix and category-route demotion without replacing the canonical PRD.

## Governance Notes

- `docs/product/feature-system.csv` is a hotspot file, so this record exists to cover the governance-facing hotspot edit required by CI.
- The bug-fix notes on this branch are supporting remediation artifacts, not substitutes for the PRD or hotspot governance lane.
- Top 5 remains the editorial homepage layer, while secondary homepage depth modules consume the broader ranked public pool defined in the implementation.
