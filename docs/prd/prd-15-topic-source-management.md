# PRD-15 — Topic and Source Management

- PRD ID: `PRD-15`
- Canonical file: `docs/prd/prd-15-topic-source-management.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Let signed-in users define the topics and feed sources that shape their live briefing, while preserving a safe demo/public experience when persistence is unavailable.

## Problem
- Without a managed topic and source layer, ingestion has no user-specific structure and the dashboard cannot produce organized briefings from saved feeds.

## Scope
### Must Do
- Support topic creation with descriptions, colors, keywords, and exclude-keywords.
- Support source creation with topic assignment, duplicate protection, and default-topic fallback.
- Seed default topics and baseline profile data for new users.
- Provide a curated starter source catalog alongside custom RSS source entry.

### Must Not Do
- Depend on sign-in for the existence of demo content.
- Save duplicate PRD docs or unrelated roadmap content.
- Expand into broad CMS or admin tooling.

## System Behavior
- New users receive default topic seeds and a minimal profile bootstrap.
- Signed-in users can add topics, exclude noisy keywords, and connect RSS feeds to specific topics.
- When no explicit topic is provided for a new source, the system resolves or creates a safe default topic.

## Key Logic
- `src/app/topics/page.tsx` and `src/app/sources/page.tsx` expose the management UI.
- `src/app/actions.ts` handles topic creation, source creation, duplicate checks, and default-topic resolution.
- `src/lib/default-topics.ts` seeds the default topic set and bootstraps user defaults.
- `src/lib/source-catalog.ts` defines the curated recommended-source inventory.

## Risks / Limitations
- Source quality still depends on the feed URLs users attach.
- Live persistence requires Supabase availability and authenticated sessions.
- Manual-source recommendations without RSS support still require out-of-band setup.

## Success Criteria
- Signed-in users can create topics and sources without manual database work.
- New accounts receive enough structure to generate a live briefing.
- Topic/source management degrades safely when the app is running in demo or public mode.

## Done When
- The repo has one canonical PRD covering topic setup, source setup, and default-user bootstrap behavior.
