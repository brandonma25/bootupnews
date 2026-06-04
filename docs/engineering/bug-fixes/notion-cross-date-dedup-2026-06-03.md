# Notion Editorial Queue Cross-Date Dedup — Bug-Fix Record

## Summary
- **Problem addressed:** Two Fed-research evergreens (NY Fed "AIs Macroeconomic Challenges and Promises" May 25 → Jun 2; SF Fed "Economic Letter Countdown" May 30 → Jun 2) recurred in the Notion Editorial Queue across multiple briefing dates. Editor had to manually skip / archive the same item every day.
- **Root cause:** `findExistingRow` (`src/lib/editorial-staging/notion-writer.ts`) keys ONLY on (Headline, Briefing Date). A new briefing date had no memory of yesterday's staging decision.
- **Affected object level:** Notion Editorial Queue write semantics.
- **Related issue:** #295. Track 2 P4.

## Fix
Cross-date lookback query in `writeEditorialQueueRow` that runs ONLY when the same-day query returns no match:
- Window: 14 days (`CROSS_DATE_DEDUP_LOOKBACK_DAYS`). Documented in code why this width.
- Filter: Headline-exact-equals + Briefing Date `on_or_after` (today − 14d) + `on_or_before` (today − 1d). Excludes today by construction so we don't re-match the same-day row.
- If match at status `raw`: re-staging proceeds (matches existing "raw can be updated" semantics).
- If match at any non-`raw` status: new action `skipped_duplicate_across_dates`; result carries `existingStatus` and `existingBriefingDate` for logging.

New summary field `notionRowsSkippedDuplicateAcrossDates` in the staging runner aggregates per run.

## Tests
- `notion-writer.test.ts`: 2 new tests — "skips when same headline already exists at non-raw status on a recent briefing date" + "does NOT skip when the cross-date match is still at status=raw". 3 existing tests updated to add the cross-date query response in the mock chain.

Full suite: 844/844 across 103 files. `npm run build` green.

## Why production didn't catch this earlier
The dedup key reflected the original "one row per signal per briefing day" design. Evergreen sources weren't anticipated; once Fed-research evergreens started appearing in the RSS pool, the same-day key let them through every time.

## Operator follow-up (post-deploy)
- After deploy: `notionRowsSkippedDuplicateAcrossDates` should fire >0 on most days while there are evergreens active.
- Editorial Queue stops accumulating cross-date duplicates of the Fed-research pieces.
- Existing duplicates already in the Notion queue from before deploy are NOT cleaned up — operator action (archive / delete) only if BM cares.

## Not addressed by this fix
- Existing cross-date duplicates in Notion (BM choice — keep for archive completeness or clean manually).
- Newsletter ingestion still dead until BM re-auths Gmail (P3 makes the timeout visible; P1 stops mislabeling the run).
- Soft `MED-HIGH` priority per Track 2 brief — lower than P1/P2/P3.
