# Politics Ingestion Sources - Local Validation Report

## Release Metadata

- Date: 2026-04-25
- Branch: `feature/politics-ingestion-sources`
- Worktree: `/Users/bm/dev/worktrees/daily-intelligence-aggregator-politics-ingestion-sources`
- Local URL: `http://localhost:3000`

## Commands Run

- `npm install`
- `npm run test -- src/lib/source-catalog.test.ts src/lib/pipeline/ingestion/index.test.ts src/lib/pipeline/index.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `lsof -i :3000`
- `npm run dev`
- `curl -I http://localhost:3000`
- `curl -s http://localhost:3000 | rg -o "Politics|Finance|Tech News|Top Events" -n`
- Live RSS probe for:
  - `https://apnews.com/politics.rss`
  - `https://rss.politico.com/politics-news.xml`
  - `https://rss.politico.com/congress.xml`
  - `https://rss.politico.com/defense.xml`
- Congress.gov connectivity probe:
  - `https://api.congress.gov/`

## Automated Results

- Targeted source/pipeline tests: passed, 3 files and 21 tests.
- Full unit/integration suite: passed, 60 files and 351 tests.
- Lint: passed.
- Build: passed.
- Port 3000 pre-check: no conflicting process was present.
- Dev server: passed on `http://localhost:3000`.
- Homepage route probe: `HTTP/1.1 200 OK`.
- Homepage HTML sanity probe: matched `Top Events`, `Tech News`, `Finance`, and `Politics`.

## Live Feed Validation

### AP Politics

- Requested URL: `https://apnews.com/politics.rss`
- Result: failed for RSS ingestion.
- Observed behavior: the URL returned AP's HTML `Page unavailable` document instead of parseable RSS.
- Handling decision: catalog-only failed entry; not wired into runtime ingestion.

### Politico Politics News

- Requested URL: `https://rss.politico.com/politics-news.xml`
- Result: passed.
- Sample normalized items:
  - `title`: `From Iran to Paris weather: Alleged prediction market violations start stacking up`
    `url`: `https://www.politico.com/news/2026/04/24/prediction-market-insider-trading-violations-00890570`
    `published_at`: `2026-04-24T16:54:44.000Z`
    `source`: `Politico Politics News`
    `category`: `politics`
  - `title`: `The nation’s cartoonists on the week in politics`
    `url`: `https://www.politico.com/gallery/2026/04/24/the-nations-cartoonists-on-the-week-in-politics-00889775`
    `published_at`: `2026-04-24T09:00:00.000Z`
    `source`: `Politico Politics News`
    `category`: `politics`

### Politico Congress

- Requested URL: `https://rss.politico.com/congress.xml`
- Result: passed.
- Sample normalized items:
  - `title`: `No credentials, no problem as TMZ DC shakes up Hill media bubble`
    `url`: `https://www.politico.com/news/2026/04/25/tmz-dc-capitol-hill-interview-00891764`
    `published_at`: `2026-04-25T14:00:00.000Z`
    `source`: `Politico Congress`
    `category`: `politics`
  - `title`: `‘I've been taking a ton of risk’: Inside Jim Himes’ mission to save a key spy authority`
    `url`: `https://www.politico.com/news/2026/04/24/jim-himes-foreign-intelligence-surveillance-act-00890092`
    `published_at`: `2026-04-24T08:45:00.000Z`
    `source`: `Politico Congress`
    `category`: `politics`

### Politico Defense

- Requested URL: `https://rss.politico.com/defense.xml`
- Result: passed.
- Sample normalized items:
  - `title`: `Senate Armed Services chair: Trump should resume strikes on Iran`
    `url`: `https://www.politico.com/news/2026/04/24/wicker-iran-bomb-00891261`
    `published_at`: `2026-04-24T20:47:02.000Z`
    `source`: `Politico Defense`
    `category`: `politics`
  - `title`: `Hegseth declares victory while preparing for more war with Iran`
    `url`: `https://www.politico.com/news/2026/04/24/iran-hegseth-victory-endless-war-00890455`
    `published_at`: `2026-04-24T15:59:38.000Z`
    `source`: `Politico Defense`
    `category`: `politics`

## Pipeline Integrity Evidence

- Supplied politics-source metadata test confirms politics sources map to canonical `World` topic metadata rather than defaulting to `Tech`.
- Pipeline resilience test confirms one failed politics source does not block deduplication, clustering, ranking, or digest generation for remaining successful feeds.
- No default public ingestion source IDs or donor fallback IDs changed.

## Congress.gov Handling

- Connectivity probe result: `200 OK`
- Content type: `text/html; charset=utf-8`
- Decision: keep `Congress.gov API` cataloged as `sourceFormat: "api"` and `catalog_only` until a dedicated adapter and safe key-management path exist.

## Remaining Risks

- AP Politics is not currently usable at the requested RSS URL.
- Politico feed content can overlap with existing politics/geopolitics sources and may increase duplicate pressure.
- UI sanity was limited to route availability and category-label presence because the public homepage source set was intentionally left unchanged in this branch.
