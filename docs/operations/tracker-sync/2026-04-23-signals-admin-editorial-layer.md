# Tracker Sync Fallback — Signals admin editorial layer

- Date: 2026-04-23
- Branch: `codex/signals-admin-editorial-layer`
- Worktree: `/Users/bm/Documents/worktrees/signals-admin-editorial-layer`
- Reason: Direct live Google Sheets update was not performed from this workspace. This file provides the exact manual update payload for the `Features Table` workbook.

## Manual Sheet1 Payload

Add or update the governed feature row:

| Column | Value |
| --- | --- |
| Layer | Experience |
| Feature Name | Signals admin editorial layer |
| Priority | High |
| Status | In Review |
| Description | Private admin editor workflow for reviewing editing approving and publishing human Why it matters copy for Top 5 Signal Posts |
| Owner | Codex |
| Dependency | Auth and session routing, Signal Display Cap, Why It Matters Quality |
| Build Order | 53 |
| Decision | build |
| Last Updated | 2026-04-23 |
| prd_id | PRD-53 |
| prd_file | docs/product/prd/prd-53-signals-admin-editorial-layer.md |

## Notes

- Open PR #98 already uses PRD-52 for source taxonomy expansion, so this branch intentionally uses PRD-53.
- Status should remain `In Review` until merge. After merge to `main`, the governed tracker row may move to `Merged`. Move to `Built` only after production verification succeeds.
