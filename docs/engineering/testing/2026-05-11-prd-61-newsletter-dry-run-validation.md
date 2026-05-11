# PRD-61 Newsletter Editorial-Cycle Validation

- Date: `2026-05-11`
- Record updated: `2026-05-12`
- Branch: `fix/prd-61-newsletter-dry-run-validation`
- PRD: `docs/product/prd/prd-61-newsletter-ingestion-story-clusters-and-historical-signal-snapshot-foundation.md`
- Object levels: Article and Surface Placement. No canonical Signal identity or Card copy model changes.

## Scope

- Added a REST OAuth label preflight for the exact Gmail label `boot-up-benchmark`.
- Added a dedicated zero-write report command: `npx tsx scripts/newsletter-ingestion-dry-run-report.ts`.
- Added read-only promotion preview logic that mirrors source URL validity, title/source dedup, and rank availability rules without insert or update helpers.
- Updated the newsletter ingestion runbook with the label-verified dry-run report procedure.
- Completed controlled operational validation against the Gmail account that can see `boot-up-benchmark`.
- Completed one BM-authorized production write validation through the controlled newsletter runner only.

## Safety Boundaries

- Gmail MCP, Chrome, and browser state remain diagnostics only, not backend dependencies.
- `NEWSLETTER_INGESTION_DRY_RUN=true` remains the expected validation mode.
- The report excludes Gmail message IDs, thread IDs, raw content, snippets, credentials, refresh tokens, and client secrets.
- The report does not write `newsletter_emails`, `newsletter_story_extractions`, or `signal_posts`.
- The authorized write validation did not run RSS, cron, `draft_only`, publish, or public-surface publication paths.
- No production cron schedule was enabled by this change.
- No credentials, refresh tokens, raw newsletter content, snippets, Gmail message IDs, or thread IDs were written into repo docs.

## Automated Validation

Focused newsletter suite:

```bash
npx vitest run src/lib/newsletter-ingestion/gmail.test.ts src/lib/newsletter-ingestion/runner.test.ts src/lib/newsletter-ingestion/storage-promotion.test.ts src/lib/newsletter-ingestion/parser.test.ts src/lib/newsletter-ingestion/dry-run-report.test.ts
```

Result:
- `5` test files passed.
- `31` tests passed.

Repo checks completed on this branch before operational validation:
- `npm install`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run governance:coverage`
- `python3 scripts/release-governance-gate.py`
- `git diff --check`

Coverage added:
- Exact Gmail label preflight success and missing-label/account-mismatch failure.
- Runner fail-closed behavior before message search when the label is not visible.
- Dry-run report privacy checks for raw content, snippets, credentials, and message IDs.
- Read-only promotion preview for eligible creation, existing non-live candidate linkage, duplicate public row skip, and exhausted-rank skip.
- Existing parser fixture coverage remains in the focused suite.

## Controlled Dry-Run Validation

Completed after BM recreated local credentials through a hidden prompt and authorized Gmail read-only OAuth for the Gmail account that contains the `boot-up-benchmark` label.

Pre-flight:

| Check | Result |
| --- | --- |
| `newsletter_emails` | `0` |
| `newsletter_story_extractions` | `0` |
| `signal_posts` | `68` |
| Gmail OAuth env vars | Present, values not printed |
| `NEWSLETTER_INGESTION_DRY_RUN` | `true` for dry-run |
| Gmail label preflight | Exact `boot-up-benchmark` label visible |

Dry-run result:

| Result | Value |
| --- | --- |
| Emails fetched | `3` |
| Source breakdown | `1440 Daily Digest: 2`, `Morning Brew: 1` |
| Story extractions | `24` |
| Failed emails | `0` |
| Source URL quality | `5` primary URLs, `19` newsletter-only |
| Category distribution | `Finance: 7`, `Tech: 1`, `Politics: 1`, `Uncategorized: 15` |
| Eligible promotion candidates | `5` |
| Duplicate public-row overlaps | `0` |
| Database writes | `0` |

Post dry-run counts remained unchanged:
- `newsletter_emails = 0`
- `newsletter_story_extractions = 0`
- `signal_posts = 68`

## Authorized Write Validation

BM authorized the controlled newsletter write after the dry-run passed. The write used only `scripts/newsletter-ingestion-controlled-run.ts` with:

- `NEWSLETTER_INGESTION_ENABLED=true`
- `NEWSLETTER_INGESTION_DRY_RUN=false`
- `NEWSLETTER_INGESTION_SINCE_HOURS=48`
- `GMAIL_NEWSLETTER_LABEL=boot-up-benchmark`
- `NEWSLETTER_INGESTION_TARGET_ENV=production`
- `ALLOW_PRODUCTION_NEWSLETTER_INGESTION=true`

Write result:

| Result | Value |
| --- | --- |
| Runner success | `true` |
| Emails fetched | `3` |
| Existing email count | `0` |
| Stored emails | `3` |
| Story extractions stored | `24` |
| Promoted candidates | `5` |
| Linked existing candidates | `0` |
| Skipped promotions | `19` |
| Failed emails | `0` |
| Candidate live state | Non-live review candidates only |
| Publish path | Not run |

Post-write table counts:

| Table | Count |
| --- | --- |
| `newsletter_emails` | `3` |
| `newsletter_story_extractions` | `24` |
| `signal_posts` | `73` |

Public-surface verification:
- `/` returned HTTP `200` and still showed the May 6 slate.
- `/signals` returned HTTP `200`.
- Latest public renderable Signal count remained `3`.
- Non-live newsletter candidates did not become public.

Cleanup:
- `.env.newsletter.local` was deleted.
- `/tmp/gmail_oauth_code_53682.json` was deleted.
- No local OAuth callback listener remained on port `53682`.
- Manual Google Cloud cleanup remains: remove temporary redirect URI `http://127.0.0.1:53682/oauth2callback` from the `Boot Up Newsletter Ingestion OAuth Playground` Web client after confirming no further local OAuth token generation is needed.
