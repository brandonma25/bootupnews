# Change Record: PRD-45 Password Reset Flow Governance Coverage

## ID
- PRD-45 Password Reset Flow Governance Coverage

## Summary
- Adds the missing governance-facing documentation lane for the PRD-45 password reset flow branch so hotspot release-governance coverage reflects the full merge-safe change set.

## Scope
- Governance coverage for the existing PRD-45 password reset flow work.
- Documents why this branch updates the hotspot file `docs/product/feature-system.csv` together with its canonical PRD.
- Confirms the implementation stays scoped to forgot-password and reset-password pages, password reset forms, recovery-token handling, proxy alignment, and the supporting local `Input` primitive.

## Non-Goals
- No login or signup form implementation.
- No Google OAuth callback behavior changes.
- No session persistence, cookie, SSR, Supabase schema, or provider configuration changes beyond the reset-link recovery path used by this feature.

## Risk Assessment
- Product risk remains bounded because this branch adds standalone reset-entry surfaces and does not change the broader auth entry architecture.
- Governance risk is reduced by explicitly documenting the hotspot-file update and preserving one canonical mapping between `PRD-45` and its feature-system row.
- Real reset-email delivery, recovery-link exchange, callback truth, and session behavior remain preview and human-validation requirements.

## Validation Status
- The canonical PRD records prior local validation for forgot-password and reset-password pages, unit coverage, build, focused password-reset Playwright smoke checks, and full Chromium Playwright coverage.
- Release-governance validation should pass once this change-record lane is present alongside:
  - one canonical PRD for PRD-45
  - one matching `docs/product/feature-system.csv` row
  - one governance-facing change record for the hotspot update
- Preview validation is still required for deployed Supabase reset-email links, recovery tokens, cookies, and session truth.

## Merge Decision / Release Note
- This branch should merge only after the release-governance gate passes, required PR checks are green, Vercel Preview is validated, and human auth/session checks are complete.
- This change record does not expand the PRD-45 implementation scope; it documents the governance impact of the existing hotspot update.
