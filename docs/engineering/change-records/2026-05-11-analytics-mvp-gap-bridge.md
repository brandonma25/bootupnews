# Analytics MVP Gap Bridge

## Summary
- Added Google Search Console URL-prefix verification support for the production Boot Up URL.
- Confirmed the analytics stack target remains minimal for MVP: Vercel Analytics and Speed Insights, Sentry, PostHog, Supabase dashboard logs, and Google Search Console.
- No secrets, DSNs, API keys, cookies, or raw environment values are recorded here.

## Scope
- Public verification artifact for Google Search Console ownership.
- External configuration follow-up: ensure browser-side Sentry DSN is configured through Vercel environment variables so client-side errors initialize in production and preview.

## Non-Goals
- No new analytics provider.
- No PostHog session replay enablement.
- No paid experimentation, revenue analytics, or custom BI layer.
- No changes to product behavior, ingestion, ranking, Signal Cards, or Surface Placement.

## Validation Plan
- Verify the Search Console property after production deploy.
- Confirm the verification artifact returns HTTP 200 at the production root.
- Confirm Sentry RSS monitoring remains server-side and that client Sentry initializes only when the public DSN env var is present.
- Confirm PostHog still receives MVP behavior events without query strings, full article bodies, or full Why It Matters copy.
