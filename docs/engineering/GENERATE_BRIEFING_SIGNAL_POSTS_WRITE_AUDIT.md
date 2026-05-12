# generateBriefingAction signal_posts Write Audit

Date: 2026-04-26
Branch: `docs/terminology-runtime-semantic-audit`
Scope: Read-only code-path verification plus documentation update.

## Summary

`generateBriefingAction()` can write to global `signal_posts` rows through `persistSignalPostsForBriefing()`.

No currently routed non-editorial UI path was found that renders the form caller for `generateBriefingAction()`. The only static form caller is in the legacy `PersonalizedDashboard` path, and current `/dashboard` route handling redirects to `/`.

If the legacy dashboard/manual refresh path is reactivated, a signed-in non-editorial user could trigger global `signal_posts` persistence. Those writes are not publicly published by themselves: inserted rows are `editorial_status = "needs_review"` and lack published copy. However, they may be inserted with `is_live = true` when creating a new daily snapshot.

Severity: low.

Code changes required before MVP: no, based on the current routed app surface. A code change is recommended before any reactivation of the legacy manual refresh dashboard path.

## Files Inspected

- `src/app/actions.ts`
- `src/components/dashboard/manual-refresh-trigger.tsx`
- `src/components/dashboard/personalized-dashboard.tsx`
- `src/app/dashboard/page.tsx`
- `src/lib/signals-editorial.ts`
- `src/app/dashboard/signals/editorial-review/actions.ts`
- `src/app/dashboard/signals/editorial-review/page.tsx`
- `src/lib/homepage-editorial-overrides.ts`
- `src/lib/data.ts`
- `src/lib/signals-editorial.test.ts`
- Historical change-record and validation evidence for the signals admin editorial layer was preserved as operational evidence. The durable public interpretation is captured in the relevant PR, product source-of-truth docs, or DECISIONS.md.

Searches run:

- `rg -n "generateBriefingAction|persistSignalPostsForBriefing|signal_posts|SignalPost|signals-editorial|getHomepageSignalSnapshot|getPublishedSignalPosts" -S src docs supabase`
- `rg -n "ManualRefreshTrigger|PersonalizedDashboard|generateBriefingAction" -S src`

## Write-Path Summary

### Server Action

File: `src/app/actions.ts`

Function: `generateBriefingAction()`

Behavior:

1. Requires Supabase configuration.
2. Requires an authenticated action session through `requireActionSession("/dashboard?demo=1", "generateBriefingAction")`.
3. Loads the current user's topics and active sources.
4. Persists raw articles and user briefing data.
5. Calls `persistSignalPostsForBriefing({ briefingDate, items: briefing.items })`.

Authorization level:

- Signed-in user required.
- No admin/editor authorization check is performed inside `generateBriefingAction()`.

### signal_posts Persistence

File: `src/lib/signals-editorial.ts`

Function: `persistSignalPostsForBriefing()`

Behavior:

1. Creates a Supabase service-role client.
2. Converts `BriefingItem[]` into signal-post candidates through `buildSignalPostCandidates()`.
3. Inserts missing rows into `signal_posts`.
4. Inserts rows with `editorial_status = "needs_review"`.
5. Inserts rows without `published_why_it_matters`.
6. May set inserted rows to `is_live = true` when there are no existing rows for that briefing date and the new snapshot becomes the active live set.

Object level:

- Surface Placement plus Card copy/public read model.
- Not canonical Signal identity.

Operational contract:

- `docs/engineering/SIGNAL_POSTS_OPERATIONAL_CONTRACT.md`

### Public Read Requirements

File: `src/lib/signals-editorial.ts`

Functions:

- `getPublishedSignalPosts()`
- `getHomepageSignalSnapshot()`
- internal `loadPublishedSignalPosts()`

Public read behavior:

- Public readers require `is_live = true`.
- Public readers require `editorial_status = "published"`.
- Public readers filter out rows without `publishedWhyItMatters`.

Therefore rows inserted by `generateBriefingAction()` are not public published rows by default.

### Editorial Publish Path

Files:

- `src/app/dashboard/signals/editorial-review/actions.ts`
- `src/lib/signals-editorial.ts`
- `src/app/dashboard/signals/editorial-review/page.tsx`

Functions:

- `approveSignalPost()`
- `approveSignalPosts()`
- `publishApprovedSignals()`
- `publishSignalPost()`
- `getAdminEditorialContext()`

Behavior:

- Editorial mutation functions use `getAdminEditorialContext()`.
- `getAdminEditorialContext()` requires a signed-in user and `isAdminUser(user)`.
- The editorial page renders unauthenticated and unauthorized states for non-admin users.

This is the admin/editor-gated path that can move rows from draft/review/approved states into published public card rows.

## Reachability Findings

### Which Files/Functions Can Call generateBriefingAction()

Static code search found one direct UI form caller:

- `src/components/dashboard/manual-refresh-trigger.tsx`
  - imports `generateBriefingAction`
  - renders `<form action={generateBriefingAction}>`

That component is rendered by:

- `src/components/dashboard/personalized-dashboard.tsx`
  - imports and renders `ManualRefreshTrigger`

Current routed app evidence:

- `src/app/dashboard/page.tsx` redirects `/dashboard` to `/`.
- Static search did not find any current app route importing `PersonalizedDashboard`.
- Static search found only tests importing `PersonalizedDashboard` directly.

Conclusion:

- Current reachable non-editorial route found: none.
- Dormant/non-routed caller found: yes, through `ManualRefreshTrigger` inside `PersonalizedDashboard`.

### Does generateBriefingAction() Write To signal_posts?

Yes.

`generateBriefingAction()` calls `persistSignalPostsForBriefing()` after building and storing the user's daily briefing.

### Are Those Writes Draft-Only, Editor-Gated, Preview-Only, Or Globally Publishable?

The writes are global `signal_posts` persistence writes, not user-scoped `signal_posts` rows.

They are not editor-gated at the write point because `generateBriefingAction()` only requires a signed-in user.

They are not preview-only.

They are not public published rows by default:

- inserted status is `needs_review`
- published copy is not set
- public readers require `editorial_status = "published"` and published copy

They can create or fill the global editorial review queue/depth snapshot. Publishing remains admin/editor-gated through the editorial workflow.

### Can A Non-Editorial Path Trigger Those Writes?

Current routed app surface: no reachable non-editorial path was found.

Dormant path: yes, if `PersonalizedDashboard` or `ManualRefreshTrigger` is reintroduced into a routed page, a signed-in non-editorial user could trigger `generateBriefingAction()` and write global `signal_posts` review rows.

### Evidence Of Public signal_posts Created Without Editorial Review

No evidence was found that `generateBriefingAction()` creates publicly rendered `signal_posts` rows without editorial review.

Reason:

- `generateBriefingAction()` inserts review rows through `persistSignalPostsForBriefing()`.
- Inserted rows are `needs_review`.
- Public readers require `published` status and published copy.
- Publishing functions are admin/editor-gated.

Important nuance:

- `persistSignalPostCandidates()` may set inserted rows to `is_live = true`.
- `is_live = true` alone is not enough for public rendering because public read paths also require `editorial_status = "published"` and published copy.

## Risk Classification

Severity: low.

This is not a confirmed current runtime bug because no current app route was found that exposes the non-editorial form caller.

It is a possible reactivation risk because the dormant legacy dashboard path would let a signed-in non-editorial user write global `signal_posts` review rows if that path becomes routed again without a guard or decoupling change.

## Recommended Follow-Up

Before reactivating `PersonalizedDashboard`, `ManualRefreshTrigger`, or any non-editorial briefing regeneration UI:

1. Decide whether manual briefing refresh is allowed to create global editorial placement rows.
2. If not, split personal briefing persistence from global `signal_posts` persistence.
3. If yes, document the operator model and ensure review rows remain non-public until admin/editor publishing.
4. Consider an admin/editor gate or separate server action for global `signal_posts` snapshot creation.

No code change is required before MVP if `/dashboard` continues to redirect and no current route renders `ManualRefreshTrigger`.
