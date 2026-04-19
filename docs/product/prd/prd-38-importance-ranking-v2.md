# PRD-38 — Importance Ranking V2

- PRD ID: `PRD-38`
- Canonical file: `docs/product/prd/prd-38-importance-ranking-v2.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Extend the current canonical post-cluster ranking system so it distinguishes between stories that are merely fresh and credible versus stories that are genuinely important.

## User Problem

The Phase 1 ranking layer surfaces credible and recent stories well, but additive scoring alone can still over-reward shallow novelty or freshness. Users need the ranking order to better reflect structural importance, downstream consequence, and cross-domain decision value without turning the product into a black-box editorial system.

## Scope

- Extend `RankingFeatureSet` with deterministic importance-oriented features.
- Upgrade canonical scoring so importance is blended into final ranking through grouped score families and bounded adjustments.
- Keep current diversity logic, but make it less likely to bury genuinely critical adjacent stories.
- Expand ranking debug output so product and engineering can inspect importance contributions and final selection rationale.
- Preserve existing clustered-signal, dashboard, homepage, and fallback-safe behavior.

## Non-Goals

- No full ranking rewrite.
- No LLM-only importance scoring.
- No homepage redesign or explanation copy overhaul beyond runtime/debug support.
- No ingestion, auth, or personalization redesign.
- No semantic-model clustering or embeddings work.

## Implementation Shape / System Impact

- `src/lib/integration/subsystem-contracts.ts` now carries importance-oriented ranking features and grouped ranking debug output.
- `src/adapters/donors/registry.ts` maps FNS-backed cluster signals into canonical importance features and applies lighter diversity penalties to clearly important overlapping stories.
- `src/lib/scoring/scoring-engine.ts` blends the legacy additive score with grouped importance families and emits deterministic ranking explanations.
- `src/lib/observability/pipeline-run.ts` logs grouped ranking families, importance adjustment, and ranking explanation for each scored cluster.

## Dependencies / Risks

- Importance remains heuristic because the current article and cluster inputs are deterministic text- and metadata-level signals.
- Overweighting importance could erode trust if the ranking becomes opaque or diverges too sharply from freshness and confirmation.
- Diversity penalties must remain conservative enough to reduce repetition without hiding truly consequential adjacent developments.
- Signed-in fallback behavior depends on ranked outputs staying backward-compatible for dashboard briefing assembly.

## Acceptance Criteria

- Ranking contracts remain backward-compatible and deterministic.
- New importance features have safe defaults when donor mapping is incomplete.
- A fresh but trivial story can lose to a structurally important, moderately recent story.
- Diversity still reduces redundant outputs but does not heavily bury clearly critical events.
- Ranking debug output explains grouped score families, importance adjustments, and diversity effects.
- Homepage and dashboard remain populated in signed-out mode, and signed-in fallback-safe behavior remains intact.

## Importance Feature Set

- `structural_impact`
- `downstream_consequence`
- `actor_significance`
- `cross_domain_relevance`
- `actionability_or_decision_value`
- `persistence_or_endurance`

These are deterministic heuristics derived from cluster text, actor/entity presence, source metadata, and cluster support patterns. They are intentionally conservative and should be treated as bounded proxies rather than true semantic understanding.

## Scoring Model

- preserve the legacy score breakdown for continuity:
  - credibility
  - novelty
  - urgency
  - reinforcement
- add grouped score families:
  - trust and timeliness
  - event importance
  - support and novelty
- blend the legacy and grouped views before applying small bounded importance adjustments
- keep diversity as a post-cluster post-score adjustment

## Evidence and Confidence

- Repo evidence used:
  - `src/lib/scoring/scoring-engine.ts`
  - `src/adapters/donors/registry.ts`
  - `src/lib/observability/pipeline-run.ts`
  - `src/lib/scoring/scoring-engine.test.ts`
- Confidence: Medium-high for deterministic local behavior and inspectability; medium for real-world editorial fit because importance remains heuristic.
