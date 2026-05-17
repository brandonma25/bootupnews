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

## 4. Enabling the health-check job (after Phase 4)

The config has a commented-out block for `bootup-health-check-1215-utc`. The
endpoint it targets (`/api/cron/health`) does not yet exist. **Do not
uncomment until PRD-65 Phase 4 ships the health endpoint.** Once it's live:

1. Uncomment the block in [`scripts/cron-jobs.config.ts`](../scripts/cron-jobs.config.ts).
2. `npm run cron:sync:dry-run` → confirm one new `create`.
3. `npm run cron:sync` to apply.
4. Use cron-job.org's "Test run" — expect HTTP 200 when the day's row count
   ≥ 7, HTTP 500 otherwise.

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

- **cron-job.org dashboard** — <https://console.cron-job.org>. Each job has an
  execution history showing status code, duration, and response excerpt for
  every fire.
- **Failure email alerts** — when `notifyOnFailure: true` (the default in
  config), cron-job.org emails the account holder on any non-2xx response.
  These arrive within minutes of a failed run.
- **Vercel function logs** — when the cron-job.org log shows a non-200,
  inspect the matching Vercel function invocation for the underlying error.
- **API rate limit** — cron-job.org's REST API allows 100 requests/day on the
  free tier. A normal sync uses about 1 read + N reads (per `bootup-*` job)
  + up to N writes, so well under the cap. Don't run the sync in a tight
  loop.

PRD-65 Phase 4 will add a Notion Pipeline Log database for long-term
operational history that survives beyond cron-job.org's retention.

---

## 7. Why infrastructure-as-code

- Schedule changes go through git review, not a browser tab someone forgot to
  reload.
- Rebuilding from scratch is one command, not click-by-click reconstruction
  of two or three jobs.
- The config file is the answer to "what's triggering our ingestion?" —
  no hunting through external dashboards.
