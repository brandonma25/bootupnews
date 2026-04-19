# Phase 1 Ranking Anomalies

## Scope

Tracks deterministic ranking anomalies for the Phase 1 scoring model.

## Known Risks

- High-credibility single-source stories can outrank broader but older coverage.
- Rare keywords can slightly inflate novelty for niche but lower-impact stories.
- Reinforcement is cluster-size-driven and can still favor repeated coverage of moderate importance.

## Current Handling

- Score breakdown logs credibility, novelty, urgency, cluster size, and final score per cluster.
- Final ordering uses deterministic score sorting rather than opaque model output.
- Public dashboard copy states that ranking is deterministic and inspectable.

## Follow-Up

- Add fixture-based calibration for ties and near-ties.
- Revisit feature weighting after preview or human review on real feeds.
