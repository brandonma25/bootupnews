# PRD-46 — Home Category Tabs

- PRD ID: `PRD-46`
- Canonical file: `docs/product/prd/prd-46-home-category-tabs.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add category-dependent Home page tabs and a lighter category card presentation for model-derived Tech, Finance, and Politics sections.

## User Problem

Readers need a way to switch between the top ranked briefing and category-specific coverage without triggering another fetch, while avoiding empty category rails when a section has no qualifying items.

## Scope

- Add `CategoryTabStrip` for Home with a default Top Events tab and hidden empty category tabs.
- Add `BriefingCardCategory` for lighter category cards that render title, what happened, and source pills from matched keywords.
- Add local shadcn-style `Tabs` and `Card` primitives.
- Extend `BriefingItem` with the proposed optional `homepageClassification` contract.
- Update `homepage-model.ts` so it prefers `item.homepageClassification?.primaryCategory` when present and falls back to computed taxonomy when absent.
- Wire the Home page to render Top Events and non-empty category sections through the new tab strip.

## Non-Goals

- Backend classification generation.
- API calls on tab selection.
- New category keys beyond `tech`, `finance`, and `politics`.
- `whyItMatters` content in category cards.
- Raw filtering by a nonexistent item-level category field.

## Implementation Shape / System Impact

The category tabs are client-side state only. `homepage-model.ts` remains the source of category sections, and the Home page passes already-derived `categorySections` into the tab strip. Category cards consume the model event shape that carries `BriefingItem` title, `whatHappened`, and `matchedKeywords`.

## Dependencies / Risks

- The live backend classification field is not shipped yet, so the model keeps the existing computed taxonomy fallback.
- PRD-43, PRD-44, and PRD-45 are active in separate unmerged branches; this branch intentionally uses PRD-46 to avoid identity collisions.
- Preview validation should confirm the Home page still renders correctly with production-like data.

## Acceptance Criteria

- Top Events is the default active tab.
- Top Events always renders as a tab.
- Tech News, Finance, and Politics tabs render only when their model-derived section has at least one item.
- Tab selection updates visible cards client-side without an API call.
- Category keys remain exactly `tech`, `finance`, and `politics`.
- Invalid category aliases and presentation-only category keys are not used.
- Category cards render title, `whatHappened`, and source pills from `matchedKeywords`.
- Category cards do not render a why-it-matters section.

## Evidence and Confidence

- Repo evidence used: `homepage-model.ts`, `homepage-taxonomy.ts`, Home page rendering, existing event card patterns, and current `BriefingItem` type.
- Confidence: High for local UI behavior and type contract; preview validation required for production-like homepage data.

## Closeout Checklist

- Scope completed: Category tab strip, lightweight category card, local Tabs/Card primitives, model contract support, Home page wiring, unit tests, and homepage Playwright smoke coverage.
- Tests run: `npm install`; `python3 scripts/validate-feature-system-csv.py`; `npm run lint || true`; `npm run test || true`; `npm run build`; homepage Playwright smoke tests in Chromium and WebKit.
- Local validation complete: Yes, `http://localhost:3000/` returned 200 locally and homepage Playwright smoke passed in Chromium and WebKit.
- Preview validation complete, if applicable: Not yet.
- Production sanity check complete, only after preview is good: Not yet.
- PRD summary stored in repo: Yes, this file.
- Bug-fix report stored in repo, if applicable: Not applicable.
- Google Sheets tracker updated and verified: Direct live Sheets update unavailable in this environment.
- If direct Sheets update is unavailable, fallback tracker-sync file created in `docs/operations/tracker-sync/` with exact manual update payload: Yes, `docs/operations/tracker-sync/2026-04-20-home-category-tabs.md`.
