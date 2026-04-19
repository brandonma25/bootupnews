# PRD-39 — Explanation Trust Layer

- PRD ID: `PRD-39`
- Canonical file: `docs/product/prd/prd-39-explanation-trust-layer.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add a canonical explanation and trust-layer backend so ranked signals can be explained through grounded deterministic runtime state, with an optional but non-critical Horizon enrichment boundary.

## User Problem

The product can already rank clusters, but explanation quality and trust visibility are spread across multiple helpers. That makes it harder to keep `why it matters`, `why this ranks here`, and `what to watch` grounded, inspectable, and safely extensible.

## Scope

- Introduce canonical explanation and trust-layer contracts.
- Add deterministic explanation assembly from cluster, ranking, source, and event-intelligence state.
- Activate an optional Horizon enrichment boundary in schema-safe mode.
- Preserve current site behavior and keep ranking as the truth source.

## Non-Goals

- No homepage redesign.
- No auth or session redesign.
- No LLM-owned ranking.
- No mandatory enrichment in the critical path.
- No broad ingestion or clustering rewrite.

## Implementation Shape / System Impact

- `ExplanationPacket` becomes the canonical app-owned explanation object.
- `TrustLayerDebug` becomes the developer-facing explanation evidence/debug structure.
- `data.ts` now assembles explanation packets for public pipeline and matched briefing paths.
- Horizon exposes an active but skipped-by-default enrichment boundary so the runtime remains deterministic unless a future bounded execution path is introduced.

## Dependencies / Risks

- Explanation trust can still degrade if low-signal inputs are overinterpreted.
- Enrichment must remain optional so it cannot silently overtake deterministic truth.
- Signed-in fallback-safe rendering depends on the briefing item shape remaining backward-compatible.

## Acceptance Criteria

- Explanation packets are deterministic and grounded in actual ranking, cluster, and source state.
- Explanation mode is explicit: deterministic, enriched, or fallback.
- Explanation packets can safely carry role-oriented output hints such as top signal versus context signal without changing ranking truth.
- Explanation packets can safely carry bounded connection-layer fields such as what led to this and what it connects to without turning enrichment into the truth owner.
- Trust debug shows evidence used, material ranking features, and enrichment status.
- Horizon enrichment can be prepared safely and skipped without breaking pipeline continuity.
- Homepage and dashboard remain populated in signed-out mode.
- Signed-in fallback-safe behavior remains intact.

## Evidence and Confidence

- Repo evidence used:
  - `src/lib/explanation-support.ts`
  - `src/lib/data.ts`
  - `src/lib/integration/subsystem-contracts.ts`
  - `src/adapters/donors/registry.ts`
- Confidence: Medium-high for deterministic runtime behavior and inspectability; medium for future enrichment because execution remains intentionally bounded and inactive.
