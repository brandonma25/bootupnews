# Donor Integration Framework

## Summary

The website repo now owns a formal donor integration framework for the cluster-first pipeline. Donor repos are no longer just named feed lists; they are explicit registry-backed modules behind canonical subsystem contracts.

## Why This Exists

- The website is the host system and source of truth.
- Donor repos provide useful subsystem patterns, not full application architecture.
- Adapter-based extraction keeps current product behavior stable while making future donor upgrades safer.

## Donor-To-Subsystem Mapping

- `openclaw-newsroom`
  - active now: ingestion adapter
  - future/stubbed: clustering, ranking, enrichment
  - boundary: feed transport and source metadata only
- `after-market-agent`
  - active now: clustering support contract
  - future/stubbed: ingestion, ranking, enrichment
  - boundary: candidate preparation, similarity-signal support, merge-decision support, and representative-selection support
- `FINANCIAL-NEWS-SUMMARIZER`
  - active now: ranking feature provider and diversity support owner
  - future/stubbed: ingestion, clustering execution, enrichment
  - boundary: deterministic ranking feature mapping and post-cluster diversity support only
- `Horizon`
  - active now: secondary ingestion/source-breadth donor
  - future-ready: enrichment support
  - boundary: source-context metadata now, optional enrichment packet preparation later

## Canonical Contracts

- `IngestionAdapter`
  - `fetchItems()`
  - `normalizeSourceMetadata()`
  - `describeCapabilities()`
- `NormalizationAdapter`
  - `convertToCanonicalArticle()`
- `ClusteringSupport`
  - cluster candidate preparation
  - similarity-signal computation
  - merge-decision support
  - candidate fingerprint helper
  - representative selection support
- `DiversitySupport`
  - post-cluster diversity adjustment hook
- `RankingFeatureProvider`
  - feature support description
  - known-source metadata
  - cluster feature mapping into deterministic scoring inputs
- `EnrichmentSupport`
  - optional packet preparation only

## Current Runtime Ownership

- Canonical now:
  - normalization
  - dedup
  - digest assembly
  - final deterministic scoring formula
- Donor-assisted now:
  - ingestion source registry, feed metadata, and transport boundary
  - clustering support boundary
  - ranking feature mapping and post-cluster diversity adjustment
- Stubbed / future-ready:
  - Horizon enrichment execution

## Remaining Limitations

- Donor contracts are now explicit, but most subsystem behavior still lives in canonical local code by design.
- Horizon enrichment remains stub-safe and intentionally non-blocking.
- This change clarifies integration boundaries; it does not attempt a donor-quality optimization pass.
