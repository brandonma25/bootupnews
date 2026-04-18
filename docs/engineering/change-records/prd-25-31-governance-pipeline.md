# PRD-25 to PRD-31 Governance Pipeline — Change Record

## Summary
- Consolidated the next governance tranche into one dependency-aware pipeline on a single fresh branch from `main`.
- Extended the existing release governance gate instead of creating a parallel enforcement system.

## Structural Changes
- Added shared governance classification and documentation-coverage logic under `scripts/`.
- Added a standalone documentation coverage validator and a non-blocking PR governance audit summary.
- Tightened hotspot handling with explicit branch freshness enforcement for material hotspot work.
- Added bug-tracking governance and a governance gate responsibility map to reduce file-overload drift.

## Why This Structure
- PRD-25 through PRD-31 are tightly related governance features with overlapping file ownership.
- One shared classifier avoids contradictory behavior between docs coverage, hotspot checks, and PR gate enforcement.
- Moving detailed gate responsibility into protocol docs keeps `AGENTS.md` lightweight enough to remain the execution front door.
