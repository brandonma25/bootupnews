# Public Surface Copy Remediation - Bug-Fix Record

## Summary
- Problem addressed: logged-out `/briefing/[date]` and `/signals` public pages exposed internal editorial vocabulary, generated ranking explanations, duplicated card copy, and architecture-facing breadcrumb language.
- Root cause: the briefing detail card rendered generated homepage ranking-explanation text as reader copy and displayed the same card summary in both the lead and `What happened` slot when those fields matched; `/signals` rendered raw editorial tags and an internal header badge directly.
- Affected object level: Card and Surface Placement.

## Source Of Truth
- Cowork frontend UX analysis 2026-05-06, prioritized shortlist Fix 3 and Fix 4.
- Product Position guidance supplied with this remediation: signal cards should expose reader-facing card structure and should not surface unexplained importance or internal vocabulary.
- PR #201 pattern: scoped public-surface bug fixes with no backend, data, ranking, source, pipeline, or admin-surface changes.
- Canonical PRD required: no.

## Fix
- Exact change: remove the public `/briefing/[date]` `Why this ranks here` block, suppress the `What happened` section only when it duplicates the lead copy exactly, filter internal `/signals` tag badges, and replace the `/signals` internal header badge with reader-facing `Signals`.
- Related PRD: none; bug-fix / public surface copy remediation only.
- PR: #202, `https://github.com/brandonma25/bootupnews/pull/202`.
- Branch: `bugfix/public-surface-copy-remediation`.
- Implementation SHA: `4a9f348e37236f642dbda22ca1006f2f6441ea10`.
- Final head SHA: `ca8df01b825bfa32984df9b9f7f62d01ee168f86`.
- Merge SHA: `93b41cdd8728ce1e421582003db96cd8f15a437a`.
- GitHub source-of-truth status: merged into `main` at `2026-05-07T04:58:00Z`.
- External references reviewed, if any: Cowork analysis supplied in prompt, Product Position guidance supplied in prompt, and PR #201 scoped hotfix precedent.
- Google Sheet / Work Log reference, if historically relevant: none used as a write target.
- Branch cleanup status: remote branch, local branch, and temporary implementation worktree removed after production verification.

## Fix Decisions
- Fix 3a: removed the public `Why this ranks here` block because the available text is generated template copy from the homepage view model, not a trusted reader-facing card-specific field. The reader-facing `Why it matters` copy remains.
- Fix 3b: treated the duplicate as a component-level presentation issue; the detail card now renders `What happened` only when it is distinct from the lead paragraph.
- Fix 3c: removed the generated `Why this ranks here` block from public detail cards because identical template fallback text is not trustworthy as card-specific reasoning.
- Fix 4a: removed raw internal tag labels from public `/signals` card metadata while preserving category tags such as `Finance`; no replacement tier badge was added because the public homepage/briefing surfaces do not already use a matching card-badge label.
- Fix 4b: replaced `Published editorial layer` with `Signals`, matching the route-level public surface without claiming false freshness.

## Terminology Requirement
- [x] Confirmed object level before coding: Card and Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy runtime naming remains unchanged; no ranking, source, pipeline, WITM template, eligibility, or database logic was modified.

## Validation
- Automated checks:
  - `npm install` passed with existing dependency audit warnings.
  - `npm run test -- src/components/briefing/BriefingDetailView.test.tsx src/app/signals/page.test.tsx` passed.
  - `npm run lint` passed.
  - `npm run test` passed.
  - `npm run build` passed with existing workspace-root and module-type warnings.
  - `git diff --check` passed.
  - `python3 scripts/validate-feature-system-csv.py` passed with existing PRD slug warnings.
  - `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name bugfix/public-surface-copy-remediation --pr-title "bug-fix: remove internal editorial vocabulary from /briefing and /signals public surfaces"` passed.
  - `python3 scripts/check-governance-hotspots.py --diff-mode local --branch-name bugfix/public-surface-copy-remediation --pr-title "bug-fix: remove internal editorial vocabulary from /briefing and /signals public surfaces"` passed.
  - `python3 scripts/release-governance-gate.py --diff-mode local --branch-name bugfix/public-surface-copy-remediation --pr-title "bug-fix: remove internal editorial vocabulary from /briefing and /signals public surfaces"` passed.
  - `python3 scripts/pr-governance-audit.py --diff-mode local --branch-name bugfix/public-surface-copy-remediation --pr-title "bug-fix: remove internal editorial vocabulary from /briefing and /signals public surfaces"` passed.
  - GitHub PR Gate passed after the final metadata update: Vercel, Vercel Preview Comments, feature-system CSV validation, PR build, Chromium E2E, WebKit E2E, lint, PR summary, unit tests, and release-governance gate.
- Human checks:
  - Local browser `/signals` confirmed `Published editorial layer`, `watch`, and `High` were absent and the `Signals` public badge rendered.
  - Local browser `/briefing/2026-05-06` did not have production snapshot data available, but confirmed `Why this ranks here` and `confirmed-event rail` were absent from the rendered page.
  - Vercel preview verification passed for `/`, `/signals`, and `/briefing/2026-05-06`; removed internal strings were absent and unchanged public content remained visible.
  - Production deployment was verified without retaining concrete deployment identifiers in the public doc.
  - Production alias checked: `https://bootupnews.com`.
  - Production HTTP checks passed: `/` 200, `/signals` 200, `/briefing/2026-05-06` 200.
  - Production Chrome incognito click-level QA passed: homepage category tabs, category gates, login routing, briefing detail navigation, detail tabs, `/signals`, and `/signals` to homepage navigation all worked.
  - Fix-specific production QA passed: `/briefing/2026-05-06` no longer rendered `Why this ranks here` or `confirmed-event rail`; `/signals` no longer rendered `watch`, `High`, or `Published editorial layer`; `/signals` still rendered category tags such as `Finance` and `Tech`.

## Documentation Closeout
- Historical validation evidence was preserved as operational evidence outside the durable public source-of-truth surface. For reviewer-facing context, use the PR body, GitHub metadata, and current public decision/governance docs.
- No binary screenshot artifact is committed with this docs closeout; the production UI state is recorded as route, click, and string-presence evidence to keep the documentation PR lightweight.
- No Google Sheet, Work Log, tracker sync, or external documentation target was written.

## Remaining Risks / Follow-up
- Cowork Fix 5 and Fix 6 remain separate and out of scope for this PR.
- This record does not claim broader UI cleanup beyond PR #202's public-surface copy remediation.
