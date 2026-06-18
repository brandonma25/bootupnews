-- Defense-in-depth: revoke unused WRITE grants from anon/authenticated on the
-- public slate (signal_posts) and the cron run-lock (cron_runs).
--
-- Today RLS (enabled, deny-by-default, zero policies) is the SOLE gate, yet the
-- browser-shipped anon key holds INSERT/UPDATE/DELETE/TRUNCATE. One accidental
-- permissive policy or a single "disable RLS" would expose public write/TRUNCATE
-- of the live slate + run-lock. All legitimate writes use the service-role client
-- (which bypasses grants), so this is a no-op for the app.
--
-- SELECT is intentionally RETAINED (reads stay governed by RLS). Do NOT add
-- permissive policies here — that would re-expose row data; the correct posture
-- is service-role-only writes + RLS-deny reads.

revoke insert, update, delete, truncate, references, trigger
  on public.signal_posts from anon, authenticated;

revoke insert, update, delete, truncate, references, trigger
  on public.cron_runs from anon, authenticated;
