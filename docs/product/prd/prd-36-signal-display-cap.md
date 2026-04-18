# PRD-36 — Signal Display Cap

- PRD ID: `PRD-36`
- Canonical file: `docs/product/prd/prd-36-signal-display-cap.md`
- Filename rule: lowercase kebab-case canonical PRD file
- Feature system row: `docs/product/feature-system.csv`

## Objective
Enforce the MVP dashboard output rule that the main briefing view shows a maximum of five ranked signals, with the top three presented as Core Signals and the next two presented as Context Signals.

## User Problem
The dashboard can currently surface more than five briefing signals in the main experience, which makes the MVP output feel less focused and hides the intended distinction between the most important signals and supporting context.

## Scope
- Cap the main dashboard briefing render layer at five signals.
- Use the ranked briefing order to select the displayed signals.
- Label ranks 1 through 3 as Core Signals.
- Label ranks 4 through 5 as Context Signals.
- Render fewer than five signals safely when that is all that is available.
- Render a clean empty state when zero signals are available.
- Keep the full ranked list intact in the data layer and pipeline output.

## Non-Goals
- No pipeline clustering or ranking changes.
- No schema changes.
- No changes to Supabase storage contracts.
- No attempt to change the full ranked output produced by the Intelligence Layer.

## Implementation Shape / System Impact
- Experience Layer update in the dashboard render path to derive a display-only capped signal list from the ranked briefing items.
- UI update to show subtle Core Signals and Context Signals tier labels.
- Test coverage for capped display behavior and the empty state.
- Governance update in `docs/product/feature-system.csv`.

## Dependencies / Risks
- Depends on the ranked briefing order remaining the canonical source for signal priority.
- The cap is display-only, so other product surfaces may still use the full ranked list.
- Preview validation is still required for SSR rendering and final visual judgment.

## Acceptance Criteria
- The main dashboard shows no more than five signals.
- Ranks 1 through 3 are labeled Core Signals.
- Ranks 4 through 5 are labeled Context Signals.
- Fewer than five signals render without layout or runtime errors.
- Zero signals render a clear empty state.
- The underlying ranked pipeline output is not truncated or rewritten.

## Evidence and Confidence
- Repo evidence used:
  - `src/components/dashboard/personalized-dashboard.tsx`
  - `src/components/dashboard/personalized-dashboard.test.tsx`
  - `docs/product/feature-system.csv`
- Confidence:
  - High for local render behavior and empty-state handling.
  - Preview validation still required for SSR and final visual confirmation.
