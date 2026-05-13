# Editorial Panel Default Collapse

## GitHub Source-of-Truth Metadata
- Affected object level: Card and Surface Placement.
- PR: #110, `https://github.com/brandonma25/bootupnews/pull/110`.
- Branch: `fix/editorial-panel-collapse`.
- Head SHA: `ef6cb23beb80c8555326890e5fbcfc9340888126`.
- Merge SHA: `55bf58cb7ed65a09f84f4a112da24b93d4653784`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #110 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Problem

The editorial review page rendered every article's editorial editing panel fully expanded on load. Older and historical articles were difficult to scan because each card included all editable fields, preview simulation, and action controls immediately.

## Cause

The per-article editor rendered the card summary and the full editorial form as one always-visible block. There was no per-card expanded state or explicit control for opening only the article an editor wanted to edit.

## Fix

Added a client-side `SignalPostEditor` card with per-article collapsed state. Cards now keep title, source, status metadata, summary, selection reason, and AI reference visible by default, while the existing editorial fields and save/approve/publish/reset controls remain mounted but hidden until the editor clicks `Expand`. Expanded cards show a `Collapse` control that hides the panel again without remounting the local editing state.

## Files Changed

- `src/app/dashboard/signals/editorial-review/StructuredEditorialFields.tsx`
- `src/app/dashboard/signals/editorial-review/page.tsx`
- `src/app/dashboard/signals/editorial-review/page.test.tsx`
- `docs/engineering/bug-fixes/editorial-panel-default-collapse.md`

## Testing Performed

- `npm install` — completed in the clean `fix/editorial-panel-collapse` worktree.
- `npm run test -- src/app/dashboard/signals/editorial-review/page.test.tsx` — passed, including default-collapsed multi-card coverage and expand/collapse behavior.
- `npm run lint` — passed.
- `npm run build` — passed.
- `npm run test` — passed, 62 test files and 364 tests.
- Local route smoke against `http://localhost:3000/dashboard/signals/editorial-review` — returned 200 and showed the admin sign-in gate without an authenticated local admin session.
- Local browser smoke against `http://localhost:3000/dashboard/signals/editorial-review` and `http://localhost:3000/` — rendered the admin gate and homepage main content with no browser console errors.

## Risks / Follow-up

- Local form state is preserved while collapsing because the panel stays mounted and is only hidden.
- Authenticated editorial access still depends on admin session and environment configuration; preview validation remains the source of truth for deployed auth/session behavior.
- No database schema, save/approve/reset logic, ranking, source selection, or homepage rendering changes were made.
