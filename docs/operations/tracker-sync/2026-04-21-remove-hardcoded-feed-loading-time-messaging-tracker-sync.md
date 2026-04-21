# Tracker Sync Fallback - Remove Hardcoded Feed Loading Time Messaging

- Date: 2026-04-21
- Feature or fix title: Remove hardcoded feed loading time messaging
- Type: Remediation (UX defect)
- Branch: `fix/v1-production-remediation`
- Implementation summary: Replaced the route-level feed loading message with neutral copy and preserved the existing skeleton layout.
- Testing / validation status: Local install, lint, tests, build, Chromium Playwright, WebKit Playwright, and targeted browser checks passed in this session.
- PRD summary path, if applicable: none. This remediation does not require a canonical PRD.
- Bug-fix report path: `docs/engineering/bug-fixes/remove-hardcoded-feed-loading-time-messaging.md`

## Exact Google Sheet Fields To Update

- Workbook: `Features Table`
- Sheet: `Intake Queue`
- Feature Name
- Type
- Layer
- Status
- Decision
- Owner
- PRD File
- Notes

## Exact Manual Values To Enter

- Feature Name: Remove hardcoded feed loading time messaging
- Type: Remediation (UX defect)
- Layer: Experience
- Status: In Review
- Decision: keep
- Owner: Codex
- PRD File: none
- Notes: Static feed loading copy included a fixed-duration estimate that was not present in the approved V1 artifact set and was not tied to real performance measurement. The loading state now uses neutral copy while retaining the existing skeleton UI. No data fetching, routing, or new UX pattern was introduced.

## Remaining Follow-Up Items Or Risks

- Validate the loading state in Vercel preview.
- Move or reconcile this intake item only if the PM maps it to an existing governed tracker row.
