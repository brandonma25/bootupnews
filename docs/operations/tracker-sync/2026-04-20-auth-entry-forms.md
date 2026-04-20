# Tracker Sync Fallback — Auth Entry Forms

- Date: 2026-04-20
- Reason: Live Google Sheets write access was not available; only read-oriented Sheets tools were exposed.
- Workbook: `Features Table`
- Target tab: `Sheet1`
- Lookup key: `prd_id = PRD-44`

## Intended Manual Payload

| Column | Value |
|---|---|
| Layer | Experience |
| Feature Name | Auth entry forms |
| Priority | High |
| Status | In Review |
| Description | Standalone login signup and Google OAuth entry components for dedicated authentication pages |
| Owner | Codex |
| Dependency | Auth and session routing |
| Build Order | 44 |
| Decision | build |
| Last Updated | 2026-04-20 |
| prd_id | PRD-44 |
| prd_file | docs/product/prd/prd-44-auth-entry-forms.md |

## Verification Needed

After Sheets write access is available, add or verify the governed row in `Sheet1`, then reread the row and confirm the values above are visible.
