# Homepage Editorial Preview Truncation — Bug-Fix Record

## Summary
- Problem addressed: collapsed homepage `Why it matters` previews could end with accidental mid-word clipping, such as `wa...`, because the UI relied on visual line clamping of the full text.
- Root cause: the collapsed state rendered the full editorial text and delegated shortening to CSS, so the browser could clip at arbitrary character positions.

## Fix
- Exact change: collapsed homepage `Why it matters` now renders an intentional preview string generated in code. The preview prefers complete sentence boundaries and cleans stored pre-truncated snippets so the summary box does not end with broken `...` text.
- Related PRD: existing signals admin/editorial layer branch; no new PRD for this scoped remediation.

## Validation
- Automated checks: `npm run lint`, focused homepage/editorial preview tests, targeted server-page reruns, and `npm run build` passed.
- Browser checks: local homepage verification at `http://localhost:3000/` found five `Why it matters` boxes, all ending with complete sentence punctuation, with no literal `...` or `…` in collapsed summaries. `Read more` / `Show less` still worked.
- Human checks: PM confirmed all manual tests passed.

## Tracker Closeout
- Google Sheets tracker row updated and verified: not performed in this local remediation pass.
- Fallback tracker-sync file, if direct Sheets update was unavailable: not created.

## Remaining Risks / Follow-up
- Broad full-suite and Chromium Playwright runs still show unrelated route/test timing failures outside this homepage summary rendering path. Preview and auth/session truth still need normal preview-environment validation before production confidence.
