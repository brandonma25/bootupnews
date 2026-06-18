# Newsletter-Ingestion Timeout Poisons the Daily Slate — Atomicity Fix (PR1)

## Summary
- **Problem addressed:** On a slow-Gmail morning the newsletter stage exceeded its internal 55s budget **mid-run**. Because it inserted `signal_posts` candidate rows **one at a time inside the per-email loop** with no transaction and no rollback, a timeout left **partial junk rows** committed for the briefing date. Those leftover rows occupied all 20 candidate ranks, so the later RSS stage early-outs ("the daily signal snapshot already exists") and stages **zero** real articles — a slate of newsletter boilerplate and no news.
- **Root cause (proven in code):** the only `signal_posts` write was a per-story `.insert(...)` at `promotion.ts` inside the `processWritableRun` loop (`runner.ts`); the 55s `Promise.race` in `cron-endpoint-runtime.ts` only **rejected the awaiter** — it never aborted the in-flight work — so already-committed rows persisted. No `.delete`/`.rpc`/transaction existed anywhere in the path.
- **Affected object level:** newsletter ingestion stage write path only. No schema change, no migration, no publish/render/`published_slates` change.

## Fix (Option A — withhold the single bulk insert; no migration)
- **`src/lib/newsletter-ingestion/promotion.ts`**
  - `buildNewsletterCandidateRow()` — one shared, byte-identical candidate-row builder (the `needs_review` contract the cockpit depends on).
  - `planNewsletterStoryPromotions()` — **pure** planner that resolves already-linked / invalid-url / dup-by-url / dup-by-title / next-rank entirely in memory against a **single** pre-fetched `existingRows` snapshot. This collapses the old ~480 per-story DB round-trips (incl. the "pull 100 rows, filter in JS" title check) into one read, and is the latency fix *and* the correctness fix.
  - `promoteNewsletterStoryBatch()` — plans the whole run, then performs **exactly one** multi-row `signal_posts` insert (one PostgREST request → one Postgres `INSERT` → all-or-nothing). Net effect on timeout/error: **zero partial rows**.
  - **Self-heal seam:** links run *after* the committed insert and are best-effort; a crash between insert and link is repaired next run because the planner sees the row by `source_url` and plans `link`, never a duplicate insert (backed by `UNIQUE(briefing_date, source_url)`).
  - `promoteNewsletterStoryToCandidate()` is now a thin wrapper over the batch (single code path; existing callers/tests unchanged).
- **`src/lib/newsletter-ingestion/runner.ts`** — `processWritableRun` buffers stories across the whole email loop and calls the batch promoter **once after the loop**. `newsletter_emails` / `newsletter_story_extractions` writes stay incremental (idempotent, dedup-keyed, and not the public slate).
- **AbortSignal threading (status reflects reality):** the 55s wall now `abort()`s an `AbortController` (`cron-endpoint-runtime.ts` `runWithStageTimeout` `onTimeout`) whose signal is forwarded to the newsletter stage (`editorial-ingestion-pipeline.ts` → `runner.ts` → `promotion.ts` and the Gmail raw-message fetch in `gmail.ts`/`storage.ts`). On timeout: in-flight Gmail fetches abort, the email loop stops, and the atomic write is **skipped** — so a timeout deterministically leaves an **empty** slate (never partial), and the reported status matches DB reality. rss/staging ignore the signal.

## Constraints respected
- No migration; `signal_posts` already has every column the insert uses. `rank` allocation stays descending 20→1, preserving `CHECK(rank 1..20)` and `UNIQUE(briefing_date, rank)`.
- No edits to the publish/render path, `published_slates`/`published_slate_items`, or `is_live` / `why_it_matters_validation_status` on candidate rows.

## Tests
- **`src/lib/newsletter-ingestion/promotion-batch.test.ts`** (new): exactly-one bulk insert with descending unique ranks; aborted-signal → zero rows; self-heal link of an orphan row → zero inserts; idempotent re-run → zero inserts; within-batch `source_url` dedupe → one insert; bulk-insert error → no partial rows; pure-planner shape; and a **runner-level timeout test** proving buffered candidates are discarded (insert never called) when the deadline fires mid-loop.
- Existing newsletter / cron / pipeline suites unchanged and green. `npm run pipeline:dry` exercises the signal-threaded wiring end-to-end (no regression).

## Not addressed by this fix (separate PRs)
- RSS rank-band backstop so leaked rows can't grab every slot (Task 2 / PR3).
- Newsletter content quality — mojibake decode, tracking-redirect drop, chrome filter (Task 3 / PR2).
- Throughput / bounded concurrency (Task 4 / PR4 — must not ship without this PR).
- Cleanup of already-poisoned historical dates (separate data operation).
