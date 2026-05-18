# Bootup News Visual System V1 + Editorial Composer Two-Pane

Date: 2026-05-13

Branch: `feature/visual-system-v1`

Change type: feature plus remediation

Object level: Card + Surface Placement

## Source Of Truth

- User-provided implementation spec: Bootup News visual system v1 + editorial composer two-pane redesign.
- `BRAND_IDENTITY_BIBLE.md` and `Product Position.pdf` were named as sources of truth in the spec, but were not present in this worktree. Implementation followed the provided locked decisions and token values.

## Scope

In scope:

- Bootup News product naming, tagline, metadata, and sidebar alignment.
- Bootup News v1 tokens for color, typography, spacing, radius, borders, and status colors.
- `next/font/google` font loading for Inter Tight and Source Serif 4.
- Public homepage, briefing detail, signals list, history, account styling, and app shell alignment.
- Rebuilt signal-card face and expanded detail treatment.
- Demoted category browse navigation.
- Editorial composer two-pane layout with sticky final slate panel and inline candidate WITM.

Out of scope and unchanged:

- Content pipeline, source pool, RSS ingestion, source manifest, and source onboarding.
- WITM generation, validation, or quality-gate logic.
- Schema, migrations, or database state.
- Cron, scheduling, and job orchestration.
- Authentication and authorization logic; existing admin gates were preserved.
- 7-slot structure and PRD-58 card-level editorial authority.

## Validation

- `npm run lint` passed.
- `npm test` passed: 95 files, 657 tests.
- `npm run build` passed.
- `npx tsc --noEmit` remains blocked by pre-existing test type debt outside this change; no remaining errors were reported for the visual-system, homepage, or composer files touched here after targeted filtering.
- Route probes returned 200 for `/`, `/signals`, `/briefing/2026-05-06`, `/history`, and `/account`.
- Playwright Chromium/WebKit full E2E passed locally after updating stale assertions for the Bootup News surface, demoted category browse treatment, and signed-out History gate.
- Browser QA confirmed Bootup News title/tagline, demoted Browse by navigation, no Top Events tab, no Details link, and no min-read card chrome on the local public surface.
- Component coverage confirms compact `/signals` cards render the rank label neutrally, without the Core vermillion accent reserved for the ranked Top 5 surface.
- Component and page coverage confirms the composer slot panel renders as a sticky desktop pane and a mobile collapsible drawer.
- The local public data path was in the intended fail-closed empty state, so production-route screenshots only prove the empty-state shell unless a published slate is available.
- A temporary, unshipped visual fixture route was used only to capture the actual SignalCard and composer layouts with representative data; the fixture route was removed before commit.

## Screenshots

After screenshots were captured under `artifacts/visual-system-v1/` for:

- Homepage at 1440px and 390px.
- Briefing detail at 1440px and 390px.
- History at 390px.
- Editorial composer auth gate at 1440px and 390px.
- Fixture-backed SignalCard and composer layouts at 1440px and 390px in Chromium and WebKit.

Admin composer interior screenshots could not be captured from the committed admin route in the local browser session because the preserved admin authorization gate correctly requires sign-in. Composer behavior is covered by component/page tests and the temporary fixture screenshots.
