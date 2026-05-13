# Bug Fix: PRD 13 Signal Filtering Layer

## GitHub Source-of-Truth Metadata
- Affected object level: Article and Signal.
- PR: implementation history maps to #20, `https://github.com/brandonma25/bootupnews/pull/20`; canonical documentation backfill in #45, `https://github.com/brandonma25/bootupnews/pull/45`.
- Branch: `feature/repo-consolidation-main-sync`; `docs/strict-truth-doc-taxonomy-and-prd-backfill`.
- Head SHA: #20 `af784d5a83972381c94f5e9fcb4a5e451a18dc19`; #45 `96bdd47ab6db18002ec38035d890f69c41dedd64`.
- Merge SHA: #20 `f8a8ffe734ea6ba49dd0a22cc4b2421a88b951bc`; #45 `c182403f25f98aa40d82073a3eedb24328ee926c`.
- GitHub source-of-truth status: canonical historical bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #20 and #45 metadata, file history, and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Summary
- Added a dedicated signal-filtering module that evaluates article quality before downstream clustering and ranking.
- Stored machine-readable filter metadata on raw articles so filtering behavior is inspectable and tunable.
- Added fallback promotion logic so low-volume runs degrade gracefully instead of collapsing into empty briefing states.

## Changed Behavior
- Weak commentary, filler, promotional content, and repetitive follow-ups are now suppressed or rejected earlier.
- Tier 1 sources pass with lighter requirements than Tier 2 or Tier 3 sources.
- Non-tier1 but important stories can still survive via explicit fallback promotion rules.

## Files and Systems Touched
- `src/lib/signal-filtering.ts`
- `src/lib/data.ts`
- `supabase/schema.sql`
- `src/lib/signal-filtering.test.ts`

## Remaining Gaps
- Source tier mappings are intentionally conservative and will need tuning as more feeds are added.
- Existing unrelated lint/test debt remains in the repository and is documented in the validation notes.
