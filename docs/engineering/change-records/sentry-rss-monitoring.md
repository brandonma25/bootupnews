# Sentry RSS Monitoring

Date: 2026-04-27

Canonical PRD required: `No`

This is audit/remediation-backed operational monitoring for the existing RSS Article ingestion and daily refresh system. It does not add user-facing product scope, source activation, ranking behavior, Signal interpretation, or editorial UI behavior.

## Scope

- Initialize Sentry for the Next.js App Router runtime with env-only configuration.
- Capture RSS boot validation failures before RSS runtime paths are used.
- Classify RSS fetch, parse, store, publish, cache, refresh, stale-health, and unexpected failures with stable failure types.
- Add one Sentry Cron Monitoring check-in path for the existing daily RSS refresh job.
- Add one uptime-monitor-compatible health endpoint at `/health/rss`.
- Keep all Sentry setup compatible with the free Developer tier.

## Required Environment Variables

Set real values only in deployment secrets or environment settings.

```text
SENTRY_DSN=<masked>
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.05
RSS_CRON_MONITOR_SLUG=rss-feed-refresh
PUBLIC_SITE_URL=https://your-production-domain.example
```

Optional:

```text
SENTRY_RELEASE=<commit sha or release id>
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.05
SENTRY_ORG=<org slug, required only for source map upload>
SENTRY_PROJECT=<project slug, required only for source map upload>
SENTRY_AUTH_TOKEN=<CI secret only, required only for source map upload>
RSS_STALE_THRESHOLD_MS=108000000
```

## Failure Taxonomy

RSS failures are classified as:

```text
rss_config_missing
rss_config_invalid
rss_boot_init_failed
rss_fetch_timeout
rss_fetch_network_error
rss_fetch_dns_error
rss_fetch_tls_error
rss_fetch_http_error
rss_fetch_rate_limited
rss_fetch_unexpected_status
rss_fetch_empty_response
rss_fetch_invalid_content_type
rss_parse_invalid_xml
rss_parse_invalid_feed
rss_parse_missing_required_fields
rss_parse_empty_feed
rss_cache_read_failed
rss_cache_write_failed
rss_retry_exhausted
rss_refresh_job_failed
rss_feed_stale
rss_unknown_error
```

Sentry events are tagged with:

```text
component=rss
rss.failure_type=<failure type>
rss.phase=boot|fetch|parse|store|publish|cache|refresh|healthcheck|render
rss.feed_host=<host only>
rss.feed_id=<stable id when available>
environment=<SENTRY_ENVIRONMENT>
```

Full feed URLs, query strings, headers, cookies, authorization values, API keys, RSS item bodies, RSS item titles, and user identifiers are not intentionally sent to Sentry.

## Boot Monitoring

Sentry initializes through Next.js instrumentation before RSS boot validation runs. Boot validation resolves configured donor feeds and public surface feeds without fetching network content. If feed configuration is missing or invalid, the app marks RSS health as degraded and captures a boot-phase RSS event; it does not crash the app because persisted read models can still serve the site.

## Scheduled Refresh Monitoring

The existing Vercel Cron route remains:

```text
/api/cron/fetch-news
schedule: 0 10 * * *
```

Sentry Cron Monitoring uses one monitor slug:

```text
rss-feed-refresh
```

The cron wrapper sends:

- `in_progress` when the job starts
- `ok` when RSS-backed editorial persistence succeeds
- `error` when seed fallback is used, too few items are produced, persistence fails, or the job throws

If Sentry auto-creates the monitor from check-ins, confirm in the Sentry UI that only this one RSS cron monitor exists.

## Uptime Monitoring

Configure exactly one Sentry uptime monitor:

```text
PUBLIC_SITE_URL + /health/rss
```

The endpoint returns:

- `200` with `status: "ok"` or `status: "degraded"` when RSS boot is acceptable and a successful RSS-backed run is fresh.
- `503` with `status: "failed"` when no successful RSS-backed run is known, the persisted read model cannot be read, or RSS health is critically stale.

The endpoint does not expose full feed URLs, headers, cookies, stack traces, internal tokens, or RSS item content.

## Alerts

Free-tier-compatible issue alert:

```text
New issue where component:rss
Action: email notification
```

Suggested metric alert:

```text
count(errors) where component:rss over 5-15 minutes
Warning: >= 3
Critical: >= 10
Action: email notification
```

Do not configure Slack, Jira, PagerDuty, GitHub, paid uptime capacity, paid profiling, pay-as-you-go, or paid trials unless explicitly approved later.

## Dashboard Widgets

Recommended Sentry dashboard widgets:

- RSS errors by `rss.failure_type`
- RSS errors by `rss.feed_host`
- RSS boot failures over time
- RSS refresh duration
- RSS fetch latency p95
- RSS stale feed count
- RSS health endpoint failures

If a widget is not available on the current Sentry plan or UI, keep it as a manual follow-up.

## Logs, Traces, And Replay

- RSS boot, fetch, parse, store, publish, cache, refresh, and health operations can emit bounded Sentry logs when `SENTRY_DSN` is present.
- Tracing uses `SENTRY_TRACES_SAMPLE_RATE` and defaults to `0.05`.
- Profiling is not enabled.
- Browser replay is not enabled in this server-side RSS monitoring pass because `NEXT_PUBLIC_SENTRY_DSN` is intentionally not configured yet.
- Backend RSS failures may correlate with browser errors only in a later browser-monitoring pass.

## Release And Source Maps

Sentry release/source map upload is configured only through env/CI values:

```text
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_RELEASE
```

Local builds must not fail when these are absent. Do not create or commit a Sentry auth token from a developer machine.

## Manual Sentry UI Steps

1. Confirm the Sentry account/project is on the free Developer tier or otherwise does not require paid changes.
2. Set `SENTRY_DSN` in production deployment env only.
3. Do not set `NEXT_PUBLIC_SENTRY_DSN` until browser-side monitoring is explicitly approved.
4. Configure the one uptime monitor for `PUBLIC_SITE_URL + /health/rss`.
5. Confirm the one cron monitor slug is `rss-feed-refresh`.
6. Add the email issue alert and metric alert above.
7. Add dashboard widgets where the current plan/UI supports them.

## Non-Goals

- No deployment in this change.
- No Sentry plan upgrade, paid add-on, pay-as-you-go, or payment method.
- No new RSS scheduler.
- No additional uptime monitors or cron monitors.
- No source activation, ranking changes, homepage behavior changes, auth changes, or schema migrations.
