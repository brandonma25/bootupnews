# Tracker Sync — MIT Review Automation

Date: 2026-04-20

## Reason

Direct live tracker access was not used in this pass. This fallback artifact records the intended tracker update for `PRD-42` so the governed row can be reconciled manually without creating duplicate feature rows.

## Governed Row

- PRD ID: `PRD-42`
- PRD File: `docs/product/prd/prd-42-source-governance-and-defaults.md`
- Work type: scheduled evidence automation

## Intended Tracker Update

- Status: `In Review`
- Decision: `keep`
- Notes: Added daily GitHub Actions automation to collect MIT Technology Review probationary runtime evidence and post the agreed review template to GitHub Issue #70. The workflow does not activate sources, change MVP defaults, change donor fallback defaults, change source-policy boosts, or expose a public debug endpoint.

## Verification Payload

- Target issue: `#70` (`MIT probationary runtime review`)
- Workflow: `.github/workflows/mit-probationary-review.yml`
- Script: `scripts/mit-probationary-review.mjs`
- Schedule: daily at 13:20 UTC after merge to the default branch
- Manual trigger: `workflow_dispatch` with `dry_run`
