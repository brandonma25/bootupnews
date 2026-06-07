-- PRD-53 remediation — pipeline_article_candidates observability columns.
--
-- Persist source_class + category alongside each candidate so the editorial
-- review pool's composition (institutional vs. news; per-category mix) is
-- queryable. Supports the surfacing-pool widening (this PR) and the later
-- source_class diversity guard (PR2).
--
-- Additive + nullable. The writer (src/lib/pipeline/article-candidates.ts)
-- degrades gracefully when these columns are absent (it retries the insert with
-- the columns stripped), so applying this migration is non-blocking and
-- order-independent with the code deploy.
ALTER TABLE public.pipeline_article_candidates
  ADD COLUMN IF NOT EXISTS source_class text,
  ADD COLUMN IF NOT EXISTS category text;
