# PR88 WebKit Navigation Race — Bug-Fix Record

## Summary
- Problem addressed: PR88's `PR Gate / pr-e2e-webkit` check failed during merge validation.
- Root cause: The new Playwright audit tests moved between Next.js routes immediately after `domcontentloaded` or URL-change detection. WebKit can still have a prior client-side navigation in flight, which caused `page.goto()` to fail with an interrupted-navigation error.

## GitHub Source-of-Truth Metadata
- Affected object level: Surface Placement validation coverage.
- PR: #88, `https://github.com/brandonma25/bootupnews/pull/88`.
- Branch: `feature/playwright-ui-audit-automation`.
- Head SHA: `c357ba5814bc0c507da1fadae2db750b59a274ab`.
- Merge SHA: `f7475c922b9addb76c9dc725638db875ba255cf0`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #88 metadata, PR #90 metadata for the open stabilization follow-up, and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Fix
- Exact change: Added a shared audit navigation helper that waits for route load state, verifies the target pathname, and retries only the known interrupted-navigation case. Updated route traversal and desktop navigation tests to use that helper.
- Related PRD: None. This is unmapped operations QA automation work for PR88.

## Validation
- Automated checks:
  - `npm install`
  - `npm run lint || true`
  - `npm run test || true`
  - `npm run build`
  - `PLAYWRIGHT_MANAGED_WEBSERVER=[REDACTED_ENV_VALUE] ... npx playwright test tests/audit/route-traversal.spec.ts tests/navigation/app-navigation.spec.ts --project=webkit --workers=1`
  - `PLAYWRIGHT_MANAGED_WEBSERVER=[REDACTED_ENV_VALUE] ... npm run test:e2e:webkit`
  - `CI=1 PLAYWRIGHT_MANAGED_WEBSERVER=[REDACTED_ENV_VALUE] ... npm run test:e2e:webkit`
  - `npm run dev`, then `curl -I http://localhost:3000/` and `curl -I http://localhost:3000/dashboard`
- Human checks: Preview and real auth/session validation remain required before merge readiness.

## Documentation Closeout
- GitHub documentation closeout completed in the canonical lane: yes.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.

## Remaining Risks / Follow-up
- Re-run PR88's GitHub `pr-e2e-webkit` check after this patch is pushed.
- Preview gate and human auth/session gate remain outside local Playwright validation.
