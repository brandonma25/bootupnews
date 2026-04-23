# Signals Admin Editorial Layer — Local Validation

- Date: 2026-04-23
- Branch: `codex/signals-admin-editorial-layer`
- Worktree: `/Users/bm/Documents/worktrees/signals-admin-editorial-layer`
- Local URL: `http://localhost:3000`

## Commands Run

- `npm install`
  - Passed.
  - Reported 1 high severity dependency audit item from `npm audit`.
- `npm run lint || true`
  - Passed after fixing one lint-only test helper issue.
- `npm run test || true`
  - Passed: 52 test files, 265 tests.
  - Vitest emitted existing `--localstorage-file` warnings.
- `npm run build`
  - Passed.
  - Next.js emitted existing workspace-root and module-type warnings.
- `npm run dev`
  - Passed.
  - Local URL: `http://localhost:3000`.
- Playwright browser route probe for `/`, `/signals`, and `/dashboard/signals/editorial-review`
  - Passed.
  - All routes rendered non-empty content.
  - No framework error overlay detected.
  - No browser console errors captured.
- `npx playwright test --project=chromium`
  - Passed: 30 tests.
- `npx playwright test --project=webkit`
  - Passed: 30 tests.

## Coverage Notes

- Unit coverage validates admin email parsing, non-admin denial, admin draft save, admin approval, publish blocking, and public rendering of `publishedWhyItMatters` instead of raw AI draft copy.
- Page coverage validates unauthenticated and unauthorized editorial review states.
- Browser checks confirm the new public `/signals` route and private editorial route render locally without framework overlays.

## Follow-Up Validation — 2026-04-23

- Refreshed the worktree-local `.env.local` service-role credential from the Supabase project API keys without printing or committing the key.
- Confirmed `.env.local` remains ignored and untracked.
- Confirmed sanitized service-role diagnostics:
  - Supabase URL present.
  - Service-role key present.
  - `ADMIN_EMAILS` present.
  - Read-only `signal_posts` query succeeds.
- Added and tested an Account-page admin entry point that renders only when the signed-in user qualifies through `ADMIN_EMAILS`.
- Focused tests passed for admin auth, editorial workflow, public signals, and the Account-page admin entry point.
- `npm run lint` passed.
- `npm run build` passed and listed `/dashboard/signals/editorial-review` and `/signals` as dynamic routes.
- Local route probes from `http://localhost:3000`:
  - `/account` returns `200` and redirects unauthenticated curl requests to login.
  - `/dashboard/signals/editorial-review` returns `200` and renders the unauthenticated admin sign-in state without cookies.
  - `/signals` returns `200` and no longer logs `Invalid API key`.

## Approve All Follow-Up — 2026-04-23

- Added a top-page `Approve All` admin action on `/dashboard/signals/editorial-review`.
- The bulk action submits only eligible currently loaded posts and refreshes hidden values from the visible editorial textareas just before submit.
- Bulk approval reuses the same server-side approval update path as individual post approval and keeps the existing admin authorization gate.
- Focused tests validate:
  - `Approve All` renders enabled for eligible review posts.
  - `Approve All` is disabled when no draft or review-ready posts are eligible.
  - Admin bulk approval updates multiple posts.
  - Partial bulk approval failures report a mixed outcome instead of silently hiding failures.

## Preview-Required Checks

- Confirm Google OAuth login with an email listed in `ADMIN_EMAILS`.
- Confirm the admin-only Account-page `Editorial Review` link appears for `brandonma25@gmail.com` and remains hidden for non-admin users.
- Confirm non-admin Google-authenticated users cannot access `/dashboard/signals/editorial-review`.
- Confirm server actions persist drafts, approvals, reset, and publish state against the preview Supabase database.
- Confirm `/signals` reads published rows through the server-side sanitized public route in preview.
- Confirm env-sensitive behavior with `ADMIN_EMAILS` and `SUPABASE_SERVICE_ROLE_KEY` configured in Vercel preview.

## Human-Only Checks

- Real Google OAuth provider flow.
- Session persistence after refresh.
- Signed-in versus signed-out truth across navigation.
- Final editorial judgment on the published Top 5 copy.
