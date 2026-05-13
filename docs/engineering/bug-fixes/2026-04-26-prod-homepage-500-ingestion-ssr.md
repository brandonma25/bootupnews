# Production Homepage 500 From Ingestion SSR Import — Bug-Fix Report

## Release Metadata
- Date: 2026-04-26
- Branch: `hotfix/prod-homepage-500-ingestion-ssr`
- PR: #108, `https://github.com/brandonma25/bootupnews/pull/108`

## GitHub Source-of-Truth Metadata

- Affected object level: Surface Placement.
- PR: #108, `https://github.com/brandonma25/bootupnews/pull/108`.
- Branch: `hotfix/prod-homepage-500-ingestion-ssr`.
- Head SHA: `d3609c1be58aefd765b1f902958492457b0a8704`.
- Merge SHA: `ff1c7dce7efc4f350ebc043fa5902aaed01185a5`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #108 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Incident Summary
- Problem addressed: production `GET /` returned `500` before any outbound feed fetch ran.
- Production symptom: Vercel logged `Function Invocation Failed` and the homepage never rendered.
- Sanitized error excerpt: `require() of ES Module .../@exodus/bytes/encoding-lite.js from .../html-encoding-sniffer.js not supported`

## Root Cause
- `src/app/page.tsx` loaded homepage state through `src/lib/data.ts`.
- `src/lib/data.ts` eagerly imported the ingestion pipeline and RSS parser modules at file load time.
- That import chain pulled `rss-parser` and its HTML sniffing dependencies into homepage SSR, even when the request only needed read-only homepage data.
- The public homepage path also generated a live briefing during SSR instead of reading persisted data, so `/` remained coupled to ingestion behavior.

## Fix Applied
- Moved the homepage-safe read path into existing shared modules so the hotfix remains remediation rather than net-new feature surface.
- `src/lib/data.ts` now exposes SSR-safe homepage/history/detail readers that use only:
  - published `signal_posts` for the signed-out homepage
  - persisted `daily_briefings` and `briefing_items` for signed-in homepage/history/detail reads
  - static demo fallback content when no published signal set is available
- Switched `/`, `/history`, `/briefing/[date]`, and `/signals` to the SSR-safe read path, with `/signals` using the existing editorial published-post reader.
- Hardened `src/lib/data.ts` with lazy imports for pipeline and RSS helpers so query-only routes that still import `data.ts` do not pull the feed parser into module initialization.
- Preserved ingestion in explicit generation and editorial workflows only.

## Files Changed
- `src/app/page.tsx`
- `src/app/history/page.tsx`
- `src/app/briefing/[date]/page.tsx`
- `src/app/signals/page.tsx`
- `src/app/page.test.tsx`
- `src/app/signals/page.test.tsx`
- `src/lib/data.ts`

## Validation
- `npm install`
- `npm run lint`
- `npm run test`
- `npm run build`
- `lsof -ti:3000 | xargs kill -9 || true`
- `npm run dev`
- `npx playwright test tests/smoke/homepage.spec.ts tests/homepage.spec.ts --project=chromium`
- Local dev server reported: `http://localhost:3000`
- Browser fallback note: desktop browser automation permissions were unavailable in this session, so the local browser validation was completed through Playwright against the live local server.

## Remaining Risks / Follow-up
- Homepage SSR should continue using persisted read models only; do not route `/` back through ingestion helpers or shared barrels that export ingestion code.
- If the public homepage needs richer depth beyond the live published signal set, add that through a separate persisted read model instead of regenerating live feeds during SSR.
- Preview validation is still required before recommending merge to production.
