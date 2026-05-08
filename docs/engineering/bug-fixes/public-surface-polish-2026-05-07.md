# Public Surface Polish — Bug-Fix Record

## Summary
- Problem addressed: Public Signal Cards used a card-face `Why it matters` label, unclamped long preview copy, `Top Event` tier wording, empty-tab signup copy that implied gated content existed, and route titles that still used legacy product/developer wording.
- Root cause: Recent public-surface cleanup removed internal sections but left older card labels, soft-gate copy, tier terminology, and metadata strings in separate public components.
- Affected object level: Card and Surface Placement.

## Fix
- Exact change: renamed public card-face reasoning labels to `Why this ranks`, added `line-clamp-2` to public WITM preview text, changed the empty-tab signup prompt to neutral notification copy, aligned public card tier labels to `Core Signal`, updated public route metadata to Boot Up reader-facing titles and description, and aligned the local release smoke marker with the data-empty homepage state.
- Related PRD: Not applicable. Canonical PRD required: No. This is bug-fix / public surface polish.
- PR: TBD
- Branch: `bugfix/public-surface-polish-20260507`
- Head SHA: TBD
- Merge SHA: TBD
- GitHub source-of-truth status: This bug-fix record is the canonical repo documentation lane for the PR.
- External references reviewed, if any: Cowork frontend UX analysis 2026-05-06 Fix 5 and Fix 6; Cowork readiness analysis 2026-05-07 Section 4; Product Position signal card structure; PR #201 and PR #202 hotfix precedents.
- Google Sheet / Work Log reference, if historically relevant: None.
- Branch cleanup status: Delete the remote branch after merge if GitHub merge automation does not do it.

## Terminology Requirement
- [x] Confirmed object level before coding: Card and Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `Top Events` tab wording remains a Surface Placement label; the public card tier label now uses `Core Signal`.

## Validation
- Automated checks:
  - `npx vitest run src/components/landing/homepage.test.tsx src/app/signals/page.test.tsx src/app/metadata.test.ts src/components/briefing/BriefingDetailView.test.tsx src/components/home/home-category-components.test.tsx` — PASS, 5 files / 45 tests.
  - `npm run lint` — PASS.
  - `npm run test` — PASS, 80 files / 601 tests.
  - `npm run build` — PASS.
  - `./scripts/release-check.sh` — local route smoke now passes after marker alignment; one Chromium mobile-navigation run flaked outside the touched surface, while WebKit passed in the wrapper and a managed full Chromium rerun passed.
  - `PLAYWRIGHT_MANAGED_WEBSERVER=1 npm run test:e2e:chromium` — PASS, 33 tests.
  - `python3 scripts/validate-feature-system-csv.py` — PASS.
  - `npm run governance:coverage` — PASS.
  - `npm run governance:hotspots` — PASS.
  - `python3 scripts/release-governance-gate.py` — PASS.
  - `npm run governance:audit` — PASS.
- Human checks:
  - Local browser metadata: `/` title `Boot Up`, `/signals` title `Boot Up — Today's Signals`, `/briefing/2026-05-06` title `Boot Up — Briefing May 6, 2026`.
  - Local browser empty-tab copy: neutral signup line rendered; old `Create a free account to read...` line absent; honest empty-state sentence remained.
  - Local card-face visual check: blocked by the local dev environment having zero published public cards; Vercel preview and production verification must confirm card labels and clamps with deployed data.

## Remaining Risks / Follow-up
- Candidate pool UI remains deferred and out of scope.
- Other Cowork items are not bundled in this bug-fix PR.
