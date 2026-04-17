# PRD-8 — Structured Event Intelligence Foundation

- PRD ID: `PRD-8`
- Canonical file: `docs/product/prd/prd-8-structured-event-intelligence-foundation.md`

## Objective
- Enrich event clusters with structured intelligence fields so downstream ranking and explanation layers can operate on event semantics instead of raw summaries.

## User Problem
- Users need more than grouped articles; the system must understand event type and impact well enough to rank and explain stories coherently.

## Scope
- Event-intelligence field construction.
- Shared event shape extensions for impact, type, and explanation inputs.
- Homepage and dashboard consumption of richer event metadata.

## Non-Goals
- The later precision-hardening pass for why-this-matters handled in PRD-12.
- Deterministic article filtering added later in PRD-13.
- Personalized ranking boosts.

## Implementation Shape / System Impact
- Shared event data structures carry richer intelligence semantics into ranking and explanation helpers.
- Homepage and dashboard flows gain access to structured metadata rather than relying only on article text.

## Dependencies / Risks
- Dependencies:
  - Event clustering and rationale foundations.
- Risks:
  - Structured fields can still be noisy when source data is incomplete.
  - Downstream ranking quality depends on these fields remaining consistent.

## Acceptance Criteria
- Events expose structured intelligence data beyond headline text alone.
- Homepage and dashboard rendering can consume richer event metadata.
- Shared intelligence logic lives in reusable library code with test coverage.

## Evidence and Confidence
- Repo evidence:
  - Historical PRD content from commit `0c6196f`
  - Current related files: `src/lib/event-intelligence.ts`, `src/lib/why-it-matters.ts`, `src/lib/homepage-model.ts`, `src/lib/ranking.ts`, `src/lib/types.ts`
- Confidence: High. The historical PRD and present code modules strongly reinforce this feature identity.
