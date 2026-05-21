# PRD-11 — Ingestion Reliability Fallbacks

## Objective
- Keep Finance, Politics, and Tech sections from rendering blank.
- Supplement thin primary-source coverage with safe fallback feeds.
- Make fallback behavior visible in logs and intentional in the UI.

## Scope
- Multi-source ingestion resilience.
- Retry and timeout handling.
- Minimum-category supplementation.
- Dedupe-safe fallback behavior.
- Fallback logging and intentional empty/loading states.

## Explicit Exclusions
- Auth changes.
- Supabase schema changes.
- Environment variable changes.
- Unrelated dashboard behavior.

## Acceptance Criteria
- Finance, Politics, and Tech are populated or show an intentional empty state.
- No blank category sections appear because a feed was thin or failed.
- Fallback usage is logged and inspectable.

## Risks
- RSS inconsistency can still create noisy or partial inputs.
- Fallback supplementation can introduce duplicates if dedupe rules drift.
- Additional fetch attempts can increase latency during weak-feed runs.

## Testing Requirements
- Normal case:
  Primary feeds return enough articles without fallback.
- Partial failure:
  Thin category coverage triggers supplemental fallback fetches.
- Primary source failure:
  Fallback feeds recover category coverage when possible.
- Total failure:
  UI shows an intentional empty state instead of blank whitespace.

## Related operational history

- 2026-05-21 — Feed-ingestion resilience hardening (Path-A Task 2, PR [#261](https://github.com/brandonma25/bootupnews/pull/261)).
  - **Per-feed Sentry level alignment.** `src/lib/rss.ts` inner `captureRssFailure` was defaulting to `level: "error"` while the outer ingestion catch in `src/lib/pipeline/ingestion/index.ts` captured the same failure at `level: "warning"`. Aligned both to `warning` so a failed feed yields one advisory Sentry issue, not a duplicate at differing severities. Fixes the duplicate-event surface seen on [BOOT-UP-WEB-5](https://boot-up.sentry.io/issues/BOOT-UP-WEB-5).
  - **France24 tolerant XML parse** ([BOOT-UP-WEB-5](https://boot-up.sentry.io/issues/BOOT-UP-WEB-5)). Added `parseRssXmlWithFallback` in `rss.ts` — a narrow strict-first, lenient-retry strategy gated on the specific sax-js diagnostic "Attribute without value". Other strict failures (truncated XML, missing channel, etc.) keep the fast-path strict rejection so the existing `rss.test.ts` classification suite stays green. Both attempts run inside the same `rss.parse` observability span.
  - **Foreign Affairs browser-shaped UA** ([BOOT-UP-WEB-2](https://boot-up.sentry.io/issues/BOOT-UP-WEB-2)). Replaced the recognizable `Daily-Intelligence-Aggregator/1.0` UA with a Mozilla/5.0 browser-shaped UA plus `Accept: application/rss+xml` and `Accept-Language: en-US,en;q=0.9`. Centralized as `RSS_FETCH_DEFAULT_HEADERS` in `rss.ts` so every feed request carries the same shape. Fallback if 403s persist post-deploy is to mark `source-foreign-affairs` inactive in the manifest (the source is `mvpDefaultAllowed: false`, so dropping it costs the public surface nothing).
  - **Soften the >=5 floor** ([BOOT-UP-WEB-4](https://boot-up.sentry.io/issues/BOOT-UP-WEB-4) root cause). `src/lib/cron/fetch-news.ts` previously threw "Cron run produced N ranked briefing items; at least five are required" whenever feed failures shrank the candidate pool below 5. The cron now hard-errors only at zero staged items; 1–6 items run in a new "degraded" mode that ships what's available with the editorial-staging email subject tagged `[DEGRADED N/7]` and the body noting "below target of 7". `EDITORIAL_TARGET_ITEM_COUNT = 7` is the new single-source-of-truth target.
  - **Source Health summary tooling.** New `scripts/source-health-summary.ts` CLI (`npm run source-health:summary`) queries the Notion Source Health Log database for the last N days and prints a Markdown table plus the top-10 chronic-failures ranking. The first snapshot lives at [`docs/engineering/reports/source-health-summary-2026-05-21.md`](../../engineering/reports/source-health-summary-2026-05-21.md); subsequent reports regenerate from the script.
