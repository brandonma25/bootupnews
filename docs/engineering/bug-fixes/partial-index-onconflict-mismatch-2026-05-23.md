# Partial-Index ON CONFLICT Mismatch — 3-Day Production Ingestion Outage - Bug-Fix Record

## Summary
- Problem addressed: Boot Up News ingestion silently failed every cron fire for 3 consecutive days (2026-05-21 → 2026-05-23). Zero `signal_posts` rows were written between 2026-05-21 10:15Z (the last fire under pre-PR-260 code) and the fix landing. `cron_runs.status='fail'` recorded each day; Sentry surfaced BOOT-UP-WEB-6 and BOOT-UP-WEB-7 but those wrappers carried no Postgres-side error message, so the failures looked like transient persistence issues until the third day's diagnostic deep-dive.
- Root cause: PR #260 created `signal_posts_briefing_date_source_url_key` as a **partial** unique index (`WHERE source_url IS NOT NULL`) and simultaneously switched `persistSignalPostCandidates` to `.upsert(rows, { onConflict: "briefing_date,source_url", ignoreDuplicates: true })`. supabase-js translates this to a bare `ON CONFLICT (briefing_date, source_url) DO NOTHING` with no `WHERE` predicate. Postgres requires the partial-index's predicate to be repeated in the conflict-inference clause — without it the planner cannot match any unique index and aborts the entire INSERT batch with `SQLSTATE 42P10`. The vitest mock at `signals-editorial.test.ts:~478` implements `.upsert()` as a JS stand-in that does NOT enforce ON CONFLICT inference semantics; 795 green tests passed against a bug that fails 100% of the time in production.
- Affected object level: Card (signal_posts is the Card storage layer).
- **Related PRD:** PRD-65 (`docs/product/prd/prd-65-pipeline-reliability-external-cron-migration.md`)

## Fix
- Exact change (4 parts):

  **Part 1 — App fix.** `src/lib/signals-editorial.ts:persistSignalPostCandidates` rewritten to select-then-decide:

  ```ts
  // SELECT existing source_url values for the briefing_date.
  // Filter candidates to those whose URL isn't already present.
  // Plain .insert() — no .upsert(), no ON CONFLICT.
  ```

  Mirrors the pattern PR #266 used for `pushApprovedRow`. The SELECT → INSERT race is closed at the orchestration layer by the `cron_runs` run-lock from PRs #260 + #266.

  **Part 2 — Writer audit.** Every signal_posts writer enumerated:
  - `persistSignalPostCandidates` — broken; fixed by Part 1.
  - `pushApprovedRow` — already select-then-decide via PR #266; safe.
  - `promoteNewsletterStoryToCandidate` (`src/lib/newsletter-ingestion/promotion.ts:406`) — plain `.insert()`; safe.
  - No other writers found via `grep '.upsert(' src --include='*.ts' | grep -v .test`.

  **Part 3 — Index decision.** The partial unique index `signal_posts_briefing_date_source_url_key` is **kept as a passive data-integrity guard**. After Part 1, no writer uses it for `ON CONFLICT` inference, so the partial predicate no longer creates a footgun. It still prevents duplicate non-NULL `(briefing_date, source_url)` pairs from any future writer, with zero behavior cost. Decision documented in PRD-65 Phase 7.3.

  **Part 4 — Test gap.** New file `src/lib/signal-posts-writers.guard.test.ts` scans all production `.ts` files and fails if any calls `.upsert(...)` against `signal_posts`. Relax-the-rule conditions ((a) all relevant indexes non-partial, AND (b) integration test against real Postgres) are documented in the test file's header so deleting the rule forces the review conversation. Mock at `signals-editorial.test.ts:~478` gains an explicit `KNOWN GAP (issue #268)` comment documenting what it does NOT enforce.

- Related PRDs: PRD-65 Phase 7.3 operational-history entry.
- PR: TBD on merge.
- Branch: `claude/fix-partial-index-onconflict`
- GitHub source-of-truth status: Canonical bug-fix record; details mirrored in PR description, PRD-65 Phase 7.3, and the guard test's header comment.
- External references reviewed: Live Supabase repro on 2026-05-23 confirmed `SQLSTATE 42P10` with the literal message "there is no unique or exclusion constraint matching the ON CONFLICT specification". A separate live repro confirmed that adding the partial predicate to `ON CONFLICT` (`... WHERE source_url IS NOT NULL`) makes the upsert succeed. supabase-js's `.upsert({onConflict})` API does not expose the WHERE predicate, so the fix had to be at the call-site, not the index.
- Branch cleanup status: branch will be deleted on merge via `gh pr merge --delete-branch`.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level: Card.
- [x] No new variable, file, function, component, or database terminology was introduced. The guard test's "writer" terminology refers to code that performs `INSERT`/`UPDATE`/`UPSERT` operations against signal_posts — a code-organization term, not editorial.
- [x] Legacy column naming asymmetry preserved; no schema rename.

## Validation
- Automated checks: `npx vitest run` — **797/797 green** (+2 vs main: the guard's two cases). `npx eslint` on touched files — clean. `npx tsc --noEmit` on touched files — zero new errors.
- Live-DB repro pre-fix: the legacy `.upsert(...,{onConflict:'briefing_date,source_url',ignoreDuplicates:true})` produced SQLSTATE 42P10 in a sentinel-briefing_date test against the actual prod schema.
- Live-DB verification of the fix: a plain `.insert()` of the same payload against the sentinel briefing_date succeeded. (The full end-to-end production fire is deferred to the post-merge operator verification step, per the brief's "STOP after opening the PR; do not self-merge" rule.)
- Human checks: the 5 days of `cron_runs.status='fail'` rows on prod, paired with Sentry BOOT-UP-WEB-6/-7 events from the same timestamps, were the diagnostic anchor.

## Remaining Risks / Follow-up
- **Test infrastructure gap remains.** The lint-style guard prevents `.upsert()` reintroduction on signal_posts, but doesn't catch other classes of partial-index/ON-CONFLICT issues if a future PR adds a partial index against a DIFFERENT table that supabase-js code targets. The deeper solution is a real-Postgres integration harness (Supabase test branch or ephemeral DB) — not in scope for this PR but called out as the right next step.
- **Sentry alerting for `cron_runs.status='fail'`** would have surfaced the failure as a page on day 1 rather than day 3. The wrapper errors (BOOT-UP-WEB-6/-7) DID reach Sentry but were not configured as alerting rules — they sat in the issue list unnoticed. A follow-up should either set up Sentry issue alerts on these specific issue types OR have the cron handler emit a Sentry message with `level: "fatal"` when `cron_runs.status='fail'` is set, to surface the failure with higher signal.
- **The 2026-05-22 and 2026-05-23 `cron_runs` rows with `status='fail'`** stay in place; the run-lock from PR #266 means future fires for OTHER briefing_dates aren't blocked. The 05-22/-23 dates themselves will simply have no editorial queue for those days. No remediation needed unless BM wants to retroactively run those dates (a one-shot manual fire after the fix is live + a `DELETE` of the stale `cron_runs` row would do it).
- **Documentation gap**: supabase-js's `.upsert({onConflict})` does not support adding a `WHERE` predicate, and this is not called out in supabase-js's docs (only Postgres's docs mention the requirement). Worth filing an upstream feature request or doc improvement at https://github.com/supabase/supabase-js if not already tracked.
