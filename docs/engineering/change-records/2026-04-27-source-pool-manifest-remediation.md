# Source Pool Manifest Remediation

Date: 2026-04-27

## Change Type

Remediation / alignment.

Canonical PRD required: No.

This change is governed by existing source-governance scope in PRD-42 and PRD-54. It does not add a new source-management product surface, schema, ranking model, selection eligibility model, homepage snapshot table, or editorial card-selection layer.

## Source of Truth

- Product Position: Boot Up is a curated briefing, not a feed.
- Product Position: Top 5 Core Signals must represent highest structural importance.
- Product Position: no trending-only content, no false freshness, and every Signal must answer why it matters structurally.
- PRD-42 Source governance and defaults.
- PRD-54 Public source manifest.
- PRD-13 Signal filtering layer.
- PRD-9 Importance-first ranking.
- PRD-35 Why-it-matters quality framework.
- PRD-53 Signals admin editorial layer.
- PR #126 controlled pipeline safety modes.
- PR #127 signal-selection eligibility remediation.
- Accepted Source-Pool Remediation Diagnosis.

## Object Level

- Article: expands the governed public source plan that can contribute ingested Articles.
- Story Cluster and Signal: diagnostic reporting only; ranking and structural eligibility rules are unchanged.
- Surface Placement plus Card copy: `signal_posts` remains a read model and is not modified by dry runs.

## Diagnosis Summary

The controlled pipeline path was narrower than the governed public source plan. `runControlledPipeline()` called `generateDailyBriefing(undefined, undefined, ...)`, so it fell back to the four-source MVP default list: The Verge, Ars Technica, TechCrunch, and Financial Times.

The PRD-54 public manifest already contained a broader source plan, but controlled dry runs did not use it. That made the latest dry run source-scarce even though more governed sources were configured.

## Implemented Changes

- Controlled pipeline `dry_run` and guarded `draft_only` now resolve `public.home` through the PRD-54 public source manifest.
- The controlled runner passes `suppliedByManifest: true` and keeps `persistPipelineCandidates: false`.
- The disabled cron generation path also resolves the PRD-54 public source manifest so future public generation does not silently use obsolete MVP defaults when cron is explicitly re-enabled.
- Politico Politics, Politico Congress, and Politico Defense were added to the public manifest as tier2 secondary-authoritative sources.
- Source-policy tier2 metadata was added for:
  - `technologyreview.com`
  - `bbc.com`
  - `bbc.co.uk`
  - `foreignaffairs.com`
  - `politico.com`
- Controlled dry-run artifacts now include source-plan diagnostics, active source IDs/names, source distribution, category distribution, source-plan warnings, manifest coverage warnings, source-scarcity status, and Core/Context/Depth counts.

## Source Role Decisions

| Source | Role | Tier | Public eligible | Decision |
| --- | --- | --- | --- | --- |
| Financial Times | primary_authoritative | tier1 | yes | Retained |
| Reuters Business | primary_authoritative | tier1 | yes | Retained |
| The Verge | secondary_authoritative | tier2 | yes | Retained |
| Ars Technica | secondary_authoritative | tier2 | yes | Retained |
| MIT Technology Review | secondary_authoritative | tier2 | yes | Retained and tiered |
| TechCrunch | secondary_authoritative | tier2 | yes | Retained |
| BBC World News | secondary_authoritative | tier2 | yes | Retained and tiered |
| Foreign Affairs | secondary_authoritative | tier2 | yes | Retained and tiered |
| Politico Politics News | secondary_authoritative | tier2 | yes | Promoted to manifest |
| Politico Congress | secondary_authoritative | tier2 | yes | Promoted to manifest |
| Politico Defense | secondary_authoritative | tier2 | yes | Promoted to manifest |
| TLDR feeds | aggregator_summary / discovery-reference only | not public authority | no | Not promoted |
| AP Politics | primary_authoritative if fixed later | blocked | no | Not promoted; feed validation failed |
| Congress.gov API | primary_authoritative if adapter/key exists later | blocked | no | Not promoted; requires API/env/adapter work |

## Ars Technica Tier Decision

The source-policy layer continues to classify Ars Technica as `tier2`. The donor no-argument registry still carries `openclaw-ars-technica` as `tier_1`. This remediation does not silently change either behavior because that would be a source-authority policy decision beyond the minimum source-pool alignment. The inconsistency is now explicitly covered by source-policy tests and should be resolved in a future source-authority calibration pass.

## TLDR Decision

TLDR remains paused and outside public source attribution. Its intended role remains discovery/reference/corroboration only. TLDR summaries must not become canonical article content, public source attribution, or Core/Context authority.

## Safety Invariants

- No ranking weight changes.
- No signal-selection eligibility changes.
- No editorial card-selection implementation.
- No homepage snapshot table implementation.
- No schema migrations.
- No production data writes.
- No cron re-enable.
- No `draft_only` execution in this change.
- No change to cleaned April 26 public content.

## Validation Plan

Required local validation:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run governance:coverage`
- `npm run governance:audit`
- `npm run governance:hotspots`
- `python3 scripts/validate-feature-system-csv.py`
- `python3 scripts/release-governance-gate.py`
- Chromium E2E
- WebKit E2E

Post-implementation controlled validation must run only `PIPELINE_RUN_MODE=dry_run` with `persistPipelineCandidates: false`. `draft_only` remains paused until explicitly approved.

## Validation Results

- `npm install`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 70 files / 449 tests.
- `npm run build`: passed.
- `npm run governance:coverage`: passed.
- `npm run governance:audit`: passed.
- `npm run governance:hotspots`: passed.
- `python3 scripts/validate-feature-system-csv.py`: passed, with existing slug warnings unrelated to this branch.
- `python3 scripts/release-governance-gate.py`: passed.
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --project=chromium --workers=1`: passed, 33 tests.
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --project=webkit --workers=1`: passed, 33 tests.

Initial parallel Playwright runs showed local timeout failures under four workers. The same affected specs passed when rerun serially, so the stable local E2E evidence for this branch is the serial Chromium/WebKit pass.

## Controlled Dry Run Result

Command:

```bash
PIPELINE_RUN_MODE=dry_run \
PIPELINE_TARGET_ENV=production \
PIPELINE_CRON_DISABLED_CONFIRMED=true \
BRIEFING_DATE_OVERRIDE=2026-04-27 \
PIPELINE_TEST_RUN_ID=source-pool-remediation-dryrun-20260427 \
npm run pipeline:controlled-test
```

Environment flags:

- `PIPELINE_RUN_MODE=dry_run`
- `PIPELINE_TARGET_ENV=production`
- `PIPELINE_CRON_DISABLED_CONFIRMED=true`
- `BRIEFING_DATE_OVERRIDE=2026-04-27`
- `PIPELINE_TEST_RUN_ID=source-pool-remediation-dryrun-20260427`
- `ALLOW_PRODUCTION_PIPELINE_TEST` was not set.

Result:

- Source plan: `public_manifest`.
- Manifest source count: 11.
- Active source count: 11.
- Ingested Articles: 60.
- PRD-13 filtering: 16 pass / 36 suppress / 8 reject.
- Story Clusters evaluated: 15.
- Candidate count: 15.
- Core eligible count: 0.
- Context count: 0.
- Depth count: 6.
- Excluded candidate count: 9.
- `candidate_pool_insufficient`: true.
- `sourceScarcityLikely`: false.
- Candidate category distribution: 1 Finance / 10 Tech / 4 Politics.
- Source distribution: 6 each from The Verge, Ars Technica, MIT Technology Review, TechCrunch, Financial Times, BBC World News, Foreign Affairs, Politico Politics News, Politico Congress, and Politico Defense.
- Reuters Business resolved as active but returned 0 items during this run due to a feed fetch failure.
- Why-it-matters validation among Depth rows: 1 passed / 5 require human rewrite.
- `insertedCount`: 0.
- `insertedPostIds`: empty.
- Local artifact path: `.pipeline-runs/controlled-pipeline-dry_run-source-pool-remediation-dryrun-20260427-final-2026-04-27T16-40-15-733Z.json`.

Write verification:

- The dry run logged `Pipeline article candidate persistence skipped by run mode`.
- The report persistence result was `null`.
- No `signal_posts` rows were inserted by the controlled runner.
- No `pipeline_article_candidates` writes were attempted because `persistPipelineCandidates` was false.
- Live Supabase count snapshots were not available in this worktree because production Supabase service-role credentials were not present locally. No credentials were pulled or written to disk.

Public surface verification:

- Production homepage and `/signals` returned HTTP 200 before and after the dry run.
- The homepage continued to show `Last updated Sunday, April 26 - Today's briefing is being prepared.`
- `/signals` continued to render the published Signals surface.
- No placeholder, sample slot, fallback rail, or malformed public why-it-matters markers were found in the checked production HTML.
- Vercel cron listing reported `/api/cron/fetch-news` as disabled.

## Dry-Run Success Criteria

- Source plan is `public_manifest`.
- Active source count increases from 4 to the manifest-backed source set.
- Politics, world, and economics coverage are present in source diagnostics.
- Weak product, entertainment, and low-specificity items still do not fill Core slots.
- `candidate_pool_insufficient` may still be true if there are not enough structurally eligible stories.
- Why-it-matters validation remains separate from selection eligibility.
- `signal_posts` and `pipeline_article_candidates` counts remain unchanged.
- Public April 26 surfaces remain unchanged.

## Risks And Follow-Up

- Politico can add politics volume, but PRD-13 and PR #127 must continue suppressing horse-race, says-frame, and low-specificity content.
- BBC World and Foreign Affairs can broaden world coverage but may contribute broad or analytical items that are better suited to Context/Depth than Core.
- The Ars Technica tier mismatch should be resolved in a future source-authority calibration pass.
- TLDR discovery can be reconsidered later only as a non-public attribution source plan.
