# Newsletter Ingestion Cron Runbook

Source of truth: PRD-61

Cron routes:
- Scheduled combined route: `/api/cron/fetch-editorial-inputs`
- Newsletter-only diagnostic route: `/api/cron/newsletter-ingestion`

Default state: disabled and dry-run.

## Required Env Vars

Gmail:
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_NEWSLETTER_LABEL=boot-up-benchmark`

Runtime gates:
- `NEWSLETTER_INGESTION_ENABLED=false` by default
- `NEWSLETTER_INGESTION_DRY_RUN=true` by default
- `NEWSLETTER_INGESTION_MAX_EMAILS_PER_RUN=10`
- `NEWSLETTER_INGESTION_SINCE_HOURS=36`
- `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=false` by default

Platform:
- `CRON_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not store real OAuth values in repo files.

## Run Dry-Run Locally

Use dry-run first:

```bash
NEWSLETTER_INGESTION_ENABLED=true \
NEWSLETTER_INGESTION_DRY_RUN=true \
GMAIL_NEWSLETTER_LABEL=boot-up-benchmark \
npx tsx scripts/newsletter-ingestion-controlled-run.ts
```

Expected:
- Gmail OAuth refresh succeeds.
- Exact Gmail label `boot-up-benchmark` is visible to the same token used by the runner.
- Gmail messages are fetched from the label.
- Candidate story count is reported.
- No `newsletter_emails` rows are inserted.
- No `newsletter_story_extractions` rows are inserted.
- No `signal_posts` rows are inserted.
- No WITM is generated.
- Nothing is published.

## Run Label-Verified Dry-Run Report Locally

Use this report before authorizing writes. It reuses the PRD-61 REST OAuth backend path and does not depend on Gmail MCP, Chrome, or browser state.

If credentials are stored in a local env file, load them without printing values:

```bash
set -a
source .env.newsletter.local
set +a
NEWSLETTER_INGESTION_ENABLED=true \
NEWSLETTER_INGESTION_DRY_RUN=true \
NEWSLETTER_INGESTION_SINCE_HOURS=48 \
GMAIL_NEWSLETTER_LABEL=boot-up-benchmark \
npx tsx scripts/newsletter-ingestion-dry-run-report.ts
```

Expected report sections:
- Gmail OAuth and exact-label preflight status.
- Sanitized email inventory: sender, subject, and received timestamp only.
- Story extraction totals and 3-5 sample headlines per newsletter.
- Source URL quality counts.
- Finance / Tech / Politics category distribution.
- Read-only promotion preview with eligible candidate titles and source URLs.
- Dedup skips for invalid URLs, duplicate public rows, and exhausted candidate ranks.

The report must not include Gmail message IDs, thread IDs, raw email content, snippets, credentials, refresh tokens, or client secrets. It must not insert or update `newsletter_emails`, `newsletter_story_extractions`, or `signal_posts`.

## Run Controlled Non-Production Ingestion

Use only in local, preview, or staging after dry-run:

```bash
NEWSLETTER_INGESTION_ENABLED=true \
NEWSLETTER_INGESTION_DRY_RUN=false \
NEWSLETTER_INGESTION_TARGET_ENV=preview \
GMAIL_NEWSLETTER_LABEL=boot-up-benchmark \
npx tsx scripts/newsletter-ingestion-controlled-run.ts
```

Expected writes:
- `newsletter_emails`
- `newsletter_story_extractions`
- optional non-live `signal_posts` candidates

Expected candidate state:
- `editorial_status = 'needs_review'`
- `is_live = false`
- `published_at is null`
- `final_slate_rank is null`
- `final_slate_tier is null`
- WITM fields remain blank or human-required

## Run Controlled Production Write Validation After Approval

Use only after BM explicitly approves a controlled write validation. This is not the cron path and must not run RSS, `draft_only`, publish, or public-surface publication workflows.

Required pre-flight:
- Confirm `NEWSLETTER_INGESTION_DRY_RUN=false` is intentional for this one run.
- Confirm `NEWSLETTER_INGESTION_ENABLED=true`.
- Confirm `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=true`.
- Confirm Gmail env vars are present without printing values.
- Confirm pre-counts for `newsletter_emails`, `newsletter_story_extractions`, and `signal_posts`.
- Confirm the exact Gmail label `boot-up-benchmark` is visible in dry-run mode first.

Command shape:

```bash
set -a
source .env.newsletter.local
set +a
NEWSLETTER_INGESTION_ENABLED=true \
NEWSLETTER_INGESTION_DRY_RUN=false \
NEWSLETTER_INGESTION_TARGET_ENV=production \
ALLOW_PRODUCTION_NEWSLETTER_INGESTION=true \
NEWSLETTER_INGESTION_SINCE_HOURS=48 \
GMAIL_NEWSLETTER_LABEL=boot-up-benchmark \
npx tsx scripts/newsletter-ingestion-controlled-run.ts
```

Expected write behavior:
- Stores new `newsletter_emails` rows idempotently by Gmail message id.
- Stores conservative `newsletter_story_extractions` Article candidates.
- Creates only non-live `signal_posts` review candidates.
- Leaves `editorial_status = 'needs_review'`.
- Leaves `is_live = false`.
- Leaves `published_at is null`.
- Does not assign final slate placement.
- Does not publish anything.

Required post-flight:
- Confirm row-count changes match the runner summary.
- Confirm `/` still returns HTTP 200 and shows the existing public slate.
- Confirm `/signals` still returns HTTP 200 and excludes non-live newsletter candidates.
- Delete `.env.newsletter.local`.
- Delete any local OAuth capture file.
- Stop any local OAuth callback listener.
- Remove temporary local OAuth redirect URIs from the Google Cloud OAuth client when no longer needed.

2026-05-11 controlled validation result:
- Dry-run pre-counts: `newsletter_emails = 0`, `newsletter_story_extractions = 0`, `signal_posts = 68`.
- Dry-run fetched `3` labeled emails, extracted `24` Article candidates, identified `5` eligible promotion candidates, and performed zero writes.
- BM-authorized controlled write stored `3` newsletter emails, stored `24` story extractions, and created `5` non-live review candidates.
- Post-write counts: `newsletter_emails = 3`, `newsletter_story_extractions = 24`, `signal_posts = 73`.
- Public surface remained gated: `/` HTTP 200 with the May 6 slate, `/signals` HTTP 200, latest public renderable Signal count `3`.
- Local secret files and OAuth capture files were deleted after validation.

2026-05-12 production Gmail token remediation result:
- Production Gmail OAuth was regenerated from the Gmail account that exposes exact label `boot-up-benchmark`.
- Vercel Production `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` were realigned to the same OAuth Playground Web application client without recording secret values.
- Production redeploy reached `READY`.
- Protected newsletter route returned HTTP `200` with `fetchedMessageCount=3`, `existingEmailCount=3`, `storedEmailCount=0`, `extractedStoryCount=0`, `promotedCandidateCount=0`, and `failedEmailCount=0`.
- Protected combined editorial-input route returned HTTP `200`; RSS reported the daily Signal snapshot already existed, and newsletter ingestion remained successful and idempotent.
- Public surface remained gated: `/` HTTP 200 with the May 6 slate, `/signals` HTTP 200 with `3` published Signals.

## Enable Production Cron After Approval

Do this only after PR review, dry-run validation, and BM approval.

1. Add Vercel cron schedules for `/api/cron/fetch-editorial-inputs`.
2. Use the approved Taipei evening fetch windows:
   - 6:15 PM Taipei = `10:15 UTC`, schedule `15 10 * * *`
   - 7:45 PM Taipei = `11:45 UTC`, schedule `45 11 * * *`
3. Configure production env:
   - `NEWSLETTER_INGESTION_ENABLED=true`
   - `NEWSLETTER_INGESTION_DRY_RUN=false`
   - `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=true`
   - Gmail OAuth env vars
   - Supabase service-role env vars
   - `CRON_SECRET`
4. Confirm the first production run only creates non-live review candidates.

The combined cron route runs RSS first, then newsletter ingestion with `writeCandidates: true`. Newsletter writes remain fail-closed unless the production env gates above are set.

## Disable Immediately

Use any one of these:
- Set `NEWSLETTER_INGESTION_ENABLED=false`.
- Set `NEWSLETTER_INGESTION_DRY_RUN=true`.
- Remove `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=true` in production.
- Rotate or unset `CRON_SECRET` to reject cron route calls.

## Inspect Internal Tables

Use read-only database inspection.

Newsletter emails:

```sql
select id, gmail_message_id, gmail_thread_id, sender, subject, received_at, extraction_status, processed_at
from public.newsletter_emails
order by received_at desc
limit 20;
```

Story extractions:

```sql
select id, newsletter_email_id, headline, source_url, source_domain, category, extraction_confidence, signal_post_id
from public.newsletter_story_extractions
order by extracted_at desc
limit 50;
```

Do not print or paste `newsletter_emails.raw_content` into PRs, docs, logs, or chat.

## Confirm No Public Leakage

Code checks:
- Public `signal_posts` selects must not include `context_material`.
- Public routes must not query `newsletter_emails` or `newsletter_story_extractions`.
- Public signal queries must require:
  - `is_live = true`
  - `editorial_status = 'published'`
  - `published_at is not null`

Runtime checks:
- Homepage should not render newsletter snippets.
- `/signals` should not render newsletter snippets.
- `/briefing/<date>` should not render newsletter snippets.
- Non-live newsletter candidates should remain absent from public pages.

## Failure Modes And Response

Gmail auth failure:
- Expected response: fail closed before writes.
- Check Gmail OAuth env values in deployment secrets.

Gmail label missing/account mismatch:
- Expected response: fail closed before message search and before writes.
- Regenerate the refresh token from the Gmail account that contains the exact `boot-up-benchmark` label.
- Do not diagnose by printing account email, tokens, message IDs, raw content, or snippets.

Gmail rate limit:
- Expected response: retry safely, then fail closed if still rate-limited.
- Do not increase frequency without approval.

Missing env:
- Expected response: stop before Gmail API calls or writes.
- Configure only the missing env values; do not paste secrets into docs or chat.

Parser failure for one email:
- Expected response: mark that email `failed` if write mode already stored it, then continue with other emails only when safe.
- Inspect `extraction_error` without printing raw content.

Database failure:
- Expected response: no publish, no live rows, sanitized failure summary.
- Disable ingestion before retrying if the failure mode is unclear.

Unexpected candidate quality:
- Disable writes.
- Keep extracted newsletter records internal.
- BM can ignore or remove non-live candidates through an explicit approved follow-up.
