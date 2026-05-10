# PRD-61 - Newsletter Ingestion, Story Clusters, and Historical Signal Snapshot Foundation

- PRD ID: `PRD-61`
- Canonical file: `docs/product/prd/prd-61-newsletter-ingestion-story-clusters-and-historical-signal-snapshot-foundation.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add the Phase 2 database foundation for newsletter ingestion tracking, Story Cluster persistence, historical Signal Card snapshots, Signal evolution, and cross-event connection mapping without implementing ingestion, clustering, browsing, or publishing behavior.

## User Problem

Boot Up is a curated 7-story briefing: Top 5 Core plus Next 2 Context, with explicit structural why-it-matters reasoning. The current schema can publish a final slate, but Phase 2 needs durable source evidence, Story Cluster lineage, published-card history, and relationship tracking so future workflows can explain how Signals change and connect over time.

## Corrected Scope

This PRD covers six database foundation areas:

1. Newsletter ingestion tracking via `newsletter_emails`.
2. Newsletter story extraction storage via `newsletter_story_extractions`.
3. Story Cluster persistence via `story_clusters` and `story_cluster_members`.
4. Historical published Signal Card snapshot tracking by extending `published_slates` and `published_slate_items`.
5. Signal evolution tracking via `signal_evolution`.
6. Cross-event connection mapping via `cross_event_connections`.

## Snapshot Schema Decision

Path A is used. The existing `published_slates` table already represents one published briefing snapshot, and `published_slate_items` already represents the ordered published Signal Card rows in that snapshot.

This PRD does not add duplicate `briefing_snapshots` or `briefing_snapshot_signals` tables. Instead, the migration adds missing Phase 2 fields to the existing published-slate tables:

- `published_slates`: `snapshot_status`, `publish_batch_id`, `source_briefing_date`, `archived_from_live_set`, `public_surface_verified_at`, `rollback_snapshot`.
- `published_slate_items`: `source_cluster_id`, `tags_snapshot`, `promoted_from_artifact_id`, plus a foreign-key constraint and index for the existing `replacement_of_row_id_snapshot`.

## Non-Goals

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
- No source governance change.
- No ranking threshold change.
- No WITM threshold change.
- No production migration execution and no production data writes.

## Implementation Shape / System Impact

- Data Layer only: additive Supabase migration plus current `supabase/schema.sql` snapshot update.
- RLS v1: service-role-only access for all new internal Phase 2 tables. No anon or authenticated policies are created for newsletter, Story Cluster, Signal evolution, or cross-event connection tables.
- `published_slates` and `published_slate_items` remain internal service-role tables and become the historical snapshot foundation.
- `signal_posts` remains the legacy runtime Surface Placement plus Card copy read model, not canonical Signal identity.
- `context_material` and `newsletter_emails.raw_content` are internal-only fields. Public route queries must continue to use explicit selected columns and must not include these fields.
- Historical snapshot rows store final published card copy and internal lineage metadata only. They must not store private newsletter raw content.
- `newsletter_story_extractions.category` is constrained to the current public briefing categories `Finance`, `Tech`, and `Politics` for this Phase 2 foundation. More granular source labels such as Fintech or Geopolitics must map into those v1 categories before persistence here.

## Terminology Requirement

- Object levels modified: Article, Story Cluster, Signal, Card, and Surface Placement.
- Article: newsletter extractions and RSS pipeline candidates are source evidence inputs.
- Story Cluster: `story_clusters` and `story_cluster_members` group Articles about the same event or development.
- Signal: `signal_evolution` tracks interpreted Signal change across days or snapshots.
- Card: `published_slate_items` stores the final published Signal Card copy for replay.
- Surface Placement: `published_slates` captures the publish-event placement set; `signal_posts` remains a live/public placement read model.

## Dependencies / Risks

- Existing `pipeline_article_candidates`, `signal_posts`, `published_slates`, `published_slate_items`, and `mvp_measurement_events` tables remain intact.
- Public leakage risk is controlled by service-role-only RLS on new tables and by explicit public `signal_posts` selects.
- `content_sha256` is indexed but not unique because duplicate or resend-equivalent newsletter bodies should not block separate Gmail messages.
- Adding the replacement-row foreign key to `published_slate_items.replacement_of_row_id_snapshot` assumes existing non-null replacement ids point at valid `signal_posts` rows. If production contains orphan replacement ids, a production migration dry-run should stop before apply.
- Signal evolution and cross-event connections are storage foundations only; no algorithm infers or publishes them in this PRD.

## Acceptance Criteria

- Migration adds newsletter, Story Cluster, Signal evolution, and cross-event connection tables with constraints, indexes, triggers where needed, and service-role policies.
- Migration extends existing `published_slates` and `published_slate_items` instead of creating duplicate snapshot tables.
- Migration adds nullable internal WITM grounding metadata to `signal_posts`.
- `gmail_message_id` is unique and `gmail_thread_id` is not unique.
- `context_material` and `raw_content` are documented as internal-only and are not selected by public routes.
- Existing public homepage and `/signals` query shapes remain unchanged and still require live published rows through app-controlled service-role queries.
- Local validation passes or any failure is documented with exact scope.

## Evidence and Confidence

- Repo evidence used:
  - `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`
  - Existing Supabase migrations for `pipeline_article_candidates`, `published_slates`, `published_slate_items`, and `mvp_measurement_events`
  - Existing publish code that creates one `published_slates` row plus ordered `published_slate_items` rows at publish time
  - Existing explicit public `signal_posts` select lists in `src/lib/signals-editorial.ts`, `src/lib/homepage-editorial-overrides.ts`, and `src/app/health/rss/route.ts`
- Confidence: high for additive schema package; runtime ingestion, clustering, browsing, and evolution inference remain intentionally unimplemented.

## Closeout Checklist

- Scope completed:
  - [x] Migration added.
  - [x] Schema snapshot updated.
  - [x] Existing snapshot table reuse decision documented.
  - [x] Public select safety confirmed.
  - [x] Tests and release-governance gate rerun after scope correction.
- Tests run:
  - `git diff --check`
  - `python3 scripts/validate-feature-system-csv.py`
  - `python3 scripts/release-governance-gate.py --diff-mode local --branch-name feature/newsletter-ingestion-schema-foundation --pr-title "Newsletter ingestion, story clusters, and historical signal snapshot foundation"`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `supabase db push --dry-run --local` was attempted only against local Postgres and did not run because no local Supabase database was listening.
- Google Sheet / Google Work Log not treated as canonical or updated for routine closeout.
