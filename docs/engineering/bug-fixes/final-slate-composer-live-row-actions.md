# Final Slate Composer Live-Row Actions — Bug-Fix Record

## Summary
- Problem addressed: the editorial review route could show enabled-looking Final Slate Composer placement buttons for rows that were already live or published.
- Root cause: the composer slot controls only checked whether editorial storage was configured, while the server-side remove action cleared placement without first checking live/published state. Assignment already rejected those rows, producing an error banner while the UI still looked actionable.

## Fix
- Exact change: lock final-slate placement controls for non-persisted, live, already-published, or blocking-decision rows; hide replacement controls for locked rows; keep valid unpublished draft-slate controls enabled; add a server guard preventing remove-from-slate mutations on live or already-published rows.
- Click-level follow-up: authenticated preview inspection confirmed guarded controls were HTML-disabled, but disabled primary buttons still retained active green styling. The shared button component now renders disabled buttons with neutral disabled styling so guarded actions no longer look clickable.
- Related PRD: existing PRD-53 signals admin editorial workflow; no new canonical PRD is required.

## Terminology Requirement
- [x] Confirmed object level before coding: Surface Placement and Card state in the legacy `signal_posts` editorial workflow.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `signal_posts` naming is preserved as the existing runtime/editorial contract.

## Validation
- Automated checks:
  - `npm test -- src/app/dashboard/signals/editorial-review/page.test.tsx src/lib/signals-editorial.test.ts`
  - `npm test -- src/components/ui/button.test.tsx src/app/dashboard/signals/editorial-review/page.test.tsx`
  - `npm test`
  - `npm run lint`
  - `npm run build`
- Human checks:
  - Authenticated production inspection confirmed the reported URL renders a current set of live/published rows with placement controls that appear actionable before this fix is deployed.
  - Authenticated preview inspection confirmed the same controls are disabled by HTML state and blocked by the live/published guard; the remaining defect was disabled-state visual affordance, not a missing click handler or overlay.
  - Mutating production remove actions were not clicked during investigation.

## Tracker Closeout
- Google Sheets tracker row updated and verified: not updated in this local bug-fix pass.
- Fallback tracker-sync file, if direct Sheets update was unavailable: not created; PR closeout should reconcile tracker status if this branch proceeds to merge.

## Remaining Risks / Follow-up
- Preview and production must be rechecked after this branch is deployed because the affected route is auth-gated and environment/session-sensitive.
