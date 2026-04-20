# Tracker Sync Fallback — Home Category Tabs

- Date: 2026-04-20
- Reason: Live Google Sheets write access was not available; only read-oriented Sheets tools were exposed.
- Workbook: `Features Table`
- Target tab: `Sheet1`
- Lookup key: `prd_id = PRD-46`

## Intended Manual Payload

| Column | Value |
|---|---|
| Layer | Experience |
| Feature Name | Home category tabs |
| Priority | Medium |
| Status | In Review |
| Description | Client-side Home page category tabs and lightweight category cards using homepage model category sections |
| Owner | Codex |
| Dependency | Homepage classification backend contract |
| Build Order | 46 |
| Decision | build |
| Last Updated | 2026-04-20 |
| prd_id | PRD-46 |
| prd_file | docs/product/prd/prd-46-home-category-tabs.md |

## Verification Needed

After Sheets write access is available, add or verify the governed row in `Sheet1`, then reread the row and confirm the values above are visible.
