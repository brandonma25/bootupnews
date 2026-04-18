# PRD-28 — PR classification audit layer

- PRD ID: `PRD-28`
- Canonical file: `docs/product/prd/prd-28-pr-classification-audit-layer.md`

## Objective
- Add an explicit audit summary that explains how governance classified a diff and what coverage it expects.

## User Problem
- Blocking governance failures are easier to fix when the system also explains how it interpreted the pull request.

## Scope
- Emit a non-blocking audit summary for classification, gate tier, hotspot status, freshness, and missing documentation coverage.
- Reuse the same shared classifier as the blocking gate.

## Non-Goals
- Do not add a second blocking workflow.
- Do not create a reporting layer disconnected from enforcement.

## Implementation Shape / System Impact
- Add a dedicated audit script.
- Append its output to the workflow step summary.

## Dependencies / Risks
- Depends on governance gate promotion to make tier reporting meaningful.
- Risk: audit drift from enforcement. Mitigation: reuse the same shared logic as the gate.

## Acceptance Criteria
- CI exposes a readable governance audit summary.
- Audit output reflects the same classification logic used by the blocking gate.

## Evidence and Confidence
- Repo evidence used:
  - `.github/workflows/release-governance-gate.yml`
  - `scripts/pr-governance-audit.py`
- Confidence:
  - High
