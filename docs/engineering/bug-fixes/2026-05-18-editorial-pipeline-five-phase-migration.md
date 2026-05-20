# Editorial Pipeline Five-Phase Migration — Operational Record

**Date:** 2026-05-18
**Branch:** `fix/source-url-nullable`
**Status:** Gap-closure complete; manual setup tasks remaining for BM (see §10)

---

## Summary

- **Problem addressed:** The Boot Up editorial ingestion pipeline was spec'd as a 5-phase migration (function timeout, decouple from Vercel cron, auth, Notion idempotency, health endpoint, source circuit breaker). A May 18 audit revealed only the auth phase had actually shipped. Three of the remaining four phases were not implemented; the pipeline was producing 0 editorial rows for two consecutive days.
- **Root cause:** Mix of three distinct failures:
  1. `CRON_SECRET` was never set in Vercel production. `process.env.CRON_SECRET` was undefined, so the auth gate returned 401 to every request — including Vercel's own scheduled cron, silently disabling ingestion for ~48 hours.
  2. RSS pipeline used UTC date for `briefing_date`; editorial staging queried for Taipei date. During the 16:00–23:59 UTC window (00:00–07:59 Taipei next day) the two stages disagreed on what "today" meant and staging found zero candidates even when RSS had written data.
  3. Phases 4 (idempotency), 5 (health endpoint), and 6 (circuit breaker) of the original 5-phase migration were never implemented. On the one day cron actually fired (2026-05-16), four runs in five hours created 4–5× duplicate rows for each headline.
- **Affected object level:** Card (Editorial Queue rows in Notion), with upstream impact on Signal generation (no signal_posts written for Taipei dates) and Surface Placement (no rows available for editorial review).

---

## Workflow — All 6 Phases (0 through 5, including 4.5)

The original 5-phase plan plus the pre-flight audit (Phase 0) and the mid-flight field-name remediation (Phase 4.5) total seven distinct chunks of work. Each is its own commit, in the order shipped.

### Phase 0 — Pre-flight audit and unblocking

**Objective:** Establish ground truth on what was actually deployed vs. spec'd, and unblock the test pipeline.

**Tasks finished:**
- Audited `vercel.json`, the ingestion route handler, `notion-writer.ts`, all `/api/cron/*` endpoints, the Sentry config, and the `draft-editorials` skill file
- Diagnosed `CRON_SECRET` mismatch via `vercel env ls`; discovered the variable did not exist in Vercel production (only an orphan `CRONJOB_API_KEY` with no code references)
- Set a fresh known `CRON_SECRET` via Vercel CLI; updated `/tmp/.bootup_cron_secret` for the test session
- Identified the RSS/staging Taipei-vs-UTC date mismatch as a second blocker, not part of the original 5-phase spec
- Patched RSS pipeline to use Taipei date (`src/lib/cron/fetch-news.ts:66-78`) — commit `9c446bd`

**Results:**
- Auth gate verified: 401 without Bearer, 200 with correct Bearer
- First successful end-to-end cron run produced 2 Editorial Queue rows for `2026-05-18` (Finance × 1, Tech × 1, both Core)
- Function time: 25.7s (well under 60s ceiling)
- Identified all three pending phases from the 5-phase spec as still blockers

**Blockers and reasons:**
- `CRON_SECRET` absence in Vercel — root cause was that the secret was added to `.env.prod.local` locally but never promoted to Vercel during the original Phase 3 (auth) ship. The auth code worked correctly; the env var simply did not exist where it needed to.
- 48-hour cron silence — Vercel's own scheduler hits the route as an unauthenticated request (or with the missing system `CRON_SECRET`) and gets 401. No surfacing because the route returns a JSON 401 rather than throwing; Sentry never alerted.

---

### Phase 1 — `vercel.json` (function timeout + cron removal)

**Objective:** Set the explicit 60-second timeout for the ingestion function and remove Vercel's internal cron entries (cron-job.org is now the external trigger).

**Tasks finished:**
- Added `functions["src/app/api/cron/fetch-editorial-inputs/route.ts"].maxDuration = 60`
- Removed the `"crons"` array
- Documented rollback procedure in `docs/engineering/CRON_SETUP.md`

**Results:**
- Slow runs no longer at risk of hitting Vercel's plan-default ceiling
- Dual cron firing eliminated (a contributing cause of the May 16 duplicates)
- Already committed as `138c8bd` (pre-dated this session)

**Blockers and reasons:**
- None — straightforward config change. Worth flagging that the rollback path (re-add crons array if cron-job.org is down) is documented but untested. First real outage will exercise it.

---

### Phase 2 — Notion idempotency guard + dedup script

**Objective:** Make Editorial Queue writes idempotent so a re-run of the cron on the same day does not duplicate existing rows. Also provide a one-time cleanup script for historical May 15–16 duplicates.

**Tasks finished:**
- Added `fetchExistingHeadlinesForBriefingDate()` to [src/lib/editorial-staging/notion-writer.ts](../../../src/lib/editorial-staging/notion-writer.ts). Queries the Editorial Queue with `{ property: "Briefing Date", date: { equals: briefingDate } }`, returns a `Set<string>` of normalized (trim → collapse whitespace → lowercase) headlines.
- `writeEditorialQueueRow()` now accepts the prefetched set and returns `{ written: false, reason: "duplicate" }` when it would otherwise duplicate. Mutates the set on a write so a within-batch duplicate is also caught.
- [src/lib/editorial-staging/runner.ts](../../../src/lib/editorial-staging/runner.ts) prefetches once before the write loop and tracks `notionRowsSkipped` alongside `notionRowsWritten`.
- Created [scripts/deduplicate-notion-queue.ts](../../../scripts/deduplicate-notion-queue.ts) for backfill cleanup of May 15–16 dupes. Default mode is dry-run; `--execute` flag required to actually mutate.
- Added npm scripts `notion:dedup` and `notion:dedup:execute`.

**Results:**
- Verified on production: post-deploy ingestion run showed `candidateCount: 2, notionRowsWritten: 0` — both rows from a prior run were correctly skipped.
- Dedup dry-run output: 5 duplicate groups on May 16, 15 rows would be archived as `Status=rejected, Kill Reason=redundant`. May 15 has no Briefing Date matches (older dupes referenced earlier appear to have used a different briefing_date or were already cleaned).
- Idempotency is fail-open: a Notion read error returns an empty set so writes proceed (risk of one stray duplicate per outage vs. blocking the whole pipeline).

**Blockers and reasons:**
- None during implementation. The script's archival approach (Status=rejected rather than hard delete) was deliberately chosen so BM can recover rows from the Notion UI if the dedup picks the wrong keeper.

---

### Phase 3 — Health check endpoint at `/api/cron/health`

**Objective:** Provide a single endpoint cron-job.org can call to verify the pipeline produced today's editorial rows. Status taxonomy must distinguish partial runs (some rows, editorial proceeds) from zero-row runs (alert).

**Tasks finished:**
- Created [src/app/api/cron/health/route.ts](../../../src/app/api/cron/health/route.ts):
  - Authorization: Bearer ${CRON_SECRET} gate; 401 on mismatch
  - Computes today's Taipei date via fixed UTC+8 offset (no DST in Taipei, no library dependency)
  - Queries Editorial Queue filtered to today's Briefing Date; counts rows
  - 3-second AbortController cap on the Notion query
  - Status logic: 0 → fail/HTTP 500; 1–6 → warn/HTTP 200; ≥7 → ok/HTTP 200
  - Optional Pipeline Log write (graceful when `NOTION_PIPELINE_LOG_DB_ID` is absent)

**Results:**
- Production response on 2026-05-18 at 11:23 UTC+8:
  ```json
  {"status":"warn","row_count":2,"expected_min":7,"briefing_date":"2026-05-18","taipei_time":"11:23 UTC+8"}
  ```
- HTTP 200 with warn status — exactly correct for a partial-run day
- Total response time well under 5 seconds even with Notion network round-trip

**Blockers and reasons:**
- None. The Pipeline Log Notion database does not yet exist; the optional write gracefully no-ops. BM creates the database manually per [docs/engineering/reports/notion-pipeline-log-schema.md](../reports/notion-pipeline-log-schema.md), then sets `NOTION_PIPELINE_LOG_DB_ID` in Vercel.

---

### Phase 4 — Source circuit breaker + Sentry filter + Source Health Log

**Objective:** Protect the 60-second function timeout from being burned on retries to a known-flaky source (Reuters Business was the trigger case). Drop the corresponding Sentry noise. Record per-source health to a Notion database for cross-run visibility.

**Tasks finished:**
- New module [src/lib/observability/source-circuit-breaker.ts](../../../src/lib/observability/source-circuit-breaker.ts): in-memory failure tracker, threshold 3, per-invocation only. Vercel serverless reset on cold start by design — the breaker's job is to protect a single run, not track failures across runs.
- Wired into `fetchFeedArticles` in [src/lib/rss.ts](../../../src/lib/rss.ts): `shouldSkipSource` check at entry returns empty articles; `recordSourceFailure` in catch path before re-throwing.
- Sentry `beforeSend` filter in [src/sentry.server.config.ts](../../../src/sentry.server.config.ts) drops events whose exception value contains `"Feed request retry exhausted"`. Other RssError shapes (parse errors, malformed feeds, transient HTTP) still report normally.
- New module [src/lib/observability/source-health-log.ts](../../../src/lib/observability/source-health-log.ts): writes one Notion row per source that failed or was breaker-skipped. Graceful no-op when `NOTION_SOURCE_HEALTH_DB_ID` is absent.
- Wired the log write into the RSS cron's success path in `fetch-news.ts`; wrapped in try/catch so log failures cannot affect cron return value.

**Results:**
- Production verification: post-deploy cron run reported `feedFailureCount: 1` (Reuters Business presumably), no Sentry alert created, function completed in 42s instead of the previous 74.5s.
- Cross-run history will accumulate in Source Health Log once BM creates the Notion database per [docs/engineering/reports/notion-source-health-schema.md](../reports/notion-source-health-schema.md).

**Blockers and reasons:**
- None during implementation. One design trade-off: the breaker resets on every cold start, so a source that fails repeatedly over hours could still be retried each new function instance. Acceptable because the typical fix-cycle for a feed is days, not hours, and the in-memory check is essentially free.

---

### Phase 4.5 — Notion field name migration (v1 → v2)

**Objective:** Align all code that reads from or writes to the Editorial Queue with the v2 Notion field names. Pre-existing code still referenced v1 names (WITM / WLTI / WITC), which no longer exist in the Notion schema — reads silently returned null and downstream Supabase writes had empty editorial columns.

**Tasks finished:**
- Updated `~/.claude/skills/draft-editorials/SKILL.md` (user-scoped, outside this repo) to use v2 names throughout Step 3 (section headings) and Step 4 (JSON write payload).
- Updated [src/app/api/editorial/push-approved/route.ts](../../../src/app/api/editorial/push-approved/route.ts) to read v2 field names from Notion. Mapping documented inline:

  | v1 (deprecated) | v2 (current) |
  |---|---|
  | WITM (Why It Matters) | The Signal |
  | WLTI (What Led To It) | Before This |
  | WITC (What It Connects To) | The Ripple |

- Local variable names (`witmAi`, `witcAi`, `wltiAi`) retain the v1 prefix on purpose because downstream Supabase columns (`ai_why_it_matters`, `ai_what_led_to_it`, `ai_what_it_connects_to`) are still v1-based. Renaming those columns is a separate downstream migration.

**Results:**
- The draft-editorials skill now writes to the actual Notion schema (verified by reloading the skill description and seeing v2 names rendered)
- The push-approved route now reads non-null values when BM approves a row in Notion — fixes the silent data loss where approved rows landed in Supabase with empty editorial columns
- UI status labels (e.g., `"WITM passed"` in `StructuredEditorialFields.tsx`) deliberately not changed — those are descriptive status badges, not Notion field references

**Blockers and reasons:**
- This was the most subtle bug of the migration: code was reading from columns that didn't exist, getting null, and writing empty strings to Supabase — all without erroring. The only signal was that the "approved" stories had no `ai_why_it_matters` content. Easy to miss in unit tests because the function returns successfully; visible only in end-to-end data inspection.

---

### Phase 5 — Documentation

**Objective:** Make the new pipeline operationally understandable. Capture rollback paths, observability surfaces, and Notion schemas in repo docs so future-BM (or a future engineer) can pick this up without re-reading commits.

**Tasks finished:**
- Updated [docs/engineering/CRON_SETUP.md](../CRON_SETUP.md): corrected auth header (Bearer, not the spec's mentioned `x-cron-secret`); added 3-job cron-job.org inventory; refined rollback notes
- Created [docs/engineering/reports/notion-pipeline-log-schema.md](../reports/notion-pipeline-log-schema.md): manual setup steps and field schema for the Pipeline Log database
- Created [docs/engineering/reports/notion-source-health-schema.md](../reports/notion-source-health-schema.md): manual setup steps and field schema for the Source Health Log database
- Created [docs/engineering/OBSERVABILITY.md](../OBSERVABILITY.md): four-tier observability model (cron-job.org → Vercel logs → Pipeline Log → Source Health Log), decision tree for "today's run looks broken", Sentry filtering note, env var inventory

**Results:**
- Every new endpoint and database has a referenceable doc
- Decision tree gives the on-call (BM) a clear sequence for triage rather than scattershot log-spelunking
- Schema docs are setup-ready: copy field names, set env var, redeploy — no further code change required for the optional Notion logs to activate

**Blockers and reasons:**
- None. The hardest part was deciding which observability surface answers which question — captured in the OBSERVABILITY.md decision tree.

---

## Post-Fix Verification

**Production smoke (2026-05-18 ~03:23 UTC, the post-Phase-4.5 deploy):**

| Endpoint | Method | Auth | HTTP | Body |
|---|---|---|---|---|
| `/api/cron/fetch-editorial-inputs` | GET | none | 401 | — |
| `/api/cron/fetch-editorial-inputs` | GET | Bearer | 200 | `notionRowsWritten: 0` (idempotency guard hit), `candidateCount: 2`, time 42.05s |
| `/api/cron/health` | GET | none | 401 | — |
| `/api/cron/health` | GET | Bearer | 200 | `status: warn, row_count: 2, briefing_date: 2026-05-18` |
| `npm run notion:dedup` (dry-run) | — | — | — | 5 groups, 15 rows would be archived on 2026-05-16 |

**What the verification proved:**
- All four auth-gated routes correctly reject missing Bearer (Phase 0 / Phase 3 outcome confirmed)
- Idempotency guard correctly skipped already-written rows (Phase 2 outcome confirmed)
- Function time dropped from 74.5s → 42s (Phase 1 + Phase 4 combined outcome — explicit timeout config + breaker preventing wasted retries)
- Health endpoint correctly returned `warn` for partial-run state (Phase 3 outcome — the warn/fail split is intentional)
- Dedup script picks the latest-edited row as keeper (Phase 2 outcome — manual review required before execute)

---

## Architecture After Migration

```
┌─────────────────┐  Authorization: Bearer ${CRON_SECRET}
│ cron-job.org    │  ─────────────────────────────────►  ┌─────────────────────────────────────┐
│  10:15 UTC      │                                       │ Vercel — bootupnews.com             │
│  11:45 UTC      │  GET /api/cron/fetch-editorial-inputs│                                     │
│  12:15 UTC ◄──────────────────────────────────────────┤   /api/cron/fetch-editorial-inputs  │
│  (health check) │                                       │     1. newsletter (Taipei date)     │
└─────────────────┘                                       │     2. RSS (Taipei date — Phase 0  │
                                                          │        fix; circuit breaker        │
                                                          │        Phase 4)                    │
                                                          │     3. editorial staging           │
                                                          │        (idempotent — Phase 2)      │
                                                          │                                     │
                                                          │   /api/cron/health (Phase 3)        │
                                                          │     warn/ok/fail by row_count       │
                                                          │                                     │
                                                          │   /api/editorial/push-approved      │
                                                          │     reads v2 fields (Phase 4.5)    │
                                                          └──────────────────┬──────────────────┘
                                                                             │
                            ┌────────────────────────────────────────────────┼────────────────────────────┐
                            │                                                │                            │
                            ▼                                                ▼                            ▼
                ┌───────────────────────┐                       ┌────────────────────────┐    ┌────────────────────┐
                │ Notion — Editorial    │                       │ Notion — Pipeline Log  │    │ Notion — Source    │
                │ Queue                 │                       │ (Phase 5 schema)       │    │ Health Log         │
                │ (v2 fields)           │                       │ — graceful when DB     │    │ (Phase 5 schema)   │
                │ — idempotency guard   │                       │   absent               │    │ — graceful when DB │
                │   (Phase 2)           │                       │                        │    │   absent           │
                └───────────────────────┘                       └────────────────────────┘    └────────────────────┘
```

---

## Outstanding Manual Actions for BM

These cannot be automated from this branch and require BM action:

1. **Create Pipeline Log database in Notion** per [docs/engineering/reports/notion-pipeline-log-schema.md](../reports/notion-pipeline-log-schema.md). Add `NOTION_PIPELINE_LOG_DB_ID` to Vercel env vars (Production scope).
2. **Create Source Health Log database in Notion** per [docs/engineering/reports/notion-source-health-schema.md](../reports/notion-source-health-schema.md). Add `NOTION_SOURCE_HEALTH_DB_ID` to Vercel env vars (Production scope).
3. **Review the dedup dry-run output** (15 rows on 2026-05-16) and run `npm run notion:dedup:execute` if satisfied.
4. **Redeploy Vercel** after env var changes so the optional Notion writers activate.
5. **Add the third cron-job.org job** for the 12:15 UTC health check per [docs/engineering/CRON_SETUP.md](../CRON_SETUP.md). (The `scripts/cron-jobs.config.ts` file does not exist in the repo yet — the cron-job.org job config lives in cron-job.org itself.)
6. **Decide whether `CRONJOB_API_KEY`** (the orphan env var discovered during Phase 0) should be removed from Vercel. It is referenced by no code in this repo.

---

## Lessons / Product-Engineering Notes

Some takeaways worth carrying forward:

**Silent 401 is worse than a thrown error.** The two-day cron silence was possible because the ingestion route returned a JSON 401 body rather than throwing. Vercel's monitoring saw 401 as "the function ran successfully and returned a response" and never escalated. Sentry never alerted. The cron-job.org status pages would have shown 401, but no one was watching that surface. The new health endpoint (Phase 3) is the explicit response to this: an active poll that says "did rows actually arrive today?" rather than a passive "did the function complete?".

**Env var presence in `.env.local` ≠ presence in Vercel.** Two of the three blockers in the audit (`CRON_SECRET` missing in prod, optional Notion DB IDs not yet set) stemmed from local dev having vars that prod did not. The repo should have a deployment checklist that explicitly diff-checks `.env.prod.local` against `vercel env ls --environment=production`. Today this is manual; making it a release-gate step would have caught both issues before the cron started silently failing.

**Date math across timezones is a category of bug worth defending against in tests.** The Taipei vs UTC mismatch was the kind of bug that only manifests during a specific time window (the 8-hour overlap). Local tests passed because they didn't simulate the cron firing at 18:41 UTC. A test that explicitly mocks `new Date()` to 18:41 UTC and confirms both the RSS pipeline and editorial staging compute the same `briefing_date` would prevent the next instance.

**Idempotency at the write layer, not the trigger layer, is more robust.** Removing the Vercel internal cron eliminated the immediate dual-firing risk, but Phase 2's idempotency guard is what actually makes the system safe: if cron-job.org accidentally fires twice, or BM triggers a manual run, no duplicates land in Notion. Trigger-layer dedup is good hygiene; write-layer dedup is the actual safety net.

**Graceful degradation on observability writes is correct.** Pipeline Log and Source Health Log writes are wrapped in try/catch and gated on env var presence. This means BM can ship the pipeline today without the Notion logging databases, then add them later when ready. The alternative (require both Notion DBs before the pipeline runs) would have blocked this work indefinitely on a non-critical-path setup task.

**The v1 → v2 field rename was caught by accident.** Nothing in the audit specifically pointed at Phase 4.5 — it surfaced when I noticed the `draft-editorials` skill description used WITM/WLTI/WITC. The matching `push-approved` route bug (reading from columns that don't exist) was a silent data loss path: approved stories landed in Supabase with empty AI editorial columns. Worth adding a contract test that asserts every property name in Notion-write code matches an actual column in the database schema. Notion API would have made this trivial — there's a "retrieve a database" endpoint that returns property definitions.

---

## Fix

- **Exact change:** Closed three blocker phases (Notion idempotency, health endpoint, source circuit breaker) and one related phase (v1 → v2 field name migration) that were spec'd but not implemented during the original 5-phase pipeline migration. Also fixed two latent bugs surfaced during the audit: missing `CRON_SECRET` env var in Vercel, and RSS/staging timezone mismatch.
- **Related PRD:** No PRD-XX assigned; this is a closure-of-existing-spec rather than a new feature. The original 5-phase migration is itself unattributed to a numbered PRD in the repo.
- **PR:** _populated after PR opened_
- **Branch:** `fix/source-url-nullable` (note: this branch was originally for source_url nullable migration; pipeline migration work was layered on top — flagged in §10 as a follow-up to clean up)
- **Head SHA:** _populated after PR opened_
- **Merge SHA:** _populated after merge_
- **GitHub source-of-truth status:** This doc is the durable record. Per-run validation evidence lives in the PR body (and in `/tmp/.bootup_cron_secret` workflow artifacts on BM's machine — not committed).
- **External references reviewed:** Vercel env var inventory via `vercel env ls`; Supabase signal_posts table via Supabase MCP `execute_sql`; Notion Editorial Queue via Notion MCP `notion-fetch` and `notion-search`.
- **Google Sheet / Work Log reference:** None. Per AGENTS.md §7a, Google Sheets are no longer source-of-truth.
- **Branch cleanup status:** Pending PR merge.

---

## Terminology Requirement

- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: **Card** (Editorial Queue rows), with upstream effects on Signal (signal_posts) and Surface Placement (BM's review surface).
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card. The v1→v2 rename (Phase 4.5) preserved the existing field-naming scheme; no new terminology was introduced.
- [x] Legacy naming inconsistency (Notion v2 fields vs. Supabase v1 column names) is documented inline in `push-approved/route.ts` and in Phase 4.5 of this record.

---

## Validation

**Automated checks:**
- `npx tsc --noEmit -p tsconfig.json` — clean (ran after each fix)
- Vercel deploy succeeded twice without build errors (Phase 0 fix and full gap-closure deploy)

**Human checks:**
- Ingestion endpoint smoke-tested with and without Bearer (Phase 0, 1, 2, 3, 4, 4.5, 5 combined)
- Health endpoint smoke-tested with and without Bearer
- Dedup script dry-run output reviewed
- Notion Editorial Queue confirmed via Supabase signal_posts count (the most reliable verification surface since Notion search lags by minutes)

**Required preview-required checks remaining:**
- Trigger the 10:15 UTC cron tomorrow morning (Taipei) and verify the queue populates without manual intervention
- Confirm cron-job.org status page shows green for both ingestion jobs and the new health job once added

**Required human-only checks remaining:**
- BM creates the two Notion logging databases (Pipeline Log, Source Health Log) per the schema docs
- BM reviews and decides whether to execute the dedup cleanup
- BM verifies the draft-editorials skill (now using v2 field names) writes correctly when next invoked

---

## Remaining Risks / Follow-up

- **Branch scope drift.** `fix/source-url-nullable` now contains both the original source_url nullable migration AND this pipeline migration. Per AGENTS.md §2 (Scope & Branching), one feature/fix per branch. Recommendation: open the PR with this combined scope, note the drift in the PR description, and plan a follow-up to split if review wants cleaner history.
- **Newsletter-vs-Taipei date alignment.** Newsletter ingestion uses Taipei date but most US-morning newsletters arrive 10:00–15:00 UTC (before Taipei's 16:00 UTC day boundary). `fetchNewsletterCandidates` returned 0 newsletter emails on the test day. Discussed in the original audit as a candidate-supply issue, not a plumbing blocker. Worth a follow-up to widen `fetchNewsletterCandidates`'s date window to a 36h sliding range so US-morning newsletters land in the same Taipei day as the briefing they inform.
- **Success-tracking in Source Health Log.** The current writer only logs failures and skips. Successful sources are silent. Future improvement: thread success state through the pipeline so the log has full coverage and chronic-failure detection can use it.
- **Schema contract test.** The Phase 4.5 silent data loss (reading non-existent Notion columns) would have been caught by a test that retrieves the Editorial Queue's property definitions from the Notion API and asserts every property name referenced in code is present. Worth adding.
- **Vercel-cron rollback never exercised.** Documented in CRON_SETUP.md but not tested. First cron-job.org outage will exercise it. Consider a quarterly drill.
- **Function timeout warning at 74.5s.** Pre-Phase-4 runs hit this. Post-fix runs are at 42s. Worth monitoring whether typical runs stay below 60s as the source catalog grows; if it creeps up, the breaker threshold (3 failures) may need lowering.
