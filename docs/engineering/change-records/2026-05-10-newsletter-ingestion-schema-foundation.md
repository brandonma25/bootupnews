# Historical Signal Snapshot And Newsletter Ingestion DB Foundation

Date: 2026-05-10
Branch: `feature/newsletter-ingestion-schema-foundation`
Change type: feature / Phase 2 Data infrastructure
Canonical PRD: `docs/product/prd/prd-61-newsletter-ingestion-story-clusters-and-historical-signal-snapshot-foundation.md`

## Status

`PRD-61` is the canonical feature record for this Phase 2 DB foundation. The original migration scope was too narrow because it excluded historical Signal Card tables. This record documents the corrected scope and the decision to reuse the existing published-slate tables instead of creating duplicate snapshot tables.

## Existing Schema Decision

Path A is used.

`published_slates` already represents one publish-event snapshot:

- one row per final slate publish
- `published_at`
- `published_by`
- row counts
- previous live row ids
- published row ids
- rollback note
- verification checklist

`published_slate_items` already represents the ordered published Signal Card rows:

- one row per published card
- `published_slate_id`
- `signal_post_id`
- `final_slate_rank`
- `final_slate_tier`
- title, summary, source, WITM, editorial decision, replacement, review snapshots
- unique `(published_slate_id, final_slate_rank)`

Because these tables already satisfy the publish-event snapshot and snapshot-item object model, the migration does not add `briefing_snapshots` or `briefing_snapshot_signals`. It extends the existing tables with missing historical and Phase 2 fields.

## What The Migration Enables

1. Newsletter ingestion tracking.
2. Newsletter story extraction storage.
3. Story Cluster persistence across RSS and newsletter Article candidates.
4. Historical published Signal Card snapshot tracking through `published_slates` and `published_slate_items`.
5. Signal evolution tracking across Story Clusters, `signal_posts`, and published snapshot items.
6. Cross-event connection mapping across Story Clusters, `signal_posts`, and published snapshot items.

## Snapshot Table Extensions

`published_slates` gains:

- `snapshot_status`
- `publish_batch_id`
- `source_briefing_date`
- `archived_from_live_set`
- `public_surface_verified_at`
- `rollback_snapshot`

`published_slate_items` gains:

- `source_cluster_id`
- `tags_snapshot`
- `promoted_from_artifact_id`
- a foreign-key constraint and index for existing `replacement_of_row_id_snapshot`

## Explicit Non-Goals

- No Gmail API integration.
- No Gmail label scanning.
- No newsletter ingestion cron job.
- No email parsing or LLM extraction logic.
- No source matching implementation.
- No clustering algorithm.
- No historical browsing UI.
- No public UI.
- No admin UI.
- No publish workflow change.
- No source governance, ranking, or WITM threshold change.
- No production migration execution or production data mutation.

## Privacy And Public Surface Constraints

- `newsletter_emails.raw_content` is internal-only raw source material and must not be selected by public routes.
- `signal_posts.context_material` is internal editorial grounding material and must not be selected by public routes.
- Historical snapshot tables store final published card copy and safe lineage metadata only. They must not store raw newsletter content.
- The current public `signal_posts` read paths use explicit column lists. No public `select('*')` on `signal_posts` was found before this migration was written.
- Public app-controlled reads still require live/published rows: `is_live = true`, `editorial_status = 'published'`, and non-null `published_at`.
- New newsletter, Story Cluster, Signal evolution, and cross-event connection tables use RLS with service-role-only policies. No anon or authenticated policies are created in v1.

## Migration Safety

The migration is additive only. It adds tables, nullable columns, constraints, indexes, triggers, comments, and RLS policies. It drops no table, drops no column, mutates no existing rows, and does not touch `pipeline_article_candidates` data.

Production migration apply is intentionally out of scope. The replacement-row FK should be checked in a production dry-run before any future apply because orphan historical replacement ids would block the constraint.

## Validation

- `git diff --check`
- `python3 scripts/validate-feature-system-csv.py`
- `python3 scripts/release-governance-gate.py --diff-mode local --branch-name feature/newsletter-ingestion-schema-foundation --pr-title "Newsletter ingestion, story clusters, and historical signal snapshot foundation"`
- `npm run lint`
- `npm run test`
- `npm run build`
- `supabase db push --dry-run --local` was attempted only against local Postgres. It did not run because no local Supabase database was listening on the expected local port. No linked or production Supabase command was run.
