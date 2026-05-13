# Homepage Progressive Loading and Performance Gate

## Scope

This record covers the production load-time remediation for the public homepage.

## Changes Under Test

- Homepage SSR no longer loads category Article rows.
- Tech, Finance, and Politics tab content is fetched only after the reader clicks a category tab.
- Category Article rows come from the latest two cron-backed `pipeline_article_candidates` runs, exclude likely paywalled sources, exclude current Signal Card URL/title duplicates, and cap at 12 per category.
- Supabase MVP measurement and PostHog forwarding remain enabled; category tab opens use the sanitized `category_tab_open` event.
- Production route-probe defaults now use current Boot Up homepage markers so route verification can reach the performance gate.
- Production verification now includes `npm run release:performance` with 3000 ms hard fails for LCP and network idle, plus a 2000 ms visible-content target.
- App-shell navigation disables eager prefetch for Home, History, Account, Login, and editorial/admin entry links so the signed-out homepage does not spend its first seconds fetching routes the reader has not requested.
- The visible "Browse by category" heading has been removed; Tech, Finance, and Politics controls render above the Signal Card list while their Article rows stay unmounted until click.
- Automatic page-view analytics remain enabled but defer briefly after mount; user-intent events such as source clicks and category tab opens still track immediately.

## Validation Plan

- Focused unit and component tests for the category selector, category API, progressive tab fetch states, and analytics sanitization.
- Homepage E2E smoke for initial signal-only render plus category tab click behavior.
- Standard local gate: `npm run lint`, `npm run test`, `npm run build`, and Chromium/WebKit Playwright.
- Production gate after merge: `npm run release:production -- --base-url https://bootupnews.vercel.app` followed by `npm run release:performance -- --base-url https://bootupnews.vercel.app`.

## Validation Run

- `npm run lint`: passed.
- `npm run test`: passed, 688 tests across 96 files.
- `npm run build`: passed.
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:chromium`: passed, 33 tests.
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:webkit`: passed, 33 tests.
- `git diff --check`: passed.
- `python3 scripts/validate-feature-system-csv.py`: passed with pre-existing slug warnings.
- `python3 scripts/release-governance-gate.py`: passed.
- `npm run release:production -- --base-url https://bootupnews.vercel.app`: passed route probe for current production.
- `npm run release:performance -- --base-url https://bootupnews.vercel.app`: failed against current production before this PR is deployed, with LCP 19756 ms, FCP 4080 ms, decompressed homepage HTML 827.3 KB, script bytes 1.75 MB, and 45 route requests.
- Local browser QA on `http://127.0.0.1:3000/`: passed. The homepage rendered category controls without an initial category panel; clicking Tech showed the progressive empty state and no browser console errors.

## Notes

- This change keeps analytics intact. It reduces first-render work by removing category Article rows from SSR and defers additional news until explicit tab intent.
- No ranking, ingestion, source activation, publishing, or public Signal selection behavior changes are included.
