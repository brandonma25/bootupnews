# Settings shell cleanup

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
