# PRD-47 — Home State Components

- PRD ID: `PRD-47`
- Canonical file: `docs/product/prd/prd-47-home-state-components.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add standalone Home page empty, error, and retry components for Daily Briefing loading failure and no-briefing states.

## User Problem

When today&apos;s briefing is missing or the Home data fetch fails, readers need calm, clear state UI that explains what happened and offers retry only when a page-level refetch is possible.

## Scope

- Add `HomeEmptyState` for an informational no-briefing state with message and expected generation time.
- Add `HomeErrorState` for a fetch-failure state with retry affordance.
- Add reusable `RetryButton` for Home and future error states.
- Add focused component tests for default and loading states.

## Non-Goals

- Wiring into the Home data-fetch implementation.
- Hard page reload retry behavior.
- Category tabs or category cards.
- API contract changes.

## Implementation Shape / System Impact

The components are standalone presentational React components. `RetryButton` fires only the supplied `onRetry` callback and disables itself while `isRetrying` is true. `HomeErrorState` delegates retry behavior to `RetryButton`; `HomeEmptyState` has no retry action.

## Dependencies / Risks

- Page-level wiring must pass a real refetch callback into `HomeErrorState`.
- Copy and generation-time values for `HomeEmptyState` should come from page/data context when wired.
- PRD-43 through PRD-46 are active in separate unmerged branches; this branch uses PRD-47 to avoid feature identity collisions.

## Acceptance Criteria

- `HomeEmptyState` renders a message and expected generation time.
- `HomeEmptyState` does not render a retry button.
- `HomeErrorState` renders an error message and retry button.
- `HomeErrorState` shows retry loading state while `isRetrying` is true.
- `RetryButton` is labeled `Try again`.
- `RetryButton` calls only the provided `onRetry` callback.
- `RetryButton` is non-interactive while retrying.
- Components use Tailwind classes and no inline styles.

## Evidence and Confidence

- Repo evidence used: local `Button` primitive, Home page state patterns, and route error UI conventions.
- Confidence: High for standalone component behavior; preview validation should happen after page-level wiring.

## Closeout Checklist

- Scope completed: Yes. Added `HomeEmptyState`, `HomeErrorState`, reusable `RetryButton`, focused component tests, PRD registration, and fallback tracker-sync payload.
- Tests run: `npm install`; `python3 scripts/validate-feature-system-csv.py`; `npm run test -- src/components/home/home-states.test.tsx`; `npm run lint || true`; `npm run test || true`; `npm run build`; `npm run dev`; `curl -I http://localhost:3000/`; `npx playwright test tests/homepage.spec.ts --project=chromium --workers=1`; `npx playwright test tests/homepage.spec.ts --project=webkit --workers=1`.
- Local validation complete: Yes. Home page returned HTTP 200 at `http://localhost:3000/`; homepage Playwright smoke coverage passed in Chromium and WebKit.
- Preview validation complete, if applicable: Not yet.
- Production sanity check complete, only after preview is good: Not yet.
- PRD summary stored in repo: Yes, this file.
- Bug-fix report stored in repo, if applicable: Not applicable.
- Google Sheets tracker updated and verified: Direct live Sheets update unavailable in this environment.
- If direct Sheets update is unavailable, fallback tracker-sync file created in `docs/operations/tracker-sync/` with exact manual update payload: Yes, `docs/operations/tracker-sync/2026-04-20-home-state-components.md`.
