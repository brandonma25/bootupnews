# PRD-32 — Mobile Navigation

- PRD ID: `PRD-32`
- Canonical file: `docs/product/prd/prd-32-mobile-navigation.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective
- Restore a reliable mobile navigation drawer so users on phone-sized viewports can move between the primary application routes without disrupting the existing desktop shell.

## User Problem
- The mobile hamburger navigation was not behaving like a dependable route switcher for the application shell. This blocked phone users from confidently opening navigation, closing it, and moving between the core pages of the product.

## Scope
- Fix the `AppShell` mobile drawer interaction for open and close behavior.
- Keep all primary application routes available from the mobile drawer.
- Close the drawer when the user taps outside it, taps a navigation link, or returns to a desktop viewport.
- Preserve the existing desktop sidebar behavior and route structure.

## Non-Goals
- No changes to ingestion, ranking, clustering, scoring, summarization, or Supabase behavior.
- No redesign of the desktop sidebar or desktop account menu.
- No new route creation or information architecture changes.

## Implementation Shape / System Impact
- The change stays in the Experience Layer inside `src/components/app-shell.tsx`.
- Mobile navigation uses explicit drawer state with toggle semantics, overlay and panel transitions, route-change cleanup, and viewport cleanup.
- Regression coverage is added in Playwright to verify the mobile drawer on the signed-out dashboard shell and to confirm desktop navigation remains unchanged.

## Dependencies / Risks
- Depends on the existing route map in `AppShell` remaining the source of truth for primary navigation links.
- Uses the current responsive breakpoint strategy where the desktop sidebar is enabled at `lg` widths.
- Risk: future navigation changes could regress mobile behavior if new links or breakpoint logic bypass the shared shell component.

## Acceptance Criteria
- On a mobile viewport, tapping the hamburger opens the navigation drawer.
- Tapping the hamburger again, tapping outside the drawer, or tapping a navigation link closes the drawer.
- The drawer shows all primary application routes from the shared shell.
- Returning to a desktop viewport does not leave the mobile drawer visible.
- Desktop sidebar behavior remains unchanged.

## What Was Implemented
- Added explicit mobile drawer toggle semantics, cleanup effects, and visible transitions in the shared app shell.
- Added Playwright coverage for mobile open and close behavior, navigation by drawer link, and desktop non-regression.

## What Was Not Implemented
- No new product routes.
- No auth flow changes beyond preserving existing signed-in and signed-out shell behavior.
- No changes to desktop navigation layout or data-layer systems.
