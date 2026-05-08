# PRD-58 — Politics Ingestion Sources

- PRD ID: `PRD-58`
- Canonical file: `docs/product/prd/prd-58-politics-ingestion-sources.md`
- Feature system row: `docs/product/feature-system.csv`

## Summary

Extend the existing ingestion foundation with three runtime-usable Politico politics RSS feeds, one cataloged-but-failed AP Politics RSS entry, and one catalog-only Congress.gov API entry, without changing default ingestion, ranking logic, clustering logic, homepage behavior, auth behavior, or schema shape.

## Objective

Increase politics-source coverage inside the governed ingestion system using existing catalog and pipeline patterns.

## User Problem

The current source inventory has limited politics-specific coverage. That reduces the system's ability to surface a broader set of government, congressional, defense, and U.S. politics developments through the existing ingestion pipeline.

## Scope

- Add AP Politics, Politico Politics News, Politico Congress, and Politico Defense to the governed source catalog.
- Add the three currently working Politico RSS feeds to the optional source configuration used by the existing supplied-source ingestion path.
- Ensure supplied politics sources normalize into the existing raw-item and normalized-article contracts with correct canonical topic metadata.
- Add Congress.gov API to the catalog with a clear non-runtime status.
- Add focused regression tests for catalog separation, politics-source ingestion metadata, and pipeline resilience when one politics source fails.

## Non-Goals

- No change to default public ingestion source IDs.
- No change to donor fallback default IDs.
- No change to ranking weights, clustering logic, homepage UI, category-tab behavior, auth/session behavior, or database schema.
- No Congress.gov production adapter or API-key rollout in this PR.
- No automatic source-tier boost or source-policy preference change for Politico or Congress.gov.

## Source List

### RSS sources added

- AP Politics — `https://apnews.com/politics.rss` (currently returns AP's HTML unavailable page, so it is cataloged only and not runtime-ingested)
- Politico Politics News — `https://rss.politico.com/politics-news.xml`
- Politico Congress — `https://rss.politico.com/congress.xml`
- Politico Defense — `https://rss.politico.com/defense.xml`

### API source added

- Congress.gov API — `https://api.congress.gov/`

## What Is RSS-Ingested Now

- Politico Politics News, Politico Congress, and Politico Defense are cataloged as optional, non-default politics sources and are wired into the supplied-source ingestion path now.
- AP Politics is cataloged, but not runtime-ingested, because the requested URL did not return parseable RSS during live validation on 2026-04-25.
- They are available to the existing supplied-source ingestion path and flow through:
  - ingestion
  - normalization
  - deduplication
  - clustering
  - ranking
- Politics and geopolitics supplied sources now map to the canonical `World` topic metadata instead of incorrectly defaulting to `Tech`.

## How Congress.gov API Is Handled

- Congress.gov is cataloged as `sourceFormat: "api"` with `importStatus: "manual"`, `lifecycleStatus: "catalog_only"`, and `validationStatus: "requires_key"`.
- The repo does not currently contain a dedicated Congress.gov API adapter or a safe runtime key-management path for this API.
- This PR does not force Congress.gov into the article RSS pipeline.
- Runtime ingestion remains pending a future adapter implementation that can:
  - validate request and pagination behavior
  - map legislative payloads into a compatible canonical contract
  - handle credentials safely without making local build and test flows depend on secrets

## Implementation Shape / System Impact

- `src/lib/source-catalog.ts` gains the governed metadata entries for the four RSS feeds plus Congress.gov.
- `src/lib/demo-data.ts` gains optional politics source definitions for the three working Politico feeds so the existing supplied-source pipeline can ingest them without altering MVP default public source selection.
- `src/lib/pipeline/ingestion/index.ts` corrects custom-source topic mapping so politics/geopolitics/world inputs resolve to the canonical `World` topic metadata.
- Focused tests cover catalog governance, ingestion metadata, and pipeline continuity on partial source failure.

## Risks

- Feed reliability: AP and Politico feeds can change format, throttle, or fail independently; AP Politics is already failing at the requested endpoint.
- Duplication: politics feeds may overlap with Reuters World or other geopolitics coverage and increase duplicate pressure.
- Source bias: the new set adds more U.S. politics and Capitol-focused reporting, which broadens supply but does not create ideological balance by itself.
- Congress.gov API compatibility: legislative records are not article-shaped news items, so forcing them into the RSS/article path would create poor data quality.

## Dependencies / Risks

- Depends on PRD-1 ingestion contracts remaining stable.
- Depends on PRD-42 source-governance rules remaining the authority for catalog versus activation.
- Depends on PRD-37 pipeline contracts remaining unchanged for ingestion, normalization, clustering, and ranking.

## Testing Plan

- `npm install`
- `npm run lint`
- `npm run test -- src/lib/source-catalog.test.ts src/lib/pipeline/ingestion/index.test.ts src/lib/pipeline/index.test.ts`
- `npm run build`
- Live feed fetch verification for:
  - AP Politics
  - Politico Politics News
  - Politico Congress
  - Politico Defense
- Local pipeline sampling with 2 to 3 normalized items per successful RSS source
- Dev-server sanity check on the branch-owned worktree after clearing port `3000`

## Rollback Plan

- Remove the five new source-catalog entries.
- Remove the four optional politics source definitions from `src/lib/demo-data.ts`.
- Revert the custom-source politics topic mapping adjustment if it is shown to regress unrelated supplied-source flows.
- Re-run lint, tests, and build to confirm the repo returns to the previous governed source set.

## Acceptance Criteria

- The four requested RSS feeds exist in the source catalog with politics labeling and accurate lifecycle metadata.
- Congress.gov API exists in the source catalog and is clearly marked as catalog-only, not runtime-ingested.
- The three currently working Politico supplied politics sources normalize with correct canonical topic metadata and continue through the existing pipeline.
- One failed politics feed logs a failure but does not stop clustering and ranking from completing for the remaining successful feeds.
- Default public ingestion and donor fallback defaults remain unchanged.

## Evidence and Confidence

- Repo evidence used:
  - `docs/product/prd/prd-01-daily-news-ingestion-foundation.md`
  - `docs/product/prd/prd-42-source-governance-and-defaults.md`
  - `src/lib/source-catalog.ts`
  - `src/lib/demo-data.ts`
  - `src/lib/pipeline/ingestion/index.ts`
  - `src/lib/pipeline/index.ts`
- Confidence: Medium-high before live feed validation, high after local command and feed checks pass.

## Closeout Checklist

- Scope completed:
- Tests run:
- Local validation complete:
- Preview validation complete, if applicable:
- Production sanity check complete, only after preview is good:
- PRD summary stored in repo:
- Bug-fix report stored in repo, if applicable:
- GitHub documentation closeout completed in the canonical lane:
- Google Sheet / Work Log not treated as canonical or updated for routine closeout:
