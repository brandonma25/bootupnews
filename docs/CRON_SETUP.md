# Cron Setup — cron-job.org

Operational runbook for the Boot Up ingestion cron jobs.

The canonical scheduler for the Boot Up ingestion pipeline is
[cron-job.org](https://cron-job.org). Job configuration lives in
[`scripts/cron-jobs.config.ts`](../scripts/cron-jobs.config.ts) and is applied
to cron-job.org by [`scripts/sync-cron-jobs.ts`](../scripts/sync-cron-jobs.ts).
Edit the config, run `npm run cron:sync`, and the diff is reconciled
idempotently — no clicking through a web UI.

This document is the cron-job.org runbook. Phase 5 of PRD-65 expands it with
architecture diagrams, observability decision trees, and the full failure
playbook.

---

## 0. Account setup (one-time)

If you don't already have a cron-job.org account:

1. Go to <https://cron-job.org/en/signup/> and create a free account.
2. Verify the email — the account is required for failure-alert emails to land.
3. Generate an API key at <https://console.cron-job.org/settings> → **API**. The free tier allows 100 API requests/day, which is well above the ~10/day a routine `npm run cron:sync` uses (one read per `bootup-*` job + one detail read per job + at most one write per job).
4. Note the timezone setting in **Settings → Account**. Job schedules in this repo are declared in `Etc/UTC` regardless of the account default, but the timezone setting affects how the dashboard displays execution timestamps.

No upgrade is required. The free tier covers Boot Up's three scheduled jobs comfortably.

---

## 1. Prerequisites

Set all four of these before running the sync script. The script will refuse
to run if any are missing.

| Env var | Where it lives | Notes |
| --- | --- | --- |
| `CRONJOB_API_KEY` | Shell session only — never commit | Generate at <https://console.cron-job.org/settings>. |
| `CRON_SECRET` | Shell session **and** Vercel production env | The two values must match exactly — the script puts this into each job's `x-cron-secret` header, and the Vercel endpoint compares against the same env var. A mismatch yields 401 on every run. |
| `BOOTUP_PRODUCTION_URL` | Shell session only | e.g. `https://bootupnews.com`. The script joins this with the API path to build each job's URL. |
| `ALLOW_VERCEL_CRON_FALLBACK` | Vercel production env, **unset** in normal operation | Only set to `true` when re-enabling Vercel Cron during a cron-job.org outage. See [Rollback](#5-rollback). |

Export them in your shell before invoking the script:

```bash
export CRONJOB_API_KEY="..."     # from cron-job.org → Settings → API
export CRON_SECRET="..."         # must match the value in Vercel prod env
export BOOTUP_PRODUCTION_URL="https://bootupnews.com"
```

Neither `CRONJOB_API_KEY`, `CRON_SECRET`, nor `BOOTUP_PRODUCTION_URL` is in
`.env.example` or any committed file — they are shell-session-only. Don't
add them to `.env*`.

---

## 2. First-time sync

Always preview first:

```bash
npm run cron:sync:dry-run
```

Expected output on a fresh account (no jobs yet on cron-job.org):

```
mode:          DRY-RUN (no writes)
prune orphans: no
config jobs:   2
production:    https://bootupnews.com
api key:       <len=…>
cron secret:   <len=…>

TITLE                       ACTION  DETAIL
--------------------------------------------------------------
bootup-ingestion-1015-utc   create  would create GET https://…/api/cron/fetch-editorial-inputs @ 10:15 Etc/UTC
bootup-ingestion-1145-utc   create  would create GET https://…/api/cron/fetch-editorial-inputs @ 11:45 Etc/UTC
Would create 2 jobs: bootup-ingestion-1015-utc, bootup-ingestion-1145-utc

summary: created=0 updated=0 skipped=0 orphans=0 pruned=0 failed=0
```

(`created=0` in the summary line is correct for dry-run — nothing was actually written.)

If output looks right, apply for real:

```bash
npm run cron:sync
```

After this, sign in to <https://console.cron-job.org> and confirm both jobs
appear in the dashboard, are enabled, and have the schedules
`15 10 * * *` and `45 11 * * *` in UTC.

**Test each job once.** Use the "Test run" button on each cron-job.org job
page. Expected response: **HTTP 200** from
`/api/cron/fetch-editorial-inputs`. If you get **HTTP 401**, the
`x-cron-secret` value on cron-job.org doesn't match `CRON_SECRET` in Vercel
production env — re-set them so both match, then re-run `npm run cron:sync`.

---

## 3. Routine changes

The config file is the source of truth. To change anything:

1. Edit [`scripts/cron-jobs.config.ts`](../scripts/cron-jobs.config.ts).
2. Run `npm run cron:sync:dry-run` and confirm the diff is what you expect.
3. Run `npm run cron:sync` to apply.
4. Commit the config change in a normal PR for review.

### Examples

**Change a schedule.** Edit the `schedule.hours` / `schedule.minutes` of the
relevant entry. Dry-run will report `update jobId=… (diff: schedule)`.

**Add a new job.** Append a new entry to the `cronJobs` array with a unique
`title` starting with `bootup-`. Dry-run will report `create`.

**Disable a job temporarily.** Set `enabled: false` on the entry. The job
stays on cron-job.org but does not fire. Re-enable by setting back to `true`
and re-syncing.

**Remove a job permanently.** Delete the entry from the config, then run
`npm run cron:sync:prune`. The script will report the missing job as an
orphan and delete it. Without `--prune`, deletion is opt-in; orphans only
show as warnings.

### Idempotency

Running `npm run cron:sync` twice in a row with no config changes produces
zero API writes on the second run. Every job will be reported as `skip
(no change)`. If the second run reports any `update`, that is a bug — the
script's diff is incomplete for some field.

---

## 4. Enabling the health-check job

The [`scripts/cron-jobs.config.ts`](../scripts/cron-jobs.config.ts) config has a commented-out block for `bootup-health-check-1215-utc`. As of PRD-65 Phase 4 the endpoint it targets (`/api/cron/health`) is live and ready to use:

1. Confirm `NOTION_EDITORIAL_QUEUE_DB_ID` and `CRON_SECRET` are set in Vercel production env. (`NOTION_PIPELINE_LOG_DB_ID` is recommended but optional — the endpoint logs a warning and continues when it's unset.)
2. Uncomment the `bootup-health-check-1215-utc` block in [`scripts/cron-jobs.config.ts`](../scripts/cron-jobs.config.ts).
3. `npm run cron:sync:dry-run` → confirm one new `create`.
4. `npm run cron:sync` to apply.
5. Use cron-job.org's "Test run" button on the new job:
   - **HTTP 200, `status: "ok"`** — day's row count ≥ 7 and every expected source contributed.
   - **HTTP 200, `status: "warn"`** — row count ≥ 7 but at least one expected source is missing. No alert email; investigate when convenient.
   - **HTTP 500, `status: "fail"`** — row count < 7 (or the Notion query itself failed). An alert email will fire to the account holder.

The job is scheduled at 12:15 UTC (= 20:15 Taipei), 30 minutes after the second ingestion run. That gives the pipeline time to complete and any retries to settle before the check fires.

---

## 5. Rollback

If cron-job.org is having an outage and you need to re-enable Vercel Cron
temporarily:

1. In Vercel project env, set `ALLOW_VERCEL_CRON_FALLBACK=true` (production scope).
2. Re-add the `crons` block to `vercel.json` on a hotfix branch:
   ```json
   "crons": [
     { "path": "/api/cron/fetch-editorial-inputs", "schedule": "15 10 * * *" },
     { "path": "/api/cron/fetch-editorial-inputs", "schedule": "45 11 * * *" }
   ]
   ```
3. Merge and redeploy. Vercel Cron will now fire on its own ±59 min window
   schedule, sending the legacy `Authorization: Bearer <CRON_SECRET>` header,
   which the endpoint accepts when the fallback flag is set.
4. On cron-job.org, disable the jobs (set `enabled: false` in config and
   re-sync) so the two schedulers don't double-fire.

When cron-job.org is healthy again, reverse the steps: re-enable jobs on
cron-job.org, remove the `crons` block, unset `ALLOW_VERCEL_CRON_FALLBACK`.

---

## 6. Monitoring

### cron-job.org dashboard

<https://console.cron-job.org> is the primary operational dashboard. Every job has:

- **Execution history** — table of recent fires with timestamp, HTTP status code, duration, and a response excerpt. The free tier retains the last ~25 executions per job; longer-term history lives in the Notion Pipeline Log (see [OBSERVABILITY.md](OBSERVABILITY.md)).
- **Test run button** — fires the job immediately, regardless of schedule. Useful for verifying changes right after `npm run cron:sync` and for ad-hoc re-runs.
- **Enable/disable toggle** — manual emergency stop. Prefer flipping `enabled: false` in [`scripts/cron-jobs.config.ts`](../scripts/cron-jobs.config.ts) and re-syncing so the change is in git.

### Reading an execution row

Each execution row shows:
- **Status code** — green for 2xx, red for everything else. HTTP 200 is the happy path for ingestion; HTTP 200 *or* 500 are both expected outcomes for the health check (500 = row count below threshold).
- **Duration** — wall-clock time from request to response. Ingestion runs typically take 8–25 seconds. A run pushing the 60-second Vercel function ceiling is a warning sign — inspect the Vercel function log.
- **Response excerpt** — the first ~500 bytes of the response body. For ingestion, this is the combined JSON summary; for health checks, the `{ status, row_count, ... }` payload. A response that's just `Unauthorized` means the `x-cron-secret` header doesn't match `CRON_SECRET` in Vercel prod env.

### Email failure alerts

Each job in [`scripts/cron-jobs.config.ts`](../scripts/cron-jobs.config.ts) has `notifyOnFailure: true`. The sync script translates that to `notification.onFailure: true` (and `onDisable: true`) in the cron-job.org API. Behavior:

- cron-job.org emails the account holder on any non-2xx response **or** if a job is auto-disabled after repeated failures.
- The email subject is `Job ‹title› failed` and the body includes the HTTP status, response excerpt, and a link back to the job page.
- Emails are sent to the address verified during account signup. To change it, update **Settings → Account** in the cron-job.org dashboard.
- **Test the alert path once after first setup**: temporarily change one job's URL to a path that returns 404 (e.g. `/api/does-not-exist`), sync, wait for the next scheduled fire (or click "Test run"), confirm the email arrives, then revert.
- Health-check `fail` (HTTP 500) is the canonical alert trigger. `warn` and `ok` both return HTTP 200 and do not alert.

### Where else to look

When the cron-job.org log shows a non-200, the underlying cause lives elsewhere — see [OBSERVABILITY.md](OBSERVABILITY.md) for the full decision tree:

- **Vercel function logs** — for the actual error, stack trace, and any branch-level failure detail.
- **Notion Pipeline Log database** — long-term operational history beyond cron-job.org's ~25-execution retention. Filter by `Run Type=ingestion` for run-by-run results, or `Status=fail` for the failure series.
- **Notion Source Health Log** — per-source-per-day fetch outcomes. Sentry no longer receives `Feed request retry exhausted for *` events for known-flaky sources; they appear here instead.

### API rate limit

cron-job.org's REST API allows **100 requests/day** on the free tier. A normal `npm run cron:sync` uses about:

- 1 read (`GET /jobs`)
- N reads (`GET /jobs/{id}` per `bootup-*` job — currently 2–3)
- Up to N writes (`PUT`/`PATCH`/`DELETE`)

So a full sync is ~6–10 API calls. Far under the cap. Don't run the sync in a tight loop or from CI on every push.

---

## 7. Why infrastructure-as-code

- Schedule changes go through git review, not a browser tab someone forgot to
  reload.
- Rebuilding from scratch is one command, not click-by-click reconstruction
  of two or three jobs.
- The config file is the answer to "what's triggering our ingestion?" —
  no hunting through external dashboards.
