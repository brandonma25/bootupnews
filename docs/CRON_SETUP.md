# Cron Setup — Boot Up Pipeline

## Trigger Model

The editorial ingestion pipeline is triggered by **cron-job.org** (external), not by Vercel's built-in cron scheduler.

- **External cron:** cron-job.org hits `GET https://bootupnews.com/api/cron/fetch-editorial-inputs` on the configured schedule.
- **Auth:** request must include `Authorization: Bearer ${CRON_SECRET}`. The secret is stored in cron-job.org's job config and in Vercel's `CRON_SECRET` env var (Production). Both must match.
- **Function timeout:** `maxDuration: 60` is set in [vercel.json](../vercel.json) for `/api/cron/fetch-editorial-inputs`.

## Why no Vercel internal cron?

A `crons` array in `vercel.json` was removed because running both Vercel cron AND cron-job.org caused duplicate runs on the same day (see May 16 2026 incident: 4 runs at 06:59, 07:17, 10:32, 11:50 UTC produced 4–5× duplicate Editorial Queue rows). External cron is the source of truth; Vercel cron is reserved for rollback.

## Rollback procedure (if cron-job.org is down)

Re-add the Vercel cron block to [vercel.json](../vercel.json) and redeploy:

```json
{
  "functions": { ... },
  "crons": [
    { "path": "/api/cron/fetch-editorial-inputs", "schedule": "15 10 * * *" },
    { "path": "/api/cron/fetch-editorial-inputs", "schedule": "45 11 * * *" }
  ]
}
```

- Schedule is UTC. `15 10 * * *` = 10:15 UTC = 18:15 Taipei.
- After cron-job.org is restored, remove the `crons` block again to prevent dual-firing.

## Operational checklist

- [ ] cron-job.org job exists, enabled, set to the same schedule
- [ ] cron-job.org job uses `Authorization: Bearer ${CRON_SECRET}` header
- [ ] Vercel `CRON_SECRET` env var matches cron-job.org's header value
- [ ] `vercel.json` does NOT contain a `crons` array (unless rollback is active)
- [ ] `vercel.json` `functions.maxDuration` is set to 60 for the ingestion route
