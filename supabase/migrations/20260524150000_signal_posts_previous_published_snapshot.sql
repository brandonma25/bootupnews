-- Add a single-prior-version snapshot column for the re-publish-live-card
-- flow (issue #280). When an editor re-publishes an already-live card, the
-- publish gate copies the current `published_*` text + WITM payload into
-- this column BEFORE overwriting them, then overwrites in place.
--
-- Why one column (not a history table):
--   - Scope of #280 is "preserve last good copy so corrections aren't
--     destroyed", not full versioning. Future corrections-log feature can
--     migrate this single jsonb into an array or break it out into a
--     dedicated `signal_post_publish_history` table without losing data.
--   - jsonb keeps the snapshot self-contained so future schema drift on
--     `published_*` columns doesn't strand the prior version.
--
-- Snapshot shape (documented but not enforced — write path validates):
--   {
--     "why_it_matters":            text | null,
--     "what_led_to_it":            text | null,
--     "what_it_connects_to":       text | null,
--     "why_it_matters_payload":    jsonb | null,
--     "what_led_to_it_payload":    jsonb | null,
--     "what_it_connects_to_payload": jsonb | null,
--     "snapshotted_at":            iso8601 string
--   }
--
-- One prior version only — each re-publish overwrites this column.

ALTER TABLE public.signal_posts
  ADD COLUMN IF NOT EXISTS previous_published_snapshot jsonb NULL;

COMMENT ON COLUMN public.signal_posts.previous_published_snapshot IS
  'Single-prior-version snapshot of published_* text + WITM payload, written by the publish gate before re-publish overwrites them. Issue #280.';
