# PRD-53 — Signals admin editorial layer

- PRD ID: `PRD-53`
- Canonical file: `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add a private in-app editorial review workflow for the public Top 5 Signals list so an authorized editor can review AI-drafted “Why it matters” copy, write the human editorial version, approve each signal, and publish the final list.

The published homepage experience must use the human editorial layer as the source of truth while keeping the collapsed “Why it matters” summary box readable, intentional, and sentence-complete across all five homepage editorial cards.

## User Problem

The site can produce ranked signal posts, but the final public “Why it matters” layer needs human editorial judgment before publication. Without an in-app workflow, review either happens outside the product or risks exposing raw AI draft copy before approval.

## Scope

- Add an environment-variable based admin/editor authorization helper using `ADMIN_EMAILS`.
- Grant admin/editor access to configured Google-authenticated users, including `brandonma25@gmail.com` when configured.
- Add `/dashboard/signals/editorial-review` as the private review route.
- Add a persisted `signal_posts` editorial model for the current Top 5 list and its historical daily snapshots.
- Support draft save, approval, reset to AI draft, and full-list publishing.
- Add `/signals` as the public published Top 5 Signals route.
- Ensure the public route renders `publishedWhyItMatters`, not raw AI draft copy.
- Support lightweight structured editorial authoring for homepage preview, thesis, and sectioned expanded copy.
- Preserve legacy single-block editorial copy as a safe fallback when structured content is absent.
- Render homepage `Why it matters` cards with collapsed previews that end at complete sentence boundaries and expand inline to the full published editorial note.
- Clean pre-truncated stored snippets so collapsed summaries do not end with broken `...` fragments such as `wa...`.
- Support admin filtering for current versus historical daily Top 5 sets, status, briefing date, and text search with paginated results.

## Non-Goals

- Do not replace Supabase/Google authentication.
- Do not add a separate role provider or auth stack.
- Do not implement the standalone AI draft-generation prompt/template system.
- Do not edit LLM prompt engineering files or content-generation-only utilities owned by the parallel generation task.
- Do not validate Vercel preview or production behavior from local tests alone.

## Implementation Shape / System Impact

- `src/lib/admin-auth.ts` parses comma-separated admin emails and checks the authenticated Supabase user email.
- `src/lib/signals-editorial.ts` owns server-side editorial reads and mutations. Mutations require an authenticated admin/editor and use the Supabase service-role key only after that in-app authorization check.
- `public.signal_posts` stores daily Top 5 signal snapshots with briefing-date scope, AI draft reference copy, human edited copy, published copy, status, and edit/approval/publish metadata.
- The latest briefing date is the admin "current" working set; older dates remain editable as historical archive rows.
- A row-level `is_live` flag protects the homepage and public `/signals` route from historical overflow. Only the explicitly live published set can power public surfaces.
- RLS does not grant direct anonymous table reads. The public `/signals` route reads published rows server-side and renders only sanitized public fields.
- `/dashboard/signals/editorial-review` is noindexed and blocks unauthenticated and non-admin users.
- `/signals` shows the final published editorial layer only when all five posts have been published.
- Homepage Top 5 cards receive published editorial overrides through the homepage model and render collapsed summaries with a shared intentional-preview helper.
- Structured editorial payloads take priority when present: the explicit preview controls the collapsed state, and thesis plus sections control the expanded state.
- Legacy published text remains supported and is split into readable expanded paragraphs without creating a second canonical summary field.
- The admin preview simulation uses the same sentence-complete preview helper as the homepage so editors see the same collapsed behavior before publishing.

## Dependencies and Risks

- Requires Supabase tables and `SUPABASE_SERVICE_ROLE_KEY` for editorial mutation operations.
- Requires `ADMIN_EMAILS` to include the editor’s Google-auth email in each deployed environment.
- Vercel preview remains required for auth, cookies, redirects, SSR, and env-sensitive confirmation.
- Open PR #98 already edits the hotspot feature registry and adds PRD-52, so this branch uses PRD-53 and must be synced with `origin/main` after #98 lands.
- Historical archive expansion is forward-safe but only as complete as the currently persisted signal snapshots. Production did not previously store a global historical archive beyond the live Top 5 set.
- The current Top 5 import uses the existing briefing pipeline output as the AI draft source and inserts only missing rows for the latest briefing date to avoid clobbering human work.
- The preview cleanup is display-layer remediation. It must not rewrite stored editorial text, ranking inputs, source ingestion, or AI-generation templates.

## Acceptance Criteria

- A Google-authenticated user whose email is listed in `ADMIN_EMAILS` can access `/dashboard/signals/editorial-review`.
- Non-admin signed-in users and unauthenticated users cannot access the review workflow.
- The page shows five ranked signal posts when the editorial table is ready.
- Each signal exposes the AI draft internally and pre-fills the editorial textarea from `editedWhyItMatters` or the AI draft.
- Editors can save drafts, approve individual posts, reset to the AI draft, and publish only after all five posts are approved.
- Publishing copies edited text into `publishedWhyItMatters` and marks all five posts as `published`.
- `/signals` displays only the final published editorial text.
- Raw `aiWhyItMatters` is not exposed on the public page.
- The homepage uses published manual editorial content when available.
- Admins can browse the historical daily Top 5 archive without loading an unbounded dataset, using current versus historical filters plus pagination.
- The current working set can coexist with an older live published set until the full latest Top 5 is published.
- Homepage/public Top 5 behavior remains capped to the explicitly live published set and does not spill over into historical rows.
- Each of the five collapsed homepage `Why it matters` summary boxes ends with complete sentence punctuation and does not show broken terminal `...` snippets.
- `Read more` expands inline to the full published editorial note, and `Show less` returns to the clean collapsed preview.
- Short complete notes do not show unnecessary expand/collapse controls.

## Evidence and Confidence

- Repo evidence used:
  - Existing Google/Supabase auth helpers in `src/lib/auth.ts` and `src/lib/supabase/server.ts`.
  - Existing signal/briefing models in `src/lib/types.ts` and `src/lib/data.ts`.
  - Existing internal route pattern in `src/app/internal/mit-review/page.tsx`.
  - Homepage editorial rendering path in `src/components/landing/homepage.tsx` and shared structured editorial utilities in `src/lib/editorial-content.ts`.
- Confidence: High for local editorial rendering after automated and human homepage checks; medium for deployed auth/env behavior until Vercel preview validation is completed.

## Closeout Checklist

- Scope completed: yes
- Tests run: `npm install`; `npm run lint`; focused homepage/editorial preview tests; targeted server-page reruns; `npm run build`; local browser homepage proof; `npx playwright test --project=chromium`
- Local validation complete: yes
- Preview validation complete, if applicable: pending
- Production sanity check complete, only after preview is good: not applicable before merge
- PRD summary stored in repo: yes
- Bug-fix report stored in repo, if applicable: yes, `docs/engineering/bug-fixes/homepage-editorial-preview-truncation.md`
- Google Sheets tracker updated and verified: no direct Sheets update performed
- If direct Sheets update is unavailable, fallback tracker-sync file created in `docs/operations/tracker-sync/` with exact manual update payload: yes
