# PRD-61 - Newsletter Ingestion, Story Clusters, and Historical Signal Snapshot Foundation

- PRD ID: `PRD-61`
- Canonical file: `docs/product/prd/prd-61-newsletter-ingestion-story-clusters-and-historical-signal-snapshot-foundation.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add the Phase 2 database foundation for newsletter ingestion tracking, Story Cluster persistence, historical Signal Card snapshots, Signal evolution, and cross-event connection mapping, then implement the approved Phase 1 runtime amendment for controlled Gmail newsletter ingestion into non-live editorial review candidates.

## User Problem

Bootup News is a curated 7-story briefing: Top 5 Core plus Next 2 Context, with explicit structural why-it-matters reasoning. The current schema can publish a final slate, but Phase 2 needs durable source evidence, Story Cluster lineage, published-card history, and relationship tracking so future workflows can explain how Signals change and connect over time.

## Corrected Scope

This PRD covers six database foundation areas plus one approved runtime amendment:

1. Newsletter ingestion tracking via `newsletter_emails`.
2. Newsletter story extraction storage via `newsletter_story_extractions`.
3. Story Cluster persistence via `story_clusters` and `story_cluster_members`.
4. Historical published Signal Card snapshot tracking by extending `published_slates` and `published_slate_items`.
5. Signal evolution tracking via `signal_evolution`.
6. Cross-event connection mapping via `cross_event_connections`.
7. Phase 1 runtime amendment: Gmail newsletter ingestion from the `[REDACTED_GMAIL_LABEL]` label into internal newsletter records, conservative Article extraction records, and non-live `signal_posts` Surface Placement candidates for BM review.

## Snapshot Schema Decision

Path A is used. The existing `published_slates` table already represents one published briefing snapshot, and `published_slate_items` already represents the ordered published Signal Card rows in that snapshot.

This PRD does not add duplicate `briefing_snapshots` or `briefing_snapshot_signals` tables. Instead, the migration adds missing Phase 2 fields to the existing published-slate tables:

- `published_slates`: `snapshot_status`, `publish_batch_id`, `source_briefing_date`, `archived_from_live_set`, `public_surface_verified_at`, `rollback_snapshot`.
- `published_slate_items`: `source_cluster_id`, `tags_snapshot`, `promoted_from_artifact_id`, plus a foreign-key constraint and index for the existing `replacement_of_row_id_snapshot`.

## Runtime Amendment - Phase 1 Newsletter Ingestion

This amendment supersedes the original runtime non-goals only for the controlled Phase 1 ingestion path below.

- Gmail label: `[REDACTED_GMAIL_LABEL]`.
- Known newsletter sources in that label: Morning Brew, Semafor Flagship, TLDR, AP Wire, and 1440.
- Backend integration uses the server-side Gmail API directly with OAuth2 refresh-token credentials supplied by environment variables.
- Gmail MCP, Chrome, and personal browser state are not backend dependencies.
- The controlled path must verify the exact Gmail label `[REDACTED_GMAIL_LABEL]` is visible to the same REST OAuth token before message search.
- If the label is missing, the runtime must fail closed with a sanitized label missing/account mismatch message before searching messages or writing records.
- Newsletters are discovery and context sources, not final editorial judgment.
- Newsletter-derived items are internal Article evidence candidates.
- BM remains the editorial layer and writes all WITM manually.
- The controlled runner and guarded cron route may store `newsletter_emails` rows, create `newsletter_story_extractions` rows, and promote usable extractions into non-live `signal_posts` review candidates.
- Candidate rows must use `editorial_status = 'needs_review'`, `is_live = false`, and `published_at = null`.
- Candidate rows must not auto-assign Core or Context placement, final slate rank, live state, or published state.
- `signal_posts.context_material` stores internal newsletter excerpt or framing for editorial grounding only.
- `newsletter_emails.raw_content` is internal-only raw source material.
- Dry-run mode is required and defaults on. Dry-run fetches and parses only in memory and performs no database writes.
- A dedicated dry-run report command must produce sanitized inventory, extraction, source URL quality, category distribution, dedup, and promotion-preview output without writing newsletter or `signal_posts` records.
- Promotion preview must reuse the same source URL, title/source dedup, and rank-availability rules as write-mode promotion while returning only read-only statuses: `eligible`, `invalid_source_url`, `duplicate_public_row`, or `no_available_candidate_rank`.
- Runtime writes are fail-closed. Missing Gmail credentials, disabled ingestion, dry-run mode, production guard failure, Gmail auth failure, Gmail rate limits, or database errors must not publish or create live rows.
- Production writes require all three runtime write gates: `NEWSLETTER_INGESTION_ENABLED=[REDACTED_ENV_VALUE]`, `NEWSLETTER_INGESTION_DRY_RUN=[REDACTED_ENV_VALUE]`, and `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=[REDACTED_ENV_VALUE]`.
- The Phase 1 parser is heuristic and conservative. It should prefer fewer higher-confidence newsletter Article candidates over noisy over-extraction.

## Non-Goals

- No Gmail MCP backend integration.
- No broad Gmail inbox search outside the `[REDACTED_GMAIL_LABEL]` label.
- No LLM extraction logic.
- No AI-generated WITM.
- No source matching implementation.
- No clustering algorithm.
- No population of `story_clusters`, `story_cluster_members`, `signal_evolution`, or `cross_event_connections` from the runtime path.
- No historical browsing UI.
- No public UI.
- No admin UI.
- No publish workflow change.
- No source governance change.
- No ranking threshold change.
- No WITM threshold change.
- No production migration execution.
- No production newsletter ingestion write-mode execution without explicit BM authorization.
- No production cron execution before BM authorization.

## Implementation Shape / System Impact

- Data Layer plus controlled backend runtime:
  - additive Supabase migration plus current `supabase/schema.sql` snapshot update
  - server-side Gmail REST client
  - internal MIME/newsletter parser
  - storage/extraction helpers
  - controlled runner
  - zero-write dry-run report script
  - read-only promotion preview helper
  - guarded cron route, disabled by default through environment gates
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
- The runtime path creates `signal_posts` rows only because the current admin queue uses that legacy Surface Placement plus Card copy table for review candidates. It does not create canonical Signal identity.
- The current `signal_posts.rank` constraint requires a review-order rank for candidate insertion. The newsletter runtime uses the next available rank for the briefing date as an admin queue compatibility value only; Core/Context and final slate placement remain unassigned.

## Acceptance Criteria

- Migration adds newsletter, Story Cluster, Signal evolution, and cross-event connection tables with constraints, indexes, triggers where needed, and service-role policies.
- Migration extends existing `published_slates` and `published_slate_items` instead of creating duplicate snapshot tables.
- Migration adds nullable internal WITM grounding metadata to `signal_posts`.
- `gmail_message_id` is unique and `gmail_thread_id` is not unique.
- `context_material` and `raw_content` are documented as internal-only and are not selected by public routes.
- Existing public homepage and `/signals` query shapes remain unchanged and still require live published rows through app-controlled service-role queries.
- Local validation passes or any failure is documented with exact scope.
- Gmail search query uses `label:[REDACTED_GMAIL_LABEL]` plus the configured since date.
- Gmail label preflight proves exact `[REDACTED_GMAIL_LABEL]` visibility before message search and fails closed on label missing/account mismatch.
- Gmail credentials come only from environment variables and are never logged.
- Dry-run report output excludes credentials, raw content, snippets, Gmail message IDs, and thread IDs.
- Dry-run report lists sanitized email inventory, extraction counts, sample headlines, source URL quality, category distribution, read-only dedup analysis, and eligible promotion candidate title/source URL pairs.
- Newsletter ingestion is idempotent by `newsletter_emails.gmail_message_id`; `gmail_thread_id` may repeat.
- Newsletter parsing covers representative Morning Brew, Semafor Flagship, TLDR, AP Wire, 1440, malformed, and empty fixtures.
- Promotion creates only non-live `needs_review` rows with WITM blank or human-required.
- Promotion links `newsletter_story_extractions.signal_post_id` to created or safe existing non-live rows.
- Promotion preview matches write-mode promotion skip/link/create rules without calling insert or update helpers.
- Runtime dry-run and disabled modes perform no writes.
- Public leakage tests prove `newsletter_emails.raw_content` and `signal_posts.context_material` are not selected or rendered publicly.

## Editorial-Cycle Validation Closeout

Controlled validation completed on `2026-05-11` in branch `fix/prd-61-newsletter-dry-run-validation`.

Dry-run validation:
- Gmail REST OAuth succeeded with the Web application client named `configured Gmail OAuth client`.
- The same token used by the controlled runner saw the exact Gmail label `[REDACTED_GMAIL_LABEL]`.
- Pre-counts were `newsletter_emails = 0`, `newsletter_story_extractions = 0`, and `signal_posts = 68`.
- Dry-run fetched `3` labeled emails, extracted `24` newsletter-derived Article candidates, identified `5` eligible non-live Surface Placement promotion candidates, and recorded `0` failed emails.
- Dry-run performed zero database writes, and post-counts remained unchanged.

BM-authorized write validation:
- The controlled newsletter runner was executed once with production write gates explicitly enabled.
- The run stored `3` `newsletter_emails` rows, stored `24` `newsletter_story_extractions` rows, and created `5` non-live `signal_posts` review candidates.
- Post-write counts were `newsletter_emails = 3`, `newsletter_story_extractions = 24`, and `signal_posts = 73`.
- Candidate rows remained non-live review candidates; no publish path, cron path, RSS path, or `draft_only` path was run.
- Public checks confirmed `/` HTTP `200` with the existing May 6 slate, `/signals` HTTP `200`, and latest public renderable Signal count `3`.
- Local credential and OAuth capture files were deleted after the run.

Cron enablement follow-up:
- BM approved production cron scheduling on `2026-05-12`.
- The scheduled path is `/api/cron/fetch-editorial-inputs`, which runs RSS first and then the PRD-61 newsletter ingestion path.
- Approved schedules are `15 10 * * *` and `45 11 * * *`, equivalent to 6:15 PM and 7:45 PM Taipei time.
- Production newsletter writes still require `NEWSLETTER_INGESTION_ENABLED=[REDACTED_ENV_VALUE]`, `NEWSLETTER_INGESTION_DRY_RUN=[REDACTED_ENV_VALUE]`, and `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=[REDACTED_ENV_VALUE]` in Vercel Production env.

Remaining operational follow-up:
- Remove temporary local OAuth redirect URI `http://127.0.0.1:53682/oauth2callback` from the `configured Gmail OAuth client` Web client after no further local token generation is needed.

## Evidence and Confidence

- Repo evidence used:
  - `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`
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
