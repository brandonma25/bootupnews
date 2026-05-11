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
- Gate PostHog behind `NEXT_PUBLIC_ENABLE_POSTHOG`, `NEXT_PUBLIC_POSTHOG_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, and explicit UX diagnostics switches for session replay, replay sample rate, click autocapture, heatmaps, and dead-click capture.
- Forward validated MVP measurement events to PostHog with the same event names already used by Supabase storage.
- Keep `capture_pageview` disabled so existing explicit MVP page-view events remain canonical.
- Allow click-only autocapture and heatmaps when explicitly enabled, with admin/auth routes excluded and text/input/attribute masking kept on.
- Strip query strings, source URL parameters, secrets, email-like fields, cookies, tokens, article bodies, and full Why It Matters copy from forwarded analytics properties.
- Keep admin and auth routes ineligible for session replay.
- Allow browser-side Sentry only when `NEXT_PUBLIC_SENTRY_DSN` is configured; keep Sentry replay focused on error sessions rather than full-session product replay.

## Non-Goals

- No `posthog-node` installation.
- No replacement for `mvp_measurement_events` or the Supabase event API.
- No changes to ranking, ingestion, publishing, source activation, Vercel Analytics, Speed Insights, server Sentry, or RSS observability behavior.
- No production debugging before preview validation passes.

## Implementation Shape / System Impact

- Client instrumentation calls `initializePostHogClient()` after the existing Sentry setup.
- `src/lib/posthog-client.ts` owns browser-only initialization, property sanitization, automatic capture route gating, route replay eligibility, and best-effort capture.
- `trackMvpMeasurementEvent()` still posts to `/api/mvp-measurement/events`; valid payloads also forward sanitized same-name events to PostHog when enabled.
- `src/lib/mvp-measurement.ts` now centralizes sensitive metadata and query-string stripping before validated event storage.
- `src/lib/sentry-config.ts` continues to require `NEXT_PUBLIC_SENTRY_DSN` for browser-side Sentry and uses replay sample-rate envs for browser/client replay controls.

## Terminology Requirement

- Object level modified: Surface Placement and Card interaction telemetry only.
- Article, Story Cluster, Signal identity, ranking, and Surface Placement selection are unchanged.

## Dependencies / Risks

- BM must keep real PostHog and Sentry values in Vercel environment configuration only.
- Preview validation is required to confirm Live Events, recordings, heatmaps, and browser error capture work without breaking rendering.
- Session replay, heatmaps, and autocapture remain opt-in and route-gated; admin/auth routes must stay blocked from replay and automatic capture.

## Acceptance Criteria

- PostHog is disabled when required env vars are missing.
- Existing MVP events still post to `/api/mvp-measurement/events`.
- PostHog receives same-name sanitized events when enabled.
- Analytics capture failures do not throw or block navigation.
- Admin/auth routes are not eligible for session replay or automatic capture.
- Heatmaps and click-only autocapture are disabled by default and enabled only through explicit `NEXT_PUBLIC_POSTHOG_*` switches.
- Browser-side Sentry remains disabled without `NEXT_PUBLIC_SENTRY_DSN`; when enabled, it sanitizes request URLs and sensitive fields before send.
- No secrets, emails, cookies, tokens, source URLs with query strings, article bodies, or full Why It Matters copy are sent through analytics metadata.

## Evidence and Confidence

- Repo evidence used: existing MVP measurement client/API, Sentry client instrumentation, root layout Vercel Analytics rendering, RSS observability files, and feature-system registry.
- Validation record: `docs/engineering/testing/2026-05-12-analytics-ux-diagnostics-validation.md`.
- Confidence: High for local code path, sanitization coverage, Preview PostHog delivery, browser Sentry ingest, and public-route UX diagnostics startup. Production validation remains post-merge only.
