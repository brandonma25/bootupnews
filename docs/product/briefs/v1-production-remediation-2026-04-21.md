# V1 Production Remediation - Release Brief

## Objective
- Bring the production-facing application architecture back into alignment with the locked V1 artifact set from the April 21, 2026 audit baseline.
- Prioritize product architecture, routing, auth gates, redirect behavior, Account controls, shared briefing detail behavior, and mobile navigation before styling polish.

## Scope
- Replace the legacy first-class shell with the V1 Home, History, and Account shell.
- Add `/account` and `/briefing/[date]`.
- Demote legacy `/dashboard`, `/settings`, `/topics`, and `/sources` routes away from primary navigation.
- Restore logged-out soft gates for category and history surfaces.
- Preserve public Top Events access.
- Restore redirect-after-auth plumbing for login, signup, password, callback, and OAuth entry points.
- Wire Account profile, RSS feed, category preference, newsletter, and sign-out controls to server-backed paths where the current repo schema supports them.
- Align visible styling with Artifact 10 constraints: Inter UI, Lora briefing titles, restrained borders, no gradients, no shadows, and approved accent usage.

## Explicit Exclusions
- No new product surfaces beyond V1.
- No new category keys beyond `tech`, `finance`, and `politics`.
- No localStorage or sessionStorage preference substitutes.
- No assumption that `homepageClassification` exists in live data.
- No production or preview claim from local-only validation.

## Acceptance Criteria
- Primary nav exposes only Home, History, and Account.
- Mobile uses a fixed bottom tab bar instead of a drawer.
- Logged-out users can read Home Top Events and are soft-gated on categories and History.
- Logged-out `/account` redirects to `/login?redirectTo=/account`.
- `/briefing/[date]` renders the shared briefing detail view and supports public Top Events plus gated categories.
- Login includes Forgot Password, signup/login preserve `redirectTo`, and Google OAuth initiation remains available.
- Account controls exist on `/account` and are server-wired without browser-local substitutes.

## Risks
- Auth/session risk: live OAuth, email/password, and session persistence still require human validation in preview and production.
- SSR/client mismatch risk: local Chromium did not reproduce the production React #418 report after fixing the port-3000 worktree conflict, but preview and production monitoring are still required.
- Environment mismatch risk: Account category/newsletter columns require the included Supabase migration before those controls can persist in deployed environments.
- Data edge case risk: signed-in history depth depends on available persisted briefing rows.
- Regression risk: legacy generation actions still exist for non-primary code paths, but legacy routes are no longer first-class V1 destinations.

## Testing Requirements
- Local validation: completed with install, lint, unit/integration tests, build, and targeted Chromium Playwright route/auth/mobile checks.
- Preview validation: required before merge recommendation.
- Production sanity: required only after preview passes and deployment is promoted.

## Documentation Updates Required
- `docs/product/briefs/v1-production-remediation-2026-04-21.md`
- `docs/engineering/bug-fixes/v1-production-remediation-2026-04-21.md`
- Historical validation evidence was preserved as operational evidence outside the durable public source-of-truth surface.
- Public documentation or PR evidence completed in the appropriate durable surface; tracker-sync details are not canonical and belong in PR metadata, GitHub history, or private archive records rather than public documentation links.
