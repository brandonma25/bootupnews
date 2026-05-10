# Newsletter Ingestion Cron Runbook

Source of truth: PRD-61

Cron route: `/api/cron/newsletter-ingestion`

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
- Gmail messages are fetched from the label.
- Candidate story count is reported.
- No `newsletter_emails` rows are inserted.
- No `newsletter_story_extractions` rows are inserted.
- No `signal_posts` rows are inserted.
- No WITM is generated.
- Nothing is published.

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

## Enable Production Cron After Approval

Do this only after PR review, dry-run validation, and BM approval.

1. Add a Vercel cron schedule for `/api/cron/newsletter-ingestion`.
2. Use 6 AM Taipei daily: `22:00 UTC`, schedule `0 22 * * *`.
3. Configure production env:
   - `NEWSLETTER_INGESTION_ENABLED=true`
   - `NEWSLETTER_INGESTION_DRY_RUN=false`
   - `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=true`
   - Gmail OAuth env vars
   - Supabase service-role env vars
   - `CRON_SECRET`
4. Confirm the first production run only creates non-live review candidates.

This PR does not add the production Vercel cron schedule.

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
