# PostHog Admin Opt-Out + Visitor-ID Unification — Bug-Fix Record

## Summary
- Problem addressed: two analytics-hygiene defects in the PostHog client. (1) Admin / internal users browsing public pages were counted as ordinary visitors in session replay, heatmaps, and web analytics, polluting low-traffic metrics. (2) PostHog SDK-captured events (autocapture, heatmaps, session replay) and the app's direct `/capture/` events used two different anonymous identifiers, so a single browser resolved to two PostHog "persons" and inflated visitor/unique counts.
- Root cause: (1) admins are identified server-side by email allowlist and that identity is deliberately never sent to PostHog, so there was no person property to filter on and no client-side suppression existed. (2) the direct-capture path hard-coded the local `mvp_` measurement id as the PostHog `distinct_id` instead of reusing the SDK's own anonymous identity.

## GitHub Source-of-Truth Metadata
- Affected object level: Surface Placement (client analytics instrumentation).
- PR: #288, `https://github.com/brandonma25/bootupnews/pull/288`.
- Branch: `claude/zealous-sutherland-97f793`.
- Head SHA: recorded on the PR; merge SHA assigned at squash-merge.
- GitHub source-of-truth status: canonical bug-fix record authored alongside the change.
- External references reviewed, if any: PostHog `posthog-js` opt-out and identity APIs (`opt_out_capturing`, `get_distinct_id`, `get_session_id`).

## Fix
- Admin opt-out: added `setPostHogAnalyticsOptOut(optedOut)` to `src/lib/posthog-client.ts`. An in-memory flag short-circuits SDK init, the direct pageview/MVP capture path, and session-replay route sync; if the SDK is already running it calls `opt_out_capturing()` + `stopSessionRecording()`. `src/components/app-shell.tsx` (which wraps every public reading surface) calls it from an effect with the server-computed `isAdmin`, so internal traffic is excluded client-side without sending any identity to PostHog.
- Visitor-ID unification: the direct `/capture/` payload in `sendPostHogBrowserCapture` now sets `distinct_id` / `$session_id` from the PostHog SDK identity (`get_distinct_id` / `get_session_id`), falling back to the local `mvp_` id only when the SDK is unavailable. SDK-captured and direct-captured events now resolve to one person.
- Retention safety: the Supabase write path (`src/lib/mvp-measurement-client.ts` and `src/app/api/mvp-measurement/events/route.ts`) is untouched. The `mvp_measurement_events.visitor_id` column still receives the same persisted `mvp_` id for a given browser before and after this change; only the PostHog-forwarded `distinct_id` changed. Day-7 retention keyed on that column does not break at cutover.
- Related PRD: not applicable; targeted analytics-instrumentation bug fix. Both behaviors are inert until PostHog is enabled via the `NEXT_PUBLIC_POSTHOG_*` environment flags.

## Validation
- Automated checks: `npm run test` (full unit suite green, including new coverage in `src/lib/posthog-client.test.ts` for opt-out short-circuiting, post-init opt-out, blocked direct capture, and SDK-identity attribution); `npm run lint` clean. Changed application files are type-clean.
- Human checks: live verification in PostHog (admin browsing produces no events; a single browser appears as one person) requires the `NEXT_PUBLIC_POSTHOG_*` flags to be enabled in a deployed environment.

## Documentation Closeout
- GitHub documentation closeout completed in the canonical lane: yes.
- Google Sheet / Work Log not treated as canonical or updated for routine closeout: yes.

## Remaining Risks / Follow-up
- The opt-out relies on PostHog SDK init being deferred (~3s), so the `isAdmin` effect sets the flag before init in normal conditions; under pathologically slow hydration one event could be captured before opt-out, after which capture and replay are stopped.
- The internal MVP measurement pipeline (Supabase) intentionally still records all traffic, including admins; this change scopes admin exclusion to PostHog only.
