# Per-Card Depth & Bulk Composer — Release Brief

## Objective
- Complete the visual-system v1 intent shipped in PR #229 by moving Signal Card depth from a per-briefing detail surface into per-card inline expansion on the homepage.
- Make the editorial composer's approve and publish gates bulk-aware so the editor's per-row friction does not block scaled workflow without losing the two-step approve → publish gate.

## Change Type
- Remediation / Alignment (per `docs/engineering/templates/llm-prompt-template-change-classification.md`).
- Canonical PRD required: `no`. This brief is the supporting governance artifact; the source of truth is PR #229 (visual system v1) plus `DECISIONS.md` D04, D05, and D06. The audit/remediation lineage is the visual-system-v1 implementation itself, which this work aligns the homepage Signal Card surface and the editorial composer back to.

## Source of Truth
- PR #229 — visual system v1 implementation that introduced the four-layer depth structure on `SignalCard` and the `/briefing/[date]` aggregate page.
- `DECISIONS.md` D04 — seven-slot public slate (Top 5 Core + Next 2 Context).
- `DECISIONS.md` D05 — Explain why it matters; each public Signal needs causal reasoning, not only a summary.
- `DECISIONS.md` D06 — Separate generation from publication; preserve the approve → publish two-gate workflow.

## Terminology Requirement
- Read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- Object level modified:
  - Change 1: **Card** — the UI rendering of a Signal. The underlying Signal identity, ranking, and selection logic are unchanged.
  - Change 2: **Surface Placement / editorial workflow** — the editorial composer surface that gates which approved Signals become live on the public Surface Placement. Signal identity is unchanged.
- [x] Confirmed object level before coding: Card (Change 1), Surface Placement / editorial workflow (Change 2).
- [x] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [x] Legacy naming preserved: `EditorialSignalPost`, `signal_posts` storage table, and the existing server actions are referenced by their canonical names without expansion.

## Scope
- Per-card inline depth expansion on the homepage Signal Cards.
  - Each card owns its expansion state and renders an `Expand ↓` / `Collapse ↑` toggle in the footer, replacing the `Read more →` link for top events.
  - "What happened" depth section renders in sans; "Why this matters", "What led to this", and "What it connects to" render in serif.
  - "What led to this" renders an italic placeholder when underlying data is empty.
  - The `/briefing/[date]` route renders all cards expanded by default via `defaultExpanded={true}`.
  - The compact category cards on the homepage keep the legacy `Read more →` link behavior; they are out of scope.
- Editorial composer bulk approve + sync publish.
  - Bulk approve button at the top of the Candidate pool labeled `Approve all WITM-passed`, gated on WITM validator passed + slot assignment + not already approved + storage ready + non-blocking editorial decision.
  - Slot panel publish summary line: `N approved · M pending publish · K already live`.
  - Publish slate button label is now dynamic (`Publish N candidates`) and is disabled when zero candidates are pending publish.
  - Publish slate opens a confirmation dialog showing the total count, tier breakdown, and scrollable title list before the existing `publishFinalSlateAction` server action runs.

## Explicit Exclusions
- No schema changes. Reuses existing columns (`editorial_status`, `final_slate_rank`, `is_live`, `published_at`, `why_it_matters_validation_status`) and existing server actions (`approveAllSignalPostsAction`, `publishFinalSlateAction` → `publishApprovedSignals`).
- No WITM validator logic, rewrite flow, or quality-gate logic changes.
- No authentication, admin role gating, or admin route protection changes.
- No changes to the visual-system tokens shipped in PR #229 (colors, fonts, spacing).
- No new vermillion accent in the expanded card state. The Publish all primary action in the confirmation dialog reuses the existing accent role.
- Compact category Signal Cards on the homepage are intentionally not converted to interactive expansion; that decision can revisit later if engagement data supports it.

## Acceptance Criteria
- [x] Homepage Signal Card has expand/collapse affordance per card. Affordance is `Expand ↓` / `Collapse ↑` in the card footer.
- [x] Expanding a card renders four depth sections in order: What happened, Why this matters, What led to this, What it connects to.
- [x] "What happened" body uses `font-sans` (source-headline treatment); the other three use `font-heading` (serif editorial treatment).
- [x] "What led to this" renders even when the underlying data is empty, with an italic placeholder in `var(--bu-text-tertiary)`.
- [x] Expand/collapse is local React state; no URL change occurs.
- [x] Multiple cards can be expanded simultaneously.
- [x] `/briefing/[date]` route still works and renders all cards expanded by default.
- [x] No second vermillion element added to the expanded card state.
- [x] Editorial composer has `Approve all WITM-passed` button at the top of the Candidate pool.
- [x] Bulk approve only affects candidates where WITM passed AND the candidate is assigned to a slot.
- [x] Bulk approve never affects rewrite-flagged candidates.
- [x] Bulk approve is disabled with a tooltip when zero candidates qualify.
- [x] Slot panel shows summary line `N approved · M pending publish · K already live` with live counts.
- [x] Publish slate button is disabled when zero candidates are pending publish.
- [x] Publish slate triggers a confirmation dialog showing count, tier breakdown, and title list before the server action runs.
- [x] Confirmation dialog has `Publish all` (vermillion) and `Cancel` (outlined) actions.
- [x] No schema changes.
- [x] No WITM validator logic changes.
- [x] No authentication or role gating changes.
- [x] Lint, typecheck, build, tests all pass (recorded in PR body).

## Risks
- Auth or session risk: none. No auth surfaces are touched. No human auth/session validation required for this PR beyond the standard preview smoke.
- SSR versus client mismatch risk: `SignalCard` is now a client component because it owns local expansion state. Server pages that render `SignalCard` continue to work because Next.js App Router permits server components to import and render client components. Both `homepage.tsx` and `BriefingDetailView.tsx` were already `"use client"` so no SSR boundary regression there. `/signals/page.tsx` renders compact `SignalCard`s through the legacy controlled-expansion path; this also still works.
- Environment mismatch risk: none. No environment variables, secrets, or config changes.
- Data edge case risk: empty `What led to this` data renders an italic placeholder by design; empty `What happened` or `What it connects to` sections continue to be suppressed to avoid empty boxes on the card face.
- Regression risk: medium-low. The `eligibleForApproveAll` prop on `StructuredEditorialFields` is now vestigial after the bulk-approve form lifted up to `EditorialComposerClient`. The prop is preserved in the component contract so existing tests still pass; the `data-approve-all-*` data attributes that the legacy DOM-scrape relied on are removed. A future scoped cleanup can drop the vestigial prop.

## Testing Requirements
- Local validation: lint, typecheck, unit/integration tests, build, and Playwright Chromium + WebKit smoke runs. Results recorded in the PR body.
- Preview validation: standard homepage + dashboard route probe after Vercel preview is available.
- Production sanity: post-merge `/` + `/briefing/[date]` + `/dashboard/signals/editorial-review` smoke check.

## Documentation Updates Required
- This brief: `docs/product/briefs/per-card-depth-and-bulk-composer.md`.
- No update to `docs/product/feature-system.csv` — no PRD/feature metadata changed.
- PR body holds the validation evidence and screenshots.
