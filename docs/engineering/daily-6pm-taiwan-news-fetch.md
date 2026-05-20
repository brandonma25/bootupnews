# Scheduled Taipei Editorial Input Fetch Cron

## Purpose

Run the existing RSS news ingestion and Signal generation pipeline plus the PRD-61 Gmail newsletter ingestion path twice each evening so the editorial Top 5 Signal Card queue and newsletter-derived review candidates are fresh for human editing.

This job reuses the existing `generateDailyBriefing` pipeline, `persistSignalPostsForBriefing` editorial snapshot persistence, and `runNewsletterIngestion({ writeCandidates: true })`. It must not create placeholder Signal Cards, refuses to persist deterministic seed-fallback output, and leaves newsletter promotion candidates non-live.

## Schedule

- Taiwan time: 6:15 PM daily and 7:45 PM daily
- UTC time: 10:15 daily and 11:45 daily
- Vercel cron schedules:
  - `15 10 * * *`
  - `45 11 * * *`

Exact minute execution depends on the Vercel plan. The repo configuration targets the two Taipei times above; if the project is on Hobby, Vercel may not guarantee minute-exact execution.

## Endpoint

- Scheduled path: `/api/cron/fetch-editorial-inputs`
- RSS-only diagnostic path: `/api/cron/fetch-news`
- Newsletter-only diagnostic path: `/api/cron/newsletter-ingestion`
- Method: `GET`
- Configured in: `vercel.json`

## Required Env Var

- `CRON_SECRET`: shared secret expected in the request header `Authorization: [REDACTED_ENV_VALUE] <CRON_SECRET>`
- `SUPABASE_SERVICE_ROLE_KEY`: required by the existing editorial persistence layer
- Existing Supabase public env vars are still required by the app: `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- PRD-61 Gmail OAuth env vars: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN`
- Newsletter gates for production writes:
  - `NEWSLETTER_INGESTION_ENABLED=[REDACTED_ENV_VALUE]`
  - `NEWSLETTER_INGESTION_DRY_RUN=[REDACTED_ENV_VALUE]`
  - `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=[REDACTED_ENV_VALUE]`
  - `GMAIL_NEWSLETTER_LABEL=[REDACTED_ENV_VALUE]` or omitted to use the default

Do not commit secret values.

## How To Test Locally

1. Ensure local env vars are configured in the shell or `.env.local`.
2. Start the app with `npm run dev`.
3. Test unauthorized access:

```bash
curl -i http://localhost:3000/api/cron/fetch-editorial-inputs
```

Expected: HTTP `401` with JSON `success: false`.

4. Test authorized access only when local env values are intentionally configured for the write mode being tested:

```bash
curl -i \
  -H "Authorization: [REDACTED_ENV_VALUE] $CRON_SECRET" \
  http://localhost:3000/api/cron/fetch-editorial-inputs
```

Expected: JSON with `success`, `timestamp`, and a sanitized `summary` containing `rss` and `newsletter` task results. A successful run returns HTTP `200`; a protected failure, such as seed fallback, missing editorial storage, or newsletter write-gate failure, returns HTTP `500` or a task-level blocked summary without publishing.

## How To Verify In Vercel Logs

1. Confirm production has `CRON_SECRET`, Supabase env vars, Gmail OAuth env vars, and newsletter write-gate env vars configured.
2. After the 10:15 UTC or 11:45 UTC scheduled run, inspect production function logs for `/api/cron/fetch-editorial-inputs`.
3. Look for:
   - `Combined editorial input cron started`
   - `Daily news cron started`
   - `Daily news cron succeeded`
   - `Newsletter ingestion run started`
   - `Combined editorial input cron completed`
   - or a clear failure log such as `Daily news cron skipped seed fallback output`
4. Confirm the response summary includes the pipeline run id, raw item count, cluster count, ranked cluster count, inserted Signal Card count, newsletter fetched email count, extracted story count, and promoted candidate count.
5. Open the editorial review route and confirm the generated Top 5 Signal Cards plus non-live newsletter candidates are available for human review before publishing.

Vercel Cron Jobs run on production deployments, not preview deployments.

## Rollback Steps

1. Remove the `/api/cron/fetch-editorial-inputs` entries from `vercel.json`, or revert the deployment containing this change.
2. Keep `CRON_SECRET` in Vercel until the rollback is deployed, then remove it if no other cron job uses it.
3. Verify Vercel no longer invokes `/api/cron/fetch-editorial-inputs`.
4. To immediately pause newsletter writes without a deploy, set `NEWSLETTER_INGESTION_DRY_RUN=[REDACTED_ENV_VALUE]`, set `NEWSLETTER_INGESTION_ENABLED=[REDACTED_ENV_VALUE]`, or remove `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=[REDACTED_ENV_VALUE]`.
5. Existing generated editorial snapshots and non-live newsletter candidates can remain in storage; unpublished rows do not publish public Signal Cards by themselves.
