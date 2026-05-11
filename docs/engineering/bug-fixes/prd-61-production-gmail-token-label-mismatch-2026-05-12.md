# PRD-61 Production Gmail Token Label Mismatch - Bug-Fix Record

## Summary

- Problem addressed: Production newsletter ingestion failed closed because the deployed Gmail REST OAuth token could not see the exact `boot-up-benchmark` Gmail label.
- Root cause: The deployed Gmail OAuth credential set did not point to the Gmail account and OAuth client pairing that exposes the newsletter label used by PRD-61.
- Affected object level: Article ingestion and non-live Surface Placement review candidates.

## Fix

- Exact change: Regenerated Gmail readonly OAuth authorization from the Gmail account that owns `boot-up-benchmark`, verified exact label visibility before upload, updated the Vercel Production Gmail OAuth env set, and redeployed production so the corrected token is active.
- Related PRD: PRD-61.
- PR: This remediation PR.
- Branch: `docs/newsletter-prod-gmail-token-remediation-20260512`
- Head SHA: See GitHub PR metadata for this branch.
- Merge SHA: See GitHub PR metadata after merge.
- GitHub source-of-truth status: Repo-safe remediation and validation records added.
- External references reviewed, if any: Google OAuth consent flow and Vercel Production deployment state.
- Google Sheet / Work Log reference, if historically relevant: None; GitHub repo documentation is canonical.
- Branch cleanup status: Delete local and remote branch after merge.

## Terminology Requirement

- [x] Confirmed object level before coding: Article and Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `signal_posts` references remain Surface Placement review-candidate persistence.

## Validation

Automated and operational checks:
- Gmail OAuth authorization completed with readonly Gmail scope.
- Gmail label preflight confirmed exact `boot-up-benchmark` visibility before Vercel env update.
- Vercel Production Gmail OAuth env set was updated without printing secret values.
- Production redeploy reached `READY`.
- Protected newsletter diagnostic route returned HTTP `200`.
- Protected combined editorial-input fetch route returned HTTP `200`.
- `/` returned HTTP `200` and rendered the May 6 public briefing.
- `/signals` returned HTTP `200` and rendered `3` published Signals.

Production newsletter route evidence:
- `dryRun=false`
- `enabled=true`
- `writeCandidates=true`
- `targetEnvironment=production`
- `fetchedMessageCount=3`
- `existingEmailCount=3`
- `storedEmailCount=0`
- `extractedStoryCount=0`
- `promotedCandidateCount=0`
- `failedEmailCount=0`

Safety checks:
- No credential values, refresh tokens, raw email content, snippets, Gmail message IDs, thread IDs, or context material were committed.
- No public Signal was published by this remediation.
- Existing newsletter rows were treated idempotently; no duplicate newsletter email rows were inserted during validation.

## Remaining Risks / Follow-Up

- Public `/` and `/signals` remain on the May 6 published slate until BM separately approves editorial selection and publish.
- The combined fetch can create non-live review candidates, but it does not publish them.
- If the Gmail label is renamed or moved to another mailbox, production will fail closed again until a new refresh token is generated from the correct account.
