# PRD-48 — History Page Components

- PRD ID: `PRD-48`
- Canonical file: `docs/product/prd/prd-48-history-page-components.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add standalone History page components for dated briefing groups, story previews, early signals, empty, loading, and error states.

## User Problem

Readers need the History page to present archived briefings in scannable groups and handle missing, loading, and failed fetch states without confusing navigation or hard reload behavior.

## Scope

- Add `DateGroupHeader` with formatted date label and full briefing link.
- Add `StoryPreviewRow` for title-only story previews.
- Add `EarlySignalsSection` that hides when no early signals exist.
- Add `HistoryEmptyState` with signup and login CTAs.
- Add `HistoryLoadingState` with date-group skeleton placeholders.
- Add `HistoryErrorState` using the shared `RetryButton`.
- Add the shared `RetryButton` dependency and local `Skeleton` primitive when absent from `main`.
- Add focused component tests.

## Non-Goals

- Wiring the components into `/history`.
- Changing the history API contract.
- Enforcing the three-story row limit inside `StoryPreviewRow`.
- Building a new retry behavior beyond the supplied callback.

## Implementation Shape / System Impact

The components are presentational and can be wired into the existing `/history` route after page-level data-fetching state is available. `HistoryErrorState` and `RetryButton` are client components because they accept callback props. Link-based CTAs use the local `Button` primitive through `asChild` so navigation remains handled by Next.js `Link`.

## Dependencies / Risks

- `RetryButton` was introduced in an earlier unmerged batch, so this branch includes the same shared dependency to keep the branch buildable from `origin/main`.
- Page-level integration must pass already-limited story previews and a refetch callback.
- Preview validation remains required after the branch is deployed.

## Acceptance Criteria

- `DateGroupHeader` renders a `Saturday, April 20` style label and links to `/briefing/[date]`.
- `StoryPreviewRow` renders only a bullet and story title.
- `EarlySignalsSection` returns null when no items exist and renders titles when populated.
- `HistoryEmptyState` renders the specified message and `/signup` and `/login` CTAs.
- `HistoryLoadingState` renders at least two date-group skeleton placeholders.
- `HistoryErrorState` renders an error message and shared retry button.
- `RetryButton` calls only the provided `onRetry` callback and is disabled while retrying.
- Components use Tailwind classes and no inline styles.

## Evidence and Confidence

- Repo evidence used: existing History page route, local `Button` primitive, `cn` utility, Next.js `Link`, and component test patterns.
- Confidence: High for standalone component behavior; route-level confidence depends on future wiring.

## Closeout Checklist

- Scope completed: Yes. Added the requested History components, shared retry dependency, local skeleton primitive, focused component tests, and PRD registration.
- Tests run: `npm install`; `python3 scripts/validate-feature-system-csv.py`; `npm run test -- src/components/history/history-components.test.tsx`; `npm run lint || true`; `npm run test || true`; `npm run build`; `npm run dev`; `curl -I http://localhost:3000/history`; `npx playwright test tests/homepage.spec.ts --project=chromium --workers=1`; `npx playwright test tests/homepage.spec.ts --project=webkit --workers=1`; `npx playwright test --project=chromium --workers=1`; `npx playwright test --project=webkit --workers=1`.
- Local validation complete: Partially. Focused component tests, lint, full unit tests, build, `/history` HTTP 200, and focused homepage Playwright smoke passed. Full Playwright projects each failed one pre-existing auth callback redirect test in `tests/dashboard.spec.ts` because `/auth/callback?error=...` did not redirect to `/?auth=callback-error`.
- Preview validation complete, if applicable: Not yet.
- Production sanity check complete, only after preview is good: Not yet.
- PRD summary stored in repo: Yes, this file.
- Bug-fix report stored in repo, if applicable: Not applicable.
- GitHub documentation closeout completed in the canonical lane: yes.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.
