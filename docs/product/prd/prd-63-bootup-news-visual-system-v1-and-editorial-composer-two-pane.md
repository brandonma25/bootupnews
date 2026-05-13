# PRD-63 — Bootup News visual system v1 and editorial composer two pane

- PRD ID: `PRD-63`
- Canonical file: `docs/product/prd/prd-63-bootup-news-visual-system-v1-and-editorial-composer-two-pane.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Align the live product with the locked Bootup News brand direction and introduce the v1 visual system across the primary reader surfaces, while rebuilding the admin editorial composer into a two-pane workflow with the final slate visible beside the candidate pool.

## User Problem

The live product still presented older Daily Intelligence naming, executive-targeted copy, incidental green states, dense card chrome, and a two-column Top 5 layout that weakened the ranked editorial thesis. Editors also had to scroll between slate slots and candidate rows when assigning the final slate.

## Scope

- Rename user-facing product copy and page metadata to Bootup News.
- Add Bootup News v1 tokens for color, typography, spacing, radius, borders, and admin status colors.
- Load Inter Tight and Source Serif 4 through `next/font/google`.
- Rework sidebar, homepage, briefing detail, signals list, history, account, and shared shell styling for the light-mode v1 system.
- Render the homepage Top 5 as a single ranked column with simplified Signal Card faces.
- Replace old card chrome with tier marker, title, Why this matters preview, source attribution, and Read more affordance.
- Demote category browsing beneath the Top 5.
- Rebuild the editorial composer as a sticky two-pane desktop layout with inline candidate WITM and inline slot assignment.
- Render the composer slot panel as a mobile collapsible drawer.

## Non-Goals

- No changes to ingestion, source pools, RSS fetching, source manifest, or source onboarding.
- No schema changes, migrations, or database state changes.
- No changes to WITM generation, validation, or quality-gate logic.
- No changes to cron, scheduling, or job orchestration.
- No changes to authentication, role gating, or admin authorization checks.
- No PRD-58 card-level editorial authority such as kill, promote, demote, replace, or source substitution.
- No dark mode.

## Implementation Shape / System Impact

- `src/app/globals.css`, `tailwind.config.ts`, and `src/app/layout.tsx` define and apply the v1 visual tokens and font variables.
- `src/components/brand/Wordmark.tsx` owns the typographic Bootup News wordmark.
- `src/components/signals/*` owns DateBadge, TierBadge, EmptyState, and SignalCard presentation contracts.
- Public routes reuse the shared SignalCard hierarchy and remove old reading-time, category pill, Details, and tag chrome from card faces.
- `/signals` remains addressable as a secondary list surface and uses compact neutral cards.
- `src/components/admin/editorial-composer/*` owns CandidateRow, SlotPanel, and the client composer shell.
- The existing editorial review route preserves authorization gates and server actions while adding inline assignment through the existing final-slate fields.

## Terminology Requirement

- Object level modified: Card and Surface Placement.
- Article, Story Cluster, Signal identity, ranking, WITM validation, and source activation are unchanged.
- Signal Cards display existing Signal data; they do not create new Signals.

## Dependencies / Risks

- Depends on PRD-36 Signal Display Cap, PRD-53 Signals admin editorial layer, and PRD-35 Why It Matters Quality.
- Local public-route screenshots may show empty states when no published slate is available; populated visual QA requires fixture data or a published slate.
- The first v1 wordmark is a Source Serif 4 typographic treatment, not a custom mark.

## Acceptance Criteria

- Sidebar and page metadata use Bootup News naming.
- Sidebar tagline reads: For people who want to understand the world, not just consume it.
- Inter Tight and Source Serif 4 load through `next/font/google`.
- Body defaults to the sans variable and WITM body copy uses the serif variable.
- Homepage Top 5 renders as one vertical ranked column.
- Signal Card faces contain only tier marker, title, Why this matters preview, source attribution, and Read more.
- Top Events is removed as a homepage tab and category browse is visually secondary.
- `/signals` is removed from primary sidebar navigation and remains a secondary direct route.
- History empty state uses the Bootup News copy and neutral outlined action.
- Editorial composer renders a sticky desktop slot panel and mobile collapsible drawer.
- Candidate rows show WITM inline and expose inline assignment plus rewrite controls.
- Rewrite-blocked candidates show warning treatment and disabled assignment.
- Publish slate is the only filled vermillion CTA.

## Evidence and Confidence

- Repo evidence used: implementation prompt, existing public routes, existing editorial review route, final-slate readiness helpers, and existing authorization gates.
- Validation record: `docs/engineering/change-records/2026-05-13-bootup-news-visual-system-v1.md`.
- Confidence: High for code-level implementation, local tests, local build, route probes, and fixture-backed visual QA. Production validation remains post-merge.

## Closeout Checklist

- Scope completed: yes
- [x] Terminology check completed: Article, Story Cluster, Signal, Card, and Surface Placement are used according to the canonical terminology document.
- [x] PRD clearly states which object level the feature modifies.
- [x] PRD does not describe UI cards as signals unless referring to the underlying Signal object.
- Tests run: `npm test`, `npm run lint`, `npm run build`, Chromium/WebKit homepage smoke.
- Local validation complete: yes
- Preview validation complete, if applicable: Vercel preview generated for PR #229.
- Production sanity check complete, only after preview is good: pending merge.
- PRD summary stored in repo: yes
- Bug-fix report stored in repo, if applicable: not applicable
- `docs/product/feature-system.csv` updated if PRD/feature metadata changed: yes
- GitHub documentation closeout completed in the canonical lane: yes
- Google Sheet / Google Work Log not treated as canonical or updated for routine closeout: yes
