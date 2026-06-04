# PRD-69 — SignalCard Server-Render + Deferred Interactivity Hydration

- PRD ID: `PRD-69`
- Canonical file: `docs/product/prd/prd-69-signalcard-server-render-deferred-hydration.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Stop the homepage's expanded Signal Cards from hydrating their heavy editorial content on the client, while keeping them server-rendered and visually expanded by default. This removes the foldback-v2 hydration weight from the homepage critical path without any visual change.

## User Problem

Field Core Web Vitals on `/` regressed to **FCP 3.92s / LCP 5.91s** (Vercel Speed Insights, RES 60) with a healthy **TTFB of 0.16s** — render-blocking/hydration cost on the client, not the server. The May 24 foldback-v2 change (#275/#277/#279) made all five homepage cards render fully expanded with three dense editorial layers each (~3× the per-card DOM). Because `LandingHomepage` is a `"use client"` component, every card hydrated as part of the homepage's client tree, so that tripled DOM all reconciled on the main thread on load. React has no partial hydration within a single client tree, so the only way to stop the card content from hydrating — while keeping it server-rendered and expanded — is to move it across an RSC boundary.

## Scope

### Must Do

- Convert `SignalCard` (`src/components/signals/SignalCard.tsx`) into a Server Component. It computes the derived editorial strings (all pure) and composes the badge / title / teaser / foldback slots as server-rendered React nodes.
- Add a small `"use client"` island, `SignalCardInteractive` (`src/components/signals/SignalCardInteractive.tsx`), that owns ONLY the interactive shell: the `<article>` element, the expand/collapse `useState`, and the footer toggle button. The badge / title / teaser / foldback are passed in as already-server-rendered slots (RSC payload), so they are not re-hydrated.
- Render the homepage's top Signal Cards in the Server Component route (`src/app/page.tsx`) and pass them into the client `LandingHomepage` as a `signalCards` prop, so the card content is RSC payload rather than client-tree JSX.
- Add a shared `selectHomepageTopEvents(viewModel)` selector (`src/lib/homepage-model.ts`) used by both the route (renders cards) and the client shell (needs the count) so the two cannot diverge.
- Non-interactive cards (compact cards on `/signals`, read-more cards) render fully statically with no island and no hydration.

### Must Not Do

- Do NOT collapse cards by default or change the expand-by-default product decision. Cards must render expanded in SSR.
- Do NOT introduce a collapse-then-expand flash or any layout shift (CLS must stay 0).
- Do NOT change card markup, styling, or behavior. The rendered DOM must be byte-identical to the previous monolithic client component.
- Do NOT change the briefing-detail route's behavior (it is a `"use client"` parent and is not the regression surface; it keeps the current client-render path).

## Success Criteria

- Homepage SSR HTML still contains all top cards expanded (`data-signal-expanded="true"`) with all three editorial layers — verified readable with JavaScript disabled.
- The expand/collapse toggle still works (collapse → re-expand) once the island hydrates.
- CLS on `/` is 0; no hydration-mismatch console errors.
- The homepage's heavy card content (the three editorial layers) is RSC payload, not part of the homepage client hydration tree.
- Rendered HTML byte size is unchanged versus the previous implementation (no payload regression).

## Done When

- `SignalCard` is a Server Component; `SignalCardInteractive` is the only hydrated part of an interactive card.
- `src/app/page.tsx` renders the cards and passes them to `LandingHomepage` via `signalCards`.
- `selectHomepageTopEvents` is exported and unit-tested.
- Lint, full unit suite, build, and Chromium + WebKit e2e pass.
- Playwright verification confirms SSR-expanded cards (JS disabled), working toggle (JS enabled), and CLS 0.

## Implementation Shape / System Impact

- **No schema / data changes.** Pure client/server component restructuring.
- `SignalCard.tsx`: drops `"use client"`, splits interactive shell to the island, keeps all pure helpers (`stripCitationMarkers`, layer readers, source attribution) server-side.
- `SignalCardInteractive.tsx`: new client island; markup copied verbatim from the previous component so output is identical.
- `page.tsx`: renders top cards server-side; `homepage.tsx`: accepts `signalCards` prop, no longer imports `SignalCard`.
- `homepage-model.ts`: adds `selectHomepageTopEvents` + `HOMEPAGE_TOP_EVENTS_LIMIT`.
- Briefing detail and `/signals` are unaffected in behavior; `/signals` compact cards additionally become fully static (a free win).

## Verification

- Unit: `homepage.test.tsx` (cards built the way the route builds them; collapse/re-expand still passes), `selectHomepageTopEvents` tests, `page.test.tsx` mock updated. Full suite green (824).
- Build: production build green. Homepage HTML byte-identical to origin/main (109,699 B uncompressed / 30,056 B gzipped, same content) with identical data.
- Playwright: JS-disabled load shows 4 expanded cards with foldback content; JS-enabled load toggles collapse→re-expand; CLS = 0; no bad `/_next/` requests on a clean server.

## Non-Goals

- The Sentry replay deferral (separate PR) and the throttled perf gate (separate PR) are tracked independently.
- Briefing-detail hydration optimization is out of scope (not the regression surface).

## Lineage

**Fixes the regression introduced by:** PRD-66 / #275 / #277 / #279 (three-layer foldback render), which added the per-card hydration weight.

**Descends from (PRDs):** PRD-17 (homepage intelligence surface), PRD-66 (three-layer publish pipeline / foldback render).

## Operational History

- 2026-06-04: Initial implementation. RSC content-as-children split chosen after confirming `LandingHomepage` is a hookless `"use client"` shell and React offers no partial hydration within one client tree. Verified byte-identical HTML + CLS 0 before opening the PR.
