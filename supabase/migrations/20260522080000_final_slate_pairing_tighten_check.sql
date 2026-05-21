-- Issue #265 — bridge OVERWRITE leaves final_slate_rank NULL with tier set;
-- the original signal_posts_final_slate_placement_check accepted this half-pair
-- because Postgres CHECK constraints pass when the predicate evaluates to NULL
-- (only FALSE rejects), and `rank BETWEEN 1 AND 5` is NULL when rank IS NULL.
--
-- This migration does three things in order:
--   1. Repair every existing half-paired row by allocating a valid rank within
--      the row's chosen tier. Guarded against the 4 sacred is_live=true rows.
--   2. Drop the old placement check and replace it with one that EXPLICITLY
--      requires tier and rank to be both NULL or both NOT NULL — so a future
--      half-pair evaluates to FALSE (rejected) instead of NULL (accepted).
--   3. Sanity-check: a placeholder NOT VALID constraint check at the end would
--      no-op if the data is dirty; we instead verify zero half-pairs remain.
--
-- Application companion: src/app/api/editorial/push-approved/route.ts now
-- always includes final_slate_rank in the OVERWRITE payload via
-- resolveFinalSlateRankForOverwrite(), so the bug cannot reintroduce itself.

BEGIN;

-- ---------- Step 1: repair half-paired rows ----------
-- For each row where exactly one of (tier, rank) is non-null, allocate the
-- next available slot in the chosen tier (Core: 1-5, Context: 6-7). The
-- DO block uses a per-row lookup so concurrent repairs (none expected, but
-- defensive) don't collide.
DO $$
DECLARE
  half_paired_row record;
  next_rank int;
  tier_min int;
  tier_max int;
BEGIN
  FOR half_paired_row IN
    SELECT id, briefing_date, final_slate_tier, final_slate_rank, is_live
    FROM public.signal_posts
    WHERE (final_slate_tier IS NULL) <> (final_slate_rank IS NULL)
  LOOP
    -- Sacred-row guard. The 4 is_live=true rows must never be mutated by
    -- infrastructure work. If a live row is half-paired, abort the migration
    -- with a loud error so the operator investigates manually.
    IF half_paired_row.is_live THEN
      RAISE EXCEPTION 'Half-paired LIVE row detected (id=%); refusing automated repair. Investigate manually before re-running migration.', half_paired_row.id;
    END IF;

    -- Determine the rank range for this row's tier.
    IF half_paired_row.final_slate_tier = 'core' THEN
      tier_min := 1; tier_max := 5;
    ELSIF half_paired_row.final_slate_tier = 'context' THEN
      tier_min := 6; tier_max := 7;
    ELSE
      -- tier IS NULL and rank IS NOT NULL — the only sensible fix is to NULL
      -- both, since we have no editorial signal for which tier the rank
      -- should belong to.
      UPDATE public.signal_posts
      SET final_slate_rank = NULL
      WHERE id = half_paired_row.id;
      RAISE NOTICE 'Repaired row id=% by NULLing orphan final_slate_rank (no tier set).', half_paired_row.id;
      CONTINUE;
    END IF;

    -- Allocate the lowest unused rank in the tier for this briefing_date.
    SELECT MIN(candidate)
    INTO next_rank
    FROM generate_series(tier_min, tier_max) AS candidate
    WHERE candidate NOT IN (
      SELECT final_slate_rank
      FROM public.signal_posts
      WHERE briefing_date = half_paired_row.briefing_date
        AND final_slate_rank IS NOT NULL
    );

    IF next_rank IS NULL THEN
      RAISE EXCEPTION 'Cannot repair row id=%: tier % has no free rank slot on briefing_date %. Manual intervention required.',
        half_paired_row.id, half_paired_row.final_slate_tier, half_paired_row.briefing_date;
    END IF;

    UPDATE public.signal_posts
    SET final_slate_rank = next_rank
    WHERE id = half_paired_row.id
      AND is_live = false;  -- belt-and-suspenders even though we checked above

    RAISE NOTICE 'Repaired row id=% (tier=%, rank=%) on briefing_date=%.',
      half_paired_row.id, half_paired_row.final_slate_tier, next_rank, half_paired_row.briefing_date;
  END LOOP;
END
$$;

-- ---------- Step 2: tighten the CHECK ----------
ALTER TABLE public.signal_posts
  DROP CONSTRAINT IF EXISTS signal_posts_final_slate_placement_check;

ALTER TABLE public.signal_posts
  ADD CONSTRAINT signal_posts_final_slate_placement_check
  CHECK (
    -- Pairing: both NULL or both NOT NULL. Coerce NULL→FALSE here so the
    -- whole predicate cannot evaluate to NULL on a half-pair the way the
    -- original predicate did (Postgres CHECK passes NULL).
    (
      (final_slate_tier IS NULL AND final_slate_rank IS NULL)
      OR (final_slate_tier IS NOT NULL AND final_slate_rank IS NOT NULL)
    )
    AND (
      final_slate_tier IS NULL
      OR (final_slate_tier = 'core' AND final_slate_rank BETWEEN 1 AND 5)
      OR (final_slate_tier = 'context' AND final_slate_rank BETWEEN 6 AND 7)
    )
  );

-- ---------- Step 3: verify ----------
DO $$
DECLARE
  bad_count int;
BEGIN
  SELECT count(*) INTO bad_count
  FROM public.signal_posts
  WHERE (final_slate_tier IS NULL) <> (final_slate_rank IS NULL);
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Post-migration sanity failed: % half-paired row(s) remain.', bad_count;
  END IF;
END
$$;

COMMIT;
