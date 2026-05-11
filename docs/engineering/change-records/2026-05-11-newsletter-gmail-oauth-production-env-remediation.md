# Newsletter Gmail OAuth Production Env Remediation

Date: 2026-05-11

Change type: remediation / production environment correction

Canonical PRD required: no. PRD-61 remains the canonical feature source of truth.

Branch: `docs/pr215-newsletter-runtime-record`

Related PR: [PR #215](https://github.com/brandonma25/daily-intelligence-aggregator/pull/215)

## Source Of Truth

- PRD-61: `docs/product/prd/prd-61-newsletter-ingestion-story-clusters-and-historical-signal-snapshot-foundation.md`
- Runtime implementation note: `docs/engineering/change-records/2026-05-10-newsletter-ingestion-runtime-phase1.md`
- Merge readiness record: `docs/operations/controlled-cycles/2026-05-11-prd-61-newsletter-runtime-merge-readiness-record.md`
- Operations runbook: `docs/operations/newsletter-ingestion-cron-runbook.md`
- PR #215 merge commit: `46a89d9fe9f75645ebe8476ffa4fcbf7eb1a3b6d`

## Scope

This remediation records the Gmail OAuth production environment correction after PRD-61 Phase 1 runtime infrastructure merged.

The correction aligned the deployed Gmail OAuth env values to the intended Google OAuth Playground Web application client named `Boot Up Newsletter Ingestion OAuth Playground`.

This record does not modify code, database schema, source manifests, ranking, WITM thresholds, cron schedules, public UI, or publish behavior.

Object levels:
- Article: newsletter-derived Article extraction infrastructure remains deployed but was not run.
- Surface Placement: non-live `signal_posts` review-candidate infrastructure remains deployed but was not run in write mode.
- No Article, Story Cluster, Signal, Card, or Surface Placement data was changed.

## Root Cause

The local newsletter env was found to contain a Gmail OAuth client ID that did not match the intended Google OAuth client for the generated refresh token.

Google Cloud Console contained multiple OAuth clients:
- intended Web application client: `Boot Up Newsletter Ingestion OAuth Playground`, client ID prefix `436125987705-cvkj...`
- separate Desktop client: `Boot Up Email Ingest`, client ID prefix `436125987705-0rt1...`
- older Web application client: `Daily Intelligence Aggregator Web`, client ID prefix `436125987705-dub1...`

The remediation standard is that `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` must all come from the same intended OAuth client flow. Mixing a Desktop client ID with a Web client secret, or using the older Daily Intelligence client, causes OAuth validation failure.

## Production Environment Changes

Vercel Production env values were updated for project `brandonma25s-projects/bootup` without printing secret values:

| Env var | Production state after remediation |
| --- | --- |
| `GMAIL_CLIENT_ID` | updated to intended OAuth Playground Web client |
| `GMAIL_CLIENT_SECRET` | updated from the same OAuth Playground Web client |
| `GMAIL_REFRESH_TOKEN` | updated from OAuth Playground using the same Web client |
| `NEWSLETTER_INGESTION_ENABLED` | `true` |
| `NEWSLETTER_INGESTION_DRY_RUN` | `true` |
| `NEWSLETTER_INGESTION_SINCE_HOURS` | `48` |

Secret values are intentionally excluded from this repo record.

Vercel marks sensitive env values as protected, so a later env pull cannot prove the raw production value. The evidence retained here is the successful local OAuth validation before upload, the Vercel production env registry update, and the production redeploy using the updated env set.

## Redeploy Evidence

Production was redeployed after the environment correction so the current deployment reads the corrected Production env values.

| Item | Result |
| --- | --- |
| Vercel deployment id | `dpl_6zgYPX2hz12KHCswxGPevmSazmCA` |
| Deployment URL | `https://bootup-mhke8wzpj-brandonma25s-projects.vercel.app` |
| Target | Production |
| Status | Ready |
| Created | `2026-05-11 20:27:59 GMT+0800` |
| Primary alias | `https://bootupnews.vercel.app` |

## Safety Boundaries

The remediation did not run:
- newsletter ingestion runner
- RSS pipeline
- `draft_only`
- publish path
- production cron
- database writes to `newsletter_emails`
- database writes to `newsletter_story_extractions`
- database writes to `signal_posts`

The production gate remained dry-run only:

```text
NEWSLETTER_INGESTION_DRY_RUN=true
```

## Remaining Work

OAuth and Gmail API access are unblocked. The next step is a separate controlled dry-run validation using the PRD-61 runbook. That dry run must remain `NEWSLETTER_INGESTION_DRY_RUN=true` and must not write newsletter rows, extraction rows, `signal_posts`, WITM, or published content.
