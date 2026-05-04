# PRD-49 — Account Page Components

- PRD ID: `PRD-49`
- Canonical file: `docs/product/prd/prd-49-account-page-components.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add standalone Account page components for profile display, RSS feed management, category preferences, preference saving, and newsletter subscription state.

## User Problem

Users need a clear Account surface where they can see their profile, manage RSS feeds, set saved briefing categories, and control daily email digest delivery without hidden state or premature edit flows.

## Scope

- Add `UserProfileBlock`.
- Add `RSSFeedInput`, `RSSFeedRow`, and `RSSFeedEmptyState`.
- Add `CategoryPreferenceCheckboxes`.
- Add `SavePreferencesButton`.
- Add `NewsletterToggle`.
- Add missing local UI primitives required by the requested components when absent from `main`.
- Add focused component tests for default, loading, error, and callback states.

## Non-Goals

- Wiring these components into `/account`.
- Implementing RSS feed edit behavior.
- Implementing server-side sign-out, feed persistence, preference persistence, or Resend subscription APIs.
- Adding category keys beyond `tech`, `finance`, and `politics`.

## Implementation Shape / System Impact

The components are mostly controlled UI surfaces. Parent code owns persistent data, API refetching, redirect after sign-out, saved preference reconciliation, and list mutation. Components with callbacks are client components and never use localStorage or sessionStorage.

## Dependencies / Risks

- `Avatar`, `Input`, `Checkbox`, `Switch`, and `Skeleton` were not present on clean `origin/main`, so this branch includes small local primitives to keep the branch buildable.
- Route-level integration must provide real session, feed, preference, and newsletter callbacks.
- Auth/session behavior and provider redirect truth still require preview and human validation after wiring.

## Acceptance Criteria

- `UserProfileBlock` renders loading skeletons, profile avatar/name/email, and sign-out loading state.
- `RSSFeedInput` blocks invalid URLs, submits valid URLs, disables while submitting, clears after success, and shows inline errors.
- `RSSFeedRow` keeps rows visible while removing, shows remove loading, keeps edit as inactive placeholder, and shows remove errors.
- `RSSFeedEmptyState` renders `No RSS feeds added yet`.
- `CategoryPreferenceCheckboxes` renders only Tech News, Finance, and Politics mapped to `tech`, `finance`, and `politics`.
- `SavePreferencesButton` reflects inactive, active, submitting, success, and error states.
- `NewsletterToggle` fires immediately on toggle, disables during API work, and reverts on error.
- Components use Tailwind classes and no inline styles.

## Evidence and Confidence

- Repo evidence used: existing local `Button`, `cn` utility, component test patterns, and account-related route naming from the active app shell work.
- Confidence: High for standalone component behavior; route-level confidence depends on future `/account` wiring and preview validation.

## Closeout Checklist

- Scope completed: Yes. Added Account components, missing local UI primitives, focused component tests, and PRD registration.
- Tests run: `npm install`; `python3 scripts/validate-feature-system-csv.py`; `npm run test -- src/components/account/account-components.test.tsx`; `npm run lint || true`; `npm run test || true`; `npm run build`; `npm run dev`; `curl -I http://localhost:3000/`; `npx playwright test tests/homepage.spec.ts --project=chromium --workers=1`; `npx playwright test tests/homepage.spec.ts --project=webkit --workers=1`; `npx playwright test --project=chromium --workers=1`; `npx playwright test --project=webkit --workers=1`.
- Local validation complete: Partially. Focused component tests, lint, full unit tests, build, `/` HTTP 200, and focused homepage Playwright smoke passed. Full Playwright projects each failed one pre-existing auth callback redirect test in `tests/dashboard.spec.ts` because `/auth/callback?error=...` did not redirect to `/?auth=callback-error`.
- Preview validation complete, if applicable: Not yet.
- Production sanity check complete, only after preview is good: Not yet.
- PRD summary stored in repo: Yes, this file.
- Bug-fix report stored in repo, if applicable: Not applicable.
- GitHub documentation closeout completed in the canonical lane: yes.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.
