# GitHub Sheets Governance Automation — Testing Report

## Metadata
- Date: 2026-04-18
- Branch: `feature/github-sheets-governance-automation`
- Scope: schema-aware Google Sheets status sync hardening, Intake Queue capture, and guarded `Merged -> Built` promotion wiring
- Current status: historical validation record only. The Google Sheets sync workflow, script, and targeted tests were decommissioned on 2026-05-04.

## Commands Run
- `npm install`
- Historical command: `npm run test -- scripts/github-sheets-sync.test.ts`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run dev`
- `node scripts/preview-check.js http://127.0.0.1:3000`
- `node scripts/prod-check.js http://127.0.0.1:3000`

## Automated Results
- Targeted schema-aware Sheets tests: passed
- Full Vitest suite: passed
- Lint: passed
- Build: passed
- Dev server: passed on `http://localhost:3000`
- Local route probes:
  - preview probe passed for `/` and `/dashboard`
  - production probe passed for `/` and `/dashboard`

## Covered Cases
- Exact `Record ID` match updates only `Status`
- Merge flow does not set `Built` directly
- No Record ID found
- Parsed Record ID not found in `Sheet1`
- Duplicate `Sheet1` matches
- Missing required `Sheet1` header fails loudly
- Missing required `Intake Queue` header fails loudly
- Blank trailing row is ignored safely
- Human-managed `Sheet1` columns remain untouched
- Formula/computed `Sheet1` columns remain untouched
- `Last Updated` and `Notes` remain untouched because they stay human-managed
- Google Sheets API retry and clear failure behavior
- Duplicate PR merge rerun avoids duplicate Intake Queue appends
- Successful production-verification promotion from `Merged` to `Built`
- Failed production verification leaves the row at `Merged`

## Remaining Human Validation
- None for active Google Sheets sync. This workflow is no longer active and must not be run for routine closeout.

## Residual Risks
- Older historical records may still mention the former Google Sheet workbook, `Sheet1`, or `Intake Queue`.
- Reintroducing sync would require a fresh governance decision and new implementation; it is not available as a compatibility runner.
