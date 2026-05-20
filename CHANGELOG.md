# Changelog

Project-level changelog. Per-PR detail lives in GitHub PR metadata; this file
records durable, reviewer-facing milestones — usually multi-PR initiatives.

## 2026-05-18 — Documentation architecture overhaul

Resolved structural drift in the docs system: scattered templates consolidated to a single canonical location, three governance bugs fixed (PR template terminology reference, missing incidents folder, change-records folder lane mismatch), AGENTS.md redesigned to retire the 9-document required-reading list, new ADR and incident templates introduced, folder structure flattened where single-file subfolders existed, PRD operational-history index system introduced with CI enforcement.

| Phase | Summary | PR |
| --- | --- | --- |
| PR 1 | Governance bug fixes: PR template terminology, incidents folder, change-records resolution | [#254](https://github.com/brandonma25/bootupnews/pull/254) |
| PR 2 | New templates (PRD, bug-fix, ADR, incident) + redesigned AGENTS.md + read-order doc + PRD operational-history index system | [#255](https://github.com/brandonma25/bootupnews/pull/255) |
| PR 3 | Folder consolidation, deprecation of superseded templates, routing taxonomy deduplication | [#256](https://github.com/brandonma25/bootupnews/pull/256) |
| PR 4 | CI enforcement of PRD operational-history index consistency | [#257](https://github.com/brandonma25/bootupnews/pull/257) |

### What changed for contributors

- **One templates folder.** `docs/engineering/templates/` is now the canonical home. Previous locations (`docs/engineering/protocols/`, `docs/engineering/bug-fixes/templates/`, `docs/product/briefs/templates/`) are emptied.
- **PRD template upgraded.** Senior-PM sections added: options considered, what we're NOT building, failure modes accepted, post-ship reflection. Existing PRDs not retrofitted.
- **PRD operational-history index.** Each PRD now has a "Related operational history" section near the bottom indexing bug fixes, incidents, amendments, and multi-PR initiatives that touched the feature. Bug-fix and incident templates pre-compute the index entry line to copy.
- **CI enforces the index.** When a bug-fix or incident record names `Related PRD: PRD-XX`, the referenced PRD must be updated in the same PR. Multi-PRD references require all referenced PRDs to be updated. `Related PRD: None` skips the check.
- **AGENTS.md retired the 9-doc required-reading list.** Essential rules embedded inline; deep specifics referenced by file path. Combined required pre-read reduced from ~1500 lines to ~280.
- **Two new templates:** `ADR-template.md` for durable architectural decisions, `incident-template.md` for process/governance/workflow failures.
- **Folder routing taxonomy has one canonical source:** `docs/product/documentation-rules.md`. Other files reference it rather than duplicating.

### Constraint compliance

This overhaul did not modify:
- Source code (`src/`) — except 3 doc comments updated to point to relocated schema files
- Database schema or migrations (`supabase/`)
- CI workflow definitions (`.github/workflows/`)
- Feature PRD content (templates changed; existing PRDs untouched — retrofit deferred)
- Product behavior or public surfaces

### What this does NOT solve

- Semantic quality of PRD index entries. The CI gate is structural. An agent can satisfy the gate with a low-signal index line. Reviewer at merge time is the quality gate.
- Retroactive index population for existing bug-fix and incident records. Forward-looking system; retroactive sweep is a separate decision.

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
- **Two new Notion databases.** [`Pipeline Log`](docs/engineering/reports/notion-pipeline-log-schema.md) and [`Source Health Log`](docs/engineering/reports/notion-source-health-schema.md). BM creates each manually in Notion; database IDs go in Vercel production env as `NOTION_PIPELINE_LOG_DB_ID` and `NOTION_SOURCE_HEALTH_LOG_DB_ID`. Both writers are best-effort — missing env vars produce a warn log and never fail the cron.
- **Sentry should be much quieter for routine RSS issues.** Post-retry-exhaustion feed errors no longer reach Sentry; they live in the Source Health Log instead. A new Sentry issue now means a genuinely new failure mode, not just a flaky feed.
- **Rollback path is real.** If cron-job.org has an outage: set `ALLOW_VERCEL_CRON_FALLBACK=true` in Vercel, re-add the `crons` block to `vercel.json` on a hotfix branch, redeploy. Reverse when cron-job.org is healthy. See [`docs/engineering/CRON_SETUP.md` §5](docs/engineering/CRON_SETUP.md#5-rollback).

### Constraint compliance

PRD-65 explicitly did not modify:
- Branch A newsletter ingestion logic.
- Branch B normalization, deduplication, clustering, or ranking. Only the fetch step (R2) was touched, to consult the circuit breaker and write per-source outcomes.
- The Supabase push path or `signal_posts` reads.
- Any public surface, ranking signal, or editorial UI.

No new runtime dependencies. The sync tooling added `tsx` usage but `tsx` was already a devDep.
