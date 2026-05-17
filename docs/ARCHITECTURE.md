# Architecture — Boot Up Ingestion Pipeline

The Boot Up ingestion pipeline collects newsletter and RSS source inputs, deduplicates and ranks them into a small set of Signal candidates, and writes them to a Notion Editorial Queue where the editor (BM) reviews and approves. Approved rows are then promoted to Supabase for publication on the public briefing surface. Triggering moved off Vercel Hobby Cron to external cron-job.org in [PRD-65](product/prd/prd-65-pipeline-reliability-external-cron-migration.md); idempotency, health checks, and a circuit breaker make the pipeline safe to retry and easy to observe.

## Pipeline overview

```mermaid
flowchart TD
    A1["Gmail<br/>Newsletter labels"] -->|fetch+parse| A2["Branch A:<br/>Newsletter Ingestion"]
    B1["RSS feeds<br/>(public source manifest)"] -->|fetch| B2["Branch B Step R2:<br/>fetchFeedArticles"]
    B2 --> B3["Circuit breaker<br/>(Phase 4.5)"]
    B3 -->|skip if Fail Count >= 5| BSKIP["Source Health Log<br/>skipped_circuit_breaker"]
    B3 -->|else| B4["Normalize, dedup,<br/>cluster, rank"]
    A2 --> C1["Branch C:<br/>Editorial Staging"]
    B4 --> C1
    C1 --> C2["Jaccard dedup<br/>across batches"]
    C2 --> C3["Score + select top 7"]
    C3 --> C4["Branch C Step E3:<br/>writeEditorialQueueRow<br/>(idempotent)"]
    C4 -->|no match| E_INS["Notion Editorial Queue<br/>inserted at Status=raw"]
    C4 -->|match @ Status=raw| E_UPD["PATCH in place"]
    C4 -->|match @ non-raw| E_SKIP["skipped_human_edited"]
    E_INS --> R1["BM reviews in Notion"]
    E_UPD --> R1
    R1 -->|sets Status=Approved| P1["/api/editorial/push-approved"]
    P1 --> P2["signal_posts<br/>(Supabase)"]
    P2 --> P3["Public briefing<br/>(bootupnews.com)"]

    classDef storage fill:#eef,stroke:#558
    classDef gate fill:#fee,stroke:#a55
    class E_INS,E_UPD,E_SKIP,BSKIP,P2 storage
    class B3,C4 gate
```

Reading the diagram:

- **Branch A** (Gmail newsletter ingestion) and **Branch B** (RSS) feed candidates into **Branch C** (Editorial Staging).
- **Branch B Step R2** consults the [RSS circuit breaker](../src/lib/observability/rss-circuit-breaker.ts) before each fetch. A source with `Fail Count >= 5` for the day is skipped; the skip is recorded in the Source Health Log and **does not** report to Sentry.
- **Branch C Step E3** is idempotent. Every write to the Notion Editorial Queue is one of `inserted`, `updated`, or `skipped_human_edited`. Two consecutive runs with the same source set produce zero duplicates; rows the editor has already touched (`Status != raw`) are never modified.
- After human review, approved rows are promoted to `signal_posts` in Supabase via [`/api/editorial/push-approved`](../src/app/api/editorial/push-approved/route.ts). That promotion path is unchanged by PRD-65 and lives outside the cron lane.

Detailed contracts:

- Editorial Staging steps B–G and the idempotency contract: [`docs/engineering/protocols/editorial-automation-operating-guide.md`](engineering/protocols/editorial-automation-operating-guide.md).
- Notion Editorial Queue schema: managed in the live Notion database; see the editorial automation guide for the field reference.
- Pipeline Log schema (per-run operational record): [`docs/notion-pipeline-log-schema.md`](notion-pipeline-log-schema.md).
- Source Health Log schema (per-source-per-day fetch outcomes): [`docs/notion-source-health-schema.md`](notion-source-health-schema.md).

## External triggering

```mermaid
flowchart LR
    SCHED["cron-job.org<br/>(scheduler)"] -->|"10:15 UTC<br/>(18:15 Taipei)"| ING1["GET /api/cron/fetch-editorial-inputs<br/>x-cron-secret"]
    SCHED -->|"11:45 UTC<br/>(19:45 Taipei)"| ING2["GET /api/cron/fetch-editorial-inputs<br/>x-cron-secret"]
    SCHED -->|"12:15 UTC<br/>(20:15 Taipei)"| HEAL["GET /api/cron/health<br/>x-cron-secret"]

    ING1 --> PIPE["Ingestion pipeline<br/>(see Pipeline overview)"]
    ING2 --> PIPE
    PIPE --> PLOG["Notion Pipeline Log<br/>run_type=ingestion"]

    HEAL --> QUERY["Query Notion<br/>Editorial Queue<br/>for today's rows"]
    QUERY -->|row count >= 7,<br/>all sources contributed| OK["HTTP 200 status=ok"]
    QUERY -->|row count >= 7,<br/>missing source| WARN["HTTP 200 status=warn"]
    QUERY -->|row count < 7| FAIL["HTTP 500 status=fail"]
    OK --> PLOG2["Notion Pipeline Log<br/>run_type=health_check"]
    WARN --> PLOG2
    FAIL --> PLOG2
    FAIL -.->|non-200| ALERT["cron-job.org email alert<br/>to BM"]

    classDef alert fill:#fee,stroke:#a55,color:#900
    classDef ok fill:#efe,stroke:#5a5
    class FAIL,ALERT alert
    class OK ok
```

| UTC | Taipei | Job | Purpose |
| --- | --- | --- | --- |
| 10:15 | 18:15 | `bootup-ingestion-1015-utc` | First ingestion run (early evening, gives time for re-runs before editor review) |
| 11:45 | 19:45 | `bootup-ingestion-1145-utc` | Second ingestion run (catches any sources slow to publish in the first window) |
| 12:15 | 20:15 | `bootup-health-check-1215-utc` | Health check 30 minutes after the second ingestion run; HTTP 500 triggers an email alert |

Source-of-truth for the schedule is [`scripts/cron-jobs.config.ts`](../scripts/cron-jobs.config.ts). Apply changes with `npm run cron:sync` (see [`docs/CRON_SETUP.md`](CRON_SETUP.md)).

## Auth and rollback

- Both `/api/cron/fetch-editorial-inputs` and `/api/cron/health` authenticate by checking the `x-cron-secret` HTTP header against `process.env.CRON_SECRET`. Missing or mismatched header → HTTP 401, no pipeline work happens.
- The legacy Vercel Cron `Authorization: Bearer <CRON_SECRET>` header is honored only when `ALLOW_VERCEL_CRON_FALLBACK=true`. This is the rollback escape hatch for re-enabling Vercel Cron during a cron-job.org outage; see [`docs/CRON_SETUP.md`](CRON_SETUP.md#5-rollback).
- The `crons` array is intentionally absent from `vercel.json`. Do not re-add it without flipping the fallback flag.

## What's outside this initiative

PRD-65 does not change:

- Branch A's newsletter parsing, label preflight, or write gates.
- Branch B's normalization, deduplication, clustering, or ranking logic. Only the fetch step (R2) is touched, and only to consult the circuit breaker and record per-source outcomes.
- The Supabase push path (`/api/editorial/push-approved` and downstream `signal_posts` reads).
- Any public surface, ranking signal, or editorial UI.

For the broader product, see the [README](../README.md) and the PRD index under [`docs/product/prd/`](product/prd/).
