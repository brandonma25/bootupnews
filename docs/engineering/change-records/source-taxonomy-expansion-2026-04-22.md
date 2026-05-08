# Source Taxonomy Expansion

Date: 2026-04-22

Governed feature: `PRD-52` (`docs/product/prd/prd-52-source-taxonomy-expansion.md`)

## Source-of-Truth Notes

- Primary request: expand ingestion with the 11 supplied RSS source identities.
- Existing repo fact: PRD-42 and `docs/engineering/change-records/source-onboarding-batch-1.md` previously treated several of these as catalog-only or probationary and explicitly did not activate them.
- This branch treats the new request as feature work, not remediation, because it changes active product scope by expanding public source-manifest and donor runtime coverage.
- 2026-05-08 merge refresh note: PRD-54 introduced the governed `public.home` manifest after this PR was opened. The refreshed implementation routes public activation through that manifest and keeps the legacy MVP default helper as a compatibility fallback.

## Source Additions

Validated and active in the governed public source manifest and/or donor runtime metadata:

- MIT Technology Review — strict `tech`
- The Verge — existing strict `tech`
- Ars Technica — existing strict `tech`
- Hacker News Best — strict `tech`
- Foreign Affairs — strict `politics`
- The Diplomat — strict `politics`
- NPR World — strict `politics`
- Foreign Policy — mixed-domain/O3
- The Guardian World — mixed-domain/O3

Registered but not actively fetched:

- Brookings Research — mixed-domain/O3, disabled because the supplied feed URL redirects to HTML and fails RSS parsing.
- CSIS Analysis — mixed-domain/O3, disabled because the supplied endpoint returns `404` and fails RSS parsing.

## Category Logic

- Strict source profiles contribute source-level category signals only for their approved category.
- Mixed-domain/O3 source names are ignored as category signals so a name like `Foreign Policy` does not force every item into politics.
- Mixed-domain items can still classify into `tech`, `finance`, or `politics` when the item title, summary, matched keywords, or ranking signals support that category.
- Homepage duplicate detection ignores generic feed/web boilerplate tokens from sources such as Hacker News Best (`http`, `com`, `comment`, `url`, and similar terms) so unrelated stories are not collapsed out of Top Events.
- The repo category key for economics remains `finance`; this branch does not rename or add category keys.

## Mixed-Domain Limitation

The repo did not already have a first-class mixed-domain/O3 source grouping or category key. The safest architecture-consistent handling is a source-profile layer with `domainScope: "mixed_domain"` plus existing item-level homepage classification.

Future first-class mixed-domain support would need:

- a formal mixed/O3 source state in source availability or taxonomy contracts,
- UI/product decisions for whether mixed-domain items get their own rail or only route into existing category tabs,
- persisted source taxonomy metadata if Supabase-backed user sources need the same distinction.

## Live Feed Validation

Validation used direct HTTP fetch plus `rss-parser` parsing with the same parser dependency used by ingestion.

| Source | URL | Result |
| --- | --- | --- |
| MIT Technology Review | `https://www.technologyreview.com/feed/` | `200`, parsed RSS, 10 items |
| The Verge | `https://www.theverge.com/rss/index.xml` | `200`, parsed RSS, 10 items |
| Ars Technica | `https://feeds.arstechnica.com/arstechnica/index` | `200`, parsed RSS, 20 items |
| Foreign Affairs | `https://www.foreignaffairs.com/rss.xml` | `200`, parsed RSS, 20 items |
| The Diplomat | `https://thediplomat.com/feed` | `200`, parsed RSS, 96 items |
| NPR World | `https://feeds.npr.org/1004/rss.xml` | `200`, parsed RSS, 10 items |
| Brookings Research | `https://www.brookings.edu/feeds/rss/research/` | `200` HTML redirect, RSS parse failed |
| Foreign Policy | `https://foreignpolicy.com/feed` | `200`, parsed RSS, 25 items |
| The Guardian World | `https://www.theguardian.com/world/rss` | `200`, parsed RSS, 45 items |
| Hacker News Best | `https://hnrss.org/best` | `200`, parsed RSS, 30 items |
| CSIS Analysis | `https://www.csis.org/analysis/feed` | `404`, RSS parse failed |

## Validation

Completed:

- `npm install` — passed with one reported high-severity npm audit finding.
- `npm run test -- src/lib/source-policy.test.ts src/lib/source-manifest.test.ts src/lib/source-taxonomy.test.ts src/lib/source-defaults.test.ts src/lib/pipeline/ingestion/index.test.ts src/lib/pipeline/index.test.ts src/lib/data.dashboard-fallback.test.ts` — passed on 2026-05-08 after merging current `origin/main`, 7 files / 44 tests.
- `npm install` — passed on 2026-05-08; npm reported 2 audit findings (1 moderate, 1 high).
- `npm run lint` — passed on 2026-05-08.
- `npm run test` — passed on 2026-05-08, 81 files / 609 tests.
- `npm run build` — passed on 2026-05-08. Warnings remained limited to the known multiple-lockfile workspace-root inference and Tailwind module-type warning.
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:chromium` — passed on 2026-05-08, 33 tests. The managed dev server logged a transient `ECONNRESET` aborted connection during shutdown after tests passed.
- `PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:webkit` — passed on 2026-05-08, 33 tests.
- `npm run lint` — passed.
- `npm run test` — passed, 49 files / 262 tests after adding the Hacker News boilerplate duplicate-regression test.
- `npm run build` — passed. Warnings: Next inferred `/Users/bm/package-lock.json` as workspace root because multiple lockfiles exist; Tailwind config reparsed as ESM because `package.json` has no `type`.
- Dev server rule — `pwd` confirmed `/Users/bm/Documents/daily-intelligence-aggregator-source-taxonomy-expansion`; no existing Next dev process or port `3000` listener found; `npm run dev` started at `http://localhost:3000`.
- `npx playwright test --project=chromium` — final full rerun passed, 30/30 tests.
- `npx playwright test` — Chromium and WebKit passed in the full cross-browser run. Firefox showed auth/navigation timing failures in full-project runs; the initially failed Firefox specs passed on direct rerun with `npx playwright test --project=firefox tests/auth-entry.spec.ts tests/audit/route-traversal.spec.ts tests/settings.spec.ts`. CI currently runs Chromium and WebKit e2e jobs, not Firefox.
- Manual local browser smoke at `http://localhost:3000/` — passed. Signed-out homepage rendered `Top Events`, `Tech News`, `Finance`, and `Politics`; top events rendered; Tech and Politics tabs showed the signed-out soft gate; Brookings and CSIS did not appear in rendered active content; no page errors or non-font request failures were captured.

Pending:

- Preview validation for deployed SSR and route behavior.
