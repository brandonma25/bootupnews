# Source Accessibility Predicate Remediation

Date: 2026-04-28

Change type: remediation / alignment

Canonical PRD required: No

## Source Of Truth

- Product Position: Boot Up is a curated briefing, not a feed; Core Signals require structural importance and explicit why-it-matters reasoning.
- PRD-11 Ingestion reliability fallbacks.
- PRD-13 Signal filtering layer.
- PRD-35 Why-it-matters quality framework.
- PRD-42 Source governance and defaults.
- PRD-54 Public source manifest.
- PR #127 signal-selection eligibility remediation.
- PR #128 public source manifest path remediation.

## Problem

The controlled pipeline could distinguish source authority from source count, but it did not treat article-body accessibility as a first-class eligibility predicate. A tier-1 source with only a thin RSS abstract, metadata-only item, paywall-limited body, or fetch failure could still look authoritative to downstream selection. That created a risk that Core Signal eligibility would be granted without enough accessible evidence to support structural reasoning.

## Remediation

This change separates source role from content accessibility and applies content-accessibility support before Core, Context, or Depth public-candidate eligibility is assigned. Dry-run artifacts now serialize source accessibility, fetch/parse status, extraction method, functional coverage by category, source-health warnings, and candidate-pool insufficiency reasons.

No source promotion is included. Reuters Business remains cataloged but fetch failures are treated as zero Core authority. FT can remain tier-1 authority, but thin RSS/paywall-limited evidence is not sufficient for Core eligibility by itself.

## Scope Boundaries

- No production data writes.
- No scheduled cron re-enable.
- No draft-only pipeline run.
- No new public source batch.
- No homepage snapshot schema.
- No card-level editorial authority workflow.

## Validation Expectations

- Metadata-only tier-1 items cannot be Core-eligible.
- Abstract-only tier-1 items cannot be Core-eligible unless substantial or corroborated.
- Paywall-limited no-body items are downgraded.
- Fetch-failing sources do not count as functional category coverage.
- Full-text or substantial-partial authoritative sources can support Core when structural eligibility also passes.
- Controlled dry-run remains zero-write.
