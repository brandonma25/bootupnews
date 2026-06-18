# Homepage Served a Stale Published Slate — Bug-Fix Record

## Summary
- **Problem addressed:** After publishing the daily slate, the public homepage (`/`) showed **fewer signals than were actually published** (e.g. 5 — or even 0 — while `/signals` correctly showed 7). The DB had 7 live, published rows for the briefing date; the homepage was serving a **stale render**.
- **Root cause:** `/` was **not** `force-dynamic` (unlike `/signals`), so Next.js cached / statically rendered it. The production deploy for #322 landed at **21:14:04 UTC**, but that day's slate wasn't published until **21:17:49 UTC** — ~3.5 minutes later. The build-time render of `/` therefore captured the **pre-publish (empty) state**, and the edge cache kept serving that stale render. `/signals` was unaffected because it already declares `export const dynamic = "force-dynamic"`.
- **Not the cause (ruled out):** the cap-to-7 code (every homepage data path returns up to 7 — `getHomepageSignalSnapshot` → `slice(0, TOP_SIGNAL_SET_SIZE=7)`; the view-model renders 7 from 7 items), the data (7 live rows confirmed in the DB), and the deployment (the #322 build was READY and current — nothing was reverted). The discrepancy was purely caching.
- **Affected object level:** Public homepage SSR/caching. No data change, no schema change.
- **Related:** follow-up to #322 (cap 5 → 7 / Pick → Publish).

## Fix
- **`src/app/page.tsx`** — add `export const dynamic = "force-dynamic"` and `export const revalidate = 0`, matching `/signals`. The homepage now always renders from the live published signal set, so it can never serve a stale build-time slate again.

## Tests
- **`src/app/page.test.tsx`** — new regression test asserting the homepage module exports `dynamic === "force-dynamic"` and `revalidate === 0`.
- Full homepage page tests pass; lint clean.

## Operator note
- The immediate live incident is cleared by a **fresh production redeploy** (rebuilds now that the slate is published, re-warming the cache with 7). This PR is the **durable** fix so the race (deploy lands before publish) can't recur.

## Not addressed by this fix
- No change to the publish path, the signal data, the cap, or `/signals` (already dynamic).
- No schema change.
