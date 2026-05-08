# Homepage Structural Importance Ranking Remediation

Date: 2026-04-27

## Change Type

Remediation / alignment.

## Source Of Truth

- Boot Up Product Position: homepage Top 5 / Core Signals should represent highest structural importance.
- Boot Up Product Position: returning users should see Signals ranked by structural importance, not recency.
- Action 1 diagnosis: final homepage selection still preferred legacy `eventIntelligence.rankingScore`, which reflects the old coverage-breadth formula.

No new canonical PRD is required. This change uses an engineering change record because it aligns existing ranking behavior to the already-approved product position.

## Object Level

This change affects final Signal ranking for homepage Surface Placement through the existing `BriefingItem` compatibility object. It does not introduce canonical Signal identity, and it does not change `signal_posts` semantics.

## Implementation Summary

- `compareBriefingItemsByRanking()` now uses the strategic score carried by `BriefingItem.importanceScore` or `BriefingItem.matchScore` before legacy `eventIntelligence.rankingScore`.
- Legacy `eventIntelligence.rankingScore` remains available only as a fallback for older/demo `BriefingItem` objects without a strategic score.
- High-signal status, confidence, source diversity, freshness, and title are now explicit tie-breakers after the primary strategic score.
- `selectPublicBriefingItems()` now delegates to the shared comparator directly, while preserving topic diversity and `non_signal` second-pass constraints.

## Non-Goals

- Does not modify the ranking pipeline or `rankStoryClusters()` scoring rules.
- Does not modify template generation, why-it-matters validation, homepage rendering, editorial UI, or `signal_posts` schema.
- Does not reactivate `PersonalizedDashboard` or `ManualRefreshTrigger`.
- Does not add LLM or external API calls.

## Validation Notes

Unit tests were added or updated for:

- Final selection prefers high strategic importance over high coverage/legacy score.
- `ranked.score`-derived `importanceScore` takes precedence over `eventIntelligence.rankingScore`.
- Legacy coverage-breadth scoring cannot dominate final Top 5 ordering when a strategic score exists.
- Source authority/tier affects strategic score upstream and that score is honored by final selection.
- `rankNewsClusters()` coverage is labeled as a legacy compatibility path.
