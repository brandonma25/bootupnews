# Analytics UX Diagnostics — Change Record

## Classification
- Change type: feature / analytics capacity follow-up.
- Canonical PRD required: Yes.
- Canonical PRD: `docs/product/prd/prd-62-analytics-capacity-v1.md`.
- Reason: This extends the PRD-62 product analytics bridge from explicit MVP events into opt-in public UX diagnostics for replay, heatmaps, click autocapture, dead-click capture, and browser-side Sentry monitoring.

## Scope
- Keep Supabase `mvp_measurement_events` as the canonical product-event storage path.
- Keep explicit MVP page-view and interaction events as the canonical page-view analytics layer by leaving SDK `capture_pageview` disabled.
- Add an explicit env gate for sanitized PostHog `$pageview` capture through the Boot Up bridge when BM wants a broader PostHog-native pageview stream in addition to the MVP custom events.
- Add env-gated PostHog switches for public session replay, replay sample rate, click-only autocapture, heatmaps, and dead-click capture.
- Keep PostHog automatic capture and replay ineligible on admin, dashboard, internal, account, login, signup, auth, reset-password, and forgot-password routes.
- Keep PostHog text, input, attribute, network body, and network header masking enabled for replay/heatmap diagnostics.
- Document browser-side Sentry configuration through `NEXT_PUBLIC_SENTRY_DSN`; server-side Sentry remains unchanged.

## Non-Goals
- No PostHog Node SDK.
- No replacement of Vercel Analytics, Speed Insights, Sentry, Supabase MVP measurement storage, or RSS observability.
- No production debugging before preview validation.
- No source activation, ranking, ingestion, publishing, editorial workflow, or schema changes.

## Required Environment Variables
Set real values only in Vercel environment settings.

```text
NEXT_PUBLIC_ENABLE_POSTHOG=1
NEXT_PUBLIC_POSTHOG_TOKEN=<PostHog project token>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_SESSION_REPLAY=1
NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE=1
NEXT_PUBLIC_POSTHOG_PAGEVIEWS=1
NEXT_PUBLIC_POSTHOG_AUTOCAPTURE=1
NEXT_PUBLIC_POSTHOG_HEATMAPS=1
NEXT_PUBLIC_POSTHOG_DEAD_CLICKS=1
NEXT_PUBLIC_SENTRY_DSN=<browser DSN>
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1
```

## Validation Plan
- Confirm the target Vercel environment has the non-secret enablement switches and existing PostHog token/host.
- Confirm `NEXT_PUBLIC_SENTRY_DSN` exists without exposing its value.
- Confirm `NEXT_PUBLIC_POSTHOG_PAGEVIEWS` is intentionally enabled only when duplicate PostHog-native `$pageview` events are wanted alongside Boot Up's explicit MVP events.
- Redeploy after env changes because `NEXT_PUBLIC_*` values are baked into the browser bundle.
- Validate `/` and `/signals` render without console or analytics network errors.
- Perform a real reader flow: homepage, signals, details, Why It Matters expansion, and source click.
- Confirm PostHog Live Events receive the expected MVP events and that recordings/heatmaps are available only for public routes.
- Confirm custom app properties do not contain emails, auth/session values, cookies, API keys, source URL query strings, full article body, full Why It Matters body, or private admin notes.
- Confirm Sentry has browser-side error capture enabled with sanitized request URLs and sensitive fields.

## Tracking Records
- Canonical PRD: `docs/product/prd/prd-62-analytics-capacity-v1.md`.
- Feature control row: `docs/product/feature-system.csv` row for `PRD-62`.
- Validation/testing record: `docs/engineering/testing/2026-05-12-analytics-ux-diagnostics-validation.md`.
