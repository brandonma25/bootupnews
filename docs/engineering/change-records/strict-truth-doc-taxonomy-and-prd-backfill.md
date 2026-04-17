# Strict Truth Doc Taxonomy And PRD Backfill

## Objective
- Repair the repo documentation structure so folder placement reflects document truth instead of legacy convenience.

## Scope
- Move canonical PRDs into `docs/product/prd/`.
- Move product briefs into `docs/product/briefs/`.
- Move engineering docs into truthful `bug-fixes`, `change-records`, `testing`, and `protocols` buckets.
- Backfill missing `PRD-1` through `PRD-10` from grounded repo evidence only.
- Update validators, generators, and governance docs to enforce the new taxonomy.

## Why This Change Exists
- The previous top-level `docs/prd/`, `docs/testing/`, and `docs/bug-fixes/` layout mixed different document types and encouraged misleading placement.
- Several records stored under `docs/bug-fixes/` were actually audits or structural change logs.
- `PRD-1` through `PRD-10` were missing from `main`, which broke the product-history chain and the feature-system source of truth.

## Evidence Used
- Current repo docs and templates on `main`.
- Current code and script references that enforced the old paths.
- Git history, especially:
  - `0c6196f` (`docs: backfill foundational prds and traceable bug docs`)
  - `5e406ff` (`docs: align future backlog with governance roadmap`)

## Confidence
- Taxonomy move confidence: high.
- PRD backfill confidence: mixed by PRD and recorded in each backfilled PRD file.

## Traceability Notes
- Product control docs were intentionally left at `docs/product/`.
- `docs/engineering/incidents/` was created for future truthful use even though this pass did not move an existing incident into it.
- Empty legacy folders can be removed once all references and validations pass.
