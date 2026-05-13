# Settings shell cleanup

## GitHub Source-of-Truth Metadata
- Affected object level: Surface Placement.
- PR: #56, `https://github.com/brandonma25/bootupnews/pull/56`.
- Branch: `fix/settings-shell-cleanup`.
- Head SHA: `d8d9807d98eb49db802395e787e37b95c8d99113`.
- Merge SHA: `f74ccd1ed188e530f98c237e565090d2bba6dd65`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #56 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Sections affected
- Profile details
- Delivery cadence
- Security and sessions
- Data controls
- Source edit and pause or resume expectations

## What changed and why
- Replaced non-functional settings-shell cards with a consistent coming-soon treatment so the UI no longer implies account controls exist when they do not.
- Removed inactive profile and delivery inputs or toggles from the personalization settings surface where they only suggested unfinished behavior.
- Added an honest source-management placeholder on `/sources` so edit and pause or resume expectations are explicit while source creation remains available.

## Validation performed
- `npm install`
- `npm run lint || true`
- `npm run test || true`
- `npm run build`
- `npm run dev`
- `npx playwright test --project=chromium`
- `npx playwright test --project=webkit`
- Local manual pass over `/settings` and `/sources` for placeholder messaging and working source-creation UI visibility
