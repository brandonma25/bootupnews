# MIT Internal Review Surface

Date: 2026-04-21

Governed feature: `PRD-50` (`docs/product/prd/prd-50-mit-internal-review-surface.md`)

## Purpose

MIT Technology Review is the active probationary runtime source, and the daily automation already posts sanitized evidence to Issue #70. This change adds a compact internal page so reviewers can inspect current MIT signal quality without relying only on logs.

## Route

- Path: `/internal/mit-review`
- Access model: authenticated internal route using the existing Supabase session check
- Indexing: noindex / nofollow metadata
- Navigation: not added to public or product navigation

## Data Shown

- Current probationary runtime source IDs
- Resolved probationary source IDs from the no-argument runtime source-resolution snapshot
- Confirmation when MIT Technology Review is the only configured and resolved probationary runtime source
- Current/recent MIT feed sample with sanitized top titles, snippets, item counts, and freshness labels
- Conservative signal-quality, noise, and duplicate-pressure notes for the current request
- A link to Issue #70 as the durable multi-day review history

## What It Does Not Prove

- It does not prove MIT contributed to a ranked dashboard card.
- It does not establish a multi-day trend.
- It does not make source activation, promotion, removal, or boost decisions.
- It does not replace Issue #70, preview validation, or human source-policy judgment.

## Safety Boundary

The page intentionally omits feed URLs, article URLs, cookies, headers, credentials, tokens, emails, user IDs, and registry dumps. Unauthenticated requests see only a locked internal-access state and no MIT evidence.

## Future Smallest Next Step

If reviewers need true multi-day in-app trend visibility later, add a structured, sanitized review-snapshot store fed by the existing Issue #70 workflow. Do not scrape logs or expose raw GitHub comments from the app without a separate access-control review.
