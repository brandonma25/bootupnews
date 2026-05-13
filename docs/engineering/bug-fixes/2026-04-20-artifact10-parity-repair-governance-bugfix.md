# Artifact 10 Parity Repair Governance Bug-Fix Record

## Summary

PR #75 repairs UI drift after the Artifact 10 global style merge, including typography, token, shell, and stale session-state presentation cleanup.

## GitHub Source-of-Truth Metadata

- Affected object level: Card and Surface Placement.
- PR: #75, `https://github.com/brandonma25/bootupnews/pull/75`.
- Branch: `fix/prd-50-artifact-10-parity-repair`.
- Head SHA: `8cd81966927df251d803456ca5e2feb74588ee1b`.
- Merge SHA: `d4150dba5b1e03fcc6eb94baba8b8a163ac19c54`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #75 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Root Cause

The repair is correctly carried on a `fix/` branch with a `fix:` PR title, so the release governance gate classifies it as a bug-fix. The branch already included a change record, but it did not include the required bug-fix documentation lane under `docs/engineering/bug-fixes/`.

## Resolution

Added this concise bug-fix record so the PR has both the existing change-record context and the bug-fix lane required by the governance classifier.

## Validation

Prior branch validation included install, lint, targeted component tests, build, and Chromium/WebKit Playwright runs. After adding this record, the release governance gate should be rerun locally against `origin/main...HEAD` for PR #75.

## Safety Note

This record is repo-safe and contains no secrets, tokens, cookies, auth headers, sensitive infrastructure details, or private logs.
