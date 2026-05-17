# Observability — Boot Up Ingestion Pipeline

Where to look when something breaks, and what each surface is good for. The pipeline architecture is in [`ARCHITECTURE.md`](ARCHITECTURE.md); the scheduling runbook is in [`CRON_SETUP.md`](CRON_SETUP.md). This document tells you how to debug a failure once you know one happened.

## The three operational surfaces

| Layer | Surface | Best for |
| --- | --- | --- |
| **Primary** | cron-job.org dashboard + email alerts | Did the cron fire? What HTTP status did it return? |
| **Secondary** | Vercel function logs | *Why* did a run return non-200? Stack traces, branch-level errors. |
| **Tertiary** | Notion Pipeline Log + Source Health Log | Long-term operational history. Per-source-per-day fetch outcomes. |
| Out-of-band | Sentry | Genuinely unexpected errors. Most RSS feed-flakiness noise is filtered out by design. |

Operate top-down: the email alert points at the cron-job.org execution row → that row tells you which Vercel function invocation to inspect → the Notion logs explain whether this is an isolated incident or a pattern.

## Decision tree

```
                    cron-job.org email alert arrives
                                 |
                                 v
                  Open cron-job.org → relevant job
                                 |
                                 v
                 What HTTP status did the failing fire return?
                                 |
                    -----------------------------
                    |                           |
                  4xx (auth)                 5xx (server)
                    |                           |
                    v                           v
        Check x-cron-secret matches      Open Vercel function log
        CRON_SECRET in Vercel prod env   for the matching timestamp
                    |                           |
                    v                           v
        Fix the secret, re-sync          Read the error
                                                 |
                                  -----------------------------
                                  |                           |
                            Branch-level error           Health check fail
                            (RSS / newsletter            (row_count < 7)
                            / staging failure)                |
                                  |                           v
                                  v                  Check Notion Editorial
                          Inspect Notion              Queue for today —
                          Pipeline Log for            were rows even
                          per-branch flags            written?
                                                              |
                                                              v
                                                  If no: was today's
                                                  ingestion run successful?
                                                  Check the Pipeline Log
                                                  for run_type=ingestion.
                                                              |
                                                              v
                                                  If yes but rows<7:
                                                  Check Source Health
                                                  Log — is a source
                                                  circuit-broken?
```

## Source Health vs Pipeline Health

Two different questions, two different logs:

- **Pipeline Health** answers *"did the pipeline complete and produce 7 rows today?"* — the [Notion Pipeline Log](notion-pipeline-log-schema.md) captures one row per ingestion run plus one row per health check. `Status` is one of `ok` / `warn` / `fail`. This is what cron-job.org's email alert is tied to.
- **Source Health** answers *"did every expected source contribute today?"* — the [Notion Source Health Log](notion-source-health-schema.md) captures one row per `(Source, Date)`. `Last Outcome` is one of `success` / `fail` / `skipped_circuit_breaker`. A failing source produces a Pipeline Log `warn` (HTTP 200, no alert) as long as the total row count is still ≥ 7.
- **Sentry** answers *"are unexpected errors occurring?"* — only events that are **not** already tracked in the Source Health Log surface here. The `beforeSend` filter in [`src/sentry.server.config.ts`](../src/sentry.server.config.ts) drops events whose exception message matches `^Feed request retry exhausted for ` because those are routine feed-flakiness signals tracked authoritatively in the Source Health Log. Other `RssError` variants and all non-RSS errors continue to report normally.

A useful mental model:

- A `fail` in the Pipeline Log is the **system level** signal — something is wrong with the pipeline as a whole.
- A pattern in the Source Health Log is the **source level** signal — a specific feed is degrading and the circuit breaker may kick in within a few days.
- A new Sentry issue is the **unexpected** signal — a code path that broke, not a known-flaky feed.

If you ever see a flood of `Feed request retry exhausted for *` in Sentry, the filter has regressed. The expected steady state is **zero** such events in Sentry — the Source Health Log holds the truth.

## Common failure shapes and where to look

| Symptom | First place to look | Likely cause |
| --- | --- | --- |
| Email alert: health check returned 500 | cron-job.org execution row → response body | Today's row count is < 7. Often: ingestion timed out, or every source slot was used but staging crashed mid-write. |
| Email alert: ingestion returned 500 | Vercel function log | Branch-level failure. RSS or newsletter branch returned `success: false`; check which one in the response JSON. |
| Email alert: ingestion returned 401 | Vercel env vars | `CRON_SECRET` in Vercel doesn't match the value on cron-job.org. Re-sync the secret on both sides. |
| Notion Editorial Queue empty at 8 PM Taipei | Pipeline Log → filter `Run Type=ingestion` for today | If no row: cron didn't fire (check cron-job.org). If row exists at `status=fail`: see Vercel log. If row exists at `status=ok` but Notion empty: investigate Branch C staging path. |
| One source consistently empty | Source Health Log → filter by source | If `Last Outcome` is `fail` repeatedly: source is degrading. If `Last Outcome` is `skipped_circuit_breaker`: breaker tripped (5+ fails today). Will auto-retry tomorrow. |
| Duplicate row appeared in Editorial Queue | Pipeline Log → look for two `inserted` rows for the same `Briefing Date` | Should not happen post-PRD-65. If it does, the idempotency query may be returning a false negative. Check the row's `Headline` for invisible characters. |
| BM edited a row, next ingestion overwrote it | Pipeline Log + the row's `Status` | Should not happen. The PATCH path explicitly omits `Status` and skips on `Status != raw`. If observed, treat as a bug in the human-edit guard. |
| Sentry shows a new RSS error | Sentry issue + Source Health Log | If the error message is `Feed request retry exhausted for *` and it's still reaching Sentry, the `beforeSend` filter has regressed. Otherwise it's a genuinely new failure mode. |

## Useful queries

### "What ran today?"

Filter the Pipeline Log by `Briefing Date = today (Taipei)`. Expect 2 rows with `Run Type=ingestion` and 1 row with `Run Type=health_check`. Anything else is unusual.

### "Is this source healthy?"

Filter the Source Health Log by `Source = <name>` and sort by `Date` descending. Look for `Last Outcome` trends and the `Last Successful Fetch` timestamp.

### "Why did the health check warn?"

Open the most recent `Run Type=health_check` row. The `Source Health` JSON column has the structure:

```json
{
  "contributed": ["Reuters", "Bloomberg", "TechCrunch"],
  "expected":    ["Reuters", "Bloomberg", "TechCrunch", "Wired"],
  "missing":     ["Wired"],
  "distinctSourceCount": 3
}
```

`missing` is the list of expected sources that did not contribute a row. Cross-reference with the Source Health Log for that day to see whether the missing source failed, was circuit-broken, or simply produced no qualifying articles.

## Retention

- **cron-job.org execution history** — ~25 most recent fires per job (free tier).
- **Vercel function logs** — 1 day on Hobby, 7 days on Pro (no upgrade is planned).
- **Notion Pipeline Log** — indefinite. The authoritative long-term operational history.
- **Notion Source Health Log** — indefinite. One row per `(Source, Date)`.
- **Sentry** — 30 days on the free tier; 90+ on paid plans. Whatever the project is currently on.

The Notion logs are the system of record for anything older than ~24 hours. Don't rely on Vercel or cron-job.org for historical investigation beyond the current day.
