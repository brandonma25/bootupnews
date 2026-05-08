# Homepage Release Route Probe Markers - 2026-04-22

## Classification

- Change type: bug fix / remediation.
- Canonical PRD required: no.
- Scope: release validation route-probe markers for the signed-out Home remediation branch.

## GitHub Source-of-Truth Metadata

- Affected object level: Surface Placement.
- PR: #97, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/97`.
- Branch: `fix/signed-out-homepage-qa-remediation`.
- Head SHA: `00ffcd3ce51d86460ef51ee54fb81b00742e81d8`.
- Merge SHA: `cd3f8a740196e1df031bb5c4989bb524f8efb6d0`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #97 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Root Cause

The local release gate still checked older signed-out Home and `/dashboard` copy:

- unsupported hero/personalization text that the signed-out Home remediation intentionally removed
- `/dashboard`-specific copy even though `/dashboard` is now a legacy redirect to Home

That made `./scripts/release-check.sh` fail at the local smoke route step after lint, tests, build, and Chromium/WebKit Playwright had passed.

## Fix

Updated `scripts/release/common.mjs` default route expectations to probe the current signed-out Home contract:

- approved `Daily Intelligence Briefing` app name
- `Top Events` tab/card surface
- Top Events card affordances such as `Details` and `Why it matters`
- signed-out shell copy for the public briefing account area

The `/dashboard` probe now checks only route health. This route is a legacy redirect to Home, and the fetch-based route probe can receive a minimal redirect/static body rather than the hydrated Home document.

## Follow-up Test Hardening

The same full release-gate rerun exposed an unrelated Chromium-only timing failure in the forgot-password E2E assertion. The form unit tests already prove the button enables after email entry, but the browser test could fill before React hydrated the controlled input handler under full parallel load. The Playwright assertion now retries the fill until the hydrated form reflects the enabled submit state.

## Validation

Run `./scripts/release-check.sh` after this fix before merging the remediation branch.
