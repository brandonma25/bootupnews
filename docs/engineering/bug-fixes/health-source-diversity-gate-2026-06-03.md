# Health Check Source-Diversity Gate — Bug-Fix Record

## Summary
- **Problem addressed:** `/api/cron/health` only failed on `row_count < 7` and warned on a specific manifest-named source missing. A monoculture day (7 rows all from one source — e.g. an upstream outage with one feed dominant) passed the canary silently.
- **Root cause:** Diversity wasn't a first-class gate.
- **Affected object level:** Cron observability surface.
- **Related issue:** #299. Track 2 P6.

## Fix
New tier in the gate ladder of `src/app/api/cron/health/route.ts`:
- Constant `EXPECTED_MIN_DISTINCT_SOURCES = 5`.
- After row-count check, before missing-sources check: if `row_count >= 7` AND `distinctSourceCount < 5` → `status='fail'` with `message: "monoculture day"` and HTTP 500 (pageable via cron-job.org notifyOnFailure).
- Existing tiers unchanged.

Response payload gains `expected_min_distinct_sources` and `distinct_source_count` so cron-job.org dashboards expose the new floor.

## Tests
- New: "returns status=fail HTTP 500 when row count >= 7 but distinct sources < 5 (monoculture day)" — pins the new tier with exact assertions on `row_count`, `distinct_source_count`, `expected_min_distinct_sources`, and the message regex.
- Updated: existing "warn" and "forgiving source match" tests use 5+ distinct sources in their fixtures so they exercise the intended paths without colliding with the new diversity gate.

Full suite: 843/843 across 103 files. `npm run build` green.

## Operator follow-up (post-deploy)
- BM-side: confirm cron-job.org `bootup-health-check-1215-utc` is enabled and pointed at `/api/cron/health`. (Per Track 2 P5: repo declares 2 jobs; cron-job.org has 3 — reconcile with `npm run cron:sync:prune`.)
- After deploy: a normal day yields `status=ok`. A monoculture day yields `status=fail` + HTTP 500 → email alert from cron-job.org.

## Not addressed by this fix
- Reconciliation of the 3rd stale cron-job.org job (BM action).
- P1/P2/P3/P4/P5 Track 2 priorities (separate PRs).
