# Source Onboarding Batch 1

Date: 2026-04-19

Governed feature: `PRD-42` (`docs/product/prd/prd-42-source-governance-and-defaults.md`)

## Purpose

Add user-provided candidate sources to the source catalog only after fetch/parse validation, while preserving the explicit MVP default ingestion set.

This pass does not add new runtime-default sources, does not add source-tier preference boosts, and does not reintroduce BBC or CNBC.

## Runtime Defaults

The MVP default public ingestion set remains unchanged:

- The Verge
- Ars Technica
- TLDR
- TechCrunch
- Financial Times

These defaults are still resolved from `MVP_DEFAULT_PUBLIC_SOURCE_IDS` in `src/lib/demo-data.ts`. Catalog support is not default ingestion.

## Candidate Validation

Validation used a direct HTTP fetch plus `rss-parser` parse check with the same parser dependency used by the ingestion code.

| Candidate | URL | HTTP result | Parse result | Items | Decision |
| --- | --- | --- | --- | ---: | --- |
| Financial Times Global Economy | `https://www.ft.com/global-economy?format=rss` | `200 OK`, `text/xml` | Parsed as RSS | 25 | Added as probationary catalog source; near-duplicate of broad FT default. |
| NPR Economy | `https://feeds.npr.org/1008/rss.xml` | `200 OK`, `text/xml` | Parsed as RSS | 10 | Deferred. Feed title returned `NPR Topics: Culture`, so it does not validate as the requested economy source. |
| WSJ / Dow Jones / MarketWatch economics | `https://feeds.content.dowjones.io/public/rss/mktw_wsjonline` | `404 Not Found` | Failed | 0 | Rejected for now. Do not add without a working endpoint. |
| MIT Technology Review | `https://www.technologyreview.com/feed/` | `200 OK`, `application/rss+xml` | Parsed as RSS | 10 | Added as optional catalog source. |
| The Verge | `https://www.theverge.com/rss/index.xml` | `200 OK`, `application/xml` | Parsed as RSS | 10 | Duplicate of existing runtime-default source; not added to catalog. |
| Ars Technica | `https://feeds.arstechnica.com/arstechnica/index` | `200 OK`, `text/xml` | Parsed as RSS | 20 | Existing catalog source; validation metadata updated. |
| Foreign Affairs | `https://www.foreignaffairs.com/rss.xml` | `200 OK`, `application/rss+xml` | Parsed as RSS | 20 | Added as optional catalog source. |
| The Diplomat | `https://thediplomat.com/feed` | `200 OK`, `application/rss+xml` | Parsed as RSS | 96 | Added as optional catalog source. |
| NPR World | `https://feeds.npr.org/1004/rss.xml` | `200 OK`, `text/xml` | Parsed as RSS | 10 | Added as optional catalog source. |
| Brookings Research | `https://www.brookings.edu/feeds/rss/research/` | `200 OK`, `text/html` redirected to research page | Failed | 0 | Deferred. URL did not return parseable RSS. |
| Foreign Policy | `https://foreignpolicy.com/feed` | `200 OK`, `application/rss+xml` | Parsed as RSS | 25 | Added as optional catalog source. |
| The Guardian World | `https://www.theguardian.com/world/rss` | `200 OK`, `text/xml` | Parsed as RSS | 45 | Added as probationary catalog source due breadth/noise risk. |
| Hacker News Best | `https://hnrss.org/best` | `200 OK`, `application/xml` | Parsed as RSS | 30 | Added as probationary catalog source; community-curated, not editorial backbone. |
| CSIS Analysis | `https://www.csis.org/analysis/feed` | `404 Not Found` | Failed | 0 | Rejected for now. Do not add without a working endpoint. |

## Onboarding Decisions

Added catalog-only support does not imply runtime ingestion. Every added source has:

- `mvpDefaultAllowed: false`
- `editorialPreference: "none"`
- `validationStatus: "validated"`
- `lifecycleStatus` set to either `active_optional` or `probationary`

Deferred or rejected sources were not added to the catalog. If a replacement endpoint is later supplied, it must pass the same fetch/parse validation before being marked ready.

## Duplicate Handling

- The Verge is already represented as a runtime-default source and was not duplicated in the catalog.
- Ars Technica already existed in the catalog and runtime defaults; only its validation metadata was updated.
- Financial Times Global Economy is narrower than the existing broad Financial Times runtime default. It was added as probationary, with an explicit duplicate-pressure note, and was not promoted into default ingestion.

## Follow-Up

- Find a verified NPR economy feed before onboarding NPR Economy.
- Find a working Brookings research RSS or API endpoint before onboarding Brookings Research.
- Find a working CSIS analysis RSS or Atom endpoint before onboarding CSIS Analysis.
- Re-check any Dow Jones endpoint manually before using it; the supplied URL returned `404 Not Found`.
