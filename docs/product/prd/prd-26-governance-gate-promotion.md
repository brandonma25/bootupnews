# PRD-26 — Governance gate promotion

- PRD ID: `PRD-26`
- Canonical file: `docs/product/prd/prd-26-governance-gate-promotion.md`

## Objective
- Promote repo governance from one flat release check into explicit gate tiers with clearer enforcement intent.

## User Problem
- Governance checks are harder to trust when trivial edits and system-level changes appear to go through the same conceptual gate.

## Scope
- Introduce gate tiers such as baseline, documented, promoted, and hotspot.
- Keep enforcement grounded in existing repo workflows instead of adding ceremonial process.

## Non-Goals
- Do not turn subjective preferences into blocking failures.
- Do not create a second PR gate workflow.

## Implementation Shape / System Impact
- Extend the existing governance classifier to assign a gate tier per diff.
- Document the tier model and use it inside the release governance gate.

## Dependencies / Risks
- Builds directly on the existing release governance gate.
- Risk: over-enforcement. Mitigation: keep docs-only and trivial work on baseline handling.

## Acceptance Criteria
- The governance gate reports a tier for each diff.
- Enforcement becomes stricter only when the diff justifies it.
- Repo docs explain the tier model clearly.

## Evidence and Confidence
- Repo evidence used:
  - `scripts/release-governance-gate.py`
  - `.github/workflows/release-governance-gate.yml`
- Confidence:
  - High
