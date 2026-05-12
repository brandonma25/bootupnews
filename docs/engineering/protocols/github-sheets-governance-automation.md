# GitHub Sheets Governance Automation - Retired Historical Reference

## Status

This is a retired historical reference, not an active protocol.

The GitHub-to-Google-Sheets sync workflow and script were decommissioned on 2026-05-04. Product source-of-truth docs, `docs/product/feature-system.csv`, PR metadata, and durable public governance artifacts are the canonical repo-side surfaces for feature, remediation, validation, release, and governance history.

## Current Rules

- Do not update Google Sheets for routine closeout.
- Do not create Google Intake Queue rows for routine closeout.
- Do not claim Google tracker, Google Sheet, or Google Work Log updates unless the user explicitly requested that historical reconciliation and the update actually happened.
- Do not recreate `.github/workflows/github-sheets-status-sync.yml`, `scripts/github-sheets-sync.mjs`, or `scripts/github-sheets/` as active source-of-truth infrastructure.
- Treat external tracker details as historical or private operational evidence unless the user explicitly asks for a Google-reference reconciliation artifact.

## Decommissioned Artifacts

- `.github/workflows/github-sheets-status-sync.yml`
- `scripts/github-sheets-sync.mjs`
- `scripts/github-sheets/sync.mjs`
- `scripts/github-sheets-sync.test.ts`
- The Google Sheets promotion job formerly embedded in `.github/workflows/production-verification.yml`

## Former External References

These names are preserved only so older docs and PRD-24 can be understood:

- Workbook: `Features Table`
- Governed feature table tab: `Sheet1`
- Intake / quarantine tab: `Intake Queue`
- Former GitHub secrets: `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SHEET_ID`

Those external references are not canonical and are not active repo workflow dependencies.

## Historical Behavior

The retired automation attempted to:

- mark a matching governed row as `Merged` after a pull request merged into `main`
- append unmapped or ambiguous merges to `Intake Queue`
- promote a matching row from `Merged` to `Built` after production route verification

That behavior is no longer part of repo completion. Durable feature metadata now lives in `docs/product/feature-system.csv`; operational evidence belongs in PR metadata, GitHub history, or private archive records when detail is needed.

## Reintroduction Rule

Do not reintroduce Google Sheets sync as active infrastructure without an explicit new user request, a fresh governance decision, and a stable public governance artifact explaining why current repo-side source-of-truth docs are no longer sufficient.
