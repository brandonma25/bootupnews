# Change Record: Why It Matters Quality Governance Coverage

## ID
- Why It Matters Quality Governance Coverage

## Summary
- Adds the missing governance-facing documentation lane for the PRD-35 why-it-matters quality branch so hotspot release-governance coverage reflects the full merge-safe change set.

## Scope
- Governance coverage for the existing PRD-35 why-it-matters quality work.
- Documents why this branch updates the hotspot file `docs/product/feature-system.csv` together with its canonical PRD.
- Confirms the implementation stays scoped to explanation-content quality across the intelligence and experience layers.

## Non-Goals
- No new dashboard layout or visual treatment.
- No auth, session, Supabase schema, or migration changes.
- No ranking, clustering, or scoring refactor.

## Risk Assessment
- Product risk remains bounded because the feature changes explanation content, not card structure or core data contracts.
- Governance risk is reduced by explicitly documenting the hotspot-file update and preserving one-to-one mapping between `PRD-35` and its canonical PRD file.

## Validation Status
- Local validation for the branch includes install, lint, tests, build, dev-server startup on port `3000`, and Chromium/WebKit Playwright runs.
- The branch still has unrelated pre-existing dashboard Playwright failures around callback-error routing and mobile drawer route change, but the PRD-35 unit and build coverage passed locally.
- Release-governance validation should pass once this change-record lane is present alongside:
  - one canonical PRD for PRD-35
  - one matching `docs/product/feature-system.csv` row
  - one governance-facing change record for the hotspot update

## Merge Decision / Release Note
- This branch should merge only after the release-governance gate passes and Preview review confirms explanation distinctiveness on generated cards.
- The branch now satisfies hotspot documentation expectations without expanding scope beyond the why-it-matters quality feature.
