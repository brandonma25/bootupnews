# Phase 1 Clustering Errors

## Scope

Tracks deterministic clustering edge cases for Phase 1.

## Known Risks

- Adjacent macroeconomic stories can over-cluster because of shared vocabulary.
- Fast-moving stories can split into separate clusters when headlines evolve quickly.
- Keyword-light headlines may rely too heavily on recency and representative-title similarity.

## Current Handling

- Clustering uses keyword overlap or representative similarity.
- Cluster keywords are recomputed as articles join a cluster.
- Ranking still exposes cluster size and scoring breakdown so a bad cluster is easier to inspect.

## Follow-Up

- Add regression fixtures for false-merge and false-split cases.
- Consider topic-aware thresholds or source-normalized title templates in a later phase.
