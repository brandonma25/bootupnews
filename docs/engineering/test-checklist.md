# Test Checklist

## 1. Branch & Scope
- Correct branch is being used.
- No unrelated changes are included.
- Scope matches the task.

## 2. Local Validation
- App runs locally.
- No crashes during the tested flow.
- Relevant flows work as expected.

## 3. Preview Validation
- OAuth or login works if applicable.
- Session persists after refresh.
- Redirects are correct.
- Signed-in and signed-out state is correct.
- No SSR or hydration mismatch appears.
- Environment variables behave correctly.

## 4. Production Sanity
- No regressions are visible after merge.
- Critical flows remain intact.

## 5. Auth-Specific Checks
- Login works.
- Logout works.
- Session persistence is correct.
- Refresh state is correct.

## 6. SSR / Env Checks
- Rendering is correct on refresh.
- No hydration mismatch appears.
- Env-sensitive logic behaves correctly.

## 7. Documentation Check
- Canonical PRD updated if applicable.
- `docs/product/feature-system.csv` updated if applicable.
- Bug-fix or feature doc created if applicable.
- Testing notes added if applicable.
- No sensitive information is included.

## 8. Merge Readiness
- Build passes.
- Preview validation is complete.
- No known blockers remain.
