# Tracker Sync Fallback — Home State Components

- Date: 2026-04-20
- Reason: Live Google Sheets write access was not available; only read-oriented Sheets tools were exposed.
- Workbook: `Features Table`
- Target tab: `Sheet1`
- Lookup key: `prd_id = PRD-47`

## Intended Manual Payload

| Column | Value |
|---|---|
| Layer | Experience |
| Feature Name | Home state components |
| Priority | Medium |
| Status | In Review |
| Description | Standalone Home empty error and retry components for no-briefing and fetch-failure states |
| Owner | Codex |
| Dependency | Home data fetch wiring |
| Build Order | 47 |
| Decision | build |
| Last Updated | 2026-04-20 |
| prd_id | PRD-47 |
| prd_file | docs/product/prd/prd-47-home-state-components.md |

## Verification Needed

After Sheets write access is available, add or verify the governed row in `Sheet1`, then reread the row and confirm the values above are visible.
