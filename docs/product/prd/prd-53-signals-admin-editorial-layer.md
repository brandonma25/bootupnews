# PRD-53 — Signals admin editorial layer

- PRD ID: `PRD-53`
- Canonical file: `docs/product/prd/prd-53-signals-admin-editorial-layer.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Add a private in-app editorial review workflow for the public Top 5 Signals list so an authorized editor can review AI-drafted “Why it matters” copy, write the human editorial version, approve each signal, and publish the final list.

## User Problem

The site can produce ranked signal posts, but the final public “Why it matters” layer needs human editorial judgment before publication. Without an in-app workflow, review either happens outside the product or risks exposing raw AI draft copy before approval.

## Scope

- Add an environment-variable based admin/editor authorization helper using `ADMIN_EMAILS`.
- Grant admin/editor access to configured Google-authenticated users, including `brandonma25@gmail.com` when configured.
- Add `/dashboard/signals/editorial-review` as the private review route.
- Add a persisted `signal_posts` editorial model for the current Top 5 list.
- Support draft save, approval, reset to AI draft, and full-list publishing.
- Add `/signals` as the public published Top 5 Signals route.
- Ensure the public route renders `publishedWhyItMatters`, not raw AI draft copy.

## Non-Goals

- Do not replace Supabase/Google authentication.
- Do not add a separate role provider or auth stack.
- Do not implement the standalone AI draft-generation prompt/template system.
- Do not edit LLM prompt engineering files or content-generation-only utilities owned by the parallel generation task.
- Do not validate Vercel preview or production behavior from local tests alone.

## Implementation Shape / System Impact

- `src/lib/admin-auth.ts` parses comma-separated admin emails and checks the authenticated Supabase user email.
- `src/lib/signals-editorial.ts` owns server-side editorial reads and mutations. Mutations require an authenticated admin/editor and use the Supabase service-role key only after that in-app authorization check.
- `public.signal_posts` stores ranked signal metadata, AI draft reference copy, human edited copy, published copy, status, and edit/approval/publish metadata.
- RLS does not grant direct anonymous table reads. The public `/signals` route reads published rows server-side and renders only sanitized public fields.
- `/dashboard/signals/editorial-review` is noindexed and blocks unauthenticated and non-admin users.
- `/signals` shows the final published editorial layer only when all five posts have been published.

## Dependencies and Risks

- Requires Supabase tables and `SUPABASE_SERVICE_ROLE_KEY` for editorial mutation operations.
- Requires `ADMIN_EMAILS` to include the editor’s Google-auth email in each deployed environment.
- Vercel preview remains required for auth, cookies, redirects, SSR, and env-sensitive confirmation.
- Open PR #98 already edits the hotspot feature registry and adds PRD-52, so this branch uses PRD-53 and must be synced with `origin/main` after #98 lands.
- The initial current Top 5 import uses the existing briefing pipeline output as the AI draft source and does not refresh over an already edited table to avoid clobbering human work.

## Acceptance Criteria

- A Google-authenticated user whose email is listed in `ADMIN_EMAILS` can access `/dashboard/signals/editorial-review`.
- Non-admin signed-in users and unauthenticated users cannot access the review workflow.
- The page shows five ranked signal posts when the editorial table is ready.
- Each signal exposes the AI draft internally and pre-fills the editorial textarea from `editedWhyItMatters` or the AI draft.
- Editors can save drafts, approve individual posts, reset to the AI draft, and publish only after all five posts are approved.
- Publishing copies edited text into `publishedWhyItMatters` and marks all five posts as `published`.
- `/signals` displays only the final published editorial text.
- Raw `aiWhyItMatters` is not exposed on the public page.

## Evidence and Confidence

- Repo evidence used:
  - Existing Google/Supabase auth helpers in `src/lib/auth.ts` and `src/lib/supabase/server.ts`.
  - Existing signal/briefing models in `src/lib/types.ts` and `src/lib/data.ts`.
  - Existing internal route pattern in `src/app/internal/mit-review/page.tsx`.
- Confidence: Medium-high for local authorization, persistence, and rendering behavior; medium for deployed auth/env behavior until Vercel preview validation is completed.

## Closeout Checklist

- Scope completed: yes
- Tests run: `npm install`; `npm run lint || true`; `npm run test || true`; `npm run build`; browser route probe; `npx playwright test --project=chromium`; `npx playwright test --project=webkit`
- Local validation complete: yes
- Preview validation complete, if applicable: pending
- Production sanity check complete, only after preview is good: not applicable before merge
- PRD summary stored in repo: yes
- Bug-fix report stored in repo, if applicable: not applicable
- Google Sheets tracker updated and verified: no direct Sheets update performed
- If direct Sheets update is unavailable, fallback tracker-sync file created in `docs/operations/tracker-sync/` with exact manual update payload: yes
