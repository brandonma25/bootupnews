# Tracker Sync Fallbacks

This folder is historical compatibility only. GitHub repo documentation is now the source of truth for closeout, remediation history, validation records, and PRD/feature governance metadata.

Do not create new tracker-sync files for routine task closeout. Use this folder only if the user explicitly asks for a Google-reference reconciliation artifact.

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
- Routine closeout belongs in the canonical GitHub documentation lane, not in tracker-sync.
- If a user explicitly requests a Google-reference reconciliation artifact, do not include secrets, tokens, cookies, sensitive logs, private infrastructure details, auth vulnerability details, or exploit instructions.
