# PRD-27 — Hotspot enforcement gate

- PRD ID: `PRD-27`
- Canonical file: `docs/product/prd/prd-27-hotspot-enforcement-gate.md`

## Objective
- Add lightweight but explicit extra governance for serialized hotspot files.

## User Problem
- High-risk governance files can drift or conflict when they are changed like ordinary files.

## Scope
- Keep the hotspot file list explicit.
- Require governance-facing documentation coverage for material hotspot work.
- Surface hotspot status clearly in local and CI checks.

## Non-Goals
- Do not treat normal feature files as hotspots.
- Do not block docs-only edits purely for touching governance docs.

## Implementation Shape / System Impact
- Reuse the shared governance classifier to detect hotspot files.
- Enforce hotspot-specific coverage only for material monitored changes.

## Dependencies / Risks
- Depends on gate-tier promotion so hotspot work can sit on the strictest lane.
- Risk: making hotspot work too hard. Mitigation: keep docs-only hotspot changes on baseline.

## Acceptance Criteria
- Hotspot files are centrally defined.
- Material hotspot work requires explicit governance documentation coverage.
- Local and CI outputs call out hotspot status.

## Evidence and Confidence
- Repo evidence used:
  - `scripts/check-governance-hotspots.py`
  - `AGENTS.md`
  - `docs/product/documentation-rules.md`
- Confidence:
  - High
