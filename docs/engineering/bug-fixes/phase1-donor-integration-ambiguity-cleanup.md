# Donor Integration Ambiguity Cleanup

## Root Cause

The repo had donor-named folders, but the runtime treated them mostly as static feed catalogs. Ingestion, clustering support, and ranking feature boundaries were implicit in local code, which made it unclear where future donor extraction work should land.

## Fix

- added canonical subsystem contracts in `src/lib/integration/subsystem-contracts.ts`
- added donor registry and donor snapshot helpers in `src/adapters/donors/registry.ts`
- converted donor folders to explicit donor definitions with contract states
- wired ingestion through registered ingestion adapters
- wired ranking source credibility lookup through donor-mapped canonical source metadata
- added integration mapping and pipeline stage ownership helpers

## Files Changed

- `src/adapters/donors/`
- `src/lib/integration/`
- `src/lib/pipeline/ingestion/index.ts`
- `src/lib/scoring/scoring-engine.ts`
- `src/lib/pipeline/index.ts`

## Remaining Risks

- Current donor support is intentionally shallow in clustering and enrichment.
- Custom user sources still use the openclaw-style ingestion shell as the canonical adapter path.
- Future donor integrations must continue translating into canonical models instead of leaking donor ontology.
