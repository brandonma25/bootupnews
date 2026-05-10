# Analytics Capacity V1 — Change Record

Date: 2026-05-10
Branch: `feature/analytics-capacity-v1`
Related PRD: `PRD-62`

## Summary

Added a browser-only PostHog analytics bridge for Boot Up product behavior events. The existing Supabase-backed MVP measurement pipeline remains the primary persisted event system, and Vercel Analytics, Speed Insights, Sentry, and RSS observability remain intact.

## Scope

- Installed `posthog-js`.
- Added `src/lib/posthog-client.ts` for env-gated client initialization, safe capture, query stripping, and session replay route eligibility.
- Initialized PostHog from `src/instrumentation-client.ts`.
- Forwarded validated MVP measurement events from `trackMvpMeasurementEvent()` to PostHog when enabled.
- Hardened MVP metadata validation so sensitive keys, rich body copy, and URL query strings are stripped before storage or forwarding.
- Documented PostHog public env placeholders in `.env.example`.

## Explicit Non-Actions

- Did not install `posthog-node`.
- Did not replace or remove `mvp_measurement_events`.
- Did not change Vercel Analytics, Speed Insights, Sentry, RSS observability, cron behavior, ranking, publication, or source activation.
- Did not add real tokens, DSNs, cookies, account IDs, private logs, or raw env values.

## Validation Plan

- Unit tests cover disabled env behavior, Supabase posting, sanitized PostHog capture, analytics failure isolation, and admin/auth replay ineligibility.
- Local full validation must run before merge readiness: install, lint, build, unit tests, Chromium E2E when safe, and local browser smoke.
- Preview validation must use BM-provided PostHog preview env values to confirm Live Events without sensitive payloads.
