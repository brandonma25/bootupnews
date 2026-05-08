# Phase A.2 Cron Disable Preflight Remediation

## Effective Change Type

Remediation / controlled operations validation.

## Source Of Truth

- Phase A.2 controlled operations prompt.
- `BOOT_UP_WORK_LOG.md` operational baseline as cited by the prompt.
- PR #190 deployed composer locked-state bug-fix baseline.

## Summary

Phase A.2 preflight requires production cron to be disabled before any controlled `draft_only` run can set `PIPELINE_CRON_DISABLED_CONFIRMED=true`.

Production inspection showed the deployed Vercel config still included a scheduled `/api/cron/fetch-news` entry. This remediation removes the scheduled cron from `vercel.json` so a later Phase A.2 preflight can truthfully confirm cron-disabled state before attempting production non-live draft creation.

## Scope

- Remove the Vercel cron schedule from `vercel.json`.
- Preserve the `/api/cron/fetch-news` route and its existing authorization behavior.
- Do not run cron.
- Do not run `draft_only`.
- Do not publish or mutate Signal rows.
- Do not change source manifests, ranking, WITM templates, homepage schema, admin authority, or database schema.

## PRD Status

No canonical PRD is required. This is an operational safety remediation, not a net-new product capability.
