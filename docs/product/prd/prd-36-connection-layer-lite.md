# PRD-36 — Connection Layer Lite

- PRD ID: `PRD-36`
- Canonical file: `docs/product/prd/prd-36-connection-layer-lite.md`

## Objective

Add bounded support for `What led to this` and `What it connects to` so top visible signals are easier to place in a broader picture.

## User Problem

The current MVP can explain what happened and why it matters, but it still leaves a connection gap. Users can miss how a familiar story fits into a larger system or what prior pressure likely set it up.

## Scope

- Extend canonical explanation packets with a compact connection layer.
- Generate deterministic-first connection output from current ranking, signal, and event-intelligence evidence.
- Use after-market-agent as the primary donor support pattern for structured connection objects.
- Keep Horizon optional and schema-safe for future connection enrichment.
- Add focused tests and lightweight debug visibility.

## Non-Goals

- Graph databases or causal-graph infrastructure
- Broad UI redesign
- Predictive modeling
- Ingestion, clustering, or auth redesign
- Making Horizon mandatory in the runtime path

## Implementation Shape / System Impact

- Add a canonical `connection_layer` inside `ExplanationPacket`.
- Add deterministic `what_led_to_this` and `what_it_connects_to` assembly.
- Keep final explanation and connection assembly app-owned.
- Route donor support through adapters only.

## Dependencies / Risks

- Depends on `PRD-32`, `PRD-34`, and `PRD-35`.
- Risk: overclaiming connections from weak evidence.
- Risk: turning optional donor enrichment into implied truth.
- Mitigation: deterministic-first assembly, explicit fallback mode, and conservative unknown handling.

## Acceptance Criteria

- Top and context signals can carry bounded connection-layer output.
- Weak signals fall back conservatively instead of inventing a narrative.
- After-market-agent is the explicit primary connection-support donor behind adapters.
- Horizon remains optional and non-blocking.
- Existing signed-out and signed-in fallback paths still render populated output.

## Evidence and Confidence
- Repo evidence used:
  - `src/lib/explanation-support.ts`
  - `src/lib/connection-support.ts`
  - `src/adapters/donors/registry.ts`
- Confidence: High
