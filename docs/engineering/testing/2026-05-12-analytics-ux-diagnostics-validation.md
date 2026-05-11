# Analytics UX Diagnostics Validation

Date: 2026-05-12

Related PRD: `docs/product/prd/prd-62-analytics-capacity-v1.md`

Related change record: `docs/engineering/change-records/analytics-ux-diagnostics-2026-05-12.md`

Related PR: [PR #221](https://github.com/brandonma25/daily-intelligence-aggregator/pull/221)

## Scope

This record captures validation for the PRD-62 analytics UX diagnostics follow-up:

- PostHog browser product analytics forwarding.
- Public-route session replay, heatmaps, dead-click capture, and click-only autocapture.
- Browser-side Sentry DSN and replay-on-error configuration.
- Preservation of existing Supabase MVP measurement event posting.

No production debugging was performed.

## Environment Tested

| Field | Result |
| --- | --- |
| Branch | `feature/analytics-replay-browser-sentry` |
| Validated implementation SHA | `b1d401430202702fd792a4d9791e8550861a126d` |
| Vercel target | Preview |
| Preview URL | `https://bootup-77ooa24ts-brandonma25s-projects.vercel.app` |
| Deployment ID | `dpl_ByHeg29VJkS9i6jzjqJ1bQqNZtZY` |
| Deployment status | Ready |
| Created | 2026-05-12 02:39 Taiwan time |

Vercel environment values were checked by name only. No PostHog token, Sentry DSN, credential value, cookie, or raw env value is recorded here.

## Vercel Environment Configuration

Confirmed for branch-specific Preview on `feature/analytics-replay-browser-sentry`:

- `NEXT_PUBLIC_ENABLE_POSTHOG`
- `NEXT_PUBLIC_POSTHOG_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_POSTHOG_SESSION_REPLAY`
- `NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE`
- `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE`
- `NEXT_PUBLIC_POSTHOG_HEATMAPS`
- `NEXT_PUBLIC_POSTHOG_DEAD_CLICKS`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_REPLAYS_SESSION_SAMPLE_RATE`
- `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`

Production variables for the same analytics controls were also present, but this branch was validated against Preview before merge.

## PostHog Project Configuration

PostHog project used: existing Default project on US Cloud.

Configured or confirmed:

- Heatmaps enabled in the PostHog UI.
- Session replay enabled in the PostHog UI.
- Total privacy masking selected for session replay.
- Replay retention set to 30 days.
- Console log capture off.
- Headers and body capture off.
- URL blocklist configured for admin, dashboard, internal, account, login, signup, auth, reset-password, and forgot-password routes.

PostHog showed `1 recently active recording` after a real Chrome public-reader flow. The completed recording list had not processed a replay by the end of this validation window.

## Automated Validation

| Command | Result |
| --- | --- |
| `npm install` | Passed; existing npm audit findings remained |
| `npm run lint` | Passed |
| `npm run build` | Passed with existing Next.js workspace-root and package module-type warnings |
| `npm test -- src/lib/posthog-client.test.ts src/lib/mvp-measurement-client.test.ts src/lib/sentry-config.test.ts` | Passed: 3 files, 13 tests |
| `npm test` | Passed: 92 files, 675 tests |
| `npm run governance:coverage` | Passed |
| `npm run governance:audit` | Passed |
| `PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:chromium` | Passed: 33 tests |

`npm run test:e2e:chromium` without a managed server failed with `ERR_CONNECTION_REFUSED`; the managed-server Chromium run passed.

GitHub PR checks for PR #221 were green before this tracking-record-only update:

- `feature-system-csv-validation`
- `release-governance-gate`
- `pr-lint`
- `pr-unit-tests`
- `pr-build`
- `pr-e2e-chromium`
- `pr-e2e-webkit`
- `pr-summary`
- Vercel preview status

## Preview Health Validation

| Route | Result |
| --- | --- |
| `/` | HTTP 200 and rendered |
| `/signals` | HTTP 200 and rendered |

Preview analytics network checks:

- Sentry browser envelope responses returned HTTP 200.
- PostHog SDK config and UX diagnostic assets loaded.
- PostHog capture responses returned HTTP 200.
- `/api/mvp-measurement/events` responses returned HTTP 202.
- Browser console error count: 0.
- Page error count: 0.

One Sentry envelope request was aborted during navigation in a preview smoke run; no console or page error accompanied it.

## User Behavior Events Observed

Observed through preview network validation and a real Chrome public-reader flow:

- `homepage_view`
- `signals_page_view`
- `signal_details_click`
- `signal_full_expansion_proxy`
- `source_click`

The real Chrome flow exercised:

- Homepage load.
- Why It Matters / Read more expansion.
- Details navigation.
- Briefing detail-page scroll.
- External source click.

## Sensitive Data Inspection

Validation confirmed the implemented app-level event path is designed to remove or avoid:

- Email addresses.
- Cookies.
- Auth/session values.
- JWTs.
- API keys.
- Raw PostHog token copied into custom event properties.
- Source URL query strings.
- Full article body.
- Full Why It Matters body.
- Private admin notes.

PostHog SDK internal project-key fields may appear in browser ingestion requests as required SDK transport data. This record intentionally does not copy or expose those values.

## Session Replay And Heatmap Status

- `posthog-recorder.js` loaded on the Preview deployment.
- `dead-clicks-autocapture.js` loaded on the Preview deployment.
- PostHog UI showed one recently active recording after the real Chrome flow.
- Admin/auth/account/internal route replay exclusion is configured in both app code and PostHog URL blocklist.
- Completed replay playback was not inspected because the recording list had not processed a finished session by the end of validation.

## Product Analytics Readiness

The event stream is ready for these MVP insights:

- Homepage visitor count.
- Signals page visitor count.
- Reader Activation Funnel: `homepage_view` to `signal_full_expansion_proxy` to `signal_details_click` to `source_click`.
- Signals Page Funnel: `signals_page_view` to `signal_details_click` to `source_click`.
- Engagement by Signal rank when rank metadata is present.
- Engagement by briefing date when briefing-date metadata is present.
- Session-level versus visitor-level behavior using MVP visitor and session IDs.

## Remaining External Gates

- Mark PR #221 ready for review only after BM is comfortable with enabling replay/heatmap diagnostics in Preview.
- After merge and production deploy, validate Production routes, PostHog events, replay masking, Vercel Analytics, Speed Insights, and Sentry issue health.
- Do not use Production as the first debugging surface.
