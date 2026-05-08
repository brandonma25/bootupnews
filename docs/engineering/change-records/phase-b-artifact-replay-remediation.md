# Phase B Artifact Replay Remediation

## Change Type

Remediation / controlled operations validation.

## Source of Truth

- Boot Up is a curated daily intelligence briefing, not a feed.
- Limited Phase B may insert only Core and Context rows, max 3, as `needs_review`, `is_live=false`, `published_at=null`.
- The Phase B regression diagnosis found live RSS/feed drift removed the previously approved Context rows from the current candidate set. This was not a selector regression.

## PRD Status

No new canonical PRD is required. This change aligns the already-approved controlled Phase B validation path with a stable replay input for operations safety.

## Scope

- Add `PIPELINE_REPLAY_ARTIFACT_PATH` for controlled-pipeline replay from a prior controlled `dry_run` artifact.
- Add optional `PIPELINE_REPLAY_EXPECTED_RUN_ID` to bind replay to a specific source run.
- Keep replay available only through the controlled pipeline script path.
- Preserve existing `dry_run` and `draft_only` gates, including production `draft_only` requirements.
- Reconstruct only Core and Context Signal candidates from `proposedTopFive` and `proposedContextRows`; Depth and Excluded rows remain out of the replay selection path.

## Non-Goals

- No production cron run or re-enable.
- No public publish behavior changes.
- No source manifest, ranking, calibration, or why-it-matters template changes.
- No Batch 2 source implementation.
- No card-level editorial authority or homepage snapshot schema work.

## Safety Notes

Replay artifacts must be controlled `dry_run` artifacts with `persistence=null`. Missing, malformed, mismatched-run, or disallowed-tier artifacts fail closed before ingestion or persistence. The path is explicitly configured and does not affect normal ingestion, public routes, cron execution, or live homepage reads.
