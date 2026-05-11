# Tracker Sync Fallback — Analytics Expanded Capabilities Enablement

Date: 2026-05-12

Reason: Direct live Google Sheets verification was not performed in this Codex run, so this repo-safe fallback record captures the manual tracker update payload for the governed PRD-62 row.

## Governed Row

| Field | Value |
| --- | --- |
| PRD ID | `PRD-62` |
| Feature Name | Analytics capacity v1 |
| PRD File | `docs/product/prd/prd-62-analytics-capacity-v1.md` |

## Manual Update Payload

| Field | Value |
| --- | --- |
| Status | In Review |
| Decision | build |
| Last Updated | 2026-05-12 |
| Notes | Follow-up enables production PostHog replay, heatmap, click diagnostics, dead-click diagnostics, browser Sentry replay-on-error settings, and adds an explicit `NEXT_PUBLIC_POSTHOG_PAGEVIEWS` code gate for optional PostHog-native pageview capture. |

## Safety Notes

- Do not add or paste PostHog tokens, Sentry DSNs, cookies, private logs, or raw env values into the tracker.
- Supabase MVP measurement events remain the canonical stored product-event path.
