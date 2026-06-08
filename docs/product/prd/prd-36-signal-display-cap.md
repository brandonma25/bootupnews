# PRD-36 — Signal Display Cap

- PRD ID: `PRD-36`
- Canonical file: `docs/product/prd/prd-36-signal-display-cap.md`
- Filename rule: lowercase kebab-case canonical PRD file
- Feature system row: `docs/product/feature-system.csv`

> **Amended (cap 5 → 7):** the public signal slate now holds **seven** ranked
> signals — **five Core ("Signal", ranks 1–5)** plus **two Context ("Context",
> ranks 6–7)**. This supersedes the original 5-row (3 Core + 2 Context) rule.
> The amendment is public-facing: the public homepage and `/signals` page now
> render all seven.

## Objective
Enforce the output rule that the public homepage and public `/signals` view show a maximum of seven ranked signals, with the top five presented as Core Signals and the next two presented as Context Signals.

## User Problem
Without a defined cap the public view can surface an unbounded list of briefing signals, which makes the output feel like a feed rather than a curated daily briefing and hides the intended distinction between the most important signals (Core) and supporting context (Context).

## Scope
- Cap the public homepage and `/signals` render layer at seven signals.
- Use the ranked briefing order to select the displayed signals.
- Label ranks 1 through 5 as Core Signals ("Signal").
- Label ranks 6 through 7 as Context Signals.
- Render fewer than seven signals safely when that is all that is available.
- Render a clean empty state when zero signals are available.
- Keep the full ranked list intact in the data layer and pipeline output.

## Non-Goals
- No pipeline clustering or ranking changes.
- No schema changes.
- No changes to Supabase storage contracts.
- No attempt to change the full ranked output produced by the Intelligence Layer.

## Implementation Shape / System Impact
- Publish gate: `FINAL_SLATE_MAX_PUBLIC_ROWS = 7` (`src/lib/final-slate-readiness.ts`); the existing `FINAL_SLATE_CORE_RANKS = [1..5]` / `FINAL_SLATE_CONTEXT_RANKS = [6,7]` already describe the 5 + 2 split.
- Public display: `HOMEPAGE_TOP_EVENTS_LIMIT = 7` and a 5-core / 2-context allocation in the homepage model (`src/lib/homepage-model.ts`), `selectPublicBriefingItems` default `limit = 7` and the rank-≤7 "top" priority bands (`src/lib/data.ts`), and published editorial overrides applied to public ranks 1–7 across both tiers (`src/lib/homepage-editorial-overrides.ts`).
- UI: Core Signals and Context Signals tier labels; the editorial composer slot panel renders the live slot counts.
- Test coverage for the seven-row cap, the 5 + 2 split, and the empty state.
- Governance update in `docs/product/feature-system.csv`.

## Dependencies / Risks
- Depends on the ranked briefing order remaining the canonical source for signal priority.
- The cap governs the public surfaces; the data/pipeline layer still retains the full ranked list.
- Preview validation is still required for SSR rendering and final visual judgment.

## Acceptance Criteria
- The public homepage and `/signals` page show no more than seven signals.
- Ranks 1 through 5 are labeled Core Signals ("Signal").
- Ranks 6 through 7 are labeled Context Signals.
- Fewer than seven signals render without layout or runtime errors.
- Zero signals render a clear empty state.
- The underlying ranked pipeline output is not truncated or rewritten.

## Evidence and Confidence
- Repo evidence used:
  - `src/lib/final-slate-readiness.ts`
  - `src/lib/homepage-model.ts`
  - `src/lib/data.ts`
  - `src/lib/homepage-editorial-overrides.ts`
  - `docs/product/feature-system.csv`
- Confidence:
  - High for local render behavior, the publish gate, and empty-state handling.
  - Preview validation still required for SSR and final visual confirmation.
