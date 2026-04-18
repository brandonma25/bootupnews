# PRD-32 — Settings shell cleanup

- PRD ID: `PRD-32`
- Canonical file: `docs/product/prd/prd-32-settings-shell-cleanup.md`
- Filename rule: use lowercase kebab-case and zero-pad `1` through `9` as `prd-01-...` through `prd-09-...`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
Replace misleading settings-shell UI with honest placeholder states wherever the product does not yet support a real end-to-end action.

## User Problem
Users can currently encounter settings and source-management surfaces that look interactive even though no backend action or persistent account behavior exists behind them. That mismatch erodes trust.

## Scope
- Replace non-functional settings sections with a consistent "Coming soon" treatment.
- Keep working flows, including topic management, personalization that already changes ranking behavior, and source creation/import, intact.
- Add an honest placeholder callout on the sources page for unfinished edit and pause or resume controls.
- Register this work in the repo feature system and bug-fix documentation lanes.

## Non-Goals
- No new server actions.
- No schema changes.
- No data-layer or ingestion changes.
- No auth or session implementation expansion.

## Implementation Shape / System Impact
- Add one reusable Experience Layer placeholder component for unfinished controls.
- Apply that component to non-functional account-management sections on `/settings`.
- Remove shell inputs and toggles from the settings personalization surface when they do not change real product behavior.
- Keep navigation to `/settings` and `/sources` intact while clarifying which controls are still under development.

## Dependencies / Risks
- Depends on the existing settings and sources pages already rendering successfully.
- Risk: users may still expect signed-in account persistence for some browser-local settings, so the copy must stay explicit.

## Acceptance Criteria
- Every affected settings section either works end to end or clearly says it is coming soon.
- No misleading no-op inputs or buttons remain for profile, cadence, security, or data-control shells.
- The sources page clearly states that edit and pause or resume controls are still in development.
- Working topic and source-creation flows remain available.

## Evidence and Confidence
- Repo evidence used:
  - `src/app/settings/page.tsx`
  - `src/components/settings-preferences.tsx`
  - `src/app/sources/page.tsx`
- Confidence: High
