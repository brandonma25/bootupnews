# V1 Production Remediation Governance Mapping

- Date: 2026-04-21
- Branch: `fix/v1-production-remediation`
- PR: `#89`

## Summary

The release governance gate classified the V1 production remediation as `new-feature-or-system` because the branch adds new production route and schema surfaces, including `/account`, `/briefing/[date]`, shared Account/detail components, and the V1 Account Supabase migration.

## Change

- Added canonical PRD `PRD-51` at `docs/product/prd/prd-51-v1-production-remediation.md`.
- Added the matching `PRD-51` row to `docs/product/feature-system.csv`.

## Reason

The existing product brief, bug-fix report, local validation matrix, and tracker fallback documented the remediation work, but the governance system requires a canonical PRD and feature-system mapping whenever a PR introduces new non-test source or schema surfaces.

## Scope Boundary

This change record is documentation-only. It does not change application behavior, Supabase schema, or release automation rules.

## Validation

- `python3 scripts/validate-feature-system-csv.py`
