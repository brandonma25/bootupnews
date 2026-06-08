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

## Operational history

### 2026-06-08 — importance recalibration (inversion fix)

Measured against the persisted 2026-06-08 candidate pool, `event_importance` was **inverted**: its features were scored as keyword-presence over economic-policy-only vocabulary (plus a conflict-blind actor regex and FOMC/macro-only calibration boosts), so interstate-conflict and major-legislation events floored near base (~20-27) while vocab-dense Fed/research explainers ceilinged (58-88). Consequence: the core pool filled with evergreen explainers (which the publish-path evergreen filter then stripped, leaving a 2-card slate) while genuine breaking news never reached the ≥52 core gate.

Recalibration — all in `mapClusterToRankingFeatures` (`src/adapters/donors/registry.ts`), no change to the ≥52 gate, the `ranked.score` floor, the blend weights, or the evergreen-filter code:

- Extended `structural_impact` / `downstream_consequence` / `actionability` keyword lists with **specific** interstate-conflict (kinetic) and major-legislation (multi-word) terms; added conflict actors (Israel, Iran, Ukraine, Russia, Gaza, Hezbollah, Hamas, NATO, North Korea) to the `actor_significance` regex.
- Added two tightly-gated calibration boosts: interstate-conflict (gated on hard kinetic terms only — never "trade war"/"culture war") and major-legislative/regulatory action (gated on a legislative NOUN + ACTION verb, or a formal regulatory action such as a Senate hearing / export-control / executive order).
- Added a **load-bearing** negative calibration (the evergreen penalty) reusing the publish-path evergreen classifier (`classifyEvergreen`), so vocab-dense explainers fall below 52 by score rather than only being deleted downstream. Without it the keyword lift re-inflates the explainers.

Measured outcome (filter-disabled, 2026-06-08 pool): core-eligible pool 10 → 8 with **0 evergreens** remaining (all 15 evergreen clusters dropped below 52; e.g. Economic Letter 87.6→39.6, food/energy 66.8→18.8) and **0 filler** crossing 52; genuine conflict/legislation/regulatory clusters crossed (Ukraine aid 25.5→73.9, Israel/Iran strikes 27.1→69.0, Nvidia/China-chip Senate hearing 49.3→80.0). Because importance is the dominant `ranked.score` group weight (0.42), the lift cascades into the score floor, clearing it for most lifted clusters without touching the floor itself.

- Repo evidence: `src/adapters/donors/registry.ts`, `src/adapters/donors/registry.importance-recalibration.test.ts`, `scripts/measure-importance-recalibration.ts`, `tests/fixtures/importance-recalibration/pool-2026-06-08.json`.
- Known residuals (out of scope here): a few genuine conflict/legislation clusters clear ≥52 but sit just under the `ranked.score` ≥58 floor (the next constraint, deliberately untouched); non-kinetic conflict phrasing ("Israel hits Beirut's suburbs") is under-credited by the keyword approach; the MIT TR "The Download" newsletter roundup remains core-eligible (pre-existing; not an evergreen-prone feed).

### 2026-06-08 — business/markets extension (follow-up to the conflict/legislation fix)

Cross-day validation of the conflict/legislation fix showed it reaches 5–7 only on conflict/legislation-heavy days: on a calm/business-heavy day (06-04) publishable was 3, because genuine **business/markets/IPO/earnings/M&A** news is the same inversion left unaddressed (SpaceX $1.78tn IPO, Broadcom $300bn rout, Quantinuum, Ramp all floored at ~20). This entry extends the lift to that class — same structure (a gated boost in `mapClusterToRankingFeatures` only), no change to the gate / `ranked.score` floor / blend weights / evergreen filter / classifiers.

- **Magnitude-gated business boost.** Fires ONLY when a business EVENT (`BUSINESS_EVENT_TERMS`: IPO, acquisition, merger, raises, valuation, earnings, revenue, guidance, rout, plunge, spinoff, layoffs, antitrust…) co-occurs with a SCALE signal — a major dollar magnitude (`hasMajorDollarMagnitude`: any billions/trillions, or ≥ $500M) **or** a mega-cap actor (`MEGA_CAP_ACTOR_RE`, word-boundary matched) performing a market-moving action. **No keyword-list change** — the gated boost alone carries the lift, so generic business vocabulary never nudges filler upward. The numeric floor is the filler firewall: a "$20M Series A" or a "$255M" round never clears it.

Measured outcome (filter-disabled): **06-04 publishable 3 → 10** (all genuine — Broadcom $300bn rout 25→60, SpaceX $1.78tn IPO 20.8→56, Quantinuum $1.68bn 20.8→56, Ramp $750M 20.8→56, Honeywell spinoff 23→58), **0 evergreen leaks, 0 filler leaks** on 06-03/04. **06-08 not regressed** — the business boost fires on 0 clusters there, so the combined provider is byte-identical to the conflict/legislation provider on 06-08 (max|Δ| = 0.00). Residual: a politics-heavy day (06-03) reaches ~3–5 — partly genuine day-to-day mega-business supply, partly `classifyEventType` mis-typing genuine legislation ("House Passes … Bills") as `generic_commentary`, which the separate classifier cleanup (non-goal) would unlock.

- Repo evidence: `src/adapters/donors/registry.ts` (`BUSINESS_EVENT_TERMS` / `MEGA_CAP_ACTOR_RE` / `hasMajorDollarMagnitude` + the gated boost), `src/adapters/donors/registry.business-markets-importance.test.ts` (incl. magnitude-gate negatives), `tests/fixtures/importance-recalibration/pool-2026-06-04.json`.
