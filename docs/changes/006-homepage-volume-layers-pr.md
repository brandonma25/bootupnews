# Homepage Volume Layers PR Note

This PR expands the public homepage beneath Top 5 Signals with two additive Experience-layer modules: Developing Now and By Category. The goal is to make the homepage feel like a populated intelligence surface that reflects the governed public-source breadth, while preserving the existing Top 5 cap, ranking path, category taxonomy, and Politics honest-empty-state behavior already established in prior homepage PRDs.

## Phase 0 — PRD and Registry

Files changed: `docs/product/prd/prd-57-homepage-volume-layers.md`, `docs/product/feature-system.csv`

Rationale: establish the canonical governance record for the recovered work on the current main branch, renumbered to `PRD-57` to preserve sequential feature tracking.

## Phase 1 — Selection Logic

Files changed: `src/lib/homepage-model.ts`, `src/lib/homepage-model.volume-layers.test.ts`

Rationale: add pure view-model helpers for Developing Now and category previews, with explicit deduplication and source-diverse freshness rules that leave ranking, manifest, and taxonomy contracts untouched.

## Phase 2 — Developing Now UI

Files changed: `src/components/home/DevelopingNow.tsx`, `src/components/home/DevelopingNow.test.tsx`, `src/components/landing/homepage.tsx`

Rationale: render a compact secondary module directly beneath Top 5 Signals using the existing lighter category-card treatment instead of introducing a new visual primitive.

## Phase 3 — By Category UI

Files changed: `src/components/home/CategoryPreviewGrid.tsx`, `src/components/home/CategoryPreviewGrid.test.tsx`, `src/components/landing/homepage.tsx`

Rationale: expose fresh category-specific volume in a fixed Tech / Finance / Politics layout while preserving honest empty states and leaving the tab strip behavior unchanged.

## Phase 4 — PR Note and Verification

Files changed: `docs/changes/006-homepage-volume-layers-pr.md`

Rationale: capture the PR-scoped narrative, validation, and product-owner checklist without competing with the canonical PRD.

## PRD Rationale Summary

The canonical spec for this work lives at `docs/product/prd/prd-57-homepage-volume-layers.md`. The selection model intentionally prefers source-diverse freshness over positions 6–15 because a simple continuation of the primary ranking would only show weaker versions of the same editorial job. Developing Now is meant to answer a different question: what is newly building from sources not already represented above.

## Rendered Homepage Before / After

Before: the public homepage showed Top 5 Signals plus the existing category tabs, with no secondary content modules beneath the hero layer.

After: the homepage keeps that top layer intact and adds Developing Now followed by a three-column By Category section beneath it. Preview deployment verification is still pending until the branch is pushed and a Vercel preview is available.

## Validation Summary

Local release validation passed on the finished branch state via `npm run release:local`. That gate ran `npm install`, `eslint`, `vitest`, `next build`, the local dev-server rule on port `3000`, Playwright Chromium, Playwright WebKit, and the local smoke-route check. The verified local URL was `http://127.0.0.1:3000`.

## Protected Areas and Invariants

This change is scoped away from the protected manifest, ingestion, ranking, taxonomy, SSR/auth, and data-surface files listed in the task prompt. It is also intended to preserve PRD-17, PRD-36, PRD-46, and PRD-54 invariants, especially the Top 5 cap, exact category key set, unchanged category-tab behavior, and Politics honest-empty-state rule.

## Blockers Encountered

No remaining blockers. The main issue encountered during implementation was a TypeScript inference error in the new category preview map, which was corrected before the final release-gate run.

## Verification Checklist for Product Owner

- Confirm Top 5 Signals still renders identically and remains capped at five.
- Confirm Developing Now appears beneath Top 5 with recent source-diverse items when supply is healthy.
- Confirm By Category renders Tech, Finance, and Politics in that fixed order.
- Confirm each category subsection shows up to three items or an honest empty-state message.
- Confirm Politics does not borrow cards from Tech or Finance.
- Confirm no event repeats across Top 5, Developing Now, and category previews.
- Confirm existing category tabs still behave as before.
