# Daily 6 PM Taiwan News Fetch Cron

## Purpose

Run the existing news ingestion and Signal generation pipeline once per day so the editorial Top 5 Signal Card review queue has a fresh generated snapshot for human editing.

This job reuses the existing `generateDailyBriefing` pipeline and `persistSignalPostsForBriefing` editorial snapshot persistence. It must not create placeholder Signal Cards, and it refuses to persist deterministic seed-fallback output.

## Schedule

- Taiwan time: 6:00 PM daily
- UTC time: 10:00 daily
- Vercel cron schedule: `0 10 * * *`

## Endpoint

- Path: `/api/cron/fetch-news`
- Method: `GET`
- Configured in: `vercel.json`

## Required Env Var

- `CRON_SECRET`: shared secret expected in the request header `Authorization: Bearer <CRON_SECRET>`
- `SUPABASE_SERVICE_ROLE_KEY`: required by the existing editorial persistence layer
- Existing Supabase public env vars are still required by the app: `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not commit secret values.

## How To Test Locally

1. Ensure local env vars are configured in the shell or `.env.local`.
2. Start the app with `npm run dev`.
3. Test unauthorized access:

```bash
curl -i http://localhost:3000/api/cron/fetch-news
```

Expected: HTTP `401` with JSON `success: false`.

4. Test authorized access:

```bash
curl -i \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/fetch-news
```

Expected: JSON with `success`, `timestamp`, and a `summary`. A successful run returns HTTP `200`; a protected failure, such as seed fallback or missing editorial storage, returns HTTP `500` without persisting placeholder Signal Cards.

## How To Verify In Vercel Logs

1. Confirm production has `CRON_SECRET` and Supabase env vars configured.
2. After the 10:00 UTC scheduled run, inspect production function logs for `/api/cron/fetch-news`.
3. Look for:
   - `Daily news cron started`
   - `Daily news cron succeeded`
   - or a clear failure log such as `Daily news cron skipped seed fallback output`
4. Confirm the response summary includes the pipeline run id, raw item count, cluster count, ranked cluster count, and inserted Signal Card count.
5. Open the editorial review route and confirm the generated Top 5 Signal Cards are available for human review before publishing.

Vercel Cron Jobs run on production deployments, not preview deployments.

## Rollback Steps

1. Remove the `/api/cron/fetch-news` entry from `vercel.json`, or revert the deployment containing this change.
2. Keep `CRON_SECRET` in Vercel until the rollback is deployed, then remove it if no other cron job uses it.
3. Verify Vercel no longer invokes `/api/cron/fetch-news`.
4. Existing generated editorial snapshots can remain in storage; unpublished rows do not publish public Signal Cards by themselves.
