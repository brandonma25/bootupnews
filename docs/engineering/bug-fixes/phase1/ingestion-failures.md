# Phase 1 Ingestion Failures

## Scope

Tracks Phase 1 RSS ingestion failures that matter to the deterministic cluster-first pipeline.

## Failure Modes

- Feed timeout or HTTP failure on a configured donor feed
- RSS parsing failure from malformed upstream XML
- Empty feed response from an upstream source
- Full live-ingestion outage that triggers seed fallback mode

## Current Handling

- Stage-level retry is applied before a feed is marked failed.
- Failures are captured in `pipeline-run.ts` as `feed_failures`.
- When all live feeds fail, the pipeline switches to deterministic seed items so the dashboard remains inspectable in local/dev environments.

## Follow-Up

- Add persistent failure history if ingestion moves into a scheduled background job.
- Split temporary network failure from source retirement or permanent feed breakage.
