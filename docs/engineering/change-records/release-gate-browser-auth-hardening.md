# Change Record: Release Gate Browser/Auth Hardening

## Summary
- Added a second required PR browser smoke gate for WebKit while preserving the existing Chromium gate.
- Expanded deterministic Playwright coverage around auth-entry and session-sensitive release risk without pretending real provider OAuth is CI-safe.
- Updated release protocol docs so merge readiness now explicitly depends on Chromium plus WebKit automation, preview verification, and the separate human auth/session gate.

## Changes Made
- `.github/workflows/ci.yml`
  - Kept `pr-e2e-chromium`
  - Added `pr-e2e-webkit`
  - Updated `pr-summary` to wait for both browser jobs
- `package.json`
  - Added `test:e2e:webkit`
- `scripts/release/validate-local.mjs`
  - Local release validation now runs both Chromium and WebKit by default
- `tests/homepage.spec.ts`
  - Added callback-error auth-entry smoke coverage
- `tests/dashboard.spec.ts`
  - Added signed-out refresh truth and callback-error redirect smoke coverage
- `src/components/auth/auth-modal.tsx`
  - Removed a server/client callback-URL text mismatch so `/?auth=callback-error` no longer throws a hydration warning while the auth modal is open
- `docs/engineering/protocols/`
  - Updated release guidance to document the new browser baseline and the remaining human-only auth/session checks

## Browser Coverage Change
- Before: Chromium-only PR browser enforcement
- After: Chromium plus WebKit PR browser enforcement

## Auth/Session Coverage Change
- Newly automated:
  - signed-out auth entry visibility
  - signed-out dashboard truth after refresh
  - callback-error redirect return to the homepage auth state
- Still manual:
  - real provider login
  - real provider callback success path
  - real signed-in session persistence after refresh
  - real sign-out behavior
  - preview-only SSR, cookies, and environment truth

## Follow-up
- GitHub branch protection or rulesets must be updated manually to require `pr-e2e-webkit` in addition to the existing required checks.
