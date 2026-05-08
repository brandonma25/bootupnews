# Homepage Editorial Preview Truncation — Bug-Fix Record

## Summary
- Problem addressed: collapsed homepage `Why it matters` previews could end with accidental mid-word clipping, such as `wa...`, because the UI relied on visual line clamping of the full text.
- Root cause: the collapsed state rendered the full editorial text and delegated shortening to CSS, so the browser could clip at arbitrary character positions.

## GitHub Source-of-Truth Metadata
- Affected object level: Card.
- PR: #100, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/100`.
- Branch: `codex/signals-admin-editorial-layer`.
- Head SHA: `4e895c44aad579281e7d612b985efb0470bb2d99`.
- Merge SHA: `cacb0753de59fc1efe7c72c9655c62625a99991e`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #100 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Fix
- Exact change: collapsed homepage `Why it matters` now renders an intentional preview string generated in code. The preview prefers complete sentence boundaries and cleans stored pre-truncated snippets so the summary box does not end with broken `...` text.
- Related PRD: existing signals admin/editorial layer branch; no new PRD for this scoped remediation.

## Validation
- Automated checks: `npm run lint`, focused homepage/editorial preview tests, targeted server-page reruns, and `npm run build` passed.
- Browser checks: local homepage verification at `http://localhost:3000/` found five `Why it matters` boxes, all ending with complete sentence punctuation, with no literal `...` or `…` in collapsed summaries. `Read more` / `Show less` still worked.
- Human checks: PM confirmed all manual tests passed.

## Documentation Closeout
- GitHub documentation closeout completed in the canonical lane: yes.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.

## Remaining Risks / Follow-up
- Broad full-suite and Chromium Playwright runs still show unrelated route/test timing failures outside this homepage summary rendering path. Preview and auth/session truth still need normal preview-environment validation before production confidence.
