# PRD-61 Production Gmail Token Remediation Validation

## Scope

- Date: 2026-05-12 Asia/Taipei
- Branch: `docs/newsletter-prod-gmail-token-remediation-20260512`
- Work type: Production remediation / controlled operations validation
- Related PRD: PRD-61
- Object level: Article ingestion and non-live Surface Placement review candidates

## Result

Production newsletter ingestion is no longer blocked by Gmail label/account mismatch.

The corrected Gmail readonly OAuth token can see the exact `boot-up-benchmark` label, Vercel Production has the aligned Gmail OAuth env set, and the deployed production newsletter route now returns HTTP `200`.

## Production OAuth Remediation

- OAuth client family: `Boot Up Newsletter Ingestion OAuth Playground` Web application client.
- Gmail account used for authorization: the account that owns the `boot-up-benchmark` label.
- Scope: `https://www.googleapis.com/auth/gmail.readonly`
- Secret values: not recorded.
- Refresh token: not recorded.
- Vercel Production env values updated:
  - `GMAIL_CLIENT_ID`
  - `GMAIL_CLIENT_SECRET`
  - `GMAIL_REFRESH_TOKEN`
- Production redeploy status: `READY`.

## Protected Route Validation

Newsletter-only route:

| Check | Result |
| --- | --- |
| Route | `/api/cron/newsletter-ingestion` |
| HTTP status | `200` |
| `success` | `true` |
| Label | `boot-up-benchmark` |
| `dryRun` | `false` |
| `enabled` | `true` |
| `writeCandidates` | `true` |
| Target environment | `production` |
| Fetched messages | `3` |
| Existing stored newsletter emails | `3` |
| Newly stored newsletter emails | `0` |
| Newly extracted stories | `0` |
| Newly promoted candidates | `0` |
| Failed emails | `0` |

Combined route:

| Check | Result |
| --- | --- |
| Route | `/api/cron/fetch-editorial-inputs` |
| HTTP status | `200` |
| `success` | `true` |
| RSS raw items | `223` |
| RSS clusters | `91` |
| RSS ranked clusters | `91` |
| RSS inserted Signal review candidates | `0` |
| RSS message | Daily Signal snapshot already existed for the briefing date. |
| Newsletter fetched messages | `3` |
| Newsletter existing stored emails | `3` |
| Newsletter failed emails | `0` |

## Public Surface QA

Automated and Chrome QA:

| Surface | Result |
| --- | --- |
| `/` | HTTP `200`; Chrome rendered the May 6 public briefing. |
| `/signals` | HTTP `200`; Chrome rendered `3` published Signals. |

The public surface did not publish newsletter review candidates. It remains on the latest editor-approved May 6 slate until BM separately authorizes editorial publish.

## Database Behavior Answer

Newsletter emails do store in the database through PRD-61, but they are internal ingestion records. This validation found the three current labeled Gmail messages were already present (`existingEmailCount=3`), so the idempotent run inserted no duplicate email rows and no duplicate story extraction rows.

## Privacy Verification

- No credential values were printed or committed.
- No refresh token was printed or committed.
- No raw email content, snippets, Gmail message IDs, thread IDs, or context material were printed or committed.
- No public route was observed exposing newsletter raw content.

## Final Status

Production Gmail newsletter ingestion label/account mismatch is fixed. The production route is unblocked, idempotent, and returning successful sanitized summaries.
