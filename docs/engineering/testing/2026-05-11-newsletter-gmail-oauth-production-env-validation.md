# Newsletter Gmail OAuth Production Env Validation

Date: 2026-05-11

Validation type: OAuth credential correction and production environment redeploy record

Related change record: `docs/engineering/change-records/2026-05-11-newsletter-gmail-oauth-production-env-remediation.md`

Related PR: [PR #215](https://github.com/brandonma25/daily-intelligence-aggregator/pull/215)

## Purpose

This record captures the safe validation performed after correcting the Gmail OAuth client pairing for PRD-61 Phase 1 newsletter ingestion runtime setup.

It intentionally stops before newsletter ingestion. It is not a dry-run ingestion result.

## Credential Pairing Validated

The intended Google OAuth client was confirmed as the Web application client named `Boot Up Newsletter Ingestion OAuth Playground`, with client ID prefix `436125987705-cvkj...`.

The Desktop client named `Boot Up Email Ingest` and the older Web application client named `Daily Intelligence Aggregator Web` were not used for the final production env correction.

The OAuth values were handled as secrets:
- OAuth client secret value was not committed.
- Gmail refresh token value was not committed.
- Raw OAuth response bodies were not recorded in repo docs.
- Raw email bodies, snippets, message ids, and context material were not printed or recorded.

## Local Validation Evidence

Local env shape and Gmail API validation completed before Production env upload:

| Check | Result |
| --- | --- |
| `NEWSLETTER_INGESTION_ENABLED` | `true` |
| `NEWSLETTER_INGESTION_DRY_RUN` | `true` |
| `NEWSLETTER_INGESTION_SINCE_HOURS` | `48` |
| `GMAIL_CLIENT_ID` shape | superficially OK |
| OAuth client identity | intended OAuth Playground Web client |
| OAuth refresh-token exchange | OK |
| Gmail API labels endpoint | OK |

No newsletter ingestion runner was executed during this validation.

## Production Env And Redeploy Evidence

The following Production env variables were updated or confirmed through Vercel without printing values:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `NEWSLETTER_INGESTION_ENABLED`
- `NEWSLETTER_INGESTION_DRY_RUN`
- `NEWSLETTER_INGESTION_SINCE_HOURS`

Production redeploy completed after the env correction:

| Item | Result |
| --- | --- |
| Vercel deployment id | `dpl_6zgYPX2hz12KHCswxGPevmSazmCA` |
| Deployment URL | `https://bootup-mhke8wzpj-brandonma25s-projects.vercel.app` |
| Target | Production |
| Status | Ready |
| Primary production alias | `https://bootupnews.vercel.app` |

Vercel protected sensitive env values on pull, so raw Production credential value equality was not re-read from Vercel. This is expected for sensitive variables.

## Explicit Non-Validation

This validation did not prove newsletter ingestion runtime behavior, parser quality, candidate quality, database persistence, cron execution, or production write behavior.

Not run:
- `scripts/newsletter-ingestion-controlled-run.ts`
- `/api/cron/newsletter-ingestion`
- RSS pipeline
- `draft_only`
- publish path
- production cron
- write-mode newsletter ingestion

No writes were performed to:
- `newsletter_emails`
- `newsletter_story_extractions`
- `signal_posts`

## Next Safe Validation Step

Run the PRD-61 controlled newsletter dry-run separately with:

```text
NEWSLETTER_INGESTION_ENABLED=true
NEWSLETTER_INGESTION_DRY_RUN=true
NEWSLETTER_INGESTION_SINCE_HOURS=48
```

The expected result of that future dry run is a sanitized count summary only, with no database writes, no raw email content, no snippets, no message ids, no WITM generation, and no publishing.
