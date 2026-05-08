# Daily 6 PM Taiwan News Cron Change Record

## Summary

Added a production Vercel Cron Job that invokes the existing ingestion and Signal generation workflow daily at 6:00 PM Taiwan time.

## Governance Classification

- Classification: new scheduled operations system
- Canonical PRD: `docs/product/prd/prd-60-daily-6pm-taiwan-news-cron.md`
- Feature-system row: `PRD-60`
- Hotspot touched: `docs/product/feature-system.csv`

## Implementation Notes

- `vercel.json` schedules `/api/cron/fetch-news` with `0 10 * * *`.
- The route requires `Authorization: Bearer <CRON_SECRET>`.
- The cron runner delegates to `generateDailyBriefing` and `persistSignalPostsForBriefing`.
- Seed fallback output is blocked from editorial persistence so fake placeholder Signal Cards are not created.

## Validation Notes

- Local route tests cover unauthorized access, missing secret, successful mocked persistence, and seed fallback blocking.
- Local endpoint testing confirmed unauthorized requests return `401`.
- Local authorized endpoint testing triggered the live pipeline and safely returned `500` because this worktree lacks Supabase service-role configuration.
- Production cron execution still requires Vercel log verification after deployment.
