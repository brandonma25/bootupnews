-- PR #316 — decoupled article-body extraction.
--
-- The four columns CRON-1 (/api/cron/extract-article-bodies) writes and CRON-2
-- (/api/cron/restage-with-bodies) reads on pipeline_article_candidates:
--   extracted_body_text     — the fetched/extracted article body
--   extracted_text_length   — its character length (loadRecentExtractedBodies filters > 0)
--   extraction_status       — 'success' | 'failed' | 'timeout' (NULL = not yet attempted)
--   extraction_attempted_at — when the fetch was attempted
--
-- Additive, idempotent, all nullable (default NULL) so the pipeline degrades to a
-- no-op both before and after this lands.
--
-- NOTE: applied to prod (fwkqjeumreaznfhnlzev) on 2026-06-08 via the Supabase
-- migration tool, recorded there as version 20260608140247. This file's
-- timestamp is the repo-sequential one; the version-stamp difference matches the
-- project's existing migration-history pattern (names align, stamps differ).
alter table public.pipeline_article_candidates
  add column if not exists extracted_body_text     text,
  add column if not exists extracted_text_length   integer,
  add column if not exists extraction_status       text,
  add column if not exists extraction_attempted_at timestamptz;
