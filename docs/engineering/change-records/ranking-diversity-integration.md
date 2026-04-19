# Ranking and Diversity Integration

## Summary

The post-cluster selection layer now has explicit donor-backed ranking feature support and active diversity-aware post-cluster adjustment while keeping final ranked output canonical to the website repo.

## Ranking Feature Contracts

- `RankingFeatureSet`
  - canonical deterministic feature inputs for scoring
- `RankingFeatureProvider`
  - donor-backed mapping from clusters to canonical feature values
- `RankingDebug`
  - provider, canonical feature set, diversity decision, and scoring notes
- `DiversitySupport`
  - post-cluster diversity adjustment contract

## Ownership

- `fns`
  - active ranking-method support owner
  - maps donor-backed trust and selection features into canonical ranking inputs
  - owns active diversity-support boundary
- website canonical scorer
  - still owns final score math
  - still owns final ordering
  - still owns final `RankedSignal` output

## Active Now

- canonical ranking feature set
- FNS feature support mapping
- active post-cluster diversity penalty path
- ranking/trust debug output in ranked results and pipeline run logs
- grouped importance-aware ranking families with deterministic explanations

## Future-Ready

- deeper FNS-inspired diversity heuristics
- richer trust calibration using broader source metadata
- additional ranking providers if later needed
