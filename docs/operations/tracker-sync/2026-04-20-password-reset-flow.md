# Tracker Sync Fallback — Password Reset Flow

- Date: 2026-04-20
- Reason: Live Google Sheets write access was not available; only read-oriented Sheets tools were exposed.
- Workbook: `Features Table`
- Target tab: `Sheet1`
- Lookup key: `prd_id = PRD-45`

## Intended Manual Payload

| Column | Value |
|---|---|
| Layer | Experience |
| Feature Name | Password reset flow |
| Priority | High |
| Status | In Review |
| Description | Standalone forgot-password and reset-password forms for email recovery and password update flows |
| Owner | Codex |
| Dependency | Auth and session routing |
| Build Order | 45 |
| Decision | build |
| Last Updated | 2026-04-20 |
| prd_id | PRD-45 |
| prd_file | docs/product/prd/prd-45-password-reset-flow.md |

## Verification Needed

After Sheets write access is available, add or verify the governed row in `Sheet1`, then reread the row and confirm the values above are visible.
