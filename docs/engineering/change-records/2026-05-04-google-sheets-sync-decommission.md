# Google Sheets Sync Decommission

## Objective

Remove the remaining active Google Sheets sync implementation artifacts so the repository no longer presents Google Sheets as an active workflow or source-of-truth system.

## Source-Of-Truth Context

PR #191, PR #192, and PR #193 established GitHub repo documentation as canonical for remediation, validation, release, governance, PRD/feature, and branch-cleanup history. Google Sheet and Google Work Log records are historical references only.

This branch does not change runtime app behavior, production data, product UI, schema, migrations, or historical tracker-sync records.

## Artifacts Audited

| Artifact | Classification | Decision |
| --- | --- | --- |
| `.github/workflows/github-sheets-status-sync.yml` | active workflow trigger | removed |
| `.github/workflows/production-verification.yml` Google Sheets promotion job | active workflow trigger | removed |
| `scripts/github-sheets-sync.mjs` | active implementation artifact | removed |
| `scripts/github-sheets/sync.mjs` | active implementation artifact | removed |
| `scripts/github-sheets-sync.test.ts` | test for retired sync path | removed |
| `package.json` | package script surface | no Google Sheets sync script present; no change |
| `package-lock.json` | dependency surface | no Google Sheets API package dependency present; no change |
| `docs/engineering/protocols/github-sheets-governance-automation.md` | retired protocol/historical reference | rewritten as historical-only reference |
| `docs/engineering/protocols/release-automation-operating-guide.md` | standing release protocol | updated to say the old workflow/script/tests were removed |
| `docs/engineering/testing/github-sheets-governance-automation.md` | historical validation record | updated to historical-only status |
| `docs/product/prd/prd-24-github-sheets-governance-automation.md` | deprecated PRD | updated to record implementation decommissioning |
| `docs/operations/tracker-sync/` | historical compatibility folder | retained untouched |

## Removed Or Disabled

- Removed `.github/workflows/github-sheets-status-sync.yml`.
- Removed Google Sheets secret validation, merged-PR lookup, and `Merged -> Built` promotion from `.github/workflows/production-verification.yml`.
- Removed `scripts/github-sheets-sync.mjs`.
- Removed `scripts/github-sheets/sync.mjs`.
- Removed `scripts/github-sheets-sync.test.ts`.

## Retained As Historical Compatibility

- `docs/operations/tracker-sync/` remains historical compatibility only.
- `docs/engineering/protocols/github-sheets-governance-automation.md` remains as a concise retired historical reference so older PRD-24 and audit records remain understandable.
- `docs/engineering/testing/github-sheets-governance-automation.md` remains as a historical validation report, not as a current test instruction.
- `docs/product/prd/prd-24-github-sheets-governance-automation.md` remains deprecated and records that the implementation artifacts were removed.

## Why Google Sheets Is No Longer Active Infrastructure

Google Sheets is no longer a source-of-truth system for repo governance. The canonical active records are now:

- GitHub repo documentation for remediation, validation, release, governance, and branch-cleanup history.
- `docs/product/feature-system.csv` for repo-side PRD/feature control metadata.
- GitHub PR metadata for branch, SHA, merge, and review reconstruction.

Keeping an active merge-time or production-verification Sheets writer would contradict that source-of-truth decision and could imply that external tracker state still governs closeout.

## Validation Commands

Completed in this branch:

- `git diff --check` - passed.
- `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name chore/decommission-google-sheets-sync --pr-title "chore: decommission Google Sheets sync"` - passed.
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name chore/decommission-google-sheets-sync --pr-title "chore: decommission Google Sheets sync"` - passed.
- `npm install` - passed; reported 2 audit findings unrelated to this cleanup.
- `npm run lint || true` - passed after dependency install.
- `npm run test -- scripts || true` - no test files found because the only Google Sheets sync script test was removed with the retired implementation.
- Targeted removed-artifact/reference check - passed; no active `.github`, `scripts`, or `package.json` invocation remains for `node scripts/github-sheets-sync`, `GOOGLE_SERVICE_ACCOUNT_JSON`, or `GOOGLE_SHEET_ID`.

## Remaining Risks Or Follow-Up

- Repository secrets such as `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_SHEET_ID`, if still configured in GitHub settings, require repository settings access to remove. This branch does not claim secret cleanup.
- Historical tracker-sync records still mention old manual tracker payloads. They are retained as historical compatibility and are not active instructions.
- Production verification still runs route probes when configured, but no longer writes Google Sheets status.

## Explicit Non-Actions

- No Google tracker updates.
- No Google Work Log updates.
- No tracker-sync fallback files.
- No runtime app behavior changes.
- No schema or migration changes.
- No production data changes.
- No production validation.
- No branch deletion.
