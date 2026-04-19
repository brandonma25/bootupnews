# PRD-40 — Quality Calibration and Output Sanity

- PRD ID: `PRD-40`
- Canonical file: `docs/product/prd/prd-40-quality-calibration-and-output-sanity.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Calibrate the current deterministic Daily Intelligence Aggregator pipeline so the visible output feels more like “Top Signals that matter” and less like a raw freshness-ordered feed.

## User Problem

The architecture can already rank and explain signals, but visible outputs can still feel flatter than the product thesis. Users need stronger differentiation between core signals and context signals, clearer “why this is a top signal” language, and tighter sanity checks on the top visible set.

## Scope

- Add bounded signal-role calibration for visible outputs.
- Improve explanation explicitness around top signals versus context signals.
- Add lightweight output-sanity and eval coverage.
- Keep the current ranking, explanation, and donor architecture intact.

## Non-Goals

- No UI redesign.
- No auth or onboarding work.
- No ingestion or clustering redesign.
- No mandatory Horizon enrichment.
- No new large-scale evaluation framework.

## Implementation Shape / System Impact

- `output-sanity.ts` classifies briefing items into core, context, or watch roles.
- homepage selection now prefers a more defensible mix of core and context signals in the top visible set.
- explanation packets now explicitly carry signal role.
- tests now cover ranking sanity, explanation explicitness, and top-visible output composition.

## Dependencies / Risks

- Over-calibration could make the homepage feel rigid if signal-role thresholds are too strict.
- Explanation wording must stay grounded in deterministic evidence rather than turning into editorial fluff.
- Personalization and visible-top-set sanity must coexist without promoting weak items.

## Acceptance Criteria

- Top visible outputs favor a plausible core/context mix when enough candidates exist.
- Explanations more explicitly tell the user why something is a top signal or context signal.
- Fresh but trivial or narrow items do not crowd out clearly consequential stories.
- The calibration remains deterministic, inspectable, and rollback-safe.
- Existing signed-out and fallback-safe signed-in behavior remains intact.

## Evidence and Confidence

- Repo evidence used:
  - `src/lib/homepage-model.ts`
  - `src/lib/explanation-support.ts`
  - `src/lib/output-sanity.ts`
  - `src/lib/homepage-model.test.ts`
- Confidence: Medium-high for bounded local calibration behavior; medium for long-run editorial fit because thresholds will still need periodic review.
