# Institutional Signal Calibration Remediation

- Date: 2026-04-28
- Change type: remediation / alignment
- Branch: `codex/institutional-signal-calibration-remediation`
- Canonical PRD: none; this is an engineering/data-pipeline remediation.

## Source Of Truth

- Product Position: Boot Up is a curated briefing, not a feed.
- PRD-9 Importance-first ranking.
- PRD-11 Ingestion reliability fallbacks.
- PRD-13 Signal filtering layer.
- PRD-35 Why-it-matters quality framework.
- PRD-42 Source governance and defaults.
- PRD-54 Public source manifest.
- PR #127 selection eligibility remediation.
- PR #129 source accessibility predicate remediation.
- PR #130 Batch 1 accessible source promotion.
- Batch 1 Core/Context Eligibility Calibration Diagnosis.

## Problem

After PR #130, the public manifest source pool expanded and the controlled
dry run remained zero-write, but the pipeline still produced no Core-eligible
Signals. The accepted diagnosis was mixed:

- fail-closed selection behavior was mostly correct;
- the event classifier under-recognized institutional, legal/accountability,
  economic-release, platform-regulation, government-capacity, and AI
  infrastructure-policy stories;
- weak-content labels such as `weak_gadget_or_review_content` were applied to
  substantive public-interest stories when the word `review` appeared in a
  legal or institutional context;
- many finance sources remained source-thin;
- why-it-matters failures added noise but were not the selection root cause.

## Implementation

This remediation keeps fail-closed behavior and source-accessibility gates
intact while adding targeted calibration:

- added event-type recognition for:
  - `government_capacity`
  - `public_interest_legal_accountability`
  - `platform_regulation`
  - `macro_data_release`
  - `central_bank_policy`
  - `ai_infrastructure_policy`
  - `cybersecurity_enforcement`
  - `institutional_governance`
- added targeted structural feature boosts for those patterns in the ranking
  feature provider without globally lowering Core thresholds;
- protected public-interest/institutional/legal/economic stories from consumer
  gadget/review labels unless the content is actually consumer-product context;
- added calibrated labels and exclusion-cause fields to controlled dry-run
  diagnostics;
- kept routine/stale institutional rollups, source-thin market commentary, and
  gadget/product/lifestyle stories out of Core/Context eligibility.

## Non-Goals

- No Batch 2 sources.
- No card-level editorial authority.
- No homepage snapshot schema.
- No public publish behavior changes.
- No Vercel cron changes.
- No production data writes.
- No global Core threshold lowering.

## Object Level

This changes Article filtering/classification, Story Cluster ranking feature
calibration, and Signal eligibility diagnostics. It does not change Card
rendering or Surface Placement behavior.

## Validation Plan

Required validation:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run governance:coverage`
- `npm run governance:audit`
- `npm run governance:hotspots`
- `python3 scripts/validate-feature-system-csv.py`
- `python3 scripts/release-governance-gate.py`
- Chromium E2E
- WebKit E2E
- controlled `dry_run` only
- production and preview browser smoke checks

