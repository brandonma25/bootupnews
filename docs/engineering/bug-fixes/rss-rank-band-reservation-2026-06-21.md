# RSS Rank-Band Reservation (PR2) — 2026-06-21

Canonical PRD required: `No` — pipeline reliability bug fix (slate starvation), not a product feature.

## Problem
On junk-heavy newsletter days (verified 06-18, 06-19) **zero** RSS articles reached the editorial slate, even though ~33–39 clean, body-extracted RSS articles surfaced. Root cause is **rank-slot contention**, not content:

- Newsletter promotion assigned `signal_posts.rank` bottom-first via `nextAvailablePreviewRank` (`promotion.ts`), scanning `20→1` for the highest free slot. One row took rank 20; ~20 rows walked all the way up into ranks 1–7.
- `reserveNewsletterCandidateRanksForRssSnapshot` (`signals-editorial.ts`) is meant to relocate newsletter rows down to free the top for RSS, but it needed one free target rank per movable row. At 20 movable rows it needed the entire space, hit the `targetRanks.length < movableNewsletterRows.length` branch, returned **`ok:false` / "No rows were changed"**, and bailed — so newsletter kept ranks 1–20 and RSS was filtered out entirely.

Corroborated in prod: newsletter held rank 20 with 1 row and **all of 1–20** with 20 rows; RSS placed 8 vs **0** respectively.

## Fix — hard-reserve the top band so newsletter can never occupy it
Keyed off the existing public-slate size (`RSS_RESERVED_TOP_RANKS = FINAL_SLATE_MAX_PUBLIC_ROWS = 7`); never hardcoded. New single source of truth in `final-slate-readiness.ts` (`SIGNAL_POST_CANDIDATE_DEPTH_LIMIT`, `RSS_RESERVED_TOP_RANKS`), imported by both writers.

1. **Write-side cap** (`nextAvailablePreviewRank`): the scan is confined to the discovery band `RSS_RESERVED_TOP_RANKS+1 .. depth limit` (8..20) and fills **floor-up** (8, then 9, …). Ranks 1..7 are never claimed by newsletter. When the band is full the function returns `null` and the caller drops the candidate; callers plan in **importance order** (`extraction_confidence` DESC — the only signal a story carries at promotion time), so band overflow drops the lowest-signal stories.

2. **Relocation-side degrade** (`reserveNewsletterCandidateRanksForRssSnapshot`): caps the target band at 8..20 and, when movable rows exceed the 13-slot band, **DELETES the lowest-signal excess** (a candidate row can't exist without a 1..20 rank) instead of returning `ok:false` and changing nothing. Collision-safe by construction: the only relocations move newsletter rows OUT of 1..7 INTO free band ranks, and overflow rows are deleted before any relocation, so in-place `rank` UPDATEs never trip `UNIQUE(briefing_date, rank)`. Preserves the #324 atomic newsletter bulk insert (untouched).

Code-only; **no migration**.

## Result (verified by the regression suite — the acceptance gate)
- 20 newsletter + RSS → ranks 1–7 RSS, newsletter 8–20, 7 lowest-signal newsletter rows dropped, zero 23505.
- 3 RSS + 20 newsletter → ranks 1–3 RSS, **ranks 4–7 empty** (not newsletter), newsletter in the band.
- 1 newsletter + RSS → RSS 1–7, newsletter at rank 8.
- 0 newsletter → RSS fills the top untouched.
- Mid-run abort → zero rows written (#324 preserved).
- The 20-movable-row reserve case **degrades** (evicts excess); never returns `ok:false`-with-no-change.
- Full suite green; typecheck 0; lint clean.

## Known behavior to confirm in verification
When RSS provides **more than 7** items AND newsletter is **sparse** (< 13 rows), RSS fills the band slots newsletter didn't use (e.g. 5 newsletter → ranks 8–12, RSS → 1–7 and 13–20). The **public slate (top 7) is still entirely RSS**; newsletter stays below the cut. This retains more RSS discovery candidates than capping RSS at 7. If strict "RSS owns only 1–7, newsletter owns all of 8–20" is preferred, that is a small follow-up (cap RSS candidates at `RSS_RESERVED_TOP_RANKS`) — deferred per the locked PR2 scope (two changes only).

## PR-A — harden the eviction against the RESTRICT FK (added to this branch)
**Problem:** the relocation-side degrade DELETEs excess newsletter rows, but
`published_slate_items.signal_post_id → signal_posts(id)` is **ON DELETE RESTRICT**.
A delete targeting a referenced row throws **23503**; the test harness uses a mock
db with no FKs, so the green suite cannot catch it. (Today's blast radius is low —
`published_slate_items` references only briefing_dates ≤ June 9 — but re-restaging
any published date would throw and could abort the reservation.)

**Fix (two layers in `reserveNewsletterCandidateRanksForRssSnapshot`):**
1. **FK-safe scope** — `fetchFkProtectedSignalPostIds` queries `published_slate_items`
   for the movable candidate ids; a referenced row is **never** an eviction target.
   Only the lowest-signal **unprotected** rows are dropped to make room; protected
   rows are always kept (relocated, never deleted). Fails **safe**: if the reference
   check itself errors, every candidate is treated as protected (evict none).
2. **Belt-and-suspenders** — each delete is guarded; a 23503 / any error is caught,
   the row is **left in place + logged**, and the reservation **continues** (never
   `ok:false`-with-no-change). Free band ranks are recomputed **after** eviction, so
   a skipped delete can never become a relocation target (no 23505).

**Tests (use the harness's `publishedSlateItems` + `deleteErrors` hooks):**
- FK scope: a `published_slate_items`-referenced row is excluded from eviction; the
  next-lowest unprotected row is evicted instead.
- Graceful degrade: inject a 23503 on the delete → run completes, the row remains,
  never `ok:false`-no-change.
- All 7 original #327 gates still green.

Full suite **1142 passing** (was 1140 at #327); typecheck 0; lint clean. No migration.

**Did NOT touch:** the publish path / cockpit / render / `published_*`/`edited_*`
columns / `final_slate_rank` assignment / validation logic. Ingestion-staging only.

## Scope
Stacked fix, PR2 of the newsletter-quality stack + its FK safety guard (PR-A). PR3 (newsletter content quality: charset decode + chrome filter) is hygiene layered on top and is **not** in this PR.
