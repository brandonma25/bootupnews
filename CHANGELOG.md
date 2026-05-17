# Changelog

Project-level changelog. Per-PR detail lives in GitHub PR metadata; this file
records durable, reviewer-facing milestones — usually multi-PR initiatives.

## 2026-05-17 — Pipeline reliability & external cron migration (PRD-65)

Migrated the editorial ingestion pipeline off Vercel Hobby Cron to external
scheduling via [cron-job.org](https://cron-job.org), added idempotency and a
health check, and made source-level flakiness invisible to Sentry. Six
landings under the same [PRD-65](docs/product/prd/prd-65-pipeline-reliability-external-cron-migration.md).

| Phase | Summary | PR |
| --- | --- | --- |
| Phase 0 — Audit | Cron-endpoint surface audit. Analysis only. | n/a |
| Phase 1 — Function timeout | Raised `maxDuration` on `/api/cron/fetch-editorial-inputs` to 60 s (Vercel Hobby max). | [#246](https://github.com/brandonma25/bootupnews/pull/246) |
| Phase 2 — Decouple trigger | Removed `crons` from `vercel.json`. Endpoint now requires `x-cron-secret` header; legacy Bearer kept behind `ALLOW_VERCEL_CRON_FALLBACK=true` for rollback. | [#247](https://github.com/brandonma25/bootupnews/pull/247) |
| Sync tooling | `scripts/cron-jobs.config.ts` source-of-truth + `scripts/sync-cron-jobs.ts` idempotent driver for cron-job.org. `npm run cron:sync` applies config. | [#248](https://github.com/brandonma25/bootupnews/pull/248) |
| Phase 3 — Branch C idempotency | `writeEditorialQueueRow` is now `inserted` / `updated` / `skipped_human_edited` keyed on `Headline + Briefing Date`. PATCH path omits `Status` so it can never demote a row. | [#249](https://github.com/brandonma25/bootupnews/pull/249) |
| Phase 4 — Health + Pipeline Log | New `/api/cron/health` endpoint; new Notion Pipeline Log + Source Health Log writers. Ingestion endpoint now writes a Pipeline Log row on every completion. | [#250](https://github.com/brandonma25/bootupnews/pull/250) |
| Phase 4.5 — Circuit breaker | Pre-fetch gate at Branch B Step R2 skips a source whose Source Health Log shows `Fail Count >= 5` for the day. Sentry `beforeSend` drops `Feed request retry exhausted for *` events. | [#251](https://github.com/brandonma25/bootupnews/pull/251) |
| Phase 5 — Docs | `ARCHITECTURE.md`, `OBSERVABILITY.md`, expanded `CRON_SETUP.md`, README operator section, this changelog. | _this PR_ |

### What changed for operators

- **The cron trigger is no longer Vercel.** It is cron-job.org, configured from a tracked file in this repo. To change schedules: edit [`scripts/cron-jobs.config.ts`](scripts/cron-jobs.config.ts), run `npm run cron:sync:dry-run`, then `npm run cron:sync`.
- **Failure alerts arrive by email.** Each cron-job.org job has `notifyOnFailure: true`; a non-2xx response triggers an email within minutes. The health-check job at 12:15 UTC is the canonical alert for "the day's queue is below threshold".
- **Two new Notion databases.** [`Pipeline Log`](docs/notion-pipeline-log-schema.md) and [`Source Health Log`](docs/notion-source-health-schema.md). BM creates each manually in Notion; database IDs go in Vercel production env as `NOTION_PIPELINE_LOG_DB_ID` and `NOTION_SOURCE_HEALTH_LOG_DB_ID`. Both writers are best-effort — missing env vars produce a warn log and never fail the cron.
- **Sentry should be much quieter for routine RSS issues.** Post-retry-exhaustion feed errors no longer reach Sentry; they live in the Source Health Log instead. A new Sentry issue now means a genuinely new failure mode, not just a flaky feed.
- **Rollback path is real.** If cron-job.org has an outage: set `ALLOW_VERCEL_CRON_FALLBACK=true` in Vercel, re-add the `crons` block to `vercel.json` on a hotfix branch, redeploy. Reverse when cron-job.org is healthy. See [`docs/CRON_SETUP.md` §5](docs/CRON_SETUP.md#5-rollback).

### Constraint compliance

PRD-65 explicitly did not modify:
- Branch A newsletter ingestion logic.
- Branch B normalization, deduplication, clustering, or ranking. Only the fetch step (R2) was touched, to consult the circuit breaker and write per-source outcomes.
- The Supabase push path or `signal_posts` reads.
- Any public surface, ranking signal, or editorial UI.

No new runtime dependencies. The sync tooling added `tsx` usage but `tsx` was already a devDep.
