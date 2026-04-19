# Tracker Sync Fallbacks

Use this folder only when direct Google Sheets updates are unavailable during task closeout.

Each fallback file must be concise, repo-safe, and named `YYYY-MM-DD-short-title-tracker-sync.md`.

Required fields:
- Date
- Feature or fix title
- Type
- Branch
- Implementation summary
- Testing / validation status
- PRD summary path, if applicable
- Bug-fix report path, if applicable
- Exact Google Sheet fields to update
- Exact manual values to enter
- Remaining follow-up items or risks

Closeout rule:
- Do not mark a task complete until the Google Sheets tracker is updated and verified, or a fallback file exists here with the exact manual update payload.
- Do not include secrets, tokens, cookies, sensitive logs, private infrastructure details, auth vulnerability details, or exploit instructions.
