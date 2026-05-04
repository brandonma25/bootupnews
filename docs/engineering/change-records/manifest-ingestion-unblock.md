# Manifest Ingestion Unblock

- Date: 2026-04-23
- Branch: `feature/public-source-manifest-v2`
- Canonical PRD: `docs/product/prd/prd-54-public-source-manifest.md`
- Canonical record after `docs/changes/` removal: this change record is the durable manifest-ingestion unblock record.

## Summary

The public source manifest unblock made the supplied-source ingestion cap aware of manifest provenance. Public manifest source lists can resolve all governed manifest entries, while ordinary user-supplied source lists remain capped at five to bound fetch load.

## System Changes

- `src/lib/pipeline/ingestion/index.ts` keeps the ordinary supplied-source cap at five.
- `src/lib/source-manifest.ts` and `src/lib/data.ts` pass manifest provenance for `public.home` source lists.
- `src/lib/pipeline/ingestion/index.test.ts` covers six manifest-flagged sources resolving to six runtime sources, six non-manifest supplied sources remaining capped at five, and smaller manifest/non-manifest source sets resolving as expected.
- Source activation and source architecture audits remained supporting context for PRD-54.

## TypeError Classification

The dev-server `TypeError: Cannot read properties of undefined (reading 'call')` observed during local verification was classified as pre-existing and unrelated to the public source manifest unblock because the same route-probe sequence reproduced on `main`.

No speculative fix was made in the manifest unblock branch.

## Validation

- `npm run test` passed.
- `npm run build` passed.
- `npm run dev` passed.
- Local `/` and `/dashboard` route probes returned `200`.

## Follow-up

The release governance gate required canonical PRD coverage for the new public source manifest surface. PRD-54 and the matching `docs/product/feature-system.csv` row were added as the canonical governance mapping.
