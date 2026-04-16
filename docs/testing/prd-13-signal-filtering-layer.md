# Testing Notes: PRD 13 Signal Filtering Layer

## Automated Validation
- `npm install`
  Passed.
- `npm run lint`
  Fails on pre-existing `react-hooks/set-state-in-effect` errors in `src/components/app-shell.tsx`.
- `npm run test`
  Signal-filtering coverage passes; overall suite still has pre-existing failures in auth-related tests.
- `npm run build`
  Passed after integrating the new filter metadata through the article/event pipeline.

## Targeted Coverage Added
- Source tier classification.
- Headline quality classification.
- Event type classification.
- Pass / suppress / reject decisions.
- Fallback promotion when pass volume is too low.
- Regression coverage for important non-tier1 stories.

## Local Smoke Validation
- A clean port-3000 dev-server check is still required as part of the final validation handoff.

## Human Validation Focus
- Confirm weak filler is reduced in the dashboard briefing.
- Confirm strong event-driven stories still appear.
- Confirm important non-tier1 stories are not lost when pass volume is thin.
- Confirm no unintended empty-state regression appears on homepage or dashboard.
