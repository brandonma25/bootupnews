# Category 1 Public Source Supply Expansion

## Summary

This PR replaces the degraded Reuters World public manifest source with BBC World News, verifies BBC World fetches successfully in Vercel preview, and expands the governed `public.home` source manifest to nine Category 1 sources across Tech, Finance, and Politics. The donor registry entry `horizon-reuters-world` is intentionally not retired in this PR because no-argument runtime and internal review dependencies remain out of scope.

## Phase 1 BBC World verification

- Preview URL: `https://daily-intelligence-aggregator-ybs9-80swm3ghi.vercel.app`
- Vercel deployment: `dpl_F8toFvs4UHPeoYNLK4UH4YWWDw2m`
- Verification timestamp: `2026-04-23T13:30:51Z`
- Result: success.

Evidence from the preview-rendered server payload:

```json
{
  "id": "source-bbc-world",
  "name": "BBC World News",
  "feedUrl": "http://feeds.bbci.co.uk/news/world/rss.xml",
  "homepageDiagnostics": {
    "totalArticlesFetched": 36,
    "failedSourceCount": 0,
    "degradedSourceNames": []
  }
}
```

The rendered briefing payload included a BBC World News article URL from `bbc.com/news`, confirming non-zero BBC item ingestion.

## Phases

Phase 0 changed `src/lib/demo-data.ts`, `src/lib/source-manifest.ts`, and source-selection tests to replace `source-reuters-world` with `source-bbc-world` at the same manifest position.

Phase 1 added `docs/changes/004-bbc-world-verification-success.md` with the Vercel preview URL, request evidence, rendered diagnostics, and log snippet.

Phase 2 changed `src/lib/demo-data.ts`, `src/lib/source-manifest.ts`, and tests to add `source-mit-tech-review` immediately after Ars Technica, matching the OpenClaw donor feed URL `https://www.technologyreview.com/feed/`.

Phase 3 changed `src/lib/demo-data.ts`, `src/lib/source-manifest.ts`, `src/lib/source-catalog.ts`, and tests to add `source-reuters-business` after Financial Times and document that the legacy catalog entry is superseded at runtime by `horizon-reuters-business` and `source-reuters-business`.

Phase 4 changed `src/lib/demo-data.ts`, `src/lib/source-manifest.ts`, ingestion/manifest/dashboard tests, and this PR description to add `source-foreign-affairs` after BBC World and assert final category grouping.

## Final manifest state

Tech: `source-verge`, `source-ars`, `source-mit-tech-review`, `source-tldr-tech`, `source-techcrunch`.

Finance: `source-ft`, `source-reuters-business`.

Politics: `source-bbc-world`, `source-foreign-affairs`.

## Feed URL confirmations

- BBC World News uses BBC's documented public feed: `http://feeds.bbci.co.uk/news/world/rss.xml`.
- MIT Technology Review demo-data feed matches the OpenClaw donor definition: `https://www.technologyreview.com/feed/`.
- Reuters Business demo-data feed matches the Horizon donor definition: `https://feeds.reuters.com/reuters/businessNews`.
- Foreign Affairs demo-data feed matches the catalog entry: `https://www.foreignaffairs.com/rss.xml`.

## Test summary

- `npm run test`: passed, 57 files and 316 tests.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run dev`: passed; Local URL `http://localhost:3000`.
- Local smoke: `curl -I http://localhost:3000/` returned `200`.

## Follow-up note

`horizon-reuters-world` remains in the donor registry and no-argument runtime path. Retiring or replacing that donor entry needs a separate audit because this PR only governs the public manifest path.
