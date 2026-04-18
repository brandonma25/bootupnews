# Ingestion Source Integration

## Summary

The ingestion layer now treats sources as first-class canonical records instead of anonymous feed rows. Donor-backed source definitions flow through a source registry, ingestion adapters, and canonical source metadata that can travel with `RawItem` and `NormalizedArticle`.

## Source Registry Structure

- registry owner:
  - `src/adapters/donors/registry.ts`
- canonical source definition fields:
  - `sourceId`
  - `source`
  - `donor`
  - `adapterOwner`
  - `sourceClass`
  - `trustTier`
  - `provenance`
  - `status`
  - `availability`
  - `fetch` config

## Donor Ownership

- `openclaw`
  - primary ingestion-ops donor
  - active now
  - owns specialist and business source definitions used for reliable RSS ingestion
- `horizon`
  - secondary ingestion/source-breadth donor
  - active now
  - adds Reuters world/business source definitions plus richer source context metadata
- `after_market_agent`
  - not an ingestion owner
  - remains clustering-support focused
- `fns`
  - not an ingestion owner
  - remains ranking-feature focused

## Canonical Metadata Flow

The canonical source metadata now flows:

`SourceRegistry -> IngestionAdapter -> RawItem.source_metadata -> NormalizedArticle.source_metadata -> ranking/trust logic`

Metadata currently preserved:

- donor origin
- source id
- source class
- trust tier
- reliability
- provenance
- active/default/custom status

## Active Now vs Future-Ready

Active now:
- donor-backed source registry
- ingestion adapter capability descriptions
- per-source fetch config
- per-source contribution summaries
- ranking access to canonical source metadata

Future-ready:
- richer Horizon context packages beyond metadata
- source-specific transport policies beyond current RSS retry settings
- additional adapter families without changing the pipeline core
