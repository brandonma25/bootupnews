# Cron Fetch Stage Diagnostics — Bug-Fix Record

## Summary
- Problem addressed: the production `/api/cron/fetch-news` one-time run returned HTTP 500 without enough route-level evidence to identify the failing execution/write stage.
- Root cause: the existing cron route returned a generic failure envelope and only logged broad start/failure events, so Vercel request inspection could not distinguish source load, fetch, ranking, WITM validation, persistence, or health-freshness behavior.
- Affected object level: Surface Placement and Card persistence diagnostics in the existing `signal_posts` editorial workflow.

## Fix
- Exact change: added a request id, safe structured stage diagnostics, sanitized failure fields, and explicit success/failure response metadata to the existing cron route and runner. Follow-up commits lazy-load the cron runner dependencies after route auth/env diagnostics, bypass auth-session proxy refresh for `/api/cron/*`, emit a single final cron diagnostic log, suppress informational RSS boot console breadcrumbs, and lazy-load TLDR/jsdom support so normal governed RSS fetches do not pull an ESM-incompatible `html-encoding-sniffer` chain into the production cron path.
- Related PRD: none. This is a scoped production remediation hotfix, not a new product feature.
- Branch: `hotfix/cron-stage-diagnostics-20260504`
- Base SHA: `c579e1162d9e68d8cdfcecbb36b7940a82cf8ca7`
- GitHub source-of-truth status: final branch/deployment metadata is recorded in the production-remediation report.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: pending after production diagnostic closeout.

## Terminology Requirement
- [x] Confirmed object level before coding: Surface Placement and Card persistence diagnostics.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `signal_posts` naming is preserved as the existing runtime/editorial contract.

## Validation
- Automated checks:
  - `npm test -- src/app/api/cron/fetch-news/route.test.ts`
  - `npm test -- src/proxy.test.ts`
  - `npm run lint`
  - `npm run build`
- Human checks:
  - Production diagnostic run and public-state verification remain required after deployment.

## Remaining Risks / Follow-up
- This change only exposes the failing production stage. Any root-cause fix must remain scoped to the existing supported route and must not bypass editorial gates or publish unreviewed rows.
