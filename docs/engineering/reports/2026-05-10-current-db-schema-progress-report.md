# Current Production DB Schema Progress Report

Date: 2026-05-10

Effective change type: documentation / production DB schema progress report

Readiness label: `phase2_db_schema_foundation_applied_runtime_not_started`

## Executive Summary

The Phase 2 database foundation from PR #210 has been merged to `main` and applied to production Supabase project `fwkqjeumreaznfhnlzev` on `main PRODUCTION`.

Production now has the schema foundation for:

- benchmark newsletter email processing state
- newsletter story extraction storage
- Story Cluster identity and RSS/newsletter membership
- Signal evolution tracking
- cross-event connection mapping
- internal Signal Card grounding fields
- historical published-slate snapshot extensions

This is schema-only foundation. It does not implement Gmail ingestion, newsletter parsing, LLM extraction, source matching, clustering logic, newsletter cron, promotion into `signal_posts`, admin UI, public historical browsing, signal evolution rendering, or cross-event rendering.

The current public content state at `https://bootupnews.vercel.app` shows a May 6 three-signal live slate. That is a public live-row/editorial state issue, not a schema migration issue.

## Source Of Truth

- Production URL: `https://bootupnews.vercel.app`
- Supabase project: `fwkqjeumreaznfhnlzev`
- Environment: `main PRODUCTION`
- PR #210: Newsletter ingestion, story clusters, and historical signal snapshot foundation
- PR #210 merge commit: `9463523c4b4658f883b321278cc02abba0304b02`
- PRD-61: `docs/product/prd/prd-61-newsletter-ingestion-story-clusters-and-historical-signal-snapshot-foundation.md`
- Feature registry row: PRD-61 is registered in `docs/product/feature-system.csv`

## Applied Migrations

Production migration list includes all repo migrations through:

| Version | Migration |
| --- | --- |
| `20260510110000` | `signal_posts_public_source_url_guard` |
| `20260510130000` | `phase2_historical_signal_newsletter_foundation` |

Latest applied production migration: `20260510130000`.

No local repo migrations remain pending after `20260510130000` at the time of this report.

## Repo Schema Inventory

Relevant repo files:

- `supabase/migrations/20260510110000_signal_posts_public_source_url_guard.sql`
- `supabase/migrations/20260510130000_phase2_historical_signal_newsletter_foundation.sql`
- `supabase/schema.sql`
- `docs/product/prd/prd-61-newsletter-ingestion-story-clusters-and-historical-signal-snapshot-foundation.md`
- `docs/engineering/change-records/2026-05-10-newsletter-ingestion-schema-foundation.md`
- `docs/engineering/change-records/2026-05-10-phase2-db-foundation-production-migration-verification.md`

`supabase/schema.sql` reflects the new Phase 2 tables, the `signal_posts` extension columns, the published-slate history extensions, indexes, constraints, and service-role policies. It does not define duplicate `briefing_snapshots` or `briefing_snapshot_signals` tables.

PR #213 exists as a docs-only production migration verification PR:

- PR: `https://github.com/brandonma25/daily-intelligence-aggregator/pull/213`
- Branch: `docs/phase2-db-foundation-production-migration-verification`
- Status at audit time: open, not draft, clean, checks green

## Production Table Inventory

| Table | Status | Row count | Purpose | Runtime state |
| --- | ---: | ---: | --- | --- |
| `newsletter_emails` | exists | 0 | processed Gmail newsletter registry | schema-only |
| `newsletter_story_extractions` | exists | 0 | extracted newsletter story candidates | schema-only |
| `story_clusters` | exists | 0 | Story Cluster identity | schema-only |
| `story_cluster_members` | exists | 0 | RSS/newsletter cluster membership | schema-only |
| `signal_evolution` | exists | 0 | story/signal evolution records | schema-only |
| `cross_event_connections` | exists | 0 | explicit cross-event links | schema-only |
| `signal_posts` | exists | 68 | current Signal Card read model | operational |
| `pipeline_article_candidates` | exists | 223 | RSS pipeline candidates | operational |
| `published_slates` | exists | 2 | published snapshot envelope | operational and extended |
| `published_slate_items` | exists | 10 | published snapshot card rows | operational and extended |
| `mvp_measurement_events` | exists | 230 | public measurement events | operational |
| `briefing_snapshots` | absent | n/a | intentionally not created | not applicable |
| `briefing_snapshot_signals` | absent | n/a | intentionally not created | not applicable |

## Existing Table Extensions

`signal_posts` now has:

- `context_material text`
- `source_cluster_id uuid references story_clusters(id) on delete set null`
- `witm_draft_generated_by text`
- `witm_draft_generated_at timestamptz`
- `witm_draft_model text`

`published_slates` now has:

- `snapshot_status text not null default 'published'`
- `publish_batch_id text`
- `source_briefing_date date`
- `archived_from_live_set boolean`
- `public_surface_verified_at timestamptz`
- `rollback_snapshot jsonb not null default '{}'::jsonb`

`published_slate_items` now has:

- `source_cluster_id uuid references story_clusters(id) on delete set null`
- `tags_snapshot text[] not null default '{}'::text[]`
- `promoted_from_artifact_id text`
- `replacement_of_row_id_snapshot uuid references signal_posts(id) on delete set null`

Path A is implemented: `published_slates` and `published_slate_items` are reused as the historical published snapshot layer.

## New Table Shape

`newsletter_emails`:

- primary key: `id uuid`
- unique: `gmail_message_id`
- non-unique indexed: `gmail_thread_id`
- status: `extraction_status` check in `pending`, `extracted`, `failed`
- internal/private: `raw_content`
- timestamps: `received_at`, `processed_at`, `created_at`, `updated_at`

`newsletter_story_extractions`:

- primary key: `id uuid`
- parent FK: `newsletter_email_id -> newsletter_emails(id) on delete cascade`
- nullable FKs: `pipeline_candidate_id -> pipeline_article_candidates(id)`, `signal_post_id -> signal_posts(id)`
- category check: `Finance`, `Tech`, `Politics`
- confidence check: `0 <= extraction_confidence <= 1`
- timestamps: `extracted_at`, `created_at`, `updated_at`

`story_clusters`:

- primary key: `id uuid`
- required identity: `canonical_title`
- status: `cluster_status` check in `active`, `resolved`, `dismissed`
- count guard: `member_count >= 0`
- timestamps: `first_seen_at`, `last_updated_at`, `created_at`, `updated_at`

`story_cluster_members`:

- primary key: `id uuid`
- required FK: `cluster_id -> story_clusters(id) on delete cascade`
- source type: `rss` or `newsletter`
- exact-one reference check across `pipeline_candidate_id` and `newsletter_extraction_id`
- source-type/reference alignment check
- partial unique indexes prevent duplicate cluster membership by RSS candidate or newsletter extraction

`signal_evolution`:

- primary key: `id uuid`
- nullable references to Story Cluster, `signal_posts`, and `published_slate_items`
- requires at least one lineage reference
- `evolution_type` check includes `continued`, `escalated`, `deescalated`, `reframed`, `resolved`, `superseded`, `follow_up`, `correction`

`cross_event_connections`:

- primary key: `id uuid`
- nullable from/to references to Story Cluster, `signal_posts`, and `published_slate_items`
- requires at least one from-reference and at least one to-reference
- self-connection guards for same cluster, same signal post, and same snapshot signal
- `connection_type` check includes causal, policy/market, actor, sector, supply-chain, regulatory, geopolitical, contagion, thematic, contradiction, and follow-up relationships
- `is_public_candidate boolean not null default false`

## Constraints, Indexes, And RLS

Verified production constraints include:

- `signal_posts_public_source_url_check`
- `signal_posts_witm_draft_generated_by_check`
- `newsletter_emails_gmail_message_id_key`
- `newsletter_emails_extraction_status_check`
- `newsletter_story_extractions_category_check`
- `newsletter_story_extractions_confidence_check`
- `story_clusters_cluster_status_check`
- `story_clusters_member_count_check`
- `story_cluster_members_exactly_one_source_check`
- `story_cluster_members_source_type_reference_check`
- `signal_evolution_type_check`
- `signal_evolution_reference_check`
- `cross_event_connections_type_check`
- `cross_event_connections_from_reference_check`
- `cross_event_connections_to_reference_check`
- cross-event self-reference checks

Verified production indexes include:

- newsletter email indexes on message id, thread id, label, extraction status, received/processed timestamps, and `content_sha256`
- newsletter extraction indexes on parent email, category, source domain, source URL, pipeline candidate, signal post, and extraction timestamp
- story cluster indexes on briefing date, status, event type, first seen, and last updated
- story cluster member indexes on cluster, source type, source references, relevance score, added timestamp, plus partial unique membership indexes
- signal evolution indexes on cluster, signal references, snapshot-signal references, type, and observed timestamp
- cross-event indexes on from/to cluster, signal, snapshot signal, connection type, public candidate, and created timestamp
- published-slate extension indexes for snapshot status, publish batch, source briefing date, and public surface verification timestamp
- `signal_posts` indexes for source cluster and WITM draft provenance

RLS/privacy posture:

- RLS is enabled on the six new Phase 2 tables.
- New Phase 2 table policies are service-role only.
- No anon/authenticated policy exposes newsletter tables.
- `published_slates` and `published_slate_items` have service-role policies.
- `signal_posts` existing app-controlled public behavior remains route/predicate based; no public RLS broadening was added by PR #210.

Source URL guard status:

- total `signal_posts`: 68
- invalid `source_url` rows: 0
- invalid published/live `source_url` rows: 0

## Privacy And Public Leakage

Privacy constraints verified:

- `newsletter_emails.raw_content` exists and is internal-only.
- `signal_posts.context_material` exists and is internal-only.
- Public HTML checks for `/`, `/signals`, and `/dashboard` did not expose `raw_content` or `context_material`.
- Repo search found no public route selecting `signal_posts.context_material`.
- Repo search found no public route selecting `newsletter_emails.raw_content`.
- Repo search found no `signal_posts` public `select('*')`.
- Current public signal reads still require `is_live=true`, `editorial_status='published'`, and `published_at IS NOT NULL`.

## Runtime Implementation Status

Implemented as schema foundation:

- newsletter email tracking table
- newsletter story extraction table
- Story Cluster table
- cluster member table
- signal evolution table
- cross-event connection table
- `signal_posts` internal grounding/provenance fields
- published-slate historical snapshot extensions
- source URL guard constraint

Not implemented yet:

- Gmail API integration
- Gmail label scanning
- newsletter parsing
- LLM story extraction
- source matching
- clustering algorithm
- newsletter candidate promotion into `signal_posts`
- newsletter ingestion cron job
- admin UI for newsletter candidates
- public UI for historical browsing
- signal evolution rendering
- cross-event connection rendering
- data backfill for newsletter/story/cluster tables

## Current Data Population Status

The new Phase 2 tables are empty, which is expected because no ingestion, parsing, extraction, clustering, backfill, seed, or cron job has run.

Operational legacy/MVP tables are populated:

- `signal_posts`: 68 rows
- `pipeline_article_candidates`: 223 rows
- `published_slates`: 2 rows
- `published_slate_items`: 10 rows
- `mvp_measurement_events`: 230 rows

No unexpected rows were found in the six new Phase 2 tables.

## Public App Smoke

Production URL: `https://bootupnews.vercel.app`

| Route | Status | Observation |
| --- | ---: | --- |
| `/` | 200 | Shows May 6 public briefing content |
| `/signals` | 200 | Shows `Signals 3 signals` and May 6 signal titles |
| `/dashboard` | 200 | Returns expected shell/auth-gated behavior |

Visible current public signal titles:

- `Economic Letter Countdown: Most Read Topics from 2025`
- `In What Ways Has U.S. Trade with China Changed?`
- `The AI Investing Landscape: Insights from Venture Capital`

The current public slate mismatch from the earlier April 29 fully verified state is not a schema issue. It is a separate public-surface/live-row editorial state issue.

## Risks And Blockers

Remaining blockers before newsletter ingestion cron can run safely:

1. Define and implement Gmail connector/auth handling without exposing secrets.
2. Implement safe Gmail label scanning and idempotent message persistence into `newsletter_emails`.
3. Build extraction logic that writes `newsletter_story_extractions` without exposing raw newsletter content publicly.
4. Implement source URL/domain normalization and source matching.
5. Implement Story Cluster creation and membership logic.
6. Define promotion rules from newsletter/RSS candidates into `signal_posts`.
7. Add tests proving raw newsletter content and `context_material` never reach public routes.
8. Add dry-run and fail-closed apply modes for any future backfill or ingestion job.
9. Add cron execution only after explicit approval and production safety gates.
10. Resolve or explicitly accept the current public live-slate state separately from schema work.

Known schema caveats:

- `published_slates.public_surface_verified_at` is still null for existing rows.
- `published_slates.verification_checklist_json` remains `not_run` for existing published slate rows.
- The new Phase 2 tables are empty by design until runtime ingestion/clustering work ships.

## Next Recommended Tasks

1. Merge or update PR #213 so migration verification and public-surface caveats are recorded.
2. Resolve the May 6 versus April 29 public live-slate editorial decision in a separate remediation task.
3. Create a newsletter ingestion runtime PRD or PRD-61 implementation amendment before coding Gmail ingestion.
4. Build the ingestion path behind dry-run and service-role-only write gates.
5. Add privacy tests that fail if `raw_content` or `context_material` are selected by public routes.

## Explicit Non-Actions

This report did not:

- apply migrations
- mutate production data
- run Gmail ingestion
- run cron
- run `draft_only`
- run `dry_run`
- run pipeline write-mode
- publish or unpublish rows
- seed newsletter/story/cluster rows
- change source governance
- change ranking or WITM thresholds
- change public UI
- change admin UI
- change Vercel settings
- expose secrets
- correct the current public live-slate state
