# Static Stories + Editorial + Account Page Regression — Bug-Fix Record

## Summary
- Problem addressed: homepage and category tabs fell back to static demo copy, `/dashboard/signals/editorial-review` hit a recoverable app error, and `/account` hit a recoverable app error in preview after the production homepage SSR hotfix sequence.
- Root cause: multiple render paths re-entered demo data or pipeline/dashboard helpers instead of staying on read-only persisted state.
- Affected object level: Surface Placement and Card rendering for public homepage/category/editorial/account surfaces.

## Fix
- Exact change: homepage SSR now prefers a persisted `signal_posts` snapshot helper before using honest category-specific placeholders; editorial review reads stored signal rows only; `/account` reads only request auth state, `user_profiles`, and `sources`.
- Related PRD: existing homepage/editorial/account behavior maps to PRD-17, PRD-49, and PRD-53; no new canonical PRD was required.
- PR: #109, `https://github.com/brandonma25/bootupnews/pull/109`
- Branch: `bugfix/static-stories-editorial-page-regression`
- Head SHA: `a45fdb6d93d4ea4f220b641dfe194964218b0528`
- Merge SHA: `ab4536b7a6b05ac9642dc5b4053f0778096cd5b8`
- GitHub source-of-truth status: canonical record consolidated here on 2026-05-04; deprecated legacy redirect was removed on 2026-05-04.
- External references reviewed, if any: PR #109 metadata and the legacy bug report.
- Google Sheet / Work Log reference, if historically relevant: Operational closeout and tracker-sync evidence should live in PR metadata, GitHub history, or private archive records rather than public documentation links.
- Branch cleanup status: branch deletion state not independently recoverable in this cleanup; PR metadata preserves branch and SHA.

## Root Cause Detail
- Public homepage SSR switched to published `signal_posts`, but when no live published set existed it dropped straight back to `demoDashboardData`, including old static promo-style titles.
- `getEditorialReviewState()` called `ensureCurrentSignalPosts()` during render, which could synthesize a fresh Top 5 through `generateDailyBriefing()` and made the admin route fragile.
- `getAccountPageState()` routed through `getDashboardData()`, which pulled dashboard pipeline audits, fallback generation, and user-scoped sync behavior into an account/profile route.

## Validation
- Automated checks:
  - `npm install`
  - `npm run test -- src/lib/signals-editorial.test.ts src/lib/data.test.ts src/app/dashboard/signals/editorial-review/page.test.tsx src/app/page.test.tsx`
  - `npm run test -- src/lib/data.test.ts`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - Local dev server on `http://localhost:3000`
  - `PLAYWRIGHT_BASE_URL=[REDACTED_ENV_VALUE] npx playwright test tests/smoke/homepage.spec.ts tests/homepage.spec.ts --project=chromium`
- Route probes:
  - `HEAD /` returned `200`
  - `HEAD /dashboard/signals/editorial-review` returned `200`
  - `HEAD /account` redirected to `/login?redirectTo=/account`
  - homepage HTML did not surface the old static demo titles
  - editorial and account probes did not show temporary server-problem copy
- Human checks: signed-in admin/editorial and account preview validation remained required.

## Remaining Risks / Follow-up
- Real signed-in editorial validation with an admin session still needs a human/browser pass.
- Real signed-in preview validation for `/account` still needs a human/browser pass.
- If production has no live published signal set and no stored latest snapshot, the homepage now shows honest placeholders; product quality still depends on keeping `signal_posts` populated.
- Add a lightweight operational check for missing live published `signal_posts` or missing latest stored homepage snapshot.
