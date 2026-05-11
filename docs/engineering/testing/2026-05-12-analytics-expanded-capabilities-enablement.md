# Analytics Expanded Capabilities Enablement

Date: 2026-05-12

Related PRD: `docs/product/prd/prd-62-analytics-capacity-v1.md`

Related change record: `docs/engineering/change-records/analytics-ux-diagnostics-2026-05-12.md`

## Scope

This record covers the PRD-62 follow-up to enable the analytics capabilities previously marked as conservative limits:

- PostHog public-route session replay.
- PostHog heatmaps.
- PostHog click-only autocapture.
- PostHog dead-click diagnostics.
- Optional PostHog-native automatic pageview capture.
- Browser-side Sentry replay-on-error settings.

The Supabase MVP measurement event system remains the canonical Boot Up event storage path.

## External Configuration

Vercel Production was explicitly updated for these non-secret switches:

- `NEXT_PUBLIC_POSTHOG_SESSION_REPLAY`
- `NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE`
- `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE`
- `NEXT_PUBLIC_POSTHOG_HEATMAPS`
- `NEXT_PUBLIC_POSTHOG_DEAD_CLICKS`
- `SENTRY_REPLAYS_SESSION_SAMPLE_RATE`
- `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`

Real PostHog token and Sentry DSN values were not recorded in this file.

## Production Redeploy

Fresh Production deployment after env update:

- Deployment URL: `https://bootup-ldr678tmi-brandonma25s-projects.vercel.app`
- Deployment ID: `dpl_EcGMsB13CatXiG35nUH4waJ61x3k`
- Alias: `https://bootupnews.vercel.app`
- Status: Ready
- Created: 2026-05-12 03:30 Taiwan time

## Production Smoke

| Check | Result |
| --- | --- |
| `/` | HTTP 200 |
| `/signals` | HTTP 200 |
| PostHog capture | HTTP 200 responses observed |
| Sentry browser envelopes | HTTP 200 responses observed |
| Browser console errors | 0 observed |
| Page errors | 0 observed |

Observed PostHog assets:

- `config.js`
- `posthog-recorder.js`
- `dead-clicks-autocapture.js`
- `surveys.js`

Observed custom MVP events:

- `homepage_view`
- `signals_page_view`
- `signal_details_click`
- `signal_full_expansion_proxy`
- `source_click`

## Code Follow-Up

The application already supported env-gated replay, heatmaps, click-only autocapture, and dead-click capture. This follow-up adds `NEXT_PUBLIC_POSTHOG_PAGEVIEWS` so sanitized PostHog-native `$pageview` events can be explicitly enabled when BM wants them alongside Boot Up's explicit MVP page-view events.

## Sensitive Data Check

Validated payload summaries contained only bounded product fields such as route, surface, signal rank, briefing date, published slate ID, MVP visitor/session IDs, source name, and safe link text.

No app-level event summary included email addresses, auth/session values, cookies, API keys, source URL query strings, full article body, full Why It Matters body, private admin notes, or raw env values.

## Remaining Gates

- Deploy the code follow-up before expecting `NEXT_PUBLIC_POSTHOG_PAGEVIEWS` to affect the browser bundle.
- Re-run Preview validation after the PR is opened.
- Re-run Production validation only after Preview passes and the PR is merged.
