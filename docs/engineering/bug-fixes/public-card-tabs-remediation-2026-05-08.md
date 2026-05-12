# Public Card Tabs Remediation - Bug-Fix Record

## Summary
- Problem addressed: published Home Cards repeated the lead summary as the first bullet, empty signed-out category tabs showed the signup gate before the honest empty state, and category navigation used labels and filtering that left the current three-card published slate out of matching tabs.
- Root cause: the Home Card only deduped key points against the title, the category tab component rendered the signed-out gate for every signed-out category tab regardless of content count, and the public tab labels plus fallback filter drifted from the runtime `signal_posts.tags` values and current three-row published slate shape.
- Affected object level: Card and Surface Placement.

## Source Of Truth
- Cowork eliminate-only analysis 2026-05-08 subtraction-lens shortlist.
- Cowork frontend UX analysis 2026-05-06 taxonomy mismatch diagnosis.
- Production homepage HTML/RSC payload fetched 2026-05-08 from `https://bootupnews.vercel.app/`.
- Product Position fail-closed empty-state principle, no false freshness, and Signal Card structure guidance supplied by PM.
- PR #202 and PR #204 GitHub diffs.
- Canonical PRD required: No.

## Diagnosis
- Fix A: `src/components/landing/homepage.tsx` rendered `event.summary` as the lead paragraph and then rendered `event.keyPoints` after filtering only against the title. Production RSC data showed all three cards had identical `whatHappened` and first `keyPoints` text. PR #202 fixed this pattern only in `src/components/briefing/BriefingDetailView.tsx`, so the Home Card variant remained unchanged.
- Fix B: `src/components/home/CategoryTabStrip.tsx` rendered `gatedCategoryState` whenever a signed-out category tab was active. PR #204 only softened the gate copy in `src/components/landing/homepage.tsx`, so empty tabs still showed signup controls before the empty-state sentence.
- Fix C: `signal_posts` has `tags`, not a dedicated category column. Production tags surfaced through Home data as `["Finance", "watch", "High"]` for both finance cards and `["Tech", "watch", "High"]` for the tech card. Tab labels were `Tech News` and `Economics`, while filtering used normalized keys `tech`, `finance`, and `politics`. A second frontend-only gap excluded all top-card IDs unless the published set had exactly five rows, so the current three-row slate could not populate category tabs even when categories matched.

## Fix
- Exact change: dedupe Home Card key points against title, lead summary, and `whatHappened`; render the signed-out category gate only when the active category tab has content; rename public tabs to `Tech`, `Finance`, and `Politics`; and allow the top published set to populate category tabs whenever no broader non-top depth pool exists.
- Related PRD: None.
- PR: https://github.com/brandonma25/daily-intelligence-aggregator/pull/205.
- Branch: `fix/public-card-tabs-remediation-20260508`.
- Head SHA at PR creation: `cb6520f5a9c24ddf76cd987849a362677ce2bb72`.
- Merge SHA: TBD.
- GitHub source-of-truth status: pending PR.
- External references reviewed, if any: prompt-supplied Cowork analyses, Product Position guidance, production homepage payload, PR #202, PR #204.
- Google Sheet / Work Log reference, if historically relevant: none used as a write target.
- Branch cleanup status: pending post-merge cleanup.

## Terminology Requirement
- [x] Confirmed object level before coding: Card and Surface Placement.
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy `signal_posts` naming remains treated as Surface Placement plus Card copy/read-model storage.

## Validation
- Automated checks:
  - `npm install` - PASS with existing audit warnings.
  - `npx vitest run src/components/landing/homepage.test.tsx src/components/home/home-category-components.test.tsx src/lib/homepage-model.test.ts` - PASS, 3 files / 67 tests.
  - `npx vitest run src/components/landing/homepage.test.tsx src/app/signals/page.test.tsx src/app/metadata.test.ts src/components/briefing/BriefingDetailView.test.tsx src/components/home/home-category-components.test.tsx src/lib/homepage-model.test.ts` - PASS, 6 files / 80 tests.
  - `npm run lint` - PASS.
  - `npm run test` - PASS, 80 files / 603 tests.
  - `npm run build` - PASS with existing workspace-root and module-type warnings.
  - `PLAYWRIGHT_MANAGED_WEBSERVER=[REDACTED_ENV_VALUE] npm run test:e2e:chromium` - PASS, 33 tests.
  - `PLAYWRIGHT_MANAGED_WEBSERVER=[REDACTED_ENV_VALUE] npm run test:e2e:webkit` - PASS, 33 tests.
  - `python3 scripts/validate-feature-system-csv.py` - PASS with existing PRD slug warnings.
  - `npm run governance:coverage` - PASS.
  - `npm run governance:hotspots` - PASS.
  - `python3 scripts/release-governance-gate.py` - PASS.
  - `npm run governance:audit` - PASS.
  - `git diff --check` - PASS.
- Human checks:
  - Local browser QA on `http://localhost:3000/` confirmed `Top Events`, `Tech`, `Finance`, and `Politics` tabs render; `Tech News` and `Economics` tabs are absent; empty signed-out category tabs render the honest empty-state sentence without `category-soft-gate`.
  - Post-deploy production verification pending.

## Remaining Risks / Follow-up
- Cowork eliminate-list residual items remain deferred: mobile bottom nav and Developing/Updated badges.
- No backend, schema, migration, source manifest, ranking, WITM template, eligibility filter, admin surface, publish path, pipeline, or production data writes are included.
