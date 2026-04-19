# Clustering Support Integration

## Summary

The clustering layer now uses explicit donor-backed support contracts while keeping final `SignalCluster` assembly canonical to the website repo.

## Clustering Support Contracts

- `ClusterCandidate`
  - canonical pre-cluster article shape used during event grouping
- `SimilaritySignals`
  - deterministic overlap/proximity signals used for support decisions
- `ClusteringSupport`
  - `prepareClusterCandidates()`
  - `buildCandidateFingerprint()`
  - `computeSimilaritySignals()`
  - `supportMergeDecision()`
  - `selectRepresentativeArticle()`
  - `describeCapabilities()`
- `DiversitySupport`
  - optional post-cluster hook for future diversity-aware selection

## Ownership

- `after_market_agent`
  - active clustering support owner
  - owns candidate preparation support, similarity-signal support, merge-decision support, and representative-selection support
- website canonical clusterer
  - still owns sort order, accepted/prevented merge application, and final `SignalCluster` creation
- `fns`
  - future-ready diversity hook only
  - does not own clustering execution

## Active Now vs Future-Ready

Active now:
- after-market-agent clustering support provider
- similarity-signal contract with title, keyword, entity, content, time, and source-confirmation signals
- canonical cluster debug snapshots showing provider, fingerprints, merge decisions, and representative selection

Future-ready:
- FNS post-cluster diversity support
- broader donor-specific cluster heuristics beyond the current deterministic support layer
