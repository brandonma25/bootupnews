# PRD-61 Newsletter Dry-Run Label Preflight — Bug-Fix Record

## Summary

- Problem addressed: Gmail OAuth could succeed while the runner searched an account that did not expose the expected `[REDACTED_GMAIL_LABEL]` label, making an account/token mismatch look like an empty newsletter inventory.
- Root cause: The controlled path searched Gmail messages directly and did not first prove exact label visibility for the same REST OAuth token.
- Affected object level: Article ingestion and Surface Placement candidate preview only.

## Fix

- Exact change: Add an exact Gmail label preflight before message search, fail closed with a sanitized label missing/account mismatch message, add a dedicated zero-write dry-run report script, and add read-only promotion preview logic that mirrors production source URL, dedup, and rank rules without writing.
- Related PRD: PRD-61.
- PR: Not opened at time of record.
- Branch: `fix/prd-61-newsletter-dry-run-validation`
- Head SHA at record time: `c9b1bb002a0c76b39b1081d83763d458440bc0b5`
- Production writes: One BM-authorized controlled newsletter write validation completed after zero-write dry-run passed.
- Cron changes: None.
- Tracker sync files: None.
- GitHub source-of-truth status: Repo docs and branch-local validation record updated; no Google Sheet / Work Log tracker update.

## Terminology Requirement

- [x] Confirmed object level before coding: Article and Surface Placement.
- [x] No new naming expands canonical Signal identity or Card terminology.
- [x] Legacy table name `signal_posts` is used only for the existing Surface Placement persistence model.

## Validation

Automated checks completed:
- `npm install` completed.
- `npx vitest run src/lib/newsletter-ingestion/gmail.test.ts src/lib/newsletter-ingestion/runner.test.ts src/lib/newsletter-ingestion/storage-promotion.test.ts src/lib/newsletter-ingestion/parser.test.ts src/lib/newsletter-ingestion/dry-run-report.test.ts` passed.
- `npm run lint` passed.
- `npm run test` passed.
- `npm run build` passed.
- `npm run governance:coverage` passed.
- `python3 scripts/release-governance-gate.py` passed.
- `git diff --check` passed.

Controlled operations validation completed:
- Gmail REST OAuth refresh-token exchange succeeded with the Web application client named `configured Gmail OAuth client`.
- Exact Gmail label `[REDACTED_GMAIL_LABEL]` was visible to the same token used by the runner.
- Zero-write dry-run fetched `3` labeled emails, extracted `24` Article candidates, identified `5` eligible Surface Placement promotion candidates, and left counts unchanged at `newsletter_emails = 0`, `newsletter_story_extractions = 0`, `signal_posts = 68`.
- BM then authorized controlled write-mode validation.
- Controlled write stored `3` `newsletter_emails` rows, stored `24` `newsletter_story_extractions` rows, and created `5` non-live `signal_posts` review candidates.
- Post-write counts were `newsletter_emails = 3`, `newsletter_story_extractions = 24`, `signal_posts = 73`.
- `/` returned HTTP `200` with the May 6 slate; `/signals` returned HTTP `200`; latest public renderable Signal count remained `3`.
- No raw email content, snippets, Gmail message IDs, thread IDs, credentials, refresh tokens, or client secrets were printed or written into repo docs.

## Remaining Risks / Follow-Up

- Remove temporary local OAuth redirect URI `http://127.0.0.1:53682/oauth2callback` from the `configured Gmail OAuth client` Web client after confirming no more local token generation is needed.
- Production cron remains disabled and still requires separate BM approval before scheduling.
- If label preflight fails in future runs, regenerate the refresh token from the Gmail account that actually contains `[REDACTED_GMAIL_LABEL]`.
