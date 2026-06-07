# Bug fix - Re-ship evergreen filter bundled with ≥5 persist-floor softening (2026-06-08)

Canonical PRD required: `no` (remediation; maps to PRD-13 Signal Filtering Layer).

## Summary

PR #307 moved evergreen recognition (P7) + cross-date URL dedup (P4) onto the `signal_posts` write path. On-demand prod validation (2026-06-07 15:52 UTC) returned `Briefing failed: RSS=fail`, **0 rows** — an **empty slate** — so #307 was reverted (PR #308, bug-fix doc `revert-evergreen-restaging-5floor-2026-06-08.md`). This PR re-ships #307 **bundled with the floor fix that makes it safe**, plus a title-pattern audit.

## Root cause (recap)

On a Fed-dominated day the evergreen filter correctly removed the 4 Fed-blog evergreens, dropping the slate below the **pre-existing ≥5 hard floor** in `persistSignalPostCandidates` ([signals-editorial.ts](../../../src/lib/signals-editorial.ts)), which then **refused the entire snapshot** → empty slate. `runDailyNewsCron`'s own floor was already softened (proceeds on 1–6 items in degraded mode; only 0 hard-fails), but the persist function still hard-required 5 — the inconsistency #307 exposed. Before #307, evergreens padded the slate to ≥5 and hid it.

## The fix (one PR)

1. **Soften the persist floor** ([signals-editorial.ts](../../../src/lib/signals-editorial.ts)). The `sourceReadyCandidates.length === 0` hard-fail above it is unchanged. The separate `< TOP_SIGNAL_SET_SIZE` (5) gate no longer returns `ok:false` — it now logs a `warn` ("persisting in degraded mode (below target count)") and **persists the thin slate (1–4 source-ready)**. This aligns the persist floor with `runDailyNewsCron`'s 1–6 degraded behaviour. A thin CLEAN slate (real items, no evergreens) beats both a 5-item slate padded with evergreens and an empty slate; these rows are `needs_review` (not auto-published), so a short review queue is safe.

2. **Re-apply #307's two layers** on top of the softened floor:
   - Layer 2 (P7) — shared `classifyEvergreen()` + `EVERGREEN_PRONE_FEEDS` ([evergreen-filter.ts](../../../src/lib/editorial/evergreen-filter.ts)), applied in `generateDailyBriefing` before the Top-N cap, cron-gated via `filterEvergreens`.
   - Layer 1 (P4) — cross-date URL recurrence dedup ([cross-date-url-dedup.ts](../../../src/lib/editorial/cross-date-url-dedup.ts), `MAX_CONSECUTIVE_DAYS=3`, `LOOKBACK_DAYS=30`), wired into `persistSignalPostCandidates`.

3. **Title-pattern audit** ([evergreen-filter.ts](../../../src/lib/editorial/evergreen-filter.ts)) — the #307 `^how (are|is|do|does|did|to|the)` and `^why (exclude|do|does|is|are)` prefixes were too broad and risked suppressing real news framed as questions. Tightened (trust-asymmetry: prefer missing one over suppressing real news):
   - `^how to …` stays (instructional guides are reliably evergreen).
   - `^how (are|is|do|does|did|the) …` now **requires an explainer verb to follow** (`work(s)/measured/calculated/computed/defined/determined/explained`), so "How the Fed raised rates" / "How are markets reacting" pass while "How are benchmark borrowing costs measured?" / "How does the Fed work?" are caught.
   - `^why …` narrowed to `exclude|do|does` (dropped `is|are`), so "Why are rates rising?" / "Why is inflation cooling?" pass while "Why exclude food and energy…?" is caught. (Fed-blog why-explainers are also caught by the feed signal regardless.)

## Tests

- `signals-editorial.test.ts` — new: **a thin clean slate (3 source-ready) persists in degraded mode** (`ok:true`, inserted 3) instead of hard-failing; the existing cross-date + provenance + idempotency cases still pass.
- `evergreen-real-data.test.ts` — new audit block: real-news how/why questions are **not** flagged; genuine explainers still are. Plus the existing real-data matrix (8 Fed evergreens excluded; 3 developing + Local Police 3-day + both Climate URLs kept).
- `cross-date-url-dedup.test.ts`, `evergreen-filter.test.ts`, `cron/fetch-news.test.ts` — unchanged, green. Full suite: 1004 passing.

## Validation note (prod)

When validating on-demand, account for the UTC-vs-Taipei date-key behaviour: `generateDailyBriefing` keys `signal_posts` on the **UTC** date while the cron run-lock uses the **Taipei** date; they diverge only for runs between 16:00–24:00 UTC. The scheduled 12:00 UTC cron is unaffected (both dates match at noon).
