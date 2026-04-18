# PRD-31 — Governance file decomposition

- PRD ID: `PRD-31`
- Canonical file: `docs/product/prd/prd-31-governance-file-decomposition.md`

## Objective
- Reduce governance file overload by clarifying which file owns which rule set.

## User Problem
- Governance becomes harder to maintain when operational rules, routing rules, and gate details are spread across too many files without a clear map.

## Scope
- Add an explicit governance responsibility map.
- Keep `AGENTS.md` as the short execution front door.
- Move detailed gate ownership into protocol docs rather than duplicating it everywhere.

## Non-Goals
- Do not rename large parts of the docs tree.
- Do not create duplicate governance rule documents for the same responsibility.

## Implementation Shape / System Impact
- Add a governance gate map protocol.
- Cross-reference the new protocol from the existing engineering and documentation rules where helpful.

## Dependencies / Risks
- Depends on documentation coverage rules so decomposition points to stable validators and lanes.
- Risk: fragmentation. Mitigation: use one responsibility-map doc instead of many narrow fragments.

## Acceptance Criteria
- Governance file ownership is explicit.
- `AGENTS.md` remains concise and does not become the only place where governance details live.
- No duplicate governance framework is introduced.

## Evidence and Confidence
- Repo evidence used:
  - `AGENTS.md`
  - `docs/engineering/protocols/engineering-protocol.md`
  - `docs/product/documentation-rules.md`
- Confidence:
  - High
