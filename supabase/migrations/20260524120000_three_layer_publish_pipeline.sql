-- Three-layer publish pipeline (#274 Part A schema).
--
-- Background:
--   Today only why_it_matters (The Signal) has a full publish pipeline:
--     ai_why_it_matters, edited_why_it_matters, edited_why_it_matters_payload,
--     published_why_it_matters, published_why_it_matters_payload.
--   what_led_to_it (Before This) and what_it_connects_to (The Ripple) only
--   have ai_* + human_* (raw inputs from the Notion bridge). There is no
--   edited_* the editor reviews into, and no published_* the publish gate
--   writes — which is why the public foldback's "What led to this" section
--   shows the empty-state string even when ai_what_led_to_it is populated.
--
-- This migration:
--   1. Adds the missing edited_* + edited_*_payload + published_* +
--      published_*_payload columns for both what_led_to_it and
--      what_it_connects_to. Type/nullability/default mirrors the existing
--      edited_why_it_matters family (text NULL no default; jsonb NULL no
--      default).
--   2. KEEPS human_what_led_to_it and human_what_it_connects_to in place.
--      Those columns are written by the Notion bridge (push-approved/route.ts:
--      ~416-418). Dropping them would break the bridge. Per #274 Step 0.3
--      decision-tree (option b): human_* stays as raw input that promotes
--      into edited_* through the editorial composer UI.
--
-- Validation columns (why_it_matters_validation_*) are NOT replicated here.
-- Those columns gate the WITM publish path; the other two layers are not
-- subject to the same automated quality gate (the WITM gate is a separate
-- product concern — see issue #270).

ALTER TABLE public.signal_posts
  ADD COLUMN IF NOT EXISTS edited_what_led_to_it text NULL,
  ADD COLUMN IF NOT EXISTS edited_what_led_to_it_payload jsonb NULL,
  ADD COLUMN IF NOT EXISTS published_what_led_to_it text NULL,
  ADD COLUMN IF NOT EXISTS published_what_led_to_it_payload jsonb NULL,
  ADD COLUMN IF NOT EXISTS edited_what_it_connects_to text NULL,
  ADD COLUMN IF NOT EXISTS edited_what_it_connects_to_payload jsonb NULL,
  ADD COLUMN IF NOT EXISTS published_what_it_connects_to text NULL,
  ADD COLUMN IF NOT EXISTS published_what_it_connects_to_payload jsonb NULL;

COMMENT ON COLUMN public.signal_posts.edited_what_led_to_it IS
  'Editor-reviewed Before This layer (#274). Promoted to published_* by the publish gate.';
COMMENT ON COLUMN public.signal_posts.edited_what_led_to_it_payload IS
  'Structured editorial layout for Before This — same shape as edited_why_it_matters_payload.';
COMMENT ON COLUMN public.signal_posts.published_what_led_to_it IS
  'Public Before This text. Written by the publish gate from edited_*. Never from ai_* directly.';
COMMENT ON COLUMN public.signal_posts.published_what_led_to_it_payload IS
  'Public Before This structured layout. Written by the publish gate from edited_*_payload.';
COMMENT ON COLUMN public.signal_posts.edited_what_it_connects_to IS
  'Editor-reviewed The Ripple layer (#274). Promoted to published_* by the publish gate.';
COMMENT ON COLUMN public.signal_posts.edited_what_it_connects_to_payload IS
  'Structured editorial layout for The Ripple — same shape as edited_why_it_matters_payload.';
COMMENT ON COLUMN public.signal_posts.published_what_it_connects_to IS
  'Public The Ripple text. Written by the publish gate from edited_*. Never from ai_* directly.';
COMMENT ON COLUMN public.signal_posts.published_what_it_connects_to_payload IS
  'Public The Ripple structured layout. Written by the publish gate from edited_*_payload.';
