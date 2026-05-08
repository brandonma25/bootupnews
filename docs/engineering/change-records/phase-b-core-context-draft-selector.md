# Phase B Core/Context Draft Selector

## Summary

This remediation adds a tightly scoped controlled-pipeline selector for a limited Phase B `draft_only` run. The default `draft_only` behavior remains Core-only. Context rows are included only when explicitly enabled through controlled-test environment configuration.

## Controlled Configuration

- `PIPELINE_DRAFT_TIER_ALLOWLIST=core,context`
- `PIPELINE_DRAFT_MAX_ROWS=3`

The selector accepts only Core and Context tiers for this path. Depth and excluded rows fail closed by configuration or selection filtering.

## Safety Boundaries

- Existing production draft gating is preserved.
- `ALLOW_PRODUCTION_PIPELINE_TEST=true` is still required for production `draft_only`.
- `PIPELINE_RUN_MODE=draft_only` is still required for writes.
- `PIPELINE_CRON_DISABLED_CONFIRMED=true` is still required for production `draft_only`.
- `PIPELINE_DRAFT_MAX_ROWS` is capped at three rows.
- No cron settings, public publish behavior, source manifests, ranking calibration, or why-it-matters templates are changed.

## Persistence Behavior

Rows inserted through `persistSignalPostsForBriefing` remain editorial review candidates:

- `editorial_status = needs_review`
- `is_live = false`
- `published_at = null`

This change does not execute `draft_only` and does not write production data.
