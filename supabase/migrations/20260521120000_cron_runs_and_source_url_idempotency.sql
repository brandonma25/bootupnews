-- Task 1 (PRD-65 follow-up): cron consolidation + idempotency.
--
-- 1. New guard table `cron_runs` keyed on briefing_date. The ingestion handler
--    claims today's run with `INSERT … ON CONFLICT (briefing_date) DO NOTHING`
--    before scheduling `after(executePipelineWork)`. A second cronjob.org HTTP
--    fire (or a Vercel Hobby double-delivery during the rollback escape hatch)
--    sees the existing row and no-ops, so exactly one ingestion run executes
--    per briefing_date.
--
-- 2. Belt-and-suspenders: dedupe legacy garbage on 2026-05-17 (Axios font CDN
--    assets + Politico tracking redirector URLs the legacy writer captured as
--    "stories" — confirmed 7 second-rank rows to delete) so the new partial
--    unique index can build. The current code path filters source URLs via
--    isValidPublicSourceUrl(), so these were inserted before that filter
--    landed; no new rows of this shape are produced today.
--
-- 3. Add `UNIQUE (briefing_date, source_url) WHERE source_url IS NOT NULL` so
--    both writer paths (legacy `persistSignalPostCandidates` and the v2
--    `push-approved` bridge) can upsert idempotently against the same
--    briefing_date if invoked twice.
--
-- See plan: ~/.claude/plans/playful-tumbling-yeti.md (Task 1).

-- 1. cron_runs guard table
CREATE TABLE IF NOT EXISTS public.cron_runs (
  briefing_date  date PRIMARY KEY,
  cron_name      text NOT NULL DEFAULT 'fetch-editorial-inputs',
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  status         text NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running','ok','fail','timeout'))
);

ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;
-- Service-role-only access. Intentionally no policies: the only readers/writers
-- are server-side handlers using the service-role key, which bypasses RLS.

-- 2. Dedupe legacy spurious (briefing_date, source_url) duplicates so step 3
--    can build the unique index. Keeps the lowest-rank row per
--    (briefing_date, source_url); deletes the rest. Confirmed pre-flight: this
--    removes exactly 7 rows on 2026-05-17 (Axios webfont assets + Politico
--    redirector URLs misclassified as stories).
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY briefing_date, source_url
           ORDER BY rank ASC, created_at ASC
         ) AS rn
  FROM public.signal_posts
  WHERE source_url IS NOT NULL
)
DELETE FROM public.signal_posts s
USING ranked r
WHERE s.id = r.id AND r.rn > 1;

-- 3. Partial unique index for upsert. NULL source_urls (Notion-originated rows
--    without a URL) are excluded so they don't collide on the NULL singleton.
CREATE UNIQUE INDEX IF NOT EXISTS signal_posts_briefing_date_source_url_key
  ON public.signal_posts (briefing_date, source_url)
  WHERE source_url IS NOT NULL;
