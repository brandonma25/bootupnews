# Briefing Detail Public Debug Artifacts — Bug-Fix Record

## Summary
- Problem addressed: logged-out `/briefing/[date]` detail pages exposed a developer subtitle and a visible inherited debug-like frame around public detail cards.
- Root cause: the detail page rendered `data.briefing.intro` directly even when the public homepage data source populated it with an implementation note, and detail event cards reused the shared `Panel` frame whose `glass-panel` border appeared as an unintended public-surface wrapper.
- Affected object level: Card and Surface Placement.

## Source Of Truth
- Cowork frontend UX analysis 2026-05-06, prioritized shortlist Fix 1 and Fix 2.
- Production URL observed before fix: `https://bootupnews.vercel.app/briefing/2026-05-06`.
- BOOT_UP_WORK_LOG Decision D3 historical reference: no false freshness; trust matters more than daily automation optics.
- Canonical PRD required: no.

## Fix
- Exact change: remove the detail-page subtitle render and replace the detail event card's inherited `Panel` frame with a local border-transparent card frame.
- Related PRD: none; hotfix only.
- PR: pending.
- Branch: `hotfix/briefing-public-artifacts`.
- Head SHA: pending.
- Merge SHA: pending.
- GitHub source-of-truth status: pending PR.
- External references reviewed, if any: Cowork analysis supplied in prompt and live production DOM check.
- Google Sheet / Work Log reference, if historically relevant: Work Log Decision D3 was treated as historical context only, not as a canonical write target.
- Branch cleanup status: pending post-merge cleanup.

## Terminology Requirement
- [x] Confirmed object level before coding: Card and Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy runtime naming mismatch remains unchanged; no ranking, source, pipeline, or database logic was modified.

## Validation
- Automated checks:
  - `npm install` passed.
  - `npm run test -- src/components/briefing/BriefingDetailView.test.tsx` passed.
  - `npm run test -- src/components/briefing/BriefingDetailView.test.tsx src/lib/data.test.ts` passed.
  - `npm run lint` passed.
  - `npm run test` passed.
  - `npm run build` passed.
  - `npx playwright test --project=chromium` passed.
  - `npx playwright test --project=webkit` passed.
  - `python3 scripts/validate-feature-system-csv.py` passed with existing slug warnings.
  - `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name hotfix/briefing-public-artifacts --pr-title "hotfix: remove developer subtitle and debug border from /briefing detail page (public surface trust)"` passed.
  - `python3 scripts/check-governance-hotspots.py --diff-mode local --branch-name hotfix/briefing-public-artifacts --pr-title "hotfix: remove developer subtitle and debug border from /briefing detail page (public surface trust)"` passed.
  - `python3 scripts/release-governance-gate.py --diff-mode local --branch-name hotfix/briefing-public-artifacts --pr-title "hotfix: remove developer subtitle and debug border from /briefing detail page (public surface trust)"` passed.
  - `python3 scripts/pr-governance-audit.py --diff-mode local --branch-name hotfix/briefing-public-artifacts --pr-title "hotfix: remove developer subtitle and debug border from /briefing detail page (public surface trust)"` passed.
- Human checks: local `/briefing/2026-05-06` rendered the unavailable state without production snapshot data; Vercel preview and production visual confirmation remain required after deployment.

## Remaining Risks / Follow-up
- Thursday/Friday UI cleanup items from the Cowork analysis remain out of scope for this hotfix.
