# PRD-14 — Auth and Session Routing

- PRD ID: `PRD-14`
- Canonical file: `docs/prd/prd-14-auth-session-routing.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Provide a safe, session-aware authentication layer so users can sign in, sign out, return from callbacks, and land on the correct product routes without breaking SSR behavior.

## Problem
- The product depends on authenticated Supabase state, but route behavior must still degrade safely when config is missing, session cookies are stale, or callback parameters are malformed.

## Scope
### Must Do
- Build safe redirect and callback URL helpers for auth entrypoints.
- Support magic link, password sign-up, password sign-in, and sign-out server actions.
- Resolve viewer state server-side and fall back to public/demo modes when sessions cannot be trusted.
- Revalidate key routes after auth changes so dashboard, history, topics, sources, and settings stay consistent.

### Must Not Do
- Store secrets, cookies, or sensitive headers in repo docs.
- Treat local auth checks as a substitute for preview auth validation.
- Introduce provider-specific OAuth automation with personal accounts.

## System Behavior
- The app constructs safe callback URLs, accepts auth return parameters, normalizes next paths, and protects against unsafe redirects.
- When a live session is available, viewer identity is surfaced to page loaders and server actions.
- When auth state is unavailable or degraded, the product falls back to public/demo rendering instead of crashing.

## Key Logic
- `src/lib/auth.ts` centralizes redirect-path normalization, callback URL generation, and auth return handling.
- `src/lib/data.ts` resolves request auth state and uses it to choose live, public, or demo data paths.
- `src/app/actions.ts` performs sign-in, sign-up, sign-out, and session-required action guards.

## Risks / Limitations
- SSR, cookie, and callback behavior still require preview validation with real environment wiring.
- Config errors can force guest-mode or error-path fallbacks even when the UI itself renders correctly.
- Human validation remains required for provider-login truth and session persistence after refresh.

## Success Criteria
- Auth entrypoints route users to the correct page after sign-in or sign-out.
- Unsafe or malformed redirect values fall back to safe defaults.
- Authenticated pages degrade safely to public/demo mode when live session state is unavailable.

## Done When
- The repo has one canonical PRD covering auth and session routing behavior across the implemented app.
