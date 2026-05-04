# PRD-54 — Public source manifest

- PRD ID: `PRD-54`
- Canonical file: `docs/product/prd/prd-54-public-source-manifest.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Adopt a minimum viable public source manifest so public surface source selection has an explicit, reviewable source of truth, while unblocking Reuters World ingestion for public Politics coverage without changing user-supplied source behavior.

## User Problem

The public dashboard previously depended on legacy MVP default sources and an ingestion cap that silently dropped the sixth manifest entry. That made Reuters World unavailable to the public pipeline and allowed the Politics tab to present borrowed non-politics stories when no politics-classified events existed.

## Scope

This PRD covers the `public.home` source manifest, Reuters World demo-source activation for that manifest, public dashboard fallback routing through the manifest, manifest-aware ingestion cap handling, and the Politics empty-state correction that prevents borrowed Tech or Finance stories from appearing under Politics.

## Non-Goals

This does not redesign the source catalog, donor registry, ingestion resolver architecture, ranking, clustering, classification, or the legacy `getMvpDefaultPublicSources()` fallback. It does not add additional public surfaces beyond `public.home`.

## Implementation Shape / System Impact

The public dashboard resolves unauthenticated fallback sources through `getSourcesForPublicSurface("public.home")`. The manifest owns the governed public source list and ordering. The ingestion resolver keeps the existing five-source cap for ordinary supplied sources, but receives an internal `suppliedByManifest` provenance flag so manifest-governed lists can resolve all declared entries.

## Dependencies / Risks

This depends on the source activation and architecture audits committed under `docs/audits/`, plus the existing Phase 1 pipeline behavior. The main risk is that the manifest becomes a new activation surface; future additions must be reviewed against manifest size, public-source quality, and fetch-load expectations.

## Acceptance Criteria

- Public home source resolution uses the public manifest when no explicit sources are supplied.
- `public.home` includes Reuters World.
- Manifest ordering is preserved and missing manifest source IDs fail clearly.
- Manifest-supplied ingestion resolves all manifest entries.
- User-supplied ingestion remains capped at five sources.
- Politics does not display borrowed Tech or Finance content when there are no politics-classified events.
- Local test, build, dev-server, PR gate, and preview checks pass before merge.

## Evidence and Confidence

- Repo evidence used: `docs/audits/source-activation-audit.md`, `docs/audits/source-architecture-audit.md`, the public source manifest implementation, and focused source-manifest, dashboard-fallback, ingestion, and homepage-model tests.
- Confidence: High for the scoped manifest behavior and cap boundary; medium for live Reuters feed reachability until deployed preview and production fetch behavior are observed.

## Closeout Checklist

- Scope completed: yes.
- Tests run: `npm run test`; `npm run build`; `npm run dev`; PR CI checks.
- Local validation complete: yes.
- Preview validation complete, if applicable: Vercel preview route checks required before merge.
- Production sanity check complete, only after preview is good: pending merge.
- PRD summary stored in repo: yes.
- Bug-fix report stored in repo, if applicable: not applicable.
- `docs/product/feature-system.csv` updated if PRD/feature metadata changed: yes.
- GitHub documentation closeout completed in the canonical lane: yes.
- Google Sheet / Google Work Log not treated as canonical or updated for routine closeout: yes.
