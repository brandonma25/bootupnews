## Summary

Homepage depth surfaces were unintentionally fed from the already-truncated `briefing.items` list, which is capped to the five-item public editorial layer. As a result, `Developing Now`, `By Category`, and homepage category tabs often had no eligible post-exclusion events to show once Top 5 items were removed.

## GitHub Source-of-Truth Metadata

- Affected object level: Signal, Card, and Surface Placement.
- PR: #105, `https://github.com/brandonma25/bootupnews/pull/105`.
- Branch: `feature/prd-55-homepage-volume-layers`.
- Head SHA: `13fd964ff5e0f2109cb066fa444e41b978b99e56`.
- Merge SHA: `9db39d7a4a02cdb41322826e47a39db0e350ce12`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #105 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Root Cause

`generateDailyBriefing(...)` built a broader ranked candidate list from pipeline `ranked_clusters`, but only the capped `briefing.items` list was preserved on `DashboardData`. `buildHomepageViewModel(...)` then used `data.briefing.items` for both the Top 5 layer and all downstream depth modules, so signed-out category exploration was constrained to the same five events already shown in Top 5.

## Fix

The remediation preserves the broader ranked public candidate list as `data.publicRankedItems` on `DashboardData`. Homepage view-model construction now keeps:

- `data.briefing.items` as the strict Top 5 editorial layer
- `data.publicRankedItems` as the source for `Developing Now`, `By Category`, and homepage category tabs

Depth modules still exclude surfaced Top 5 IDs and continue to apply semantic deduplication. If `publicRankedItems` is absent or empty, depth modules render honest empty states rather than silently falling back to the five-item briefing list.

## Outcome

Top 5 remains capped and unchanged, while signed-out users can now see broader public category-specific depth whenever the ranked public pool contains eligible items beyond the editorial five.
