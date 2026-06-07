# Bug fix - Revert #307 evergreen filter: the ≥5 persist floor zeroes the slate on Fed-heavy days (2026-06-08)

Canonical PRD required: `no` (revert / remediation; maps to PRD-13 Signal Filtering Layer).

## Summary

PR [#307](https://github.com/brandonma25/bootupnews/pull/307) moved evergreen recognition (P7) + cross-date URL dedup (P4) onto the `signal_posts` write path. On-demand production validation on the merged code (2026-06-07 15:52 UTC) returned `Briefing failed: RSS=fail` with **0 rows persisted** — an empty slate. #307 is reverted here (PR #308) to restore reliable daily ingestion; it will be re-shipped bundled with the floor fix described below.

## Diagnosis (grounded in real prod data)

The evergreen filter did its job: it removed the day's four Fed-blog evergreens (2× FRED Blog, 2× SF Fed `research-and-insights/blog/sf-fed-blog`). But the 2026-06-07 RSS pool was Fed-dominated — the pre-revert slate was 4 evergreens + 1 real story (MIT Technology Review). Removing the four evergreens dropped the source-ready slate **below the pre-existing ≥5 hard floor** in `persistSignalPostCandidates` ([signals-editorial.ts](../../../src/lib/signals-editorial.ts)):

```ts
if (mode !== "draft_only" && sourceReadyCandidates.length < TOP_SIGNAL_SET_SIZE) {
  return { ok: false, ... }; // refuses the ENTIRE snapshot, not just the thin part
}
```

→ `persistSignalPostsForBriefing` returned `ok:false` ("…requires at least five") → `runDailyNewsCron` returned `success:false` → the briefing route finalized `cron_runs='fail'` and persisted **0** rows.

Confirmed via the Notion Pipeline Log (`ingestion / fail / RowCount 0 / "Briefing failed: RSS=fail."`) and the runtime log line "…requires at least five"; **no seed fallback** (feeds were healthy). Contrast the same-session pre-fix run at 12:53 UTC: `ingestion / ok / "RSS=ok … updated=4"`.

**Root cause — an inconsistency #307 exposed:** `runDailyNewsCron` ([fetch-news.ts](../../../src/lib/cron/fetch-news.ts)) already softened its own floor (it proceeds on 1–6 items in degraded mode; only 0 items hard-fails), but `persistSignalPostCandidates` still **hard-requires 5**. Before #307, evergreens padded the slate to ≥5, hiding the inconsistency; the filter legitimately drops thin / Fed-heavy days below 5, so the hard floor now zeroes the whole slate.

Public site unaffected — the affected rows were `needs_review` / `is_live=false` (never published).

## The fix

**Now:** revert #307 (this PR, #308) so the daily briefing reliably persists ≥5 (including evergreens) again.

**Next — re-ship in one PR:**
1. Soften the `persistSignalPostCandidates` floor so a thin CLEAN slate (1–4 source-ready) persists in degraded mode instead of hard-failing — aligning it with `runDailyNewsCron`'s 1–6 degraded behaviour. Only 0 source-ready should fail.
2. Re-apply the evergreen filter (P7) + cross-date URL dedup (P4) from #307 on top of the softened floor.
3. Audit the `^how (are|is|do|does|did|to|the)` / `^why (exclude|do|does|is|are)` title patterns for false positives on real (non-Fed) headlines before re-enabling.
