# V1 Production Remediation - Testing Report

## Release Metadata
- Date: 2026-04-21
- Branch: `fix/v1-production-remediation`
- PR: not opened in this local session

## Commands Run
- `npm install`
- `npm run lint`
- `npm run test`
- `npm run build`
- Dev server rule: stopped the conflicting port-3000 Next.js server from another worktree, then ran `npm run dev`.
- Local URL: `http://localhost:3000`
- `npx playwright test --project=chromium --workers=1`
- `npx playwright test --workers=1`

## Automated Results
- Local install: passed; npm reported one existing high-severity audit finding.
- Lint: passed.
- Unit/integration tests: passed, 47 files and 243 tests.
- Build: passed.
- Chromium Playwright: passed, 16 tests.
- Full Playwright project set: passed, 48 tests across Chromium, Firefox, and WebKit.
- Preview gate: not run; no preview URL was validated in this local session.
- Production verification gate: not run; production must follow preview validation.

## FUNCTIONAL VALIDATION MATRIX

| Surface | Control / Workflow | Expected Behavior | Actual Behavior | Status | Artifact Reference | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Global navigation | Desktop primary navigation | Only Home, History, and Account are first-class destinations; sidebar can collapse. | Shell exposes Home, History, and Account only; legacy labels absent in Chromium check. | Pass | Artifacts 1, 7, 10 | Verified by `tests/dashboard.spec.ts`. |
| Global navigation | Legacy routes | Today, Topics, Sources, and Settings are not primary V1 destinations. | `/dashboard` redirects home; `/settings`, `/topics`, and `/sources` flow through Account auth. | Pass | Artifacts 4, 7 | Legacy routes remain only as redirects. |
| Mobile navigation | Mobile primary nav | Mobile uses fixed bottom tab bar, not drawer. | Bottom Home, History, Account tabs render; no drawer trigger found. | Pass | Artifacts 1, 10 | Verified at 390x844 viewport. |
| Home | Top Events default | Top Events is default and public. | Home renders Today's briefing with Top Events active and public content visible. | Pass | Artifacts 1, 7, 10 | Uses homepage-model fallback; no `homepageClassification` assumption. |
| Home | Category tabs | Logged-out category tabs are soft-gated. | Tech, Finance, and Politics render gated CTA content for signed-out users. | Pass | Artifacts 2, 7 | Verified in component and Playwright coverage. |
| Home cards | Source pills | Source pills come from `sources[].title`, not `matchedKeywords`. | Home card source pills render source titles such as TechCrunch and The Verge. | Pass | Artifacts 3, 5 | Unit coverage updated. |
| Home to detail | Open full briefing / Details links | Links navigate to `/briefing/[date]`. | Home Open full briefing navigates to `/briefing/2026-04-21` locally. | Pass | Artifacts 1, 7 | Verified by Chromium test. |
| Briefing detail | Shared detail route | Detail route renders shared briefing model with public Top Events and gated categories. | `/briefing/[date]` renders the shared detail component with Top Events tab and back-to-history link. | Pass | Artifacts 1, 2, 7 | Signed-out local behavior verified. |
| History | Logged-out access | Logged-out users see inline soft gate, not full history. | History tab shows sign-in gate for logged-out users. | Pass | Artifact 7 | Verified in mobile navigation flow. |
| History | Authenticated history groups | Authenticated users see date-grouped history and Open full briefing links. | Route and component wiring implemented; real authenticated persistence not exercised locally. | Partially verified | Artifacts 1, 7 | Requires preview/human signed-in session. |
| Account | Logged-out access | `/account` redirects to `/login?redirectTo=/account`. | Browser lands on `/login?redirectTo=/account` and shows Sign in. | Pass | Artifact 7 | Query value verified semantically after browser normalization. |
| Account | Profile, RSS, preferences, newsletter, sign out | Controls live on Account and persist through server-backed paths. | UI and server actions are present; persistence depends on deployed schema migration and auth session. | Partially verified | Artifacts 6, 8 | No browser-local substitutes added. |
| Login | Email/password form | Form fields, password visibility toggle, Google OAuth entry, Forgot Password, and signup link are reachable. | Controls render and password toggle hydrates; button enables after hydrated input. | Pass | Artifacts 6, 7 | Real credential success remains human-only. |
| Signup | Signup flow | Signup preserves redirectTo and validates malformed email/password states. | Signup link preserves redirectTo; validation state renders for invalid email. | Pass | Artifacts 6, 7 | Real account creation remains human-only. |
| Forgot password | Password reset entry | Forgot Password is reachable from login and reset form can submit supported fields. | Login links to `/forgot-password`; password reset tests pass. | Pass | Artifacts 6, 7 | Email delivery remains environment/human validation. |
| Redirect-after-auth | Auth redirect target | Login/signup/OAuth/password callback preserve safe `redirectTo` destination. | Server helpers and auth pages preserve safe redirect paths; UI links verified locally. | Partially verified | Artifacts 6, 7 | Successful real auth callback requires preview/human validation. |
| Runtime stability | Hydration/runtime issue | No React hydration/runtime crash on remediated routes. | No local Chromium runtime crash observed after correcting the port-3000 worktree conflict. | Partially verified | Artifact 10 | Production #418 was not reproducible locally. |

## Human Auth / Session Results
- Google OAuth: not validated locally with a real provider session.
- Email/password success: UI controls validated; real credential success requires human validation.
- Callback redirect: helper behavior and links validated; real provider callback requires preview validation.
- Refresh persistence: not validated locally with a real deployed session.
- Sign-out: button and action wiring present; real deployed session behavior requires human validation.

## Remaining Risks
- The local port-3000 conflict initially served a stale app from another worktree; final browser validation was run after binding this branch's server to port 3000.
- Preview validation is still required for cookies, OAuth, Supabase environment variables, and redirect-after-auth.
- Production validation is still required after preview passes.
