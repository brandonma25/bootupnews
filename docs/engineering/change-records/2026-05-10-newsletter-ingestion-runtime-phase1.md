# Newsletter Ingestion Runtime Phase 1

Effective change type: feature

Source of truth: `PRD-61` in `docs/product/prd/prd-61-newsletter-ingestion-story-clusters-and-historical-signal-snapshot-foundation.md`

Branch: `feature/prd-61-newsletter-ingestion-runtime-phase1`

## Runtime Scope

This change implements the Phase 1 PRD-61 runtime amendment: controlled Gmail newsletter ingestion from the `boot-up-benchmark` label into internal newsletter storage, conservative Article extraction records, and non-live `signal_posts` review candidates.

Object levels:
- Article: newsletter-derived story extraction records.
- Surface Placement: non-live `signal_posts` candidates for the existing admin queue.

## Gmail Integration Approach

- Uses the Gmail REST API directly from server-side code.
- Uses OAuth2 refresh-token flow from environment variables only:
  - `GMAIL_CLIENT_ID`
  - `GMAIL_CLIENT_SECRET`
  - `GMAIL_REFRESH_TOKEN`
  - `GMAIL_NEWSLETTER_LABEL`
- Does not use Gmail MCP, Chrome, or browser state as a backend dependency.
- Logs only safe metadata such as counts, message ids, route, and run status. It does not log raw email bodies or OAuth values.

## Data Flow

1. Controlled runner resolves env gates and since-date.
2. Gmail search uses `label:boot-up-benchmark` plus the configured since date.
3. Existing `gmail_message_id` values are skipped.
4. New messages are stored in `newsletter_emails` with `extraction_status = 'pending'`.
5. Raw Gmail payloads are decoded internally into safe text content for `newsletter_emails.raw_content`.
6. Heuristic parsers extract newsletter Article candidates into `newsletter_story_extractions`.
7. Usable extractions with valid public source URLs can be promoted to `signal_posts`.
8. Promoted rows stay non-live: `editorial_status = 'needs_review'`, `is_live = false`, `published_at = null`.
9. `context_material` stores internal newsletter framing for BM review.

## Privacy Constraints

- `newsletter_emails.raw_content` is internal-only.
- `signal_posts.context_material` is internal-only.
- Public routes must continue explicit column lists and must not select either field.
- Public rows must still require `is_live = true`, `editorial_status = 'published'`, and non-null `published_at`.
- PRs, docs, and logs must not include private newsletter bodies or Gmail credentials.

## Cron Gating

The cron route exists at `/api/cron/newsletter-ingestion`, but no Vercel production schedule is added in this PR.

Runtime write gates:
- `NEWSLETTER_INGESTION_ENABLED=true`
- `NEWSLETTER_INGESTION_DRY_RUN=false`
- Non-production target, or production with `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=true`
- `CRON_SECRET` authorization for route access

Disabled mode returns before Gmail API calls. Dry-run mode fetches and parses in memory only.

## Dry-Run Behavior

Dry-run mode:
- fetches Gmail message metadata and raw messages when Gmail env is configured
- parses candidate stories in memory
- writes no `newsletter_emails`
- writes no `newsletter_story_extractions`
- writes no `signal_posts`
- publishes nothing

## Tests

Coverage added for:
- env defaults and production write guards
- Gmail query construction, OAuth refresh flow, and rate-limit classification
- MIME decoding and link preservation
- Morning Brew, Semafor, TLDR, AP Wire, 1440, malformed, and empty parser fixtures
- newsletter email idempotency by `gmail_message_id`
- repeated `gmail_thread_id`
- extraction status transitions
- non-live candidate promotion
- duplicate source URL linking
- invalid source URL skip
- runner disabled/dry-run/write/production guard behavior
- cron authorization
- public leakage guardrails

## Non-Goals

- No LLM extraction.
- No AI WITM generation.
- No Story Cluster algorithm.
- No `signal_evolution` behavior.
- No `cross_event_connections` behavior.
- No public UI changes.
- No admin UI changes.
- No publish workflow changes.
- No RSS pipeline changes.
- No source manifest changes.
- No ranking or WITM threshold changes.
- No production write-mode run.
- No production cron run.

## Rollout Plan

1. Merge the PR after local and PR validation pass.
2. Configure Gmail OAuth env only in the intended deployment environment.
3. Run local or preview dry-run with `NEWSLETTER_INGESTION_DRY_RUN=true`.
4. Review sanitized run summary counts.
5. Enable non-production controlled writes first.
6. After BM approval, add or enable a production Vercel cron schedule for 6 AM Taipei daily (`22:00 UTC`) and set production write gates.
7. Confirm candidate rows remain `needs_review`, non-live, and unpublished before BM writes WITM manually.

## Rollback / Disable Plan

Immediate disable:
- Set `NEWSLETTER_INGESTION_ENABLED=false`, or
- Set `NEWSLETTER_INGESTION_DRY_RUN=true`, or
- Remove/unset `ALLOW_PRODUCTION_NEWSLETTER_INGESTION` in production.

Route-level disable:
- Remove or rotate `CRON_SECRET` if the endpoint must reject all scheduled calls.

Data cleanup:
- Do not delete newsletter rows automatically.
- If a controlled run creates unwanted candidates, remove or mark those non-live `signal_posts` rows through an explicit follow-up with row ids and BM approval.
