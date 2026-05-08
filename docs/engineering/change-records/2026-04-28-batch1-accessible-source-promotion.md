# Batch 1 Accessible Source Promotion

Date: 2026-04-28

## Change Type

Remediation / alignment.

Canonical PRD required: No.

This change is governed by PRD-42 Source governance and defaults and PRD-54 Public source manifest. It adds a small validated source batch to the governed public manifest and source catalog, without adding a source-management UI, homepage snapshot schema, card-level editorial authority, ranking-weight changes, or public publish behavior.

## Source of Truth

- Product Position: Boot Up is a curated briefing, not a feed.
- Product Position: Top 5 Core Signals require structural importance and explicit why-it-matters reasoning.
- Product Position: no trending-only content, no false freshness, and every Signal must answer why it matters structurally.
- PRD-11 Ingestion reliability fallbacks.
- PRD-13 Signal filtering layer.
- PRD-35 Why-it-matters quality framework.
- PRD-42 Source governance and defaults.
- PRD-54 Public source manifest.
- PR #127 signal-selection eligibility remediation.
- PR #128 public manifest source path remediation.
- PR #129 source accessibility predicate remediation.
- Accepted Source Intelligence Report for Batch 1 candidates.

## Object Level

- Article source metadata and feed availability.
- Signal eligibility evidence inputs.
- Public surface placement, ranking weights, editorial publishing, and stored production `signal_posts` rows are unchanged.

## Feed Validation Summary

Read-only validation was performed before promotion. The promoted feeds returned HTTP 200, parsed as RSS, and returned at least one useful item. Most public RSS feeds expose short abstracts rather than full article bodies, so PR #129 content-accessibility predicates continue to prevent source brand alone from supplying Core authority.

| Source | Feed | Validation result | Runtime decision |
| --- | --- | --- | --- |
| NPR Business | `https://feeds.npr.org/1006/rss.xml` | HTTP 200, RSS parsed, 10 items, abstract-only | Promoted as tier2 secondary-authoritative |
| NPR Economy | `https://feeds.npr.org/1017/rss.xml` | HTTP 200, RSS parsed, 10 items, abstract-only | Promoted as tier2 secondary-authoritative |
| Federal Reserve All Press | `https://www.federalreserve.gov/feeds/press_all.xml` | HTTP 200, RSS parsed, 20 items, abstract-only primary releases | Promoted as tier1 primary-institutional |
| Federal Reserve Monetary Policy | `https://www.federalreserve.gov/feeds/press_monetary.xml` | HTTP 200, RSS parsed, 15 items, abstract-only primary releases | Promoted as tier1 primary-institutional |
| BLS Principal Federal Economic Indicators | `https://www.bls.gov/feed/bls_latest.rss` | HTTP 200, RSS parsed, 1 item, substantial abstract | Promoted as tier1 primary-institutional |
| BLS CPI | `https://www.bls.gov/feed/cpi.rss` | HTTP 200, RSS parsed, 12 items, abstract-only | Promoted as tier1 primary-institutional |
| BLS Employment Situation | `https://www.bls.gov/feed/empsit.rss` | HTTP 200, RSS parsed, 12 items, abstract-only | Promoted as tier1 primary-institutional |
| CNBC Business | `https://www.cnbc.com/id/10001147/device/rss/rss.html` | HTTP 200, RSS parsed, 30 items, abstract-only | Promoted as tier2 secondary-authoritative |
| CNBC Economy | `https://www.cnbc.com/id/20910258/device/rss/rss.html` | HTTP 200, RSS parsed, 30 items, abstract-only | Promoted as tier2 secondary-authoritative |
| CNBC Finance | `https://www.cnbc.com/id/10000664/device/rss/rss.html` | HTTP 200, RSS parsed, 30 items, abstract-only | Promoted as tier2 secondary-authoritative |
| MarketWatch Top Stories | `https://feeds.content.dowjones.io/public/rss/mw_topstories` | HTTP 200, RSS parsed, 10 items, abstract-only | Promoted as tier2 corroboration-only |
| NPR World | `https://feeds.npr.org/1004/rss.xml` | HTTP 200, RSS parsed, 10 items, abstract-only | Promoted as tier2 secondary-authoritative |
| NPR Politics | `https://feeds.npr.org/1014/rss.xml` | HTTP 200, RSS parsed, 10 items, abstract-only | Promoted as tier2 secondary-authoritative |
| ProPublica Main | `https://www.propublica.org/feeds/propublica/main` | HTTP 200, RSS parsed, 20 items, abstract-only | Promoted as tier1 primary-authoritative |
| CNBC Politics | `https://www.cnbc.com/id/10000113/device/rss/rss.html` | HTTP 200, RSS parsed, 30 items, abstract-only | Promoted as tier2 secondary-authoritative |

## Blocked Or Deferred Sources

| Source | Reason |
| --- | --- |
| NPR Top Stories | Deferred as broad duplicate pressure; category-specific NPR feeds were used instead. |
| NPR Technology | Deferred to avoid widening this finance/institution source remediation into more technology supply. |
| ProPublica Politics | Candidate URL returned 404. |
| ProPublica Technology | Candidate URL returned 404. |
| BLS supplied broad news release URL | `https://www.bls.gov/feed/news_release/rss.xml` returned 404; official BLS per-release feeds were used instead. |
| Treasury | Official press page is HTML and supplied RSS candidates returned 404/503 or failed parsing; no stable official RSS was promoted. |
| CNBC Top News | Deferred as broad duplicate pressure. |
| CNBC Technology | Deferred to avoid widening this finance/institution source remediation into more technology supply. |
| MarketWatch Market Pulse | Parsed but exposed metadata-only items; not promoted. |
| Reuters/AP unofficial feeds or scrapers | Not used. |
| TLDR | Remains paused and non-public; not promoted as public Core authority. |

## Implemented Changes

- Added validated Batch 1 source definitions to `demoSources`.
- Expanded `PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"]` with the promoted feeds.
- Added public source governance metadata for source roles and public eligibility.
- Added source-policy tier metadata for NPR, CNBC, ProPublica, and BLS while preserving Fed/Treasury tier1 institutional treatment.
- Updated MarketWatch to the validated public Dow Jones RSS endpoint and marked it `corroboration_only`.
- Added catalog entries for promoted sources with notes documenting abstract-only accessibility and continued PRD-13/PR #129 gating.
- Left Reuters Business cataloged and unchanged; while its RSS endpoint is exhausted, it contributes zero Core authority through PR #129 diagnostics.
- Left TLDR paused and outside public source attribution.

## Safety Invariants

- No production data writes.
- No `draft_only` run.
- No cron run or re-enable.
- No change to cleaned April 26 public content.
- No ranking-weight changes.
- No homepage snapshot schema.
- No card-level editorial authority implementation.
- No broad paywalled or unofficial source expansion.

## Validation Plan

Required local validation:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run governance:coverage`
- `npm run governance:audit`
- `npm run governance:hotspots`
- `python3 scripts/validate-feature-system-csv.py`
- `python3 scripts/release-governance-gate.py`
- Chromium E2E
- WebKit E2E

Post-implementation controlled validation must run only `PIPELINE_RUN_MODE=dry_run` with production write guards disabled. `draft_only` remains paused until explicitly approved.

## Validation Results

- `npm run lint`: passed.
- `npm run test`: passed, 72 files / 466 tests.
- `npm run build`: passed.
- `npm run governance:coverage`: passed.
- `npm run governance:audit`: passed.
- `npm run governance:hotspots`: passed.
- `python3 scripts/validate-feature-system-csv.py`: passed, with existing slug warnings unrelated to this branch.
- `python3 scripts/release-governance-gate.py`: passed.
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npx playwright test --project=chromium --workers=1`: passed, 33 tests.
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npx playwright test --project=webkit --workers=1`: passed, 33 tests.

## Controlled Dry Run Result

Command:

```bash
PIPELINE_RUN_MODE=dry_run \
PIPELINE_TARGET_ENV=production \
PIPELINE_CRON_DISABLED_CONFIRMED=true \
BRIEFING_DATE_OVERRIDE=2026-04-28 \
PIPELINE_TEST_RUN_ID=batch1-accessible-sources-dryrun-20260428T024847Z \
npm run pipeline:controlled-test
```

Environment flags:

- `PIPELINE_RUN_MODE=dry_run`
- `PIPELINE_TARGET_ENV=production`
- `PIPELINE_CRON_DISABLED_CONFIRMED=true`
- `BRIEFING_DATE_OVERRIDE=2026-04-28`
- `ALLOW_PRODUCTION_PIPELINE_TEST` was not set.

Result:

- Source plan: `public_manifest`.
- Manifest source count: 26.
- Active source count: 26.
- Added active sources versus the post-PR129 plan: 15.
- Ingested article candidates after source fetch: 145 raw / 61 after PRD-13 filtering.
- Story clusters evaluated: 49.
- Candidate count: 49.
- Core eligible count: 0.
- Context count: 1.
- Depth count: 10.
- Excluded candidate count: 122.
- `candidate_pool_insufficient`: true.
- `candidate_pool_insufficient_reason`: `mixed`.
- `sourceScarcityLikely`: false.
- `sourceAccessibilityLikely`: true.
- Category distribution: 23 Tech / 16 Finance / 10 Politics.
- Functional coverage:
  - Tech: 4 active, 3 Core-capable, 3 Context-capable, 4 Depth-capable.
  - Finance: 13 active, 1 Core-capable, 1 Context-capable, 9 Depth-capable, 1 failed.
  - World: 9 active, 3 Core-capable, 3 Context-capable, 8 Depth-capable.
- Reuters Business remained `rss_retry_exhausted` and contributed zero Core authority.
- Financial Times remained paywall/thin and did not supply Core authority alone.
- Why-it-matters validation across generated public-candidate reports: 8 passed / 41 require human rewrite.
- `insertedCount`: 0.
- `insertedPostIds`: empty.
- Local artifact path: `.pipeline-runs/controlled-pipeline-dry_run-batch1-accessible-sources-dryrun-20260428T024847Z-2026-04-28T02-48-53-594Z.json`.

Write verification:

- The controlled runner returned `persistence: null`.
- The controlled runner printed `insertedCount: 0` and `insertedPostIds: []`.
- The pipeline logged `Pipeline article candidate persistence skipped by run mode`.
- Supabase row-count snapshots were not available in this isolated worktree because production Supabase credentials were not present locally and no credentials were pulled.
