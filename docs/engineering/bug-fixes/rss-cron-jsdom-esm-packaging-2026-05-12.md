# RSS Cron jsdom ESM Packaging — Bug-Fix Record

## Summary
- Problem addressed: Production RSS fetch cron failed before producing Articles, with a serverless runtime packaging error in `html-encoding-sniffer` / `@exodus/bytes`.
- Root cause: `src/lib/tldr.ts` imported `jsdom` in the production RSS ingestion path. The deployed Node serverless bundle hit a CommonJS-to-ESM dependency edge before RSS ingestion could run.
- Affected object level: Article ingestion.

## Fix
- Exact change: Replaced the TLDR digest DOM extraction dependency with a deterministic anchor/heading extractor so production cron code no longer imports `jsdom`.
- Related PRD: `PRD-60`, `PRD-61`
- PR: `#222`
- Branch: `fix/prd-60-rss-cron-esm-packaging`
- Head SHA: `97d7df3c40dd3e5a650079b7aee67c2acef28542`
- Merge SHA: Pending
- GitHub source-of-truth status: PR open.
- External references reviewed, if any: Sanitized production log evidence only; no secrets, raw email content, snippets, or message IDs recorded.
- Google Sheet / Work Log reference, if historically relevant: Not used as canonical source of truth.
- Branch cleanup status: Pending PR merge.

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- [x] Confirmed object level before coding: Article.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `rss` and `tldr` naming preserved only where already established.

## Validation
- Automated checks:
  - `npm install` completed.
  - `npx vitest run src/lib/tldr.test.ts src/lib/rss.test.ts src/lib/pipeline/ingestion/tldr.integration.test.ts` passed.
  - `npm run lint` passed.
  - `npx vitest run src/app/api/cron/fetch-news/route.test.ts src/app/api/cron/fetch-editorial-inputs/route.test.ts src/lib/newsletter-ingestion/gmail.test.ts src/lib/newsletter-ingestion/runner.test.ts src/lib/tldr.test.ts src/lib/rss.test.ts src/lib/pipeline/ingestion/tldr.integration.test.ts` passed.
  - `npm run test` passed, 91 files and 670 tests.
  - `npm run build` passed. Existing workspace-root and module-type warnings were observed.
  - Built cron route artifacts under `.next/server/app/api/cron` no longer contain `html-encoding-sniffer`, `@exodus/bytes`, or direct `jsdom` imports.
- Human checks:
  - Production fetch retry requires merge, deployment, valid production env, and BM authorization.

## Remaining Risks / Follow-up
- Gmail newsletter ingestion remains blocked until the production REST OAuth refresh token belongs to the Gmail account that can see exact label `boot-up-benchmark`.
- Vercel preview or production should be used to verify the cron route after this fix is merged and deployed.
