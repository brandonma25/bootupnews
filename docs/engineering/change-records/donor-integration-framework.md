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
  - boundary: candidate similarity and representative-selection support only
- `FINANCIAL-NEWS-SUMMARIZER`
  - active now: ranking feature provider
  - future/stubbed: ingestion, clustering, enrichment
  - boundary: deterministic source-quality feature mapping only
- `Horizon`
  - active now: no mandatory runtime behavior
  - future-ready: enrichment support
  - boundary: optional enrichment packet preparation only

## Canonical Contracts

- `IngestionAdapter`
  - `fetchItems()`
  - `normalizeSourceMetadata()`
- `NormalizationAdapter`
  - `convertToCanonicalArticle()`
- `ClusteringSupport`
  - similarity strategy description
  - candidate fingerprint helper
  - representative selection description
- `RankingFeatureProvider`
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
  - ingestion feed metadata and transport boundary
  - clustering support strategy boundary
  - ranking source-feature mapping
- Stubbed / future-ready:
  - Horizon enrichment execution

## Remaining Limitations

- Donor contracts are now explicit, but most subsystem behavior still lives in canonical local code by design.
- Horizon remains stub-safe and intentionally non-blocking.
- This change clarifies integration boundaries; it does not attempt a donor-quality optimization pass.
