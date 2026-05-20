# Ingestion Source Hardcoding Cleanup

## Root Cause

The previous donor integration framework made donors explicit, but ingestion still operated mostly as a flat feed list. Source identity, status, trust tier, provenance, and adapter ownership were not first-class source records inside the ingestion stage.

## Fix

- promoted source definitions into canonical registry-backed records
- added source registry snapshot helpers and active-source resolution
- carried canonical source metadata through `RawItem` and `NormalizedArticle`
- promoted Horizon to an active ingestion/source-breadth donor
- split ingestion responsibilities more cleanly across:
  - source resolution
  - fetch adapter execution
  - canonical raw item generation
  - source contribution observability

## Remaining Risks

- live source quality still depends on external RSS stability
- custom user sources still use the openclaw-shaped ingestion shell
- richer source-specific fallback handling is still future work
