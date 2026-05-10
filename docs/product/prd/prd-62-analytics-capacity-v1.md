# PRD-62 — Analytics Capacity V1

- PRD ID: `PRD-62`
- Canonical file: `docs/product/prd/prd-62-analytics-capacity-v1.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add a safe client-side PostHog bridge for Boot Up product analytics while preserving the existing Supabase MVP measurement pipeline, Vercel Analytics, Speed Insights, Sentry, and RSS observability.

## User Problem

Boot Up needs preview and production visibility into which public Signal surfaces readers actually use without making product reading dependent on third-party analytics or leaking sensitive data.

## Scope

- Install `posthog-js` only for browser-side product analytics.
- Initialize PostHog from the existing client instrumentation path.
- Gate PostHog behind `NEXT_PUBLIC_ENABLE_POSTHOG`, `NEXT_PUBLIC_POSTHOG_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, and `NEXT_PUBLIC_POSTHOG_SESSION_REPLAY`.
- Forward validated MVP measurement events to PostHog with the same event names already used by Supabase storage.
- Keep `capture_pageview` and autocapture disabled.
- Strip query strings, source URL parameters, secrets, email-like fields, cookies, tokens, article bodies, and full Why It Matters copy from forwarded analytics properties.
- Keep admin and auth routes ineligible for session replay.

## Non-Goals

- No `posthog-node` installation.
- No replacement for `mvp_measurement_events` or the Supabase event API.
- No changes to ranking, ingestion, publishing, source activation, Vercel Analytics, Speed Insights, Sentry, or RSS observability behavior.
- No production debugging before preview validation passes.

## Implementation Shape / System Impact

- Client instrumentation calls `initializePostHogClient()` after the existing Sentry setup.
- `src/lib/posthog-client.ts` owns browser-only initialization, property sanitization, route replay eligibility, and best-effort capture.
- `trackMvpMeasurementEvent()` still posts to `/api/mvp-measurement/events`; valid payloads also forward sanitized same-name events to PostHog when enabled.
- `src/lib/mvp-measurement.ts` now centralizes sensitive metadata and query-string stripping before validated event storage.

## Terminology Requirement

- Object level modified: Surface Placement and Card interaction telemetry only.
- Article, Story Cluster, Signal identity, ranking, and Surface Placement selection are unchanged.

## Dependencies / Risks

- BM must create a PostHog project and configure preview/production public env vars in Vercel.
- Preview validation is required to confirm Live Events receives expected events without breaking rendering.
- Session replay remains opt-in and route-gated; admin/auth routes must stay blocked from replay capture.

## Acceptance Criteria

- PostHog is disabled when required env vars are missing.
- Existing MVP events still post to `/api/mvp-measurement/events`.
- PostHog receives same-name sanitized events when enabled.
- Analytics capture failures do not throw or block navigation.
- Admin/auth routes are not eligible for session replay.
- No secrets, emails, cookies, tokens, source URLs with query strings, article bodies, or full Why It Matters copy are sent through analytics metadata.

## Evidence and Confidence

- Repo evidence used: existing MVP measurement client/API, Sentry client instrumentation, root layout Vercel Analytics rendering, RSS observability files, and feature-system registry.
- Confidence: High for local code path and sanitization coverage; preview PostHog delivery requires BM-provided project token and Vercel env configuration.
