# PRD-61 Newsletter Runtime Merge Readiness Record

Date: 2026-05-11
Branch: `docs/pr215-newsletter-runtime-record`
Referenced PR: [PR #215](https://github.com/brandonma25/daily-intelligence-aggregator/pull/215)
Readiness label: `ready_for_newsletter_dry_run_validation`

## Effective Change Type

Remediation / controlled operations record keeping.

This packet records the post-merge state for PRD-61 Phase 1 newsletter runtime infrastructure after PR #215 merged. It does not implement a new feature, create a new PRD, run Gmail newsletter ingestion, run cron, run the RSS pipeline, run `draft_only`, publish, mutate production data, change source manifests, change ranking thresholds, or change WITM thresholds.

Object level:
- Article: newsletter-derived Article extraction infrastructure is deployed.
- Surface Placement: non-live `signal_posts` review-candidate promotion infrastructure is deployed but not run in production write mode.
- This record changes no Article, Story Cluster, Signal, Card, or Surface Placement data.

## Source Of Truth

- `AGENTS.md` GitHub documentation source-of-truth governance.
- PRD-61: `docs/product/prd/prd-61-newsletter-ingestion-story-clusters-and-historical-signal-snapshot-foundation.md`
- Runtime implementation note: `docs/engineering/change-records/2026-05-10-newsletter-ingestion-runtime-phase1.md`
- Operations runbook: `docs/operations/newsletter-ingestion-cron-runbook.md`
- PR #215 merge metadata.

Canonical PRD required: No new PRD. PRD-61 is the canonical feature source of truth and already contains the Phase 1 runtime amendment.

## Merge And Deployment State

| Item | Result |
| --- | --- |
| PR | #215, `feat(newsletter): add Gmail ingestion runtime foundation` |
| PR state | Merged |
| Original implementation head | `6b6ae9335f043618865752d263f5e0073afd2b7d` |
| Updated merge-ready head | `7bbcfcb6532ff088579fffac1500bd620e5fe456` |
| Merge commit | `46a89d9fe9f75645ebe8476ffa4fcbf7eb1a3b6d` |
| Merged at | `2026-05-11T08:05:41Z` |
| Production deployment | Ready |
| Production URL | `https://bootupnews.vercel.app` |
| Production deployment URL | `https://bootup-gy2yqovjw-brandonma25s-projects.vercel.app` |

Production was checked after merge and returned HTTP 200 for:
- `/`
- `/signals`

## PR Gate Evidence

After the PR branch was updated against `main`, these checks passed before merge:

| Check | Result |
| --- | --- |
| Vercel | Pass |
| Vercel Preview Comments | Pass |
| feature-system-csv-validation | Pass |
| pr-build | Pass |
| pr-e2e-chromium | Pass |
| pr-e2e-webkit | Pass |
| pr-lint | Pass |
| pr-summary | Pass |
| pr-unit-tests | Pass |
| release-governance-gate | Pass |

## Environment Readiness

Vercel environment variable presence was verified without printing values:

| Env var | Production | Preview branch | Development |
| --- | --- | --- | --- |
| `GMAIL_CLIENT_ID` | Present | Present | Present |
| `GMAIL_CLIENT_SECRET` | Present | Present | Present |
| `GMAIL_REFRESH_TOKEN` | Present | Present | Present |

Newsletter write-mode env vars were not enabled during this record. The implementation defaults remain fail-closed unless the explicit PRD-61 write gates are set.

## Blocked Validation Before Merge

A requested production newsletter dry-run was not executed before PR #215 merged because the preflight premise was false at that time:

- GitHub still reported PR #215 as open.
- Production was still serving a prior `main` commit, not PR #215.
- Running the production validation then would not have validated deployed PR #215 infrastructure.

The block was correct. No Gmail ingestion dry-run was run before merge.

## Post-Merge Safe Next Action

The next safe operational step is a dry-run only newsletter validation using the PRD-61 runbook:

```bash
NEWSLETTER_INGESTION_ENABLED=true \
NEWSLETTER_INGESTION_DRY_RUN=true \
NEWSLETTER_INGESTION_SINCE_HOURS=48 \
GMAIL_NEWSLETTER_LABEL=boot-up-benchmark \
npx tsx scripts/newsletter-ingestion-controlled-run.ts
```

Expected safety posture:
- Gmail API may be read with readonly OAuth scope.
- No `newsletter_emails` rows are inserted.
- No `newsletter_story_extractions` rows are inserted.
- No `signal_posts` rows are inserted.
- No WITM is generated.
- Nothing is published.
- Raw newsletter content and `context_material` are not printed.

## Non-Authorization

This record does not authorize:

- `NEWSLETTER_INGESTION_DRY_RUN=false`
- production newsletter write mode
- `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=true`
- production cron scheduling
- cron execution
- RSS pipeline execution
- `draft_only`
- publish
- direct SQL mutation
- clustering implementation
- `signal_evolution` behavior
- `cross_event_connections` behavior
- AI WITM generation

## Privacy And Secret Handling

This record intentionally excludes:
- Gmail refresh token values
- OAuth client secret values
- raw email bodies
- newsletter excerpts or snippets
- cookies, auth headers, Supabase keys, and Vercel tokens

OAuth client setup created a new Gmail OAuth client secret because Google no longer allowed viewing or downloading the prior secret. The older OAuth client secret remained enabled at the end of setup and should be rotated or disabled only after the deployed app is confirmed to use the new secret safely.

## Branch Cleanup State

- Remote PR branch `feature/prd-61-newsletter-ingestion-runtime-phase1` was deleted after merge.
- The local PR worktree remains on disk for inspection and should be removed separately when local workspace cleanup is authorized.

## Result

PRD-61 Phase 1 newsletter runtime infrastructure is merged and deployed to production. Production write mode remains disabled. Dry-run validation is now unblocked and should be run only under dry-run gates before BM authorizes any production writes.
