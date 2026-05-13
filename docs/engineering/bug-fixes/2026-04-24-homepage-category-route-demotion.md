# Homepage Category Route Demotion — Bug-Fix Report

## Release Metadata
- Date: 2026-04-24
- Branch: `feature/prd-55-homepage-volume-layers`
- PR: #105, `https://github.com/brandonma25/bootupnews/pull/105`

## GitHub Source-of-Truth Metadata

- Affected object level: Surface Placement.
- PR: #105, `https://github.com/brandonma25/bootupnews/pull/105`.
- Branch: `feature/prd-55-homepage-volume-layers`.
- Head SHA: `13fd964ff5e0f2109cb066fa444e41b978b99e56`.
- Merge SHA: `9db39d7a4a02cdb41322826e47a39db0e350ce12`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #105 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Issue Summary
- Problem addressed: preview behavior could surface homepage content when users visited `/technology`, `/economics`, or `/politics`, creating the false impression that those were standalone category pages.
- Root cause: category browsing is implemented only through homepage tab state and homepage view-model filtering, while those direct URLs had no explicit framework-level contract.

## Fix Applied
- Exact change: added explicit non-permanent redirects from `/technology`, `/economics`, and `/politics` to `/` so category browsing remains inside the homepage tabs, and added tests to preserve the homepage tab-category mapping.
- Files modified:
  - `next.config.ts`
  - `tests/routes/dashboard.spec.ts`
  - `src/lib/homepage-model.test.ts`

## Validation
- Automated checks:
  - `npm run release:local`
- Human checks:
  - Verified the product decision remains intact: homepage tabs are the only category-browsing surface, and direct category URLs resolve back to Home.

## Remaining Risks / Follow-up
- If product later wants standalone category destinations, that should be scoped as a new feature with dedicated routes and a separate governed spec rather than reusing these legacy-looking paths implicitly.
