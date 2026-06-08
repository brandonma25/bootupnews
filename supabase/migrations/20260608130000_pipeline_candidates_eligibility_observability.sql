-- PRD-53 remediation (observability) — pipeline_article_candidates eligibility signals.
--
-- Persist the three selection-eligibility signals that decide whether a ranked
-- cluster reaches the public slate, so the core-eligibility collapse
-- (selectPublicBriefingItems places only tier=core_signal_eligible) is measurable
-- from pipeline_article_candidates alone — no log scraping, no re-running the
-- pipeline:
--   * event_importance  — groupedScores.event_importance (the PR3 placeholder
--                         blend; the `event_importance >= 52` core gate keys on it).
--   * event_type        — the inferred EventType (CORE_EVENT_TYPES membership is a
--                         core gate).
--   * eligibility_tier  — core_signal_eligible / context_signal_eligible /
--                         depth_only / exclude_from_public_candidates.
--
-- Additive + nullable. The writer (src/lib/pipeline/article-candidates.ts ->
-- updateArticleCandidateEligibilitySignals) degrades gracefully when these columns
-- are absent (the missing-column UPDATE error is swallowed), so applying this
-- migration is non-blocking and order-independent with the code deploy.
--
-- NOT auto-applied: per the manual-migration process, this is applied out-of-band.
ALTER TABLE public.pipeline_article_candidates
  ADD COLUMN IF NOT EXISTS event_importance numeric,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS eligibility_tier text;
