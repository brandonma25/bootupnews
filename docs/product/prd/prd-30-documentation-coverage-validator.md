# PRD-30 — Documentation coverage validator

- PRD ID: `PRD-30`
- Canonical file: `docs/product/prd/prd-30-documentation-coverage-validator.md`

## Objective
- Add a reusable validator that checks whether a change updated the documentation lanes it truthfully requires.

## User Problem
- Documentation expectations are easy to say in protocol docs but hard to enforce consistently without a dedicated validator.

## Scope
- Validate documentation coverage for bug-fix, material, hotspot, and new-system work.
- Keep the validator reusable in local workflows and CI.

## Non-Goals
- Do not replace the existing CSV schema validator.
- Do not hardcode fragile assumptions about one exact doc file name per change type.

## Implementation Shape / System Impact
- Add a standalone validator script backed by shared governance classification logic.
- Reuse the validator logic inside the release governance gate.

## Dependencies / Risks
- Depends on bug-tracking integration so bug-fix coverage rules are concrete.
- Risk: false positives. Mitigation: classify docs-only and trivial work separately.

## Acceptance Criteria
- The repo has a standalone documentation coverage validator.
- The blocking governance gate uses the same documentation-coverage logic.
- Coverage output explains what lane is missing when it fails.

## Evidence and Confidence
- Repo evidence used:
  - `scripts/validate-documentation-coverage.py`
  - `scripts/governance_common.py`
- Confidence:
  - High
