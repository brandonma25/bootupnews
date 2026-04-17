# PRD-1 — Daily News Ingestion Foundation

- PRD ID: `PRD-1`
- Canonical file: `docs/product/prd/prd-01-daily-news-ingestion-foundation.md`

## Objective
- Establish the first reusable ingestion layer that can fetch news from multiple sources and normalize article payloads for downstream product surfaces.

## User Problem
- Without a shared ingestion foundation, the product cannot reliably collect enough raw news data to produce useful briefings or later intelligence features.

## Scope
- Multi-source RSS fetching.
- Environment-aware source configuration.
- Shared article normalization in the data layer.
- Curated source catalog support for initial feed coverage.

## Non-Goals
- Fallback ingestion reliability rules handled later in PRD-11.
- Ranking, clustering, and reasoning layers.
- User-authenticated source management.

## Implementation Shape / System Impact
- Shared ingestion logic lives in reusable library code instead of route-specific fetch logic.
- Normalized article fields become the baseline contract for later matching, clustering, and ranking layers.

## Dependencies / Risks
- Dependencies:
  - Feed source configuration in shared source-catalog and env-aware code.
- Risks:
  - Feed quality and freshness vary by source.
  - Slow or malformed feeds can reduce article volume.
  - Early ingestion does not yet protect against thin-category output.

## Acceptance Criteria
- The repo can fetch articles from configured RSS sources through shared library code.
- Ingested items expose consistent article fields for later matching and ranking layers.
- Source definitions are centralized instead of hardcoded across routes.

## Evidence and Confidence
- Repo evidence:
  - Historical PRD content from commit `0c6196f`
  - Current related files: `src/lib/rss.ts`, `src/lib/data.ts`, `src/lib/source-catalog.ts`, `src/lib/env.ts`
- Confidence: High. The repo history and current code both point to a clear foundational ingestion layer.
