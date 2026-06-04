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
