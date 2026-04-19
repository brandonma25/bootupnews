# Importance Ranking V2

## Summary

The ranking layer now extends the existing canonical post-cluster scorer with a bounded importance framework instead of relying on a flatter additive model alone.

## What Changed

- Added deterministic importance-oriented ranking features:
  - structural impact
  - downstream consequence
  - actor significance
  - cross-domain relevance
  - actionability / decision value
  - persistence / endurance
- Kept the legacy score breakdown for continuity, but blended it with grouped score families:
  - trust and timeliness
  - event importance
  - support and novelty
- Added bounded importance boosts and penalties so fresh-but-trivial stories do not dominate clearly consequential events.
- Refined diversity penalties so overlapping critical stories receive lighter penalties instead of being buried.
- Expanded ranking inspectability with grouped score logging, importance adjustment values, and deterministic explanation strings.

## What Did Not Change

- Final ranked output remains canonical app-owned logic.
- FNS still supports ranking and diversity, but does not replace the canonical scorer.
- The current clustered signal pipeline, homepage, dashboard, and signed-in fallback path remain structurally unchanged.

## Limits

- Importance is still heuristic and should not be confused with true semantic editorial judgment.
- The current model uses article text, cluster metadata, source metadata, and actor/entity cues; deeper semantic reasoning remains future work.
