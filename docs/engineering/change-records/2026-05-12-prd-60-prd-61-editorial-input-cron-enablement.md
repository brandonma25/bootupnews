# PRD-60 / PRD-61 Editorial Input Cron Enablement

## Summary

BM approved enabling the evening fetch cron for established RSS sources and the Gmail newsletter label used by PRD-61. This change adds a single protected combined Vercel cron route and schedules it twice per day:

| Taipei time | UTC cron | Route |
| --- | --- | --- |
| 6:15 PM | `15 10 * * *` | `/api/cron/fetch-editorial-inputs` |
| 7:45 PM | `45 11 * * *` | `/api/cron/fetch-editorial-inputs` |

## Change

- Added `/api/cron/fetch-editorial-inputs`.
- The route requires `Authorization: Bearer <CRON_SECRET>`.
- The route runs the existing RSS fetch path first.
- The route then runs PRD-61 newsletter ingestion with `writeCandidates: true`.
- `vercel.json` schedules the combined route twice daily.
- Existing RSS-only and newsletter-only cron routes remain available as protected diagnostic routes.

## Governance Notes

- Canonical PRD references:
  - `docs/product/prd/prd-60-daily-6pm-taiwan-news-cron.md`
  - `docs/product/prd/prd-61-newsletter-ingestion-story-clusters-and-historical-signal-snapshot-foundation.md`
- `docs/product/feature-system.csv` was updated because PRD-60 moved from prior in-review scheduling work to the approved combined fetch cron.
- No new PRD was created because this is operational enablement for existing PRD-60 and PRD-61 runtime paths.
- No tracker-sync artifact was created.

## Safety Notes

- No production cron route was executed during implementation.
- No RSS pipeline, newsletter ingestion runner, `draft_only`, publish path, direct SQL mutation, or production database write was run from this branch.
- No secrets, Gmail message IDs, raw email content, snippets, or context material were committed.
- Vercel Production env names were inspected without values. `ALLOW_PRODUCTION_NEWSLETTER_INGESTION` was not listed and must be added before newsletter production writes are enabled.

## Validation

See `docs/engineering/testing/2026-05-12-prd-60-prd-61-fetch-cron-enablement.md`.
