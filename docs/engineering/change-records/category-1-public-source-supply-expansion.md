# Category 1 Public Source Supply Expansion

- Date: 2026-04-23
- Branch: `feature/public-source-manifest-v3`
- PRD: `docs/product/prd/prd-54-public-source-manifest.md`

## Summary

This change replaces the degraded Reuters World public manifest entry with BBC World News and expands the governed `public.home` manifest to nine public sources across Tech, Finance, and Politics.

## System Changes

- Replaces `source-reuters-world` with `source-bbc-world` in `demoSources` and the public manifest.
- Adds MIT Technology Review, Reuters Business, and Foreign Affairs as public manifest sources.
- Keeps `horizon-reuters-world` in the donor registry and no-argument runtime path for follow-up audit rather than retiring it in this PR.
- Updates tests that assert public manifest ordering, dashboard fallback source IDs, and manifest-aware ingestion cap behavior.

## Verification

- BBC World News fetched successfully in Vercel preview with zero degraded sources.
- Local `npm run test`, `npm run build`, `npm run lint`, and `npm run dev` passed.
