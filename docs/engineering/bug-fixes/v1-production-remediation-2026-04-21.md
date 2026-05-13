# V1 Production Remediation - Bug-Fix Record

## Summary
- Problem addressed: production-facing UI and workflow behavior had drifted from the locked V1 artifact system. The visible shell still exposed legacy Home, Today, Topics, Sources, History, and Settings navigation; `/account` and `/briefing/[date]` were absent; logged-out soft gates and redirect-after-auth behavior were incomplete.
- Root cause: V1 component work existed in partial or isolated form, but route-level architecture, auth redirect plumbing, Account data wiring, mobile navigation, and shared detail behavior were not integrated into the production shell.

## GitHub Source-of-Truth Metadata
- Affected object level: Card and Surface Placement.
- PR: #89, `https://github.com/brandonma25/bootupnews/pull/89`.
- Branch: `fix/v1-production-remediation`.
- Head SHA: `19d7353155a971d312a4b331ad4020eced3c9b88`.
- Merge SHA: `156d4f59beb871a6b0cdf48478816be805f92eb3`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #89 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Fix
- Exact change: replaced the primary app shell with Home, History, and Account; added `/account`; added `/briefing/[date]`; redirected legacy first-class routes; restored category/history soft gates; restored auth entry links and `redirectTo` behavior; moved V1 Account controls onto `/account`; added schema support for category preferences, newsletter state, and avatar metadata; updated focused unit and Chromium Playwright coverage.
- Related PRD: PRD-14, PRD-17, PRD-18, PRD-32, PRD-44, PRD-45, PRD-46, PRD-48, and PRD-49.

## Validation
- Automated checks:
  - `npm install` passed with the existing npm audit warning still present.
  - `npm run lint` passed.
  - `npm run test` passed: 47 files, 243 tests.
  - `npm run build` passed.
  - `npx playwright test --project=chromium --workers=1` passed: 16 tests.
- Human checks:
  - Real Google OAuth, email/password success, session persistence, deployed Supabase persistence, preview validation, and production validation remain required.

## Documentation Closeout
- GitHub documentation closeout completed in the canonical lane: yes.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.

## Remaining Risks / Follow-up
- Apply the Supabase migration before expecting deployed Account category/newsletter controls to persist.
- Validate redirect-after-auth with real email/password and OAuth credentials in Vercel preview.
- Re-check production React #418/hydration behavior after preview promotion; it was not reproducible locally once the correct dev server was used.
