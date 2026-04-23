# Signals Admin Editorial Layer — Local Validation

- Date: 2026-04-23
- Branch: `codex/signals-admin-editorial-layer`
- Worktree: `/Users/bm/Documents/worktrees/signals-admin-editorial-layer`
- Local URL: `http://localhost:3000`

## Commands Run

- `npm install`
  - Passed.
  - Reported 1 high severity dependency audit item from `npm audit`.
- `npm run lint || true`
  - Passed after fixing one lint-only test helper issue.
- `npm run test || true`
  - Passed: 52 test files, 265 tests.
  - Vitest emitted existing `--localstorage-file` warnings.
- `npm run build`
  - Passed.
  - Next.js emitted existing workspace-root and module-type warnings.
- `npm run dev`
  - Passed.
  - Local URL: `http://localhost:3000`.
- Playwright browser route probe for `/`, `/signals`, and `/dashboard/signals/editorial-review`
  - Passed.
  - All routes rendered non-empty content.
  - No framework error overlay detected.
  - No browser console errors captured.
- `npx playwright test --project=chromium`
  - Passed: 30 tests.
- `npx playwright test --project=webkit`
  - Passed: 30 tests.

## Coverage Notes

- Unit coverage validates admin email parsing, non-admin denial, admin draft save, admin approval, publish blocking, and public rendering of `publishedWhyItMatters` instead of raw AI draft copy.
- Page coverage validates unauthenticated and unauthorized editorial review states.
- Browser checks confirm the new public `/signals` route and private editorial route render locally without framework overlays.

## Follow-Up Validation — 2026-04-23

- Refreshed the worktree-local `.env.local` service-role credential from the Supabase project API keys without printing or committing the key.
- Confirmed `.env.local` remains ignored and untracked.
- Confirmed sanitized service-role diagnostics:
  - Supabase URL present.
  - Service-role key present.
  - `ADMIN_EMAILS` present.
  - Read-only `signal_posts` query succeeds.
- Added and tested an Account-page admin entry point that renders only when the signed-in user qualifies through `ADMIN_EMAILS`.
- Focused tests passed for admin auth, editorial workflow, public signals, and the Account-page admin entry point.
- `npm run lint` passed.
- `npm run build` passed and listed `/dashboard/signals/editorial-review` and `/signals` as dynamic routes.
- Local route probes from `http://localhost:3000`:
  - `/account` returns `200` and redirects unauthenticated curl requests to login.
  - `/dashboard/signals/editorial-review` returns `200` and renders the unauthenticated admin sign-in state without cookies.
  - `/signals` returns `200` and no longer logs `Invalid API key`.

## Approve All Follow-Up — 2026-04-23

- Added a top-page `Approve All` admin action on `/dashboard/signals/editorial-review`.
- The bulk action submits only eligible currently loaded posts and refreshes hidden values from the visible editorial textareas just before submit.
- Bulk approval reuses the same server-side approval update path as individual post approval and keeps the existing admin authorization gate.
- Focused tests validate:
  - `Approve All` renders enabled for eligible review posts.
  - `Approve All` is disabled when no draft or review-ready posts are eligible.
  - Admin bulk approval updates multiple posts.
  - Partial bulk approval failures report a mixed outcome instead of silently hiding failures.

## All-Posts Editorial Management Follow-Up — 2026-04-23

- Expanded `/dashboard/signals/editorial-review` into a single editorial management surface with filters for All Posts, Review Queue, Draft, Needs Review, Approved, and Published.
- Default view is All Posts so historical approved and published posts remain visible and editable.
- Review Queue remains available as a queue-scoped filter for Draft and Needs Review posts.
- `Approve All` remains intentionally queue-scoped: it applies only to visible Draft and Needs Review posts, and the server rechecks status eligibility before mutating rows.
- Saving edits now preserves Approved and Published statuses instead of moving historical posts back to Draft. Published post edits also update `published_why_it_matters`.
- Focused tests validate all-status rendering, review-queue filtering, historical approved/published editing, and server-side bulk eligibility.

## Homepage Published Editorial Override Follow-Up — 2026-04-23

- Root cause: the editorial workflow persisted manual copy to `signal_posts`, but the homepage view model was built from generated briefing items and did not read published editorial fields.
- Added a server-side homepage override layer that reads published `signal_posts.published_why_it_matters` values and applies them to matching homepage briefing items by title and source URL, with a title-only fallback for rows that do not have a source URL.
- The public homepage remains publish-gated: Draft or Approved-only `edited_why_it_matters` values are not rendered publicly unless they are promoted into `published_why_it_matters`.
- Focused tests validate generated-versus-published priority, fallback matching, no-match behavior, homepage SSR wiring, editorial persistence for published edits, and public `/signals` rendering.
- `npm run lint` passed.
- `npm run test -- src/lib/homepage-editorial-overrides.test.ts src/app/page.test.tsx src/lib/signals-editorial.test.ts src/app/signals/page.test.tsx` passed: 4 files, 14 tests.
- `npm run test` passed: 55 files, 280 tests.
- `npm run build` passed and listed `/`, `/signals`, and `/dashboard/signals/editorial-review` as server-rendered routes.
- `npx playwright test --project=chromium` passed: 30 tests.
- Local HTTP route probes from `http://localhost:3000`:
  - `/` returns `200`.
  - `/signals` returns `200`.
  - `/dashboard/signals/editorial-review` returns `200`.

## Editorial Publish State Follow-Up — 2026-04-23

- Root cause: card-level approval set a post to `approved`, while homepage visibility requires `published_why_it_matters` on a `published` row. The top-level publish action required all five Top 5 rows to be exactly `approved`, so a normal mixed state of one newly Approved edit plus four already Published rows blocked publishing.
- Added a per-card `Publish` action for Approved posts so historical/all-post edits have a clear path from `approved` to `published` without relying on the Top 5 bulk publish contract.
- Updated Top 5 publishing to accept rows that are either Approved or already Published, then writes the best available editorial text into `published_why_it_matters` and sets each row to Published.
- Updated mutation revalidation to include `/`, `/signals`, and `/dashboard/signals/editorial-review`.
- Focused tests validate:
  - edit/approve/publish state progression for an individual historical post.
  - blocked individual publishing before approval.
  - mixed Approved plus Published Top 5 publishing.
  - disabled-state messaging for Draft rows blocking publish.
  - per-card Publish button visibility for Approved rows.
- `npm run lint` passed.
- `npm run test -- src/lib/signals-editorial.test.ts src/app/dashboard/signals/editorial-review/page.test.tsx src/lib/homepage-editorial-overrides.test.ts src/app/page.test.tsx` passed: 4 files, 25 tests.
- `npm run test` passed: 55 files, 286 tests.
- `npm run build` passed after the Supabase result cast was aligned with existing server-helper casting.
- Dev server restarted from this worktree at `http://localhost:3000`.
- Local HTTP route probes returned `200` for `/`, `/signals`, and `/dashboard/signals/editorial-review`.
- `npx playwright test --project=chromium` had one transient route-traversal timeout while 29 tests passed; rerunning `npx playwright test tests/audit/route-traversal.spec.ts --project=chromium` passed.
- `npx playwright test --project=webkit` passed: 30 tests.

## Homepage Editorial Preview Follow-Up — 2026-04-23

- Root cause: the homepage model preserved generated copy as a single sentence by calling `summarize(value, 1)` inside `sanitizeWhyItMatters`, and published editorial overrides were flowing through that same model path. The database override remained full text, but the homepage view model reduced it before rendering.
- Updated the homepage model to preserve full text when a briefing item is a published editorial override.
- Added a card-level `WhyItMattersPreview` UI that shows long notes with a `line-clamp-3` preview and inline `Read more` / `Show less` controls. The full text remains the single source of truth in the rendered card content.
- Short notes do not show expand/collapse controls.
- Focused tests validate:
  - full published editorial text survives the homepage model.
  - generated copy remains concise.
  - long published editorial text is collapsed by default in the UI.
  - `Read more` expands to the full note.
  - `Show less` returns to the preview state.
  - short notes do not render unnecessary controls.
- `npm run lint` passed.
- `npm run test -- src/components/landing/homepage.test.tsx src/lib/homepage-model.test.ts src/lib/homepage-editorial-overrides.test.ts src/app/page.test.tsx` passed: 4 files, 38 tests.
- `npm run test` passed: 55 files, 291 tests.
- `npm run build` passed.
- Dev server restarted from this worktree at `http://localhost:3000`.
- Local HTTP route probes returned `200` for `/`, `/signals`, and `/dashboard/signals/editorial-review`.
- `npx playwright test --project=chromium` passed: 30 tests.
- `npx playwright test --project=webkit` passed: 30 tests.

## Homepage Expanded Editorial Readability Follow-Up — 2026-04-23

- Root cause: the expanded homepage `Why it matters` state rendered the full editorial note as one dense paragraph. Data correctness and expand/collapse behavior were already working; the issue was visual hierarchy and text chunking.
- Updated expanded rendering to show long editorial content as paragraph sections with improved line-height, section spacing, a subtle left rule, and stronger label styling.
- Added deterministic display-only formatting:
  - explicit blank-line paragraphs are preserved when present.
  - otherwise, expanded long-form text with three or more sentences is split into sentence paragraphs.
  - collapsed preview still uses the same full text with `line-clamp-3`.
- This formatting does not rewrite, summarize, store, or mutate the editorial source text.
- Focused tests validate:
  - expanded long-form editorial copy renders as readable paragraph sections.
  - preview/collapse behavior still works.
  - short content remains clean without expand controls.
  - full published editorial source-of-truth behavior remains unchanged.
- `npm run lint` passed.
- `npm run test -- src/components/landing/homepage.test.tsx src/lib/homepage-model.test.ts src/lib/homepage-editorial-overrides.test.ts src/app/page.test.tsx` passed: 4 files, 39 tests.
- `npm run test` passed: 55 files, 292 tests.
- `npm run build` passed.
- Dev server restarted from this worktree at `http://localhost:3000`.
- Local HTTP route probes returned `200` for `/`, `/signals`, and `/dashboard/signals/editorial-review`.
- `npx playwright test --project=chromium` passed: 30 tests.
- `npx playwright test --project=webkit` passed: 30 tests.

## Preview-Required Checks

- Confirm Google OAuth login with an email listed in `ADMIN_EMAILS`.
- Confirm the admin-only Account-page `Editorial Review` link appears for `brandonma25@gmail.com` and remains hidden for non-admin users.
- Confirm non-admin Google-authenticated users cannot access `/dashboard/signals/editorial-review`.
- Confirm server actions persist drafts, approvals, reset, and publish state against the preview Supabase database.
- Confirm historical Approved and Published posts can be edited from the All Posts view without losing their status.
- Confirm Approved cards show a per-card Publish action and become visible on homepage after publishing.
- Confirm a published signal edited from the editorial page updates the matching homepage signal card after refresh.
- Confirm a long published editorial note on the homepage defaults to a short preview, expands with `Read more`, and collapses with `Show less`.
- Confirm expanded long-form editorial content is visually chunked and easier to scan than a single wall of text.
- Confirm structured homepage preview, thesis, and section fields can be edited, approved, published, and then rendered on the homepage as collapsed preview plus expanded structured sections.
- Confirm older legacy single-block editorial content still renders sensibly when no structured payload exists.
- Confirm `/signals` reads published rows through the server-side sanitized public route in preview.
- Confirm env-sensitive behavior with `ADMIN_EMAILS` and `SUPABASE_SERVICE_ROLE_KEY` configured in Vercel preview.

## Structured Editorial Authoring Follow-Up — 2026-04-23

- Added structured homepage editorial authoring fields for collapsed preview, thesis/opening statement, and fixed section title/body slots.
- Added admin-side preview simulation for collapsed and expanded homepage states.
- Added nullable `jsonb` payload columns for edited and published structured editorial content while preserving legacy text fields.
- Applied migration `20260423120000_signal_posts_structured_editorial_payload.sql` to the linked Supabase project after confirming it was pending in remote migration history.
- Homepage collapsed cards now use the explicit editor-authored preview when published structured content exists.
- Homepage expanded cards render the structured thesis and sections when available, with legacy single-block editorial text still supported as fallback.
- Focused tests validate:
  - structured editorial form rendering and hidden server-action payload sync.
  - all-post editorial page rendering with structured fields.
  - structured payload persistence through draft, approval, and publish actions.
  - structured homepage override bridge behavior.
  - structured collapsed homepage preview and expanded thesis/section rendering.
- `npm run lint` passed.
- `npm run test -- src/app/dashboard/signals/editorial-review/StructuredEditorialFields.test.tsx src/app/dashboard/signals/editorial-review/page.test.tsx src/app/dashboard/signals/editorial-review/ApproveAllButton.test.tsx src/lib/signals-editorial.test.ts src/lib/homepage-editorial-overrides.test.ts src/components/landing/homepage.test.tsx src/lib/homepage-model.test.ts src/app/page.test.tsx` passed: 8 files, 70 tests.
- `npm run test` passed: 56 files, 301 tests.
- `npm run build` passed and listed `/`, `/signals`, and `/dashboard/signals/editorial-review` as server-rendered routes.
- Dev server restarted from this worktree at `http://localhost:3000`.
- Local HTTP route probes returned `200` for `/`, `/signals`, and `/dashboard/signals/editorial-review`; after applying the migration, the prior missing-column warning for structured payload fields no longer appeared.
- `npx playwright test --project=chromium` initially reported 27 passed and 3 route/navigation timing failures; rerunning the exact failures with `npx playwright test tests/audit/route-traversal.spec.ts tests/dashboard.spec.ts:59 tests/routes/core-routes.spec.ts --project=chromium` passed: 9 tests.
- `npx playwright test --project=webkit` initially reported 25 passed, 2 route/navigation timing failures, and 3 tests skipped after the first failure; rerunning the exact failures with `npx playwright test tests/audit/route-traversal.spec.ts tests/dashboard.spec.ts:20 --project=webkit` passed: 2 tests.

## Homepage Editorial Preview Truncation Follow-Up — 2026-04-23

- Root cause: collapsed homepage `Why it matters` rendered the full editorial note and relied on `line-clamp-3`, allowing browser clipping to end previews mid-word.
- Updated collapsed rendering to use a code-generated preview string that prefers complete sentence boundaries and cleans stored pre-truncated snippets so the summary box does not end with broken `...` text.
- Expanded rendering still shows the full editorial text and preserves the existing `Read more` / `Show less` interaction.
- `npm run test -- src/components/landing/homepage.test.tsx src/app/dashboard/signals/editorial-review/StructuredEditorialFields.test.tsx` passed: 2 files, 23 tests.
- `npm run lint` passed.
- `npm run build` passed.
- Local browser verification at `http://localhost:3000/` found five collapsed homepage `Why it matters` boxes; all five ended with complete sentence punctuation and none contained literal `...` or `…`.
- `npx playwright test --project=chromium` reported 27 passed and 3 unrelated route/navigation wait failures.

## Human-Only Checks

- Real Google OAuth provider flow.
- Session persistence after refresh.
- Signed-in versus signed-out truth across navigation.
- Final editorial judgment on the published Top 5 copy.
