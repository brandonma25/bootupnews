# Signal Selection Eligibility Remediation

Date: 2026-04-27

## Change Type

Remediation / alignment.

Canonical PRD required: No.

## Source of Truth

- Product Position: Boot Up is a curated briefing, not a feed.
- Product Position: Top 5 Core Signals must represent highest structural importance.
- Product Position: Next 2 Context Signals are lower-importance but still structurally useful.
- Product Position: no trending-only content and no unexplained importance.
- Product Position: no false freshness.
- PRD-9 Importance-first ranking.
- PRD-13 Signal filtering layer.
- PRD-35 Why-it-matters quality framework.
- PRD-40 Quality calibration and output sanity.
- PRD-53 Signals admin editorial layer.
- PRD-57 Homepage volume layers.
- PR #120 structural-importance ranking remediation.
- PR #126 controlled pipeline safety modes.
- Dry-Run Signal Selection Quality Diagnosis.

No new canonical PRD is required because this remediates selection behavior against already-approved Product Position and PRD contracts.

## Problem

The controlled dry run proved the no-write mode worked, but the active cluster-first pipeline could rank candidates before applying the PRD-13 filtering layer. With a narrow source pool, weak product, entertainment, partnership, gadget, lifestyle, or generic commentary items could still be promoted into proposed Core Signal slots merely to fill the expected Top 5.

Limited source coverage may explain a weak candidate pool, but it must not excuse weak Core Signals. The pipeline should fail closed when fewer than five Core-eligible candidates exist.

## Remediation

The cluster-first path now applies PRD-13 article filtering before dedupe, clustering, ranking, and public candidate selection.

Final candidate selection now assigns explicit eligibility tiers:

- `core_signal_eligible`
- `context_signal_eligible`
- `depth_only`
- `exclude_from_public_candidates`

Core eligibility requires a passing PRD-13 decision, structural event evidence, enough specificity, adequate source quality, and enough strategic importance. Weak consumer, entertainment, podcast, partnership, gadget, lifestyle, product-review, trailer, deal, or generic commentary candidates are excluded from Core placement unless the general evaluator finds explicit structural importance.

Why-it-matters validation remains separate from selection quality:

- bad generated why-it-matters copy blocks publish;
- structurally valid stories with bad copy may still enter editorial review;
- structurally weak stories cannot become Core Signals even when their copy passes validation.

## Fail-Closed Behavior

The controlled pipeline no longer manufactures public readiness. If fewer than five candidates are Core-eligible, dry-run and draft/test output returns fewer Core Signals and reports:

- `candidate_pool_insufficient`
- `eligibleCoreCount`
- `excludedWeakCandidateCount`
- exclusion reasons
- source-pool sufficiency warnings

The existing clean public surface remains untouched because generation is still separated from editorial publish.

## Diagnostics

Dry-run artifacts now include article and signal diagnostics for future review, including:

- active source list and source distribution;
- PRD-13 filter decisions, severities, and reasons;
- eligibility tier and eligibility reasons;
- event type, source tier, article count, source diversity, score components, final score, ranking provider, and diversity provider;
- why-it-matters validation status and failure details;
- selection-quality warnings and source scarcity signals.

## Non-Goals

- Does not promote TLDR or any additional political source into ingestion.
- Does not hard-code source bans or title-specific exclusions.
- Does not change Action 1 final homepage ranking behavior except to enforce upstream public-candidate eligibility.
- Does not run `draft_only`.
- Does not run or re-enable the production cron.
- Does not write production data.
- Does not change cleaned April 26 public content.
