# PRD-59 — TLDR URL Ingestion

- PRD ID: `PRD-59`
- Canonical file: `docs/product/prd/prd-59-tldr-url-ingestion.md`
- Date: `2026-04-25`
- Branch: `feature/tldr-url-ingestion`
- Scope: TLDR discovery-source adapter across validated official TLDR category feeds

## Objective

Feed TLDR article URLs into the existing Boot Up ingestion pipeline without treating TLDR editorial copy as canonical content.

## Reference Inputs

- Reference repo: [Bullrich/tldr-rss](https://github.com/Bullrich/tldr-rss/)
- Feed index inspected: [bullrich.dev/tldr-rss](https://bullrich.dev/tldr-rss/)
- Validated example feed: [bullrich.dev/tldr-rss/ai.rss](https://bullrich.dev/tldr-rss/ai.rss)
- Native TLDR digest feeds validated as runtime candidates:
  - `https://tldr.tech/api/rss/tech`
  - `https://tldr.tech/api/rss/ai`
  - `https://tldr.tech/api/rss/product`
  - `https://tldr.tech/api/rss/founders`
  - `https://tldr.tech/api/rss/design`
  - `https://tldr.tech/api/rss/fintech`
  - `https://tldr.tech/api/rss/it`
  - `https://tldr.tech/api/rss/crypto`
  - `https://tldr.tech/api/rss/marketing`

The Bullrich repo and feed index remain reference-only inputs for discovery-shape validation. They are not Boot Up editorial sources, canonical publishers, or preferred production runtime feed inputs. The deployed [bullrich.dev/tldr-rss](https://bullrich.dev/tldr-rss/) index remains reference/fallback only.

## Architecture Decision

TLDR is a discovery source only.

Runtime shape:

`TLDR digest RSS -> digest page fetch -> outbound URL extraction -> URL normalization -> dedupe candidate creation -> existing Boot Up ingestion/normalization/dedup/clustering/ranking pipeline`

Guardrails:

- Preserve the existing pipeline entrypoints.
- Do not store or promote TLDR summary copy as canonical article content.
- Keep the visible article source anchored to the outbound article domain, not TLDR.
- Preserve source metadata only as ingestion context, with discovery metadata explicitly marking TLDR provenance.
- Keep all TLDR sources paused/non-default unless an ingesting surface explicitly opts in.

## Scope

- Add TLDR digest extraction adapter inside the existing RSS ingestion layer.
- Thread TLDR discovery metadata through raw-item and normalized-article stages.
- Update TLDR catalog/runtime feed definitions to validated native digest endpoints.
- Add validated TLDR category source metadata without activating any TLDR source by default.
- Add tests for digest extraction, ignore rules, normalization, dedupe, and pipeline-native ingestion.

## Validation Status

Validated official TLDR runtime candidates on `2026-04-25`:

- `tech`: passed
- `ai`: passed
- `product`: passed
- `founders`: passed
- `design`: passed
- `fintech`: passed
- `it`: passed
- `crypto`: passed
- `marketing`: passed

Validation bar:

- HTTP `200`
- RSS/XML parse success
- `item_count > 0`
- First item link resolves to a TLDR digest URL for the matching category

Rejected or blocked official TLDR categories:

- None in this validation pass

## Non-Goals

- No auth/session changes.
- No homepage ranking redesign.
- No new parallel ingestion pipeline.
- No TLDR summary reuse or TLDR publisher attribution on surfaced articles.

## Risks

- Legal/content risk: TLDR summaries must not become canonical stored content; the adapter intentionally emits empty summary/content fields.
- Duplication risk: one digest can contain repeated or tracked variants of the same URL; normalization and dedupe now use TLDR discovery metadata.
- Feed instability risk: TLDR native endpoints and digest markup may change; the adapter uses safe skip behavior on malformed entries and continues ingestion when an individual digest page fails.
- Rate-limit risk: TLDR may respond with transient throttling; the adapter reuses existing feed retry handling and bounds each run with lookback and max-item limits.
- Category-specific instability risk: newly validated TLDR categories are supported as paused/non-default sources because each category can drift independently in availability or digest markup shape.
