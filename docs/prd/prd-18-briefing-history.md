# PRD-18 — Briefing History

- PRD ID: `PRD-18`
- Canonical file: `docs/prd/prd-18-briefing-history.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Preserve and present previous daily briefings so users can revisit earlier scans instead of treating each day as disposable.

## Problem
- Without history, the product loses continuity across days and users cannot review prior briefings or build a lightweight record of what has already been surfaced.

## Scope
### Must Do
- Load prior saved daily briefings for authenticated users.
- Fall back to demo history when live history is unavailable.
- Present prior briefing titles, intros, event counts, and reading windows in the history route.

### Must Not Do
- Rebuild full historical analytics or archival exports in this PRD.
- Depend on live auth for the existence of a usable history page.
- Duplicate the continuity-state system inside history itself.

## System Behavior
- Signed-in users see their recent saved briefings ordered by date.
- When live history cannot be fetched, the route degrades to sample/demo history instead of failing.
- History cards provide enough metadata to understand prior scan volume and context.

## Key Logic
- `src/lib/data.ts` queries `daily_briefings` and associated `briefing_items` to assemble history models.
- `src/app/history/page.tsx` renders the browsing surface for prior briefings.

## Risks / Limitations
- History depth is limited by the current query window.
- Demo history is a fallback, not proof of live persistence.
- The page summarizes prior briefings rather than reconstructing the full original interactive state.

## Success Criteria
- Authenticated users can review prior briefings without direct database access.
- History degrades safely when live data is not available.
- The repo has a canonical PRD for the implemented history route.

## Done When
- One canonical PRD exists for saved-briefing history behavior and retrieval.
