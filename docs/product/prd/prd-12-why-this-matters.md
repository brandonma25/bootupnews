# PRD-12 — Why This Matters

## Objective
- Generate concise, causal `why_it_matters` explanations that stay specific to the event.
- Keep output resilient under low-data conditions without falling back to generic filler.
- Prevent repeated phrasing, weak subject anchoring, and overstated signal labels.

## Scope
- Structured event-intelligence fields for subject, event type, impact, affected markets, time horizon, and signal strength.
- Deterministic and AI-assisted reasoning paths that follow event -> mechanism -> impact structure.
- Entity validation, event-specific routing, and safer non-signal handling.
- Batch-level anti-repetition and text cleanup.
- Signal-label calibration for thin, weak, and stronger evidence.

## Explicit Exclusions
- Dashboard redesign.
- Ingestion pipeline redesign outside the data already consumed by this feature.
- Schema migration.
- PRD 13 filtering work beyond safely consuming filter metadata.

## Acceptance Criteria
- Explanations reference a valid company, institution, market, country, or safe event phrase.
- Different event types produce meaningfully different reasoning patterns.
- Low-data stories degrade gracefully with constrained early-signal language.
- Duplicate or near-duplicate phrasing is reduced across the same batch.
- Signal labels reflect evidence quality rather than topic alone.

## Implementation Summary
- Added structured intelligence fields to support reasoning instead of summary-style filler.
- Tightened entity selection so pronouns, malformed fragments, and weak generic tokens do not become subjects.
- Added event-specific routing for funding, IPO, governance, policy, legal, macro, defense, product, and non-signal content.
- Improved explanation cleanup to remove repeated clauses and malformed causal phrasing.
- Recalibrated signal scoring so thin or weak single-source stories are not overstated.

## Risks
- AI-configured environments can still vary in phrasing quality and require preview verification.
- Noisy headlines can still force conservative fallback phrasing for some stories.
- Signal thresholds may still need tuning as live feed mix changes.

## Testing Requirements
- Add regression coverage for anchor extraction, event routing, low-confidence fallback behavior, repetition control, and signal calibration.
- Run local validation with install, lint, tests, and build.
- Validate explanation quality in preview for multiple real events before merge when environment-backed generation is in play.

## Related operational history

- 2026-05-22 — Legacy template generator relabel (Path-A Task 3, PR [#262](https://github.com/brandonma25/bootupnews/pull/262)). Live Supabase inspection at the start of Path A found that the heuristic template generator built by this PRD is producing **~100%** of production `signal_posts` rows: real source URLs, but `ai_why_it_matters` is template-built (with the "(Signal: Weak)" suffix and identical phrasing across unrelated stories), `ai_what_led_to_it` / `ai_what_it_connects_to` are NULL, and all `witm_draft_*` provenance columns are NULL — leaving heuristic-template rows indistinguishable from any future v2 LLM bridge rows (Task 4). Trace: cron `GET /api/cron/fetch-editorial-inputs` → `runDailyNewsCron` (`src/lib/cron/fetch-news.ts`) → `generateDailyBriefing` → `summarizeArticles` → `generateWhyThisMattersHeuristically` (`src/lib/why-it-matters.ts:439`, ultimately `buildEventTypeSpecificWhyThisMatters:561` returning ``${concreteChange}, which matters because ${consequence}.``) → `briefing.items[].whyItMatters` → `persistSignalPostsForBriefing` → `persistSignalPostCandidates` (`src/lib/signals-editorial.ts:1316`) upsert to `signal_posts`. Disposition (Option B from the brief): keep the path as the explicit fallback, but stamp every row it writes with `witm_draft_generated_by='deterministic_template'` + `witm_draft_model='heuristic_template_v1'` + `witm_draft_generated_at=now` + `editorial_content_source='ai'`. The pre-existing `(briefing_date, source_url)` upsert with `ignoreDuplicates: true` (PR #260) already prevents legacy from overwriting any existing row; Task 4's bridge PR will need to invert that for `push-approved` so v2 LLM rows can overwrite stale `deterministic_template` rows when BM approves a real draft for the same article URL. `why_it_matters_validation_status` remains the auto-default `'passed'` here; Task 6 lands the enum change that lets the writer record `'not_run'`.
