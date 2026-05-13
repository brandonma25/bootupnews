# Remove Hardcoded Feed Loading Time Messaging — Bug-Fix Record

## Classification
- Title: Remove hardcoded feed loading time messaging
- Type: Remediation (UX defect)

## Summary
- Problem addressed: the route-level loading UI displayed a fixed-duration loading estimate, which created a false expectation that loading should take a predictable amount of time.
- Root Cause: Static placeholder copy not defined in the artifact system and not tied to real performance.

## GitHub Source-of-Truth Metadata
- Affected object level: Surface Placement.
- PR: #94, `https://github.com/brandonma25/bootupnews/pull/94`.
- Branch: `fix/v1-production-remediation`.
- Head SHA: `c6ce9e5cc5e946c2c9c386daf3f1ef51ebc7f996`.
- Merge SHA: `63f1a748fb55730d305dff3140f70423ad8132c9`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #94 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Fix
- Fix: Replaced time-based loading message with neutral loading state.
- Exact change: replaced the time-based loading sentence with the neutral loading copy `Preparing your feed...` while preserving the existing skeleton layout and component structure.
- Related PRD: none. This is remediation alignment against the approved V1 artifacts, not a net-new product feature.

## Validation
- Automated checks:
  - `npm install` passed with the existing npm audit warning.
  - `npm run lint || true` passed.
  - `npm run test || true` passed: 47 files, 243 tests.
  - `npm run build` passed with existing Next.js workspace-root and module-type warnings.
  - `npx playwright test --project=chromium --workers=1` passed: 28 tests.
  - `npx playwright test --project=webkit --workers=1` passed: 28 tests.
  - Local targeted browser check passed for `/` and signed-out `/account`: removed duration copy absent, one main landmark present, no framework error overlay, no browser console errors.
- Human checks:
  - Validate locally and in Vercel preview that the loading state no longer suggests a fake duration and that the skeleton layout still feels correct.

## Documentation Closeout
- GitHub documentation closeout completed in the canonical lane: yes.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.

## Remaining Risks / Follow-up
- Loading duration perception still depends on actual runtime performance, which this remediation does not change.
