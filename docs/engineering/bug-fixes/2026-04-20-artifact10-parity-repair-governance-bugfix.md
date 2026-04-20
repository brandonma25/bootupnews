# Artifact 10 Parity Repair Governance Bug-Fix Record

## Summary

PR #75 repairs UI drift after the Artifact 10 global style merge, including typography, token, shell, and stale session-state presentation cleanup.

## Root Cause

The repair is correctly carried on a `fix/` branch with a `fix:` PR title, so the release governance gate classifies it as a bug-fix. The branch already included a change record, but it did not include the required bug-fix documentation lane under `docs/engineering/bug-fixes/`.

## Resolution

Added this concise bug-fix record so the PR has both the existing change-record context and the bug-fix lane required by the governance classifier.

## Validation

Prior branch validation included install, lint, targeted component tests, build, and Chromium/WebKit Playwright runs. After adding this record, the release governance gate should be rerun locally against `origin/main...HEAD` for PR #75.

## Safety Note

This record is repo-safe and contains no secrets, tokens, cookies, auth headers, sensitive infrastructure details, or private logs.
