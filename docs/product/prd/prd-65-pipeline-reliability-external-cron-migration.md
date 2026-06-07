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
- Document the new architecture (`/docs/engineering/ARCHITECTURE.md`), the `cron-job.org` runbook (`/docs/engineering/CRON_SETUP.md`), the observability story (`/docs/engineering/OBSERVABILITY.md`), and the two new Notion database schemas.

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
- `/docs/engineering/ARCHITECTURE.md`, `/docs/engineering/CRON_SETUP.md`, `/docs/engineering/OBSERVABILITY.md`, `/docs/engineering/reports/notion-pipeline-log-schema.md`, and `/docs/engineering/reports/notion-source-health-schema.md` exist; `README.md` links to them; `CHANGELOG.md` has an entry for this migration.
- `.env.example` documents `CRON_SECRET`, `ALLOW_VERCEL_CRON_FALLBACK`, `NOTION_PIPELINE_LOG_DB_ID`, and `NOTION_SOURCE_HEALTH_LOG_DB_ID` with comments.

## Evidence and Confidence

- Repo evidence used: existing `/api/cron/fetch-editorial-inputs` route shape and tests (PRD-60), Branch C editorial-staging runner (PRD-64), Notion client patterns under `src/lib/`, existing Sentry init, the audit performed in Phase 0 of this initiative listing all `/api/cron/*` routes and their trigger sources.
- Confidence: high for repo-side configuration, header-auth migration, idempotency contract, and health endpoint shape; medium for cron-job.org execution timing in production (cannot be proven from a preview deploy — requires the user's external account setup); medium for Notion rate-limit behavior under back-to-back retries (the idempotency guard exists precisely to handle this safely).

## Phase Status

| Phase | Status | Landed in |
| --- | --- | --- |
| Phase 0 — Cron-endpoint audit | Done (analysis only, no code) | n/a |
| Phase 1 — Raise function timeout to 60 s | Done | [#246](https://github.com/brandonma25/bootupnews/pull/246) |
| Phase 2 — Decouple from Vercel Cron + `x-cron-secret` auth | Done | [#247](https://github.com/brandonma25/bootupnews/pull/247) |
| Cron-job.org sync tooling | Done | [#248](https://github.com/brandonma25/bootupnews/pull/248) |
| Phase 3 — Branch C E3 idempotency | Done | [#249](https://github.com/brandonma25/bootupnews/pull/249) |
| Phase 4 — `/api/cron/health` + Notion Pipeline Log + Source Health Log writer | Done | [#250](https://github.com/brandonma25/bootupnews/pull/250) |
| Phase 4.5 — Source circuit breaker + Sentry filter | Done | [#251](https://github.com/brandonma25/bootupnews/pull/251) |
| Phase 5 — ARCHITECTURE / CRON_SETUP (full) / OBSERVABILITY docs + CHANGELOG | Done | [#252](https://github.com/brandonma25/bootupnews/pull/252) |
| Phase 6 — Activate `bootup-health-check-1215-utc` in `scripts/cron-jobs.config.ts` | Done | [#258](https://github.com/brandonma25/bootupnews/pull/258) |
| Phase 7 (Path-A Task 1) — Consolidate ingestion to one 12:00 UTC trigger + Supabase `cron_runs` run-lock + `(briefing_date, source_url)` upsert | Done | [#260](https://github.com/brandonma25/bootupnews/pull/260) |
| Phase 7.1 — Run-lock hardening (reclaim stale/fail/timeout + fail-closed on null service-role client) | In Review | this PR |

### Phase 7 — Operational history (Path-A Task 1, 2026-05-21)

The dual-ingestion schedule (10:15 + 11:45 UTC) shipped in Phase 4 was the
root cause of the 5–7× duplicate-rows-per-article symptom in the Notion
Editorial Queue: both runs succeeded daily, and the Notion writes were not
cross-run idempotent. Path A of the May 21 execution handoff collapsed the
schedule to a single canonical run at 20:00 Asia/Taipei (= `0 12 * * *` UTC)
and introduced a Supabase `cron_runs(briefing_date PK)` guard table that the
cron handler claims with `INSERT … ON CONFLICT DO NOTHING` before scheduling
`after(executePipelineWork)`. A second cronjob.org HTTP fire — or a Vercel
Hobby double-delivery during the rollback escape hatch — sees the existing
claim and responds `HTTP 200 status=skipped` without scheduling pipeline
work. As a second line of defense, both `signal_posts` writer paths
(`persistSignalPostCandidates` and `/api/editorial/push-approved`) now
upsert on `(briefing_date, source_url)`; the partial unique index that backs
this is created in the same migration, alongside a small cleanup that
removed 7 legacy garbage rows on 2026-05-17 (Axios webfont CDN URLs +
Politico tracking redirectors the pre-`isValidPublicSourceUrl` writer
captured as "stories"). The health-check job at 12:15 UTC stays as-is and
gives the single ingestion 15 minutes to settle before the alertable check
fires.

### Phase 7.1 — Run-lock hardening (issue #264, 2026-05-22)

Phase 7's first-pass run-lock had two defects surfaced during operator
verification on 2026-05-21:

1. **Fail-closed-and-stuck.** `tryAcquireRunLock` returned `acquired=false`
   on any PK conflict regardless of the existing row's status, so a single
   row with `status='fail'` / `status='timeout'` / stale `status='running'`
   stranded the entire `briefing_date` — every subsequent fire (including
   the next scheduled cron) returned `HTTP 200 status=skipped` and the day
   silently produced no editorial queue. For a daily product that runs
   unattended, one transient failure could cause a no-briefing day with no
   alert.
2. **Silent fall-through on Supabase blip.** When
   `createSupabaseServiceRoleClient()` returned null (env mid-propagation
   during a deploy swap), the route logged a warning and proceeded WITHOUT
   the lock. During the 15:10:56Z fire on 2026-05-21, this caused two
   concurrent ingestion attempts to both pass the gate. The single-execution
   guarantee silently evaporated during any service-role configuration blip.

Fix:

- **Status-aware reclaim** in `tryAcquireRunLock`. On PK conflict, SELECT
  the existing row's `status` and `started_at`. Branch:
  - `status IN ('fail','timeout')` → DELETE the carrion, retry INSERT,
    return `{ acquired: true, reason: "reclaimed_fail" | "reclaimed_timeout" }`.
  - `status='running'` AND age > `RUN_LOCK_STALE_MS` (70 s) → reclaim as
    stale (matches `INTERNAL_PIPELINE_TIMEOUT_MS=55 000` + a 15 s buffer for
    Sentry flush and writeback; anything older is from a dead function
    instance).
  - `status='running'` AND fresh → return
    `{ acquired: false, reason: "in_progress" }` so the second call no-ops.
  - `status='ok'` → return
    `{ acquired: false, reason: "already_completed" }`.
- **Fail-closed on null service-role client.** When the client is null,
  the route now `Sentry.captureMessage(..., level: "error")`, flushes, and
  returns HTTP **503** without scheduling the pipeline. cron-job.org's
  `notifyOnFailure` flag will email the operator. Documented policy choice:
  a missed run is recoverable on the next scheduler trigger; a concurrent
  double-run produces duplicate Notion writes and corrupts downstream
  tier/rank accounting.
- **Non-conflict insert errors** are now also fail-closed (HTTP 503) for the
  same reason — without a successful claim we can't safely run.

Test coverage in `src/app/api/cron/fetch-editorial-inputs/route.test.ts`
(five new cases): reclaim 'fail', reclaim stale 'running', reject fresh
'running' as `in_progress`, reject 'ok' as `already_completed`, and null
service-role client never schedules the pipeline + emits Sentry + returns
HTTP 503.

### Phase 7.2 — cron-job.org consolidation actually applied (2026-05-22)

PR #266 shipped the run-lock fix but the live cron-job.org state was still
diverged from the repo config: three legacy jobs (`bootup-ingestion-1015-utc`,
`bootup-ingestion-1145-utc`, an undocumented `bootup-health-check-1100-utc`
that the As-Built had silently aged out of sync) kept firing, and the two
config-defined jobs (`bootup-ingestion-1200-utc`, `bootup-health-check-1215-utc`)
didn't exist yet. The first `npm run cron:sync:prune` consumed the new
`CRONJOB_API_KEY` operator value, deleted all three orphans, created the
ingestion job, and **bounced off cron-job.org's burst-write throttle on the
second create with `HTTP 429: null`** — the summary correctly reported
`created=1 failed=1`. A direct `PUT /jobs` from `curl` a few seconds later
created the health-check job (jobId 7646665) without further issue.

Final live state confirmed via `GET https://api.cron-job.org/jobs`:

| UTC | Job | Endpoint | jobId | Header |
| --- | --- | --- | --- | --- |
| 12:00 | `bootup-ingestion-1200-utc` | `/api/cron/fetch-editorial-inputs` | 7646662 | rotated `x-cron-secret` ✓ |
| 12:15 | `bootup-health-check-1215-utc` | `/api/cron/health` | 7646665 | rotated `x-cron-secret` ✓ |

Operational lesson captured in [`docs/engineering/CRON_SETUP.md` §6 → Burst-rate gotcha](../../engineering/CRON_SETUP.md#burst-rate-gotcha-observed-2026-05-22): high-churn syncs (multiple creates + multiple deletes) can interleave reads and writes tightly enough to trip an apparent per-window throttle even when the daily 100-request cap is nowhere near exhausted. The script's `failed=N` summary line accurately reflects this; the workaround is either re-running the sync (idempotent) or a single direct `PUT` for the missed job.

### Phase 7.3 — Partial-index ON CONFLICT mismatch (issue #268, 3-day production outage 2026-05-21 → 2026-05-23)

**Severity:** load-bearing. Production ingestion silently failed every cron fire for 3 consecutive days. Zero `signal_posts` rows were written between 2026-05-21 10:15Z (the last fire under pre-PR-260 code) and the fix landing. `cron_runs.status='fail'` every day; Sentry surfaced BOOT-UP-WEB-6 (RSS signal post persistence failed during daily refresh) and BOOT-UP-WEB-7 (Current RSS Top 5 snapshot could not be persisted for editing) but those wrappers carried no Postgres-side error message.

**Root cause:** PR #260's migration `20260521120000_cron_runs_and_source_url_idempotency.sql` created `signal_posts_briefing_date_source_url_key` as a **partial** unique index (`WHERE source_url IS NOT NULL`). The same PR switched `persistSignalPostCandidates` to `.upsert(rows, { onConflict: "briefing_date,source_url", ignoreDuplicates: true })`. supabase-js translates this to a bare `ON CONFLICT (briefing_date, source_url) DO NOTHING` with no `WHERE` predicate. Postgres requires the partial-index's predicate to be repeated in the conflict-inference clause; without it the planner cannot match any unique index and aborts the entire INSERT batch with `SQLSTATE 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`. The vitest mock at `signals-editorial.test.ts:~478` implements `.upsert()` as a JS stand-in that does NOT enforce ON CONFLICT inference semantics, so 795 green tests never caught the bug.

**Why detection lagged 3 days:** the new consolidated 12:00 UTC schedule didn't start firing until 2026-05-22 (after `cron:sync:prune` ran), so the first failing run under post-PR-260 code was 05-22 12:00. Sentry events landed but were classified as transient feed/persistence issues. `cron_runs` rows showed `status='fail'` with duration ~25–30s — within budget, ruling out the timeout hypothesis only on the third day's diagnostic deep-dive.

**Fix (PR #268-fix):** four parts, one PR.

1. **App** — `persistSignalPostCandidates` rewritten to a select-then-decide flow (mirrors PR #266's `pushApprovedRow`): SELECT existing `source_url`s for the briefing_date → filter candidate rows to non-present → plain `.insert()` for the rest. No `.upsert()`, no `ON CONFLICT`. The SELECT → INSERT race window is closed at the orchestration layer by the `cron_runs` run-lock from PRs #260 + #266.
2. **Audit** — every signal_posts writer enumerated. `pushApprovedRow` already uses `.insert()`/`.update()` via PR #266. `promoteNewsletterStoryToCandidate` uses plain `.insert()` (no upsert). No other writers exist.
3. **Index decision** — the partial unique index `signal_posts_briefing_date_source_url_key` is **kept as a passive data-integrity guard**. After Part 1, no writer uses it for `ON CONFLICT` inference, so the partial predicate no longer creates a footgun. It still prevents duplicate non-NULL `(briefing_date, source_url)` pairs from any future writer, with zero behavior cost.
4. **Test gap** — new lint-style guard at `src/lib/signal-posts-writers.guard.test.ts` scans all production `.ts` files and fails if any production code calls `.upsert(...)` against `signal_posts`. The relax-the-rule conditions ((a) all relevant indexes non-partial, and (b) integration test against real Postgres) are documented in the test file's header so deleting the rule forces the review conversation. Additionally, the mock's known gap is now explicitly documented at `signals-editorial.test.ts:~478` so future editors know what the mock does NOT enforce.

**Operational lesson:** supabase-js's `.upsert({onConflict})` cannot match partial unique indexes. Any future migration adding a partial unique index that a JS-client upsert needs to target MUST be paired with either (a) a non-partial sibling index, or (b) a switch to select-then-decide / RPC. The guard test enforces this at PR review time.

### Phase 7.4 — `cron_runs.status='warn'` for degraded runs (Track 2 P1, 2026-06-04)

**Severity:** observability fidelity. Production ingestion runs since 2026-05-22 wrote `cron_runs.status='ok'` on degraded paths (RSS healthy + newsletter dead), collapsing the three-state Pipeline Log ladder (`ok`/`warn`/`fail`) into two states at the guard-table layer. `cron_runs` was therefore useless as a gauge — every RSS-healthy run read clean regardless of newsletter state.

**Root cause:** The CHECK constraint on `cron_runs.status` from PR #260's migration (`20260521120000_cron_runs_and_source_url_idempotency.sql`) allowed only `('running','ok','fail','timeout')`. The `'warn'` value used elsewhere in the Pipeline Log schema would have thrown a constraint violation if written to `cron_runs`, so `finalizeRunLock` defensively collapsed `warn → ok`. Track 2 P1 (PR #289) introduced the three-state Pipeline Log but kept the same `cron_runs` write contract.

**Fix:** migration `supabase/migrations/20260604070000_cron_runs_add_warn_status.sql` drops the existing CHECK constraint and re-adds it with `'warn'` included (`'running'`, `'ok'`, `'warn'`, `'fail'`, `'timeout'`). `finalizeRunLock`'s parameter type widens to accept `'warn'`, and the call site in `route.ts` now passes `pipelineLogStatus` through directly rather than collapsing the degraded case.

**Migration ordering is load-bearing:** the migration must land **before** any code path that writes `'warn'` to `cron_runs` (this PR's writes, plus the in-flight Track 2 P6 health-check rewrite). If P6 ships first, its `'warn'` write throws the constraint violation and the health-check row finalize silently drops — recreating the same depth-layer dark-write class as the cron_runs failure PR #275 fixed.

**Operator behavior preserved:** cron-job.org's failure trigger keys on HTTP status, NOT on `cron_runs.status`. The ingestion endpoint still returns 202 on degraded runs, so `'warn'` is observable in `cron_runs` and Pipeline Log without paging.

### Phase 7.5 — Full-pipeline dry-run validation harness (Track 2, 2026-06-06)

**Problem this closes:** every pipeline change had a ~24-hour feedback loop — the only end-to-end exercise of sweep → newsletter → RSS → staging was the 12:00 UTC cron tick. A regression (e.g. the newsletter leg silently dying) was invisible until the next day's run, and even then read as a *fast green* rather than a failure. This phase adds one command that runs the whole pipeline in dry-run in <1 min, writing nothing to prod.

**Blessed safe command:** `npm run pipeline:dry` → `scripts/pipeline-dry-run.ts` → `runFullPipelineDryRun()` (`src/lib/pipeline/full-dry-run.ts`). Prints a capability matrix + per-stage timing + feature-validation counts, and writes a JSON artifact to `.pipeline-runs/` (gitignored).

**PART 0 — capability matrix (the anti-false-success floor).** Before any stage runs, `runPreflight()` (`src/lib/pipeline/preflight.ts`) probes each stage's real dependency (network egress, Supabase `cron_runs` read, Notion `users/me`, Gmail creds presence) and emits a three-state-per-stage matrix that the report never collapses:

- `ran` — executed against a real, reachable dependency.
- `skipped` — creds/dependency absent; the **exact** missing var or `no egress` is named, and `stage_ms = N/A` (never `0`).
- `degraded` — ran, but the dependency returned nothing (e.g. all feeds failed → `candidate_pool_insufficient`).

The specific trap this closes: newsletter with a missing Gmail credential now reports `skipped (missing GMAIL_REFRESH_TOKEN)` with `newsletter_ms = N/A` — **never** `newsletter_ms ≈ 0 + items = 0`, which reads as "fast and fixed" and reincarnates the cron-green-while-newsletter-was-dead failure class from Phase 7.4.

**PART 1 — coverage with no logic fork.** The harness calls the SAME production functions in dry mode — `runNeedsReviewSweep` (forced `NEEDS_REVIEW_SWEEP_DRY_RUN=true`), `runNewsletterIngestion({ dryRun: true })`, `runControlledPipeline(… PIPELINE_RUN_MODE=dry_run)`, and `runEditorialStaging({ dryRun: true })`. A new `dryRun` flag on `runEditorialStaging` + `writeEditorialQueueRow` keeps the same-day + cross-date (P4) Notion **READ** lookups (so the computed insert/update/skip action is the real one) while skipping every `createRow`/`updateRow` **WRITE** and the completion email. Asserted by `notion-writer.test.ts` (dryRun does reads, zero `/v1/pages` writes).

**PART 2 — shared timing util.** `StageTimer` (`src/lib/pipeline/stage-timing.ts`) emits `stage_ms { sweep, newsletter, rss, staging, total }`; `markSkipped` records `"N/A"`, never `0`. Built once, intended for reuse by the live cron route's timing breadcrumb (timeout-bundle FIX 3).

**PART 3 — feature-validation visibility.** The report surfaces `candidatesFilteredEvergreen` (P7), `notionRowsSkippedDuplicateAcrossDates` (P4 cross-date would-skip), newsletter items processed, and selected core/context counts — so a change to any of those levers is observable in one place.

**PART 4 — footgun guardrail (default-safe).** `runControlledPipeline` now refuses the only persisting mode (`draft_only`) unless `PIPELINE_RUN_CONFIRM_WRITES=1` is explicitly set; `dry_run` is always allowed. `npm run pipeline:controlled-test` now defaults to `PIPELINE_RUN_MODE=dry_run`. No run can write to prod by accident. Asserted by `controlled-runner.test.ts` (PART 4 guardrail describe).

**PART 5 — graceful all-sources-failed degrade (also a production fix).** `captureRssFailure` / `logRssEvent` (`src/lib/observability/rss.ts`) crashed with `Sentry.withScope is not a function` whenever the Sentry SDK was not initialized (any plain node/tsx/CI process, and any code path that reached the RSS failure handler before init). On an all-feeds-failed run this took the whole RSS leg down on the FIRST feed failure instead of degrading. Fix: guard every Sentry call (`typeof Sentry.withScope !== "function"` and `Sentry.logger?.[level]?.()`) so the JSON structured log still fires and ingestion degrades to `candidate_pool_insufficient` rather than throwing.

**CI-vs-local split (load-bearing):** CI runners have no egress and no prod secrets, so on CI every stage resolves to `skipped`/`degraded` and the suite exercises the **logic + degrade** paths (PART 5, the fixture/guard tests) only. The **live-fetch + real-timing** path runs **LOCAL** (`npm run pipeline:dry` with `.env.local`). Both are valid; the matrix names which one ran.

**SCOPE BOUNDARY (stated in the report and the PR):** a local node process has **no 60s ceiling**. This harness validates pipeline **logic + relative stage timing** only — it **CANNOT certify the Vercel 60s timeout is fixed**. `report.certifies60sFit` is hard-coded `false`; "does it fit in 60s on Vercel" requires a deployed (preview/prod) test. This is deliberately decoupled from the decouple-legs / timeout work.

**Files:** new — `src/lib/pipeline/{preflight,full-dry-run,stage-timing}.ts` (+ tests), `scripts/pipeline-dry-run.ts`, `src/lib/observability/rss-sentry-guard.test.ts`. Changed — `src/lib/observability/rss.ts` (PART 5 prod fix), `src/lib/editorial-staging/{notion-writer,runner}.ts` (dryRun), `src/lib/pipeline/controlled-runner.ts` (PART 4 guard), `package.json` (`pipeline:dry` + safe controlled-test default).

**No schema changes, no migrations, no P4/P7 logic changes, no stage moved off the critical path** (that is the decouple-legs PR). Read-only fetches against prod Supabase/Notion are intentional (real P4 dedup data); zero writes occur.

### Phase 7.6 — Pipeline-body unification: harness runs the real prod sequence (Track 2, 2026-06-07)

**Problem this closes (found in the Phase 7.5 pre-merge review):** the dry-run harness had its own COPY of the stage sequence and ran the RSS leg through `runControlledPipeline(dry_run)` instead of the production `runDailyNewsCron`. A green `npm run pipeline:dry` therefore did not exercise the function prod actually calls for RSS — `runDailyNewsCron`'s seed-fallback gate, degraded-flag logic, and signal_posts snapshot path were all unvalidated by the harness. The fork could silently drift from prod.

**Fix — one shared body.** New `src/lib/pipeline/editorial-ingestion-pipeline.ts` exports `runEditorialIngestionPipeline({ dryRun, now, runStage })`: the single newsletter → RSS → staging sequence (prod order; newsletter first for rank-slot reservation). It is called by BOTH:

- the production cron `/api/cron/fetch-editorial-inputs` (`dryRun: false`, inside the existing run-lock + 55s internal-timeout + Pipeline-Log/Source-Health wrapper), and
- the harness `runFullPipelineDryRun` (`dryRun: true`).

Each consumer injects a `runStage` wrapper for its own concerns (the route: per-stage timeout attribution + degrade-don't-throw; the harness: `StageTimer` timing + outcome capture). After this, **the only difference between a dry run and the real 12:00 UTC run is that dry mode persists nothing.**

**`runDailyNewsCron` gained a `dryRun` param** that threads `persistPipelineCandidates: !dryRun` into `generateDailyBriefing`, skips the `persistSignalPostsForBriefing` snapshot write, and skips the RSS cron-monitor check-in. `dryRun` defaults `false`, so the prod call is byte-for-byte unchanged (the 23 route tests stay green). The RSS dry leg is genuinely zero-write — verified: `ingestRawItems` performs no Supabase writes, and the only writers (`persistNormalizedArticleCandidates` / cluster / ranking) sit inside `if (shouldPersistArticleCandidates)`.

**Harness behavior change — run-all-like-prod.** The harness now RUNS every stage exactly as prod would; the capability matrix is a **pre-check** that names missing dependencies. A missing credential surfaces as that stage's real `error`/`degrade` (with the matrix reason attached), not a tidy `skipped`. This is strictly more faithful: the dry run's control flow is identical to the cron's. (The earlier skip-on-missing behavior from Phase 7.5 is replaced.)

**Evidence:** 925 unit tests green (incl. 23 route tests unchanged + rewritten harness tests asserting run-all + dryRun threading + the shared body). `npm run pipeline:dry` against a no-creds sandbox now exercises the real `runDailyNewsCron` and correctly reports its seed-fallback gate as an RSS error — proof the real prod RSS path is now in the loop. Lint + build clean.

**Still does NOT certify the Vercel 60s fit** (`certifies60sFit: false`). That requires a deployed test — the next step is a guarded, read-only `?dryRun=1` trigger on the cron route so the unified body can be run on a preview deployment under the real serverless budget on demand (no 24h wait).

### Phase 7.7 — Ingestion-leg decoupling: the structural 60s-timeout cure (Track 2, 2026-06-07)

**Root cause (confirmed across sessions + data):** one HTTP request ran newsletter → RSS → staging inside a single 60s Vercel function. After Gmail was restored, the newsletter leg actually fetches/parses (~33s) and STARVED RSS + staging — the 06-06 12:00 UTC tick staged 11 rows, ALL newsletter-sourced, ZERO RSS, and `cron_runs` recorded `timeout` (06-06/05 `timeout`, 04/03 `fail`). The fix is to stop sharing one 60s clock: give each leg its own invocation/budget. This does NOT create 120s — it creates two INDEPENDENT 60s budgets so neither leg can starve the other. It changes WHERE work runs, not WHAT it produces.

**New topology** (each endpoint = its own Vercel function = its own 60s budget; all go through the ONE shared `runEditorialIngestionPipeline` via the `stages` subset + the shared `cron-endpoint-runtime`, no fork):

| Endpoint | Stages | Run-lock |
| --- | --- | --- |
| `/api/cron/fetch-editorial-inputs` | RSS → staging (the briefing pipeline) | **keeps** `cron_runs[briefing_date]` |
| `/api/cron/ingest-newsletters` (NEW) | newsletter | lock-free |
| `/api/cron/sweep` (NEW) | P8 needs_review sweep | lock-free |

**Newsletter → staging hand-off is DB-based** (investigation, settled): the newsletter endpoint writes `newsletter_emails` + `newsletter_story_extractions`; the briefing endpoint's `runEditorialStaging` READS them back (`fetchNewsletterCandidates`, keyed on the day's `received_at` window). No in-memory hand-off — decoupling is clean. **Schedule ordering is load-bearing:** the newsletter endpoint must fire ~10 min BEFORE the briefing endpoint (e.g. 11:50 UTC) so the extractions exist when staging reads them.

**Run-lock design (no-migration constraint):** `cron_runs`' PK is `briefing_date` ALONE (verified), so three endpoints can't each hold a per-day lock row without a migration (out of scope). The **briefing endpoint keeps the lock** — it owns the non-idempotent writes (signal_posts snapshot + Notion staging) that most need double-fire protection. The newsletter + sweep endpoints run **lock-free**, safe because:
- **Newsletter:** `insertNewsletterEmail` is now conflict-safe — a `gmail_message_id` UNIQUE-violation (Postgres 23505) is caught and reported `skipped_existing` (no throw, no duplicate row) on a concurrent double-fire. Email-level dedup is DB-enforced by `newsletter_emails_gmail_message_id_key`.
- **Sweep:** `runNeedsReviewSweep` is a bounded, idempotent UPDATE with no non-idempotent side effects — a double-fire converges to the same end state.

**Instrumentation:** each endpoint emits `stage_ms` (its stages + total) via the shared `StageTimer` → `logServerEvent` + a Pipeline Log entry, with a best-effort Sentry flush on internal timeout naming the in-flight stage. **FIX 2:** Pipeline Log rows now set `Name = ${runType} — ${YYYY-MM-DD}` on every write (new `newsletter_ingestion` run type added).

**Equivalence:** the combined output of (newsletter + briefing + sweep) equals the prior single-request run given the same inputs — a unit test proves the decoupled flow calls the same leaf functions with the same args as a single-request run. 962 unit tests green; lint + build clean.

**Honesty:** the `?dryRun=1` preview trigger remains the explicitly-deferred follow-up. The decouple does NOT itself certify the 60s fit — the first real decoupled tick (after BM adds the cron-job.org entries) is the proof: expect `fetch-editorial-inputs` well under 60s (`ok`, not `timeout`) and RSS contributing again.

**BM actions:** add cron-job.org entries for `/api/cron/ingest-newsletters` (~11:50 UTC, before the briefing) + `/api/cron/sweep`; keep the existing `/api/cron/fetch-editorial-inputs` entry (now RSS→staging); set `NOTION_SOURCE_HEALTH_LOG_DB_ID` in Vercel + delete the orphan `NOTION_SOURCE_HEALTH_DB_ID` (FIX 1).

## Closeout Checklist

- Scope completed: all phases (0–5) plus the cron-job.org sync tooling landing.
- [x] Terminology check completed: Article, Story Cluster, Signal, Card, and Surface Placement are used according to the canonical terminology document.
- [x] PRD clearly states which object level the feature modifies.
- [x] PRD does not describe UI cards as signals unless referring to the underlying Signal object.
- Tests run: vitest unit suite (last green: 99 files / 730 tests on Phase 4.5) + per-phase targeted tests; lint and build clean on every phase PR.
- Local validation complete: yes, per-phase.
- Preview validation complete: Vercel preview deployed and reviewed on every phase PR. cron-job.org execution remains a production-only validation step performed by the operator after merge.
- Production sanity check complete: the operator's post-merge checklist lives in [`docs/engineering/CRON_SETUP.md` §2](../../engineering/CRON_SETUP.md#2-first-time-sync) and [`docs/engineering/OBSERVABILITY.md`](../../engineering/OBSERVABILITY.md). Production wiring (cron-job.org jobs + Vercel env vars + Notion databases) is owned by BM.
- PRD summary stored in repo: yes (this file).
- Bug-fix report stored in repo, if applicable: n/a (new system).
- `docs/product/feature-system.csv` updated if PRD/feature metadata changed: yes. Row will flip from `In Progress` / `build` to `Built` / `keep` on this PR's merge.
- Public documentation or PR evidence complete: yes. Per-phase protocol updates in [`docs/engineering/protocols/editorial-automation-operating-guide.md`](../../engineering/protocols/editorial-automation-operating-guide.md). Notion database schemas in [`docs/engineering/reports/notion-pipeline-log-schema.md`](../../engineering/reports/notion-pipeline-log-schema.md) and [`docs/engineering/reports/notion-source-health-schema.md`](../../engineering/reports/notion-source-health-schema.md). Reviewer-facing runbook + architecture in [`docs/engineering/ARCHITECTURE.md`](../../engineering/ARCHITECTURE.md), [`docs/engineering/CRON_SETUP.md`](../../engineering/CRON_SETUP.md), [`docs/engineering/OBSERVABILITY.md`](../../engineering/OBSERVABILITY.md). Initiative-level summary in [`CHANGELOG.md`](../../../CHANGELOG.md).
- Google Sheet / Google Work Log not treated as canonical or updated for routine completion: confirmed.
