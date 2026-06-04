# Kill orphan cron endpoints (Track 2 P5) — change record

## Summary
- **What changed:** Deleted the two superseded cron HTTP endpoints and their now-dead support code:
  - `src/app/api/cron/fetch-news/route.ts` (+ test)
  - `src/app/api/cron/newsletter-ingestion/route.ts` (+ test)
  - Dead support paths in `src/lib/cron/fetch-news.ts`, `src/lib/newsletter-ingestion/runner.ts`, and `src/lib/pipeline/controlled-runner.ts` that only those endpoints called.
- **Why:** PRD-65 Phase 7 consolidated ingestion into a single endpoint `/api/cron/fetch-editorial-inputs` triggered once daily at 12:00 UTC by cron-job.org. The old `fetch-news` and `newsletter-ingestion` endpoints were no longer scheduled and only added surface area: a stale auth path, duplicate ingestion logic, and a second way to double-write Notion if anything ever hit them. Removing them removes the footgun.
- **Object level:** Operational surface (HTTP route inventory + the cron trigger contract). No change to the editorial pipeline's deterministic logic — the consolidated endpoint already owns ingestion.

## Deploy sequencing (LOAD-BEARING)
After this merges and deploys, requests to `/api/cron/fetch-news` and `/api/cron/newsletter-ingestion` return **404**. cron-job.org's failure trigger keys on HTTP status, so a job still pointed at either URL would page on a 404 — the same cry-wolf class Track 2 exists to remove.

**Run `cron:sync:prune` BEFORE or WITH the deploy that removes the endpoints:**

```sh
CRONJOB_API_KEY=… CRON_SECRET=… BOOTUP_PRODUCTION_URL=https://bootupnews.com \
  npm run cron:sync:prune
```

Expected diff: the orphan jobs are deleted from cron-job.org, leaving only `bootup-ingestion-1200-utc` and `bootup-health-check-1215-utc`. Confirm in <https://console.cron-job.org>. Recommended order: **prune first, verify the dashboard, then deploy** — zero failure-trigger noise.

## Tests
The deleted endpoints' tests are removed with them. The remaining suite (consolidated endpoint, newsletter gmail, editorial staging, health) stays green; `npm run build` green.

## Related
- PRD-65 — Pipeline Reliability and External Cron Migration (the consolidation that made these endpoints orphans).
- Track 2 priorities pass (P1 #290, P2 #292, P3 #294, P4 #296, P5 this change, P6 #300, P7 #301).
