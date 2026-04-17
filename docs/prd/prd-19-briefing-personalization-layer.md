# PRD-19 — Briefing Personalization Layer

- PRD ID: `PRD-19`
- Canonical file: `docs/prd/prd-19-briefing-personalization-layer.md`
- Feature system row: update `docs/product/feature-system.csv` with matching `prd_id` and `prd_file`

## Objective
- Let users tune the briefing around tracked topics and entities without letting weak personalization overwhelm the core ranking quality floor.

## Problem
- A generic ranking can feel impersonal, but a naive personalization layer can flood the briefing with low-quality items that merely match user interests.

## Scope
### Must Do
- Store browser-local personalization preferences for topics, entities, landing page, and reading density.
- Build personalization matches and bounded ranking bonuses on top of existing quality signals.
- Expose settings UI and dashboard explanations for how personalization changes ranking.

### Must Not Do
- Replace the confirmed-event quality threshold with preference-only ranking.
- Require server persistence for basic personalization behavior.
- Expand into full recommendation-system infrastructure.

## System Behavior
- Users can track topics and entities from settings.
- Matching strong events receive a bounded ranking bonus, while weak or early-signal items stay constrained.
- Dashboard and homepage surfaces explain tracked priorities and resulting personalization effects.

## Key Logic
- `src/lib/personalization.ts` manages preference storage, parsing, match construction, and re-ranking.
- `src/components/settings-preferences.tsx` provides the preference UI.
- Dashboard and homepage rendering consume the resulting personalization summaries and matches.

## Risks / Limitations
- Current persistence is browser-local rather than fully account-synced.
- Personalization depends on extracted entities and topic labels being accurate enough to match.
- Strong personalization cannot fix poor underlying ingestion or ranking quality.

## Success Criteria
- Users can save personalization preferences locally and see ranking adjustments that respect quality constraints.
- The dashboard clearly communicates how personalization affects ordering.
- The repo has one canonical PRD for this implemented personalization layer.

## Done When
- One canonical PRD exists for user-tunable, quality-bounded personalization behavior.
