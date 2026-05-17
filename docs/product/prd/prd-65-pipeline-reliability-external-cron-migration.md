# PRD-65 — Pipeline Reliability and External Cron Migration

- PRD ID: `PRD-65`
- Canonical file: `docs/product/prd/prd-65-pipeline-reliability-external-cron-migration.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Make the daily editorial ingestion pipeline reliable in production by moving scheduled triggering off Vercel Hobby Cron to an external scheduler (`cron-job.org`), raising the serverless function timeout, making Branch C Notion writes idempotent, adding a health-check endpoint with structured operational logging in Notion, and protecting the run against flaky upstream sources with a circuit breaker.

## User Problem

The current scheduled ingestion path has three failure modes that block reliable production operation:

1. **Vercel Hobby cron has a ±59-minute firing window.** A run scheduled at 10:15 UTC can fire as late as 11:14 UTC. With two crons (10:15 and 11:45 UTC), the windows can overlap, so Branch C ("Editorial Staging") can be invoked twice within minutes and double-write the Notion Editorial Queue.
2. **The default 10-second serverless function timeout is being hit silently.** A single slow RSS source can consume ~9 s before normalization, deduplication, clustering, ranking, and Notion write begin. When the function times out mid-run, Notion gets zero rows and no error surfaces — the editor (BM) only discovers it during the evening grounding pass.
3. **No observability on partial or total failure.** Runs that complete but produce zero rows (timeout, Notion auth failure, source outage) are invisible until the editor opens Notion at ~8 PM Taipei.

The editor needs ingestion to fire on a tight, predictable schedule, retry cleanly on transient failures without duplicating data, and alert when it produces fewer signals than expected.

## Scope

- Raise `maxDuration` on `/api/cron/fetch-editorial-inputs` to 60 s (Vercel Hobby maximum). *(Phase 1, already shipped in PR #246.)*
- Remove the `crons` array from `vercel.json`. The endpoint will be triggered externally by `cron-job.org`.
- Add `x-cron-secret` HTTP header authentication to `/api/cron/fetch-editorial-inputs`. Continue to accept the existing `Authorization: Bearer <CRON_SECRET>` header path only when `ALLOW_VERCEL_CRON_FALLBACK=true` (rollback escape hatch).
- Make Branch C Editorial Staging Step E3 ("Write to Notion") idempotent: insert when no row matches `Headline + Briefing Date`; update in place when one does and the row is still `Status=raw`; skip with a log when the row has been human-edited.
- Add `/api/cron/health` endpoint that queries Notion for today's row count, returns structured JSON, returns HTTP 500 when row count is below the expected minimum so `cron-job.org` emails an alert, and writes a row to a Notion "Pipeline Log" database for long-term operational history.
- Add a separate Notion "Source Health Log" database tracking per-source-per-day fetch outcomes. The ingestion endpoint writes one row per source per run.
- Add a circuit breaker in Branch B Step R2 (RSS fetch): skip a source whose Source Health Log shows 5 or more failures in the past 24 hours; auto-reset after 24 hours; do not report skipped sources to Sentry.
- Add a Sentry `beforeSend` filter dropping `Feed request retry exhausted for *` events. Those failures are now tracked in Source Health Log instead.
- Document the new architecture (`/docs/ARCHITECTURE.md`), the `cron-job.org` runbook (`/docs/CRON_SETUP.md`), the observability story (`/docs/OBSERVABILITY.md`), and the two new Notion database schemas.

## Non-Goals

- No changes to Branch A (Newsletter Ingestion) ingestion logic.
- No changes to Branch B (RSS Pipeline) clustering, ranking, or normalization logic. The only Branch B addition is the circuit-breaker pre-check on each source.
- No changes to the Supabase push path or the `editorial/push-approved` endpoint.
- No new ranking signals, scoring changes, or editorial UI changes.
- No paid Vercel plan upgrade. All changes stay within Hobby tier limits (60 s function ceiling).
- No automated migration of historical Notion data.

## Implementation Shape / System Impact

Five thin layers added around the existing pipeline; no rewrite of ingestion logic.

- **Triggering boundary moves out of the repo.** `vercel.json` no longer schedules anything. `cron-job.org` becomes the canonical scheduler and issues authenticated GETs to two production endpoints (`/api/cron/fetch-editorial-inputs`, `/api/cron/health`) at three times: 10:15 UTC, 11:45 UTC, and 12:15 UTC (= 6:15 PM, 7:45 PM, 8:15 PM Taipei).
- **Auth boundary tightens.** Header `x-cron-secret` becomes the primary auth on the ingestion endpoint. The legacy `Authorization: Bearer …` path stays only behind the `ALLOW_VERCEL_CRON_FALLBACK` env flag for rollback. Missing/incorrect header → HTTP 401; pipeline is never invoked.
- **Branch C E3 becomes idempotent.** Before insert, query Notion Editorial Queue for `Headline + Briefing Date`. Three outcomes — `inserted`, `updated`, `skipped_human_edited` — are logged on every write. `Status != raw` rows are never modified.
- **Two new Notion databases.** "Pipeline Log" captures each ingestion run plus each health-check run. "Source Health Log" captures per-source-per-day fetch outcomes that drive the circuit breaker and replace Sentry noise on known-flaky sources.
- **Health check is intentionally cheap.** One Notion query, no pipeline invocation. HTTP 200 when row count ≥ 7; HTTP 500 below threshold so `cron-job.org` alerts.

The change is structural at the edges (scheduling, auth, observability) and lightly surgical at the middle (Branch C idempotency, Branch B per-source skip). The pipeline's deterministic logic for normalization, dedup, clustering, and ranking is unchanged.

## Terminology Requirement

- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- Use Article, Story Cluster, Signal, Card, and Surface Placement according to the canonical definitions.
- Object level modified: Article ingestion scheduling (external trigger), Story Cluster → Signal pipeline execution envelope (timeout + circuit breaker), Signal Card editorial review-candidate write path (idempotency at Branch C E3), and a new operational surface for pipeline-health observability that does not change Signal identity.
- The Notion Editorial Queue stores review candidates for Signal Cards, not canonical Signals. The Pipeline Log and Source Health Log are operational records, not Signal storage.

## Dependencies / Risks

- **External dependency on cron-job.org.** Free tier; if `cron-job.org` is down, no ingestion runs. Rollback path: set `ALLOW_VERCEL_CRON_FALLBACK=true` and re-add the `crons` block to `vercel.json`.
- **CRON_SECRET must be configured in Vercel before the new auth path is exercised.** The user is configuring `CRON_SECRET` in Vercel separately. Until set, the endpoint returns 401 to every request.
- **Two Notion databases must be created manually** by BM. The endpoint code handles missing `NOTION_PIPELINE_LOG_DB_ID` and `NOTION_SOURCE_HEALTH_LOG_DB_ID` gracefully (warning log, no hard failure) so deploy ordering is not coupled to Notion setup.
- **PRD-60 status changes.** This PRD partly supersedes PRD-60's Vercel-Cron triggering decision. PRD-60 itself remains canonical for the *endpoint shape* and pipeline contract; PRD-65 only changes the *trigger*.
- **PRD-64 Branch C E3 contract changes.** Insert-only becomes insert-or-update-or-skip. Downstream consumers (Notion review surface, push-approved) continue to read by `Briefing Date + Status`, which is unaffected.
- **Sentry signal-to-noise.** Filtering `Feed request retry exhausted for *` reduces Sentry noise but means a source that newly degrades will be invisible in Sentry until the pipeline-level alert fires. Source Health Log is the new authoritative record.

## Acceptance Criteria

- `vercel.json` contains no `crons` array; `functions["src/app/api/cron/fetch-editorial-inputs/route.ts"].maxDuration = 60` is preserved.
- Requests to `/api/cron/fetch-editorial-inputs` without an `x-cron-secret` header matching `CRON_SECRET` return HTTP 401 and do not call the pipeline.
- Requests with the correct `x-cron-secret` header proceed normally and return the existing combined-summary JSON shape.
- When `ALLOW_VERCEL_CRON_FALLBACK=true`, the legacy `Authorization: Bearer …` header continues to authorize. When the flag is unset or `false`, that path returns 401.
- Running ingestion twice in succession with the same source set produces the same row count in Notion, not double. Each Notion write logs one of `inserted`, `updated`, or `skipped_human_edited`.
- Rows with `Status != raw` are never modified.
- `GET /api/cron/health` with the correct `x-cron-secret` header returns `{ status, row_count, expected_min, briefing_date }` as JSON. HTTP 200 when `row_count >= 7`; HTTP 500 when below. The endpoint runs in well under 60 s.
- Missing `NOTION_PIPELINE_LOG_DB_ID` does not break the health endpoint or the ingestion endpoint; both log a warning and continue.
- Pipeline Log captures a row per ingestion run and per health check; Source Health Log captures a row per source per run.
- Status is `warn` (not `fail`) when row count ≥ 7 but one or more expected sources contributed zero articles.
- A source with 5 or more failures in the past 24 hours is skipped on the next run, logged to Source Health Log as `skipped_circuit_breaker`, and not reported to Sentry. Skipped sources auto-reset after 24 hours.
- Sentry no longer receives `Feed request retry exhausted for *` events; other `RssError` variants continue to report normally.
- `/docs/ARCHITECTURE.md`, `/docs/CRON_SETUP.md`, `/docs/OBSERVABILITY.md`, `/docs/notion-pipeline-log-schema.md`, and `/docs/notion-source-health-schema.md` exist; `README.md` links to them; `CHANGELOG.md` has an entry for this migration.
- `.env.example` documents `CRON_SECRET`, `ALLOW_VERCEL_CRON_FALLBACK`, `NOTION_PIPELINE_LOG_DB_ID`, and `NOTION_SOURCE_HEALTH_LOG_DB_ID` with comments.

## Evidence and Confidence

- Repo evidence used: existing `/api/cron/fetch-editorial-inputs` route shape and tests (PRD-60), Branch C editorial-staging runner (PRD-64), Notion client patterns under `src/lib/`, existing Sentry init, the audit performed in Phase 0 of this initiative listing all `/api/cron/*` routes and their trigger sources.
- Confidence: high for repo-side configuration, header-auth migration, idempotency contract, and health endpoint shape; medium for cron-job.org execution timing in production (cannot be proven from a preview deploy — requires the user's external account setup); medium for Notion rate-limit behavior under back-to-back retries (the idempotency guard exists precisely to handle this safely).

## Closeout Checklist

- Scope completed:
- [ ] Terminology check completed: Article, Story Cluster, Signal, Card, and Surface Placement are used according to the canonical terminology document.
- [ ] PRD clearly states which object level the feature modifies.
- [ ] PRD does not describe UI cards as signals unless referring to the underlying Signal object.
- Tests run:
- Local validation complete:
- Preview validation complete, if applicable:
- Production sanity check complete, only after preview is good:
- PRD summary stored in repo:
- Bug-fix report stored in repo, if applicable: n/a (new feature)
- `docs/product/feature-system.csv` updated if PRD/feature metadata changed:
- Public documentation or PR evidence complete when durable reviewer-facing context is needed:
- Google Sheet / Google Work Log not treated as canonical or updated for routine completion:
