# Batch 2B Finance Source Governance Update

Date: 2026-04-29

## Change Type

Remediation / controlled source-governance update.

Canonical PRD required: No.

This change stays inside existing PRD-42 source governance and PRD-54 public source manifest governance. It adds governed public RSS source definitions, institutional source roles, source-policy host classification, catalog notes, and regression coverage only. It does not add source adapters, scraping, authenticated or private feed access, ranking threshold changes, WITM threshold changes, schema changes, public behavior changes, cron, publishing, `draft_only`, or production data writes.

## Source Of Truth

- Batch 2A dry-run result for 2026-04-29.
- Batch 2A slate-readiness diagnostic.
- Batch 2B Finance/Core-capable source-governance planning audit.
- Product position: Boot Up is a curated Top 5 Core plus Next 2 Context briefing, not a feed.
- PRD-42 Source Governance and Defaults.
- PRD-54 Public Source Manifest.

## Object Level

- Article source metadata and feed availability.
- Signal eligibility evidence inputs.
- No public Surface Placement semantics, Card behavior, stored `signal_posts` rows, editorial status, publish state, ranking thresholds, or WITM thresholds are changed.

## Sources Added

| Source | Runtime source ID | Feed URL | Host | Accessibility class | Source role | Core-capable caveat | Context-capable caveat |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Liberty Street Economics | `source-liberty-street-economics` | `https://libertystreeteconomics.newyorkfed.org/feed/` | `libertystreeteconomics.newyorkfed.org` | `full_text_available` | `primary_institutional` | Yes, item-specific only. | Yes when relevant. |
| FRED Blog | `source-fred-blog` | `https://fredblog.stlouisfed.org/feed/` | `fredblog.stlouisfed.org` | `full_text_available` | `primary_institutional` | Conditional on structural importance. | Yes when relevant. |
| Federal Reserve FEDS Notes | `source-fed-feds-notes` | `https://www.federalreserve.gov/feeds/feds_notes.xml` | `federalreserve.gov` | `partial_text_available` | `primary_institutional` | Conditional only when summary/body is substantial or corroborated. | Yes when excerpt is substantial enough. |
| SF Fed Research and Insights | `source-sf-fed-research-insights` | `https://www.frbsf.org/feed/` | `frbsf.org` | `full_text_available` | `primary_institutional` | Conditional; broad feed requires item-level relevance. | Yes when relevant. |
| St. Louis Fed On the Economy | `source-stlouisfed-on-the-economy` | `https://www.stlouisfed.org/rss/page%20resources/publications/blog-entries` | `stlouisfed.org` | `partial_text_available` thin excerpt | `primary_institutional` | No by default; not a Core fix by itself. | Maybe with corroboration or stronger accessible text. |

## Read-Only Feed Verification

Public feed checks were run without credentials, production writes, cron, pipeline execution, `draft_only`, or publishing. All five feeds returned HTTP 200 and parseable RSS-shaped item blocks.

| Source | Items observed | Accessible text signal from first 10 items | Runtime decision |
| --- | ---: | ---: | --- |
| Liberty Street Economics | 100 | average 12898 chars, min 8076, max 31864 | Add as full-text primary institutional source. |
| FRED Blog | 10 | average 2518 chars, min 1726, max 4037 | Add as full-text primary institutional source. |
| Federal Reserve FEDS Notes | 15 | average 386 chars, min 265, max 905 | Add conservatively; excerpt-length evidence is not automatically Core. |
| SF Fed Research and Insights | 10 | average 5242 chars, min 1072, max 8433 | Add as full-text primary institutional source with broad-feed caveat. |
| St. Louis Fed On the Economy | 50 | average 158 chars, min 139, max 191 | Add as thin official support; non-Core by default. |

## Implemented Changes

- Added five Batch 2B Finance sources to `demoSources`.
- Added the five sources to `PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"]`.
- Added public source governance roles and eligibility metadata.
- Added source-policy tier metadata for New York Fed, St. Louis Fed, and SF Fed hosts.
- Added source-catalog entries with validation notes and Core/Context caveats.
- Added regression tests for manifest ordering, catalog governance, source policy, defaults, ingestion metadata, and source-accessibility behavior.
- Kept existing source-accessibility, ranking, and WITM gates unchanged.

## Explicit Non-Goals

- No publish.
- No cron re-enable.
- No production writes.
- No `draft_only`.
- No ranking threshold changes.
- No WITM threshold changes.
- No Batch 2C sources.
- No IMF, Calculated Risk, Marketplace, Financial Times, Reuters/AP direct, or paywalled/private/authenticated feeds.
- No scraping or unofficial feed generators.
- No new source adapters.
- No public UI work.
- No editorial-quality conclusion.

## Validation Plan

Required local validation:

- `git diff --check`
- `npm run lint`
- `npm run test -- src/lib/source-manifest.test.ts src/lib/source-catalog.test.ts src/lib/source-policy.test.ts src/lib/source-defaults.test.ts src/lib/source-accessibility.test.ts src/lib/signal-selection-eligibility.accessibility.test.ts src/lib/pipeline/ingestion/index.test.ts src/lib/pipeline/controlled-execution.test.ts`
- `npm run build`
- `npm run test`, if practical.
- Governance/source coverage checks used for Batch 2A, if practical.

Dry-run gate after PR review and merge/deploy approval only:

```bash
PIPELINE_RUN_MODE=dry_run \
PIPELINE_TARGET_ENV=production \
PIPELINE_CRON_DISABLED_CONFIRMED=true \
BRIEFING_DATE_OVERRIDE=<approved-test-date> \
PIPELINE_TEST_RUN_ID=batch2b-finance-source-governance-dryrun-<timestamp> \
npm run pipeline:controlled-test
```

The dry run must report active/public source counts, contributing source count, raw candidate count, filtered candidate count, Story Cluster count, Core/Context/Depth distribution, WITM pass/fail, source-accessibility mix, category mix, fetch failures, `candidate_pool_insufficient`, and reason. `draft_only` remains blocked until dry-run evidence supports it.

## Risks And Caveats

- Feed drift can change item-level accessibility after deployment.
- FEDS Notes and St. Louis Fed On the Economy are official but excerpt-limited; they must not be treated as automatic Core evidence.
- SF Fed is a broad site feed; category relevance must remain item-specific.
- More accessible Finance evidence does not validate representative editorial quality by itself.
- This source-governance update improves the candidate supply path but does not guarantee 5 Core plus 2 Context.
