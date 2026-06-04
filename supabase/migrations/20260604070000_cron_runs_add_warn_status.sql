-- Track 2 Priority 1 — add 'warn' to the cron_runs.status enum.
--
-- Background: the cron success boolean was previously `rss.success && newsletter.success`,
-- which marked every RSS-healthy run since 2026-05-18 as `fail` because the Gmail
-- credential expired. P1 changes success to `rss.success` only, with a new three-state
-- Pipeline Log status: ok | warn | fail.
--
-- The cron_runs CHECK constraint currently rejects 'warn' (only running/ok/fail/timeout).
-- This migration adds 'warn' so the finalize step can write a degraded-but-functional
-- run without throwing a constraint violation — the same failure class that hid the
-- depth-layer bug in PR #275 (column write rejected silently, observability went dark).
--
-- MIGRATION ORDERING IS LOAD-BEARING: this must land BEFORE any code writes 'warn' to
-- cron_runs (P1's own writes, and P6's health-check write). If P6 ships first, P6's
-- 'warn' write throws and the health-check Pipeline Log goes dark again.
--
-- Idempotent: drop-then-add the named constraint. Both statements must succeed
-- together; do not split this migration.

ALTER TABLE public.cron_runs DROP CONSTRAINT IF EXISTS cron_runs_status_check;
ALTER TABLE public.cron_runs ADD CONSTRAINT cron_runs_status_check
  CHECK (status = ANY (ARRAY['running','ok','warn','fail','timeout']));

COMMENT ON COLUMN public.cron_runs.status IS
  'running | ok | warn | fail | timeout. warn = degraded leg but run completed (Track 2 P1).';
