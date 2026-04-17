# PRD-17 — Homepage Intelligence Surface

- PRD ID: `PRD-17`
- Canonical file: `docs/prd/prd-17-homepage-intelligence-surface.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Present the day’s intelligence in a homepage model that is categorized, trust-layered, and easier to scan than a flat feed.

## Problem
- Ranked briefing items alone do not create a clear public-facing homepage. The product needs category sections, featured events, trust signals, and empty-state explanations to make the intelligence surface understandable.

## Scope
### Must Do
- Classify events into homepage categories like Tech, Finance, and Politics.
- Build featured, top-ranked, trending, and early-signal homepage sections.
- Provide trust-layer presentation, why-this-is-here reasoning, fallback summaries, and homepage diagnostics.
- Handle sparse or empty category states intentionally.

### Must Not Do
- Reintroduce raw unstructured feed rendering on the homepage.
- Replace the dashboard’s deeper workflow with homepage-only abstractions.
- Turn diagnostics into sensitive operational logging.

## System Behavior
- The homepage converts briefing items into categorized event cards with trust framing, ranking signals, related coverage, and timelines.
- Sparse categories receive fallback allocation and clear empty/exclusion explanations.
- Debug diagnostics summarize source coverage, ranking output, and category-level gaps.

## Key Logic
- `src/lib/homepage-model.ts` builds the homepage view model from briefing items and personalization context.
- `src/lib/homepage-taxonomy.ts` classifies events and sources into homepage categories.
- `src/app/page.tsx` and `src/components/landing/homepage.tsx` render the resulting homepage surface.

## Risks / Limitations
- Category classification is heuristic and can misclassify borderline stories.
- Homepage quality still depends on the underlying briefing quality.
- Public/demo rendering cannot replace preview checks for SSR-sensitive behavior.

## Success Criteria
- The homepage shows a coherent, categorized intelligence surface instead of a flat list.
- Empty and sparse states are explicit rather than visually broken.
- Trust and ranking context help explain why each homepage event is present.

## Done When
- The repo has one canonical PRD covering homepage-specific categorization and presentation behavior.
