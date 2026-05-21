# Cron Run-Lock Hardening + Bridge final_slate_rank Pairing - Bug-Fix Record

## Summary
Three correctness fixes bundled into one PR — all on the cron + bridge infrastructure paths surfaced during the May 21 Path-A operator session.

1. **Cron run-lock fail-closed-and-stuck (issue [#264](https://github.com/brandonma25/bootupnews/issues/264)).** `tryAcquireRunLock` returned `acquired=false` on PK conflict regardless of the existing row's status. A single `cron_runs` row with `status='fail'` / `'timeout'` / stale `'running'` stranded the entire `briefing_date` — every subsequent fire returned `HTTP 200 status=skipped` until the calendar day rolled over. Launch-blocking: a daily unattended product could lose an entire briefing day from one transient failure with no operator alert.
2. **Cron run-lock silent fall-through on null Supabase client (also issue #264 scope).** When `createSupabaseServiceRoleClient()` returned null (env mid-propagation during a deploy swap), the route logged a warning and proceeded WITHOUT the lock. During the 15:10:56Z fire on 2026-05-21, this allowed two concurrent ingestion attempts to both pass the gate.
3. **Bridge OVERWRITE leaves final_slate_rank NULL (issue [#265](https://github.com/brandonma25/bootupnews/issues/265)).** `pushApprovedRow`'s `overwrote_template` branch updated `final_slate_tier` from the editor's Slot but omitted `final_slate_rank` — leaving a half-pair the schema CHECK accepted because Postgres CHECK treats NULL as a pass. One live broken row in production: `995958fe-78df-46ce-b1fc-fe449c6717a2`.

- Affected object level: Card (signal_posts is the Card storage layer).
- **Related PRDs:** PRD-65 (cron lock), PRD-64 (bridge)

## Fix
- Exact change:
  - `src/app/api/cron/fetch-editorial-inputs/route.ts` — `tryAcquireRunLock` now reads the existing row's status on PK conflict and reclaims when `status IN ('fail','timeout')` or stale `status='running'` (older than `RUN_LOCK_STALE_MS=70_000`, matching the 55 s internal pipeline timeout plus a 15 s buffer). Fresh `running` returns `in_progress`; `ok` returns `already_completed`. Null service-role client returns HTTP 503 + `Sentry.captureMessage(level: "error")` + flush, NEVER schedules the pipeline. Non-conflict insert errors also fail-closed for the same reason.
  - `src/app/api/editorial/push-approved/route.ts` — new `resolveFinalSlateRankForOverwrite()` helper. OVERWRITE branch now keeps the existing rank when it's already in the editor's tier range (idempotent re-push), otherwise allocates fresh via `getNextAvailableFinalSlateRank()`. Fails closed with `no_rank_slot` when the tier is exhausted.
  - `supabase/migrations/20260522080000_final_slate_pairing_tighten_check.sql` — replaces `signal_posts_final_slate_placement_check` with a tightened version that requires `(tier IS NULL) = (rank IS NULL)` so half-pairs evaluate to FALSE, not NULL. Includes a guarded one-shot repair (`WHERE is_live=false`) that allocates valid ranks for every existing half-pair before adding the constraint. Aborts loudly if any `is_live=true` row is half-paired.
- Related PRDs: PRD-65 Phase 7.1 (operational-history entry) and PRD-64 (operational-history entry).
- PR: TBD on this PR's merge.
- Branch: `claude/items-1-3-lock-and-bridge-fixes`
- GitHub source-of-truth status: Canonical bug-fix record; details mirrored in the PR description, the linked issues, and the two PRD operational-history entries.
- External references reviewed, if any: Live Supabase pre-flight on 2026-05-22 confirmed only one half-paired row table-wide (`995958fe…`, `is_live=false`) and zero half-paired live rows.
- Branch cleanup status: branch will be deleted on merge via `gh pr merge --delete-branch`.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Card. `signal_posts` is the Card storage layer per the operational contract; `cron_runs` is infrastructure state and is not an editorial object.
- [x] No new variable, file, function, component, or database terminology was introduced. New `RunLockResult` reasons (`fresh`, `reclaimed_fail`, `reclaimed_timeout`, `reclaimed_stale`, `in_progress`, `already_completed`, `service_unavailable`, `lock_check_failed`) are infrastructure-status snake_case strings that don't overload Cluster/Signal/Card meanings.
- [x] Legacy column naming asymmetry preserved; no schema rename in this PR.

## Validation
- Automated checks: `npx vitest run` — **795/795 green** (+5 lock cases + 1 bridge regression). `npx eslint` on touched files — clean. `npx tsc --noEmit` — zero new errors vs main on touched files.
- Human checks: Live Supabase confirms the lock anomaly description (`cron_runs` row started_at=15:10:56Z status='fail' stranding 2026-05-21) and the broken row (`995958fe…` tier='core' rank=NULL).

## Remaining Risks / Follow-up
- **Item 4 (feed-health observability)** is reported separately in the PR description without code changes. Brief summary: feed warnings are NOT 95% dropped by sample-rate as initially suspected — `tracesSampleRate=0.05` only affects performance traces, not `captureException`/`captureMessage` events. What does drop them is `beforeSend → isFilteredRssNoiseEvent` in `sentry.server.config.ts:24-31` which filters only the specific `RssError: Feed request retry exhausted for …` pattern (Phase 4.5 noise reduction). Other RssError shapes (France24 XML, Foreign Affairs 403) still emit at level="warning". The Source Health Log lives in Notion (env `NOTION_SOURCE_HEALTH_LOG_DB_ID`), not Supabase — by design. Recommendation: surface a per-source success/fail/junk_filtered rollup from the Source Health Log in the completion email so feed health is visible without opening the Notion DB; defer to operator decision on scope.
- The `RUN_LOCK_STALE_MS=70_000` constant is tied to `INTERNAL_PIPELINE_TIMEOUT_MS=55_000` — if either changes, the relationship needs to stay (stale window must be > internal timeout + Sentry flush + writeback budget).
- A future Vercel deploy swap with `Sentry.flush()` interrupted could leave a stale `running` row; the new 70 s reclaim window covers that case automatically.
