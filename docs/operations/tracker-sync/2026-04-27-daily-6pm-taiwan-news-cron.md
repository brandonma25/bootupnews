# Tracker Sync Fallback — Daily 6 PM Taiwan News Cron

## Reason

Direct Google Sheets write/readback was not verified in this local implementation pass. Use this payload to update the live `Features Table` workbook manually.

## Target

- Workbook: `Features Table`
- Sheet: `Sheet1`
- Lookup key: `PRD-60`

## Manual Update Payload

| Field | Value |
| --- | --- |
| Layer | Operations |
| Feature Name | Daily 6pm Taiwan News Cron |
| Priority | High |
| Status | In Review |
| Description | Schedule the existing ingestion Signal generation and editorial Top 5 snapshot workflow to run daily at 6 PM Taiwan time. |
| Owner | Codex |
| Dependency | Daily news ingestion foundation, Phase 1 pipeline, Signals admin editorial layer |
| Build Order | 60 |
| Decision | build |
| Last Updated | 2026-04-27 |
| prd_id | PRD-60 |
| prd_file | docs/product/prd/prd-60-daily-6pm-taiwan-news-cron.md |

## Verification Needed

After the row is updated, reread the live row and confirm:

- `Status` is normalized as `In Review`
- `prd_file` exactly matches `docs/product/prd/prd-60-daily-6pm-taiwan-news-cron.md`
- no duplicate governed row was created
