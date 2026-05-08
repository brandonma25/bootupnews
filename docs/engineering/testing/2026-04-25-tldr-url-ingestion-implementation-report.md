# TLDR URL Ingestion Implementation Report

- Date: `2026-04-25`
- Branch: `feature/tldr-url-ingestion`

## What Changed

- Added `src/lib/tldr.ts` as a Boot Up-native TLDR discovery adapter.
- Routed TLDR feed URLs through the existing `fetchFeedArticles()` entrypoint in `src/lib/rss.ts`.
- Added TLDR discovery metadata to `RawItem` and `NormalizedArticle`.
- Updated dedupe to prefer TLDR normalized discovery URLs when present.
- Switched TLDR catalog/demo feed URLs to native TLDR digest RSS endpoints.
- Expanded validated TLDR category support to official `tech`, `ai`, `product`, `founders`, `design`, `fintech`, `it`, `crypto`, and `marketing` feeds.
- Kept every TLDR source paused/non-default in demo/catalog metadata.

## New Runtime Controls

- `TLDR_MAX_ITEMS_PER_RUN`
- `TLDR_LOOKBACK_DAYS`

Defaults used when unset:

- `TLDR_MAX_ITEMS_PER_RUN=12`
- `TLDR_LOOKBACK_DAYS=2`

## Validation Performed

Focused tests:

- `npx vitest run src/lib/tldr.test.ts src/lib/rss.test.ts src/lib/pipeline/ingestion/tldr.integration.test.ts`

Coverage achieved:

- Extracting outbound links from TLDR digest HTML
- Ignoring unsubscribe links
- Ignoring internal TLDR links
- Ignoring tracked duplicate variants through normalization
- Ignoring sponsor slots
- Recognizing official TLDR digest URLs across all validated category slugs
- Mapping discovery metadata into ingestion candidates
- Verifying `ingestRawItems()` receives TLDR-derived candidates without a bypass path

## Local Verification Notes

- TLDR feed fetch path validated against current live endpoints:
  - `https://tldr.tech/api/rss/tech`
  - `https://tldr.tech/api/rss/ai`
  - `https://tldr.tech/api/rss/product`
  - `https://tldr.tech/api/rss/founders`
  - `https://tldr.tech/api/rss/design`
  - `https://tldr.tech/api/rss/fintech`
  - `https://tldr.tech/api/rss/it`
  - `https://tldr.tech/api/rss/crypto`
  - `https://tldr.tech/api/rss/marketing`
- Hard runtime validation evidence:

| URL | HTTP status | Final URL | Content-Type | Parse success | Feed title | Item count | First item link | Link type | Runtime candidate? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `https://tldr.tech/api/rss/tech` | `200` | `https://tldr.tech/api/rss/tech` | `text/xml` | `yes` | `TLDR RSS Feed` | `20` | `https://tldr.tech/tech/2026-04-24` | `tldr_digest_url` | `yes` | Official TLDR Tech feed validated locally on `2026-04-25`. Added as paused/non-default runtime source. |
| `https://tldr.tech/api/rss/ai` | `200` | `https://tldr.tech/api/rss/ai` | `text/xml` | `yes` | `TLDR AI RSS Feed` | `20` | `https://tldr.tech/ai/2026-04-24` | `tldr_digest_url` | `yes` | Official TLDR AI feed validated locally on `2026-04-25`. Added as paused/non-default runtime source. |
| `https://tldr.tech/api/rss/product` | `200` | `https://tldr.tech/api/rss/product` | `text/xml` | `yes` | `TLDR Product Management RSS Feed` | `20` | `https://tldr.tech/product/2026-04-24` | `tldr_digest_url` | `yes` | Official TLDR Product feed validated locally on `2026-04-25`. Added as paused/non-default runtime source. |
| `https://tldr.tech/api/rss/founders` | `200` | `https://tldr.tech/api/rss/founders` | `text/xml` | `yes` | `TLDR Founders RSS Feed` | `20` | `https://tldr.tech/founders/2026-04-24` | `tldr_digest_url` | `yes` | Official TLDR Founders feed validated locally on `2026-04-25`. Added as paused/non-default runtime source. |
| `https://tldr.tech/api/rss/design` | `200` | `https://tldr.tech/api/rss/design` | `text/xml` | `yes` | `TLDR Design RSS Feed` | `20` | `https://tldr.tech/design/2026-04-24` | `tldr_digest_url` | `yes` | Official TLDR Design feed validated locally on `2026-04-25`. Added as paused/non-default runtime source. |
| `https://tldr.tech/api/rss/fintech` | `200` | `https://tldr.tech/api/rss/fintech` | `text/xml` | `yes` | `TLDR Fintech RSS Feed` | `20` | `https://tldr.tech/fintech/2026-04-23` | `tldr_digest_url` | `yes` | Official TLDR Fintech feed validated locally on `2026-04-25`. Added as paused/non-default runtime source. |
| `https://tldr.tech/api/rss/it` | `200` | `https://tldr.tech/api/rss/it` | `text/xml` | `yes` | `TLDR IT RSS Feed` | `20` | `https://tldr.tech/it/2026-04-24` | `tldr_digest_url` | `yes` | Official TLDR IT feed validated locally on `2026-04-25`. Added as paused/non-default runtime source. |
| `https://tldr.tech/api/rss/crypto` | `200` | `https://tldr.tech/api/rss/crypto` | `text/xml` | `yes` | `TLDR Crypto RSS Feed` | `20` | `https://tldr.tech/crypto/2026-04-24` | `tldr_digest_url` | `yes` | Official TLDR Crypto feed validated locally on `2026-04-25`. Added as paused/non-default runtime source. |
| `https://tldr.tech/api/rss/marketing` | `200` | `https://tldr.tech/api/rss/marketing` | `text/xml` | `yes` | `TLDR Marketing RSS Feed` | `20` | `https://tldr.tech/marketing/2026-04-24` | `tldr_digest_url` | `yes` | Official TLDR Marketing feed validated locally on `2026-04-25`. Added as paused/non-default runtime source. |
- The adapter keeps outbound article URLs untouched for click-through while using a normalized discovery URL for dedupe.
- TLDR summaries are intentionally dropped before raw-item creation.
- Bullrich feeds remain reference/fallback only and are not used as production runtime dependencies.

## Human Checks Still Required

- Verify preview-environment ingestion against the deployed TLDR endpoints.
- Confirm no production data contamination before enabling any non-default TLDR source beyond existing public-source behavior.
- Confirm homepage/output still shows canonical outbound publishers rather than TLDR labels in the validated preview flow.
