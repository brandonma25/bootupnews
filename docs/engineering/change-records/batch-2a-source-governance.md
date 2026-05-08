# Batch 2A Source Governance Update

Date: 2026-04-29

## Change Type

Remediation / controlled source-governance update.

Canonical PRD required: No.

This change stays inside existing PRD-42 source governance, PRD-54 public source manifest, PRD-1 ingestion foundation, PRD-11 ingestion reliability, and PRD-37 Phase 1 pipeline behavior. It adds governed RSS source definitions and metadata only. It does not add source adapters, authenticated access, scraping, ranking threshold changes, WITM threshold changes, public UI behavior, or production data writes.

## Source of Truth

- Batch 2 source expansion planning audit.
- Product position: Boot Up is a curated daily intelligence briefing, not a feed.
- Phase C Track A: workflow mechanics are sufficiently validated for continued controlled operations, but representative editorial usefulness is still blocked by candidate-pool/accessibility constraints.
- Batch 1 controlled dry run: the system already had meaningful source volume, but accessible Core-capable evidence remained too thin.
- PRD-42 Source governance and defaults.
- PRD-54 Public source manifest.
- PRD-1 Daily news ingestion foundation.
- PRD-11 Ingestion reliability fallbacks.
- PRD-37 Phase 1 pipeline.

## Object Level

- Article source metadata and feed availability.
- Signal eligibility evidence inputs.
- No public Surface Placement semantics, Card behavior, stored `signal_posts` rows, editorial status, publish state, ranking thresholds, or WITM thresholds are changed.

## Sources Added

| Source | Runtime source ID | Feed/access URL | Accessibility class | Source role | Core-capable caveat | Context-capable caveat |
| --- | --- | --- | --- | --- | --- | --- |
| Semafor | `source-semafor` | `https://www.semafor.com/rss.xml` | `full_text_available` | `secondary_authoritative` | Maybe, only when event evidence and WITM pass. | Yes when content is relevant. |
| Axios | `source-axios` | `https://www.axios.com/feeds/feed.rss` | `full_text_available` | `secondary_authoritative` | Maybe, only when event evidence and WITM pass. | Yes when content is relevant. |
| 404 Media | `source-404-media` | `https://www.404media.co/rss/` | `full_text_available` | `secondary_authoritative` | Maybe for structurally important tech/platform accountability items. | Yes when content is relevant. |
| Heatmap | `source-heatmap` | `https://heatmap.news/feeds/feed.rss` | `full_text_available` | `secondary_authoritative` | Maybe for structurally important climate/energy/market policy items. | Yes when content is relevant. |
| Guardian World | `source-guardian-world` | `https://www.theguardian.com/world/rss` | `partial_text_available` | `secondary_authoritative` | Maybe only when partial text is substantial enough or corroborated. | Yes when partial text clears context support. |
| PBS NewsHour | `source-pbs-newshour` | `https://www.pbs.org/newshour/feeds/rss/headlines` | `headline_or_abstract_only` | `secondary_authoritative` | No by default; requires enough accessible text or corroboration. | Maybe, depending on accessible text. |
| SEC Press Releases | `source-sec-press-releases` | `https://www.sec.gov/news/pressreleases.rss` | `official_primary_source` | `primary_institutional` | Maybe only for structurally significant releases with enough accessible text or corroboration. | Maybe, depending on release substance. |
| France24 | `source-france24` | `https://www.france24.com/en/rss` | `headline_or_abstract_only` | `secondary_authoritative` | No by default; requires enough accessible text or corroboration. | Maybe, depending on accessible text. |

## Read-Only Feed Verification

Public feed checks were run without credentials, production writes, cron, or pipeline execution. All eight feeds returned HTTP 200 and parseable RSS-shaped item blocks.

| Source | Items observed | Accessible text signal from first 10 items | Runtime decision |
| --- | ---: | ---: | --- |
| Semafor | 241 | average 2376 chars, max 7100 | Add as accessible secondary-authoritative. |
| Axios | 100 | average 4102 chars, max 5743 | Add as accessible secondary-authoritative. |
| 404 Media | 15 | average 5763 chars, max 9553 | Add as accessible secondary-authoritative. |
| Heatmap | 30 | average 7602 chars, max 12368 | Add as accessible secondary-authoritative. |
| Guardian World | 45 | average 850 chars, max 1184 | Add as substantial partial secondary-authoritative. |
| PBS NewsHour | 20 | average 311 chars, max 393 | Add conservatively; thin items are not Core by role alone. |
| SEC Press Releases | 25 | average 252 chars, max 255 | Add as primary institutional; short RSS requires item-level evidence. |
| France24 | 22 | average 312 chars, max 482 | Add conservatively; thin items are not Core by role alone. |

## Implemented Changes

- Added eight Batch 2A sources to `demoSources`.
- Added the eight sources to `PUBLIC_SURFACE_SOURCE_MANIFEST["public.home"]`.
- Added public source governance roles and eligibility metadata.
- Added source-policy tier metadata for 404 Media, Heatmap, Guardian, PBS NewsHour, and France24. Semafor, Axios, and SEC were already classifiable through existing policy hosts.
- Added or updated source-catalog entries with validation notes and Core/Context caveats.
- Kept existing source-accessibility and WITM gates unchanged.

## Explicit Non-Goals

- No publish.
- No cron re-enable.
- No production writes.
- No `draft_only`.
- No ranking threshold changes.
- No WITM threshold changes.
- No Batch 2B or Batch 2C sources.
- No scraping or authenticated/private feed access.
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

Dry-run gate after PR review/merge approval:

```bash
PIPELINE_RUN_MODE=dry_run \
PIPELINE_TARGET_ENV=production \
PIPELINE_CRON_DISABLED_CONFIRMED=true \
BRIEFING_DATE_OVERRIDE=<approved-test-date> \
PIPELINE_TEST_RUN_ID=batch2a-source-governance-dryrun-<timestamp> \
npm run pipeline:controlled-test
```

The dry run must report active/public source counts, contributing source count, raw candidate count, filtered candidate count, Story Cluster count, Core/Context/Depth distribution, WITM pass/fail, source-accessibility mix, category mix, fetch failures, `candidate_pool_insufficient`, and reason. `draft_only` remains blocked until the dry run improves candidate sufficiency and safety checks still pass.

## Risks And Caveats

- Feed drift can change accessibility class after deployment.
- Thin RSS feeds can create false WITM certainty if accessibility gates are weakened later.
- Guardian, Axios, Semafor, and global feeds can add duplicate pressure.
- SEC releases are authoritative but sparse and often too narrow for broad public Core treatment.
- Source expansion does not guarantee more Core Signals; it only improves accessible evidence density for the next dry-run-only validation.
