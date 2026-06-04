# PRD-68 — MVP Measurement: Dwell-Based Depth, Comprehension Self-Report, URL Cohort

- PRD ID: `PRD-68`
- Canonical file: `docs/product/prd/prd-68-mvp-measurement-dwell-and-self-report.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Instrument the three Phase-1 MVP success criteria — retention (40%+ D7), depth engagement, and comprehension self-report (70%+ agree) — and add cohort tagging so real-tester telemetry can be separated from self-browsing and QA traffic. All instrumentation is additive on top of the existing `mvp_measurement_events` table; no schema redesign and no migration.

## User Problem

The Phase-1 success criteria define what "shippable MVP" means, but the current `mvp_measurement_events` surface does not let us actually evaluate them:

- **Comprehension** (70% agree "I could explain at least one of today's signals to someone else") is not instrumented at all. The `comprehension_prompt_shown` / `comprehension_prompt_answered` event names exist on the allowlist but never fire.
- **Depth engagement** today emits only a `signal_full_expansion_proxy` placeholder — it fires on a one-shot action and cannot distinguish a one-layer skim from a full read. The three editorial layers ("The Signal", "Before This", "The Ripple") render expanded by default on page load, so any expansion-based event would record a click that never happens.
- **Tester isolation** does not exist. Self-browsing by BM, ad-hoc QA, and approved tester traffic all land in the same rows, polluting every aggregate the criteria depend on.

Until these three holes are filled, the criteria cannot be measured, and shipping decisions can't be defended.

## Scope

### Must Do

- **`signal_read` (dwell-based depth primitive).** Per-card `IntersectionObserver` registered via a new module (`src/lib/signal-read-tracking.ts`). Fires at most once per signal per session — session-scoped dedupe via `sessionStorage` — when BOTH (a) the card is ≥50% in viewport for ≥20 continuous seconds AND (b) at least one scroll event has occurred while the card was visible during the session. Continuous: the dwell timer resets on visibility drop and does not accumulate across separate viewport entries. Event metadata: `{ signalRank, dwellMs, cohort }`. Stable signal identity (`signalPostId`, `signalSlug`) is carried in the existing top-level event fields, not in metadata.
- **Comprehension self-report (`comprehension_self_report`).** Dismissible session-end micro-survey using the exact statement *"I could explain at least one of today's signals to someone else."* Binary Agree / Disagree. Eligibility (all must hold): not first-ever session, at least one `signal_read` has fired in the current session, 7-day per-visitor cap not active. Triggers (whichever first): 45s of inactivity (no scroll / click / keypress), exit-intent (`mouseout` with `clientY <= 0`), or `visibilitychange` to hidden. Answering trips the 7-day cap (persists `last-shown` in `localStorage`); dismissal does NOT trip the cap. Event metadata: `{ response, briefingDate, cohort }`.
- **Inspectability.** `?mvp_survey_debug=1` bypasses both the first-session suppression and the 7-day cap but NOT the `signal_read` eligibility gate. Behind the debug flag only, `console.info` logs one of `first_session | no_signal_read | cap_active | gate_off` when the prompt mounts but does not show.
- **Deterministic URL-entry cohort.** Resolution order (first match wins): `?mvp_qa=1` or persisted QA flag → `qa`; `?c=tester` or persisted → `tester`; `?c=internal` or persisted → `internal`; no marker → `internal`. Resolved cohort is persisted client-side the same way `visitor_id` is. Attached to every emitted MVP measurement event's `metadata.cohort`. No new DB column, no migration.
- **PostHog forwarding stays sanitized and env-gated.** New keys (`signalRank`, `dwellMs`, `cohort`, `response`, `briefingDate`) all pass through the existing `sanitizeMetadata` helper. Admin/auth routes remain excluded from capture — new emitters mount only on the public homepage and briefing detail surfaces.

### Must Not Do

- No DB migration; no schema redesign; no change to migration history. Supabase MVP events remain canonical.
- No removal of `signal_full_expansion_proxy` — the event name stays registered for historical continuity even though no client emits it. Do not extend or rebuild it.
- No tester-id allowlist (`NEXT_PUBLIC_TESTER_IDS` was rejected as a model; cohort must be deterministic at URL entry).
- No PII, no raw source URLs with query strings, no full Why-It-Matters / editorial layer body copy in metadata.
- No change to cron, publish flow, draft_only path, RSS / newsletter ingestion, or source config.
- No new admin-route emitters.

## Success Criteria

- **Criterion 1 (retention).** Existing `homepage_view` / `signal_details_click` / category emissions already supply the D7 calculation; this PRD adds `cohort` to those rows so the rate can be computed on the tester slice.
- **Criterion 2 (depth, redefined).** "≥60% of sessions include at least one `signal_read`" replaces the prior "all four layers expanded" framing. The expanded-by-default UI made layer-open instrumentation meaningless, so depth is now measured by dwell. The 60% threshold is a deliberate metric redefinition and is the canonical Criterion 2 going forward.
- **Criterion 3 (comprehension).** "≥70% of `comprehension_self_report` rows have `metadata.response = 'agree'`" — measurable as soon as the prompt is in front of testers.
- **Cohort.** A non-empty `metadata.cohort ∈ { 'qa', 'tester', 'internal' }` on every MVP event, deterministically resolvable from URL entry.

## Done When

- `src/lib/signal-read-tracking.ts` registers per-card dwell observers, dedupes per signal per session, and emits `signal_read`.
- `src/components/mvp-measurement/ComprehensionSelfReport.tsx` is mounted on the homepage and briefing detail surfaces, gates on `signal_read` + first-session + cap, and fires `comprehension_self_report` on Agree / Disagree.
- `src/lib/mvp-measurement-client.ts` resolves cohort from URL markers (`?mvp_qa=1`, `?c=tester`, `?c=internal`), persists it in `localStorage`, and attaches it to every emitted event's metadata.
- `MVP_MEASUREMENT_EVENT_NAMES` includes `signal_read` and `comprehension_self_report`.
- Unit, lint, build, Chromium and WebKit e2e suites all pass.
- This PRD file exists and is mapped in `docs/product/feature-system.csv` as `PRD-68`.

## Implementation Shape / System Impact

- **No migration.** Cohort lives in `metadata`. `signal_read` and `comprehension_self_report` write through the existing `/api/mvp-measurement/events` route into the existing `mvp_measurement_events` table.
- **Three new event names** added to the registered allowlist: `signal_read`, `comprehension_self_report`. (`signal_full_expansion_proxy` left in place untouched.)
- **One new client module:** `src/lib/signal-read-tracking.ts`. Encapsulates the per-card dwell observer, the session-level scroll listener, session dedupe, and a `subscribeToSignalRead(listener)` API so the survey can flip to "armed" when the first session-level `signal_read` fires.
- **One new client component:** `src/components/mvp-measurement/ComprehensionSelfReport.tsx`. Self-contained gating + triggers + cap.
- **One prop on `SignalCard`:** `mvpDwellTracking?: SignalReadTracking`. Wired from the homepage and briefing detail callers.
- **No changes** to the route handler, the validator, the PostHog forwarding shape, the sanitization helper, the briefing pipeline, the publish flow, or the cron path.

## Verification

- Unit: `src/lib/mvp-measurement.test.ts` (cohort resolution branches, `signal_read` + `comprehension_self_report` event-name acceptance), `src/lib/mvp-measurement-client.test.ts` (cohort URL markers + persistence + override), `src/lib/signal-read-tracking.test.ts` (20s + scroll, no scroll → no fire, no dwell → no fire, dwell reset on viewport exit, session dedupe, subscriber callback), `src/components/mvp-measurement/ComprehensionSelfReport.test.tsx` (first-session / no-signal-read / cap-active suppressions, inactivity / exit-intent / visibilitychange triggers, answer trips cap, dismiss does not, debug bypass logs the right reason).
- Lint clean. Full vitest suite green (850 tests). `npm run build` green.
- E2E: Chromium + WebKit Playwright suites green against a managed dev server.
- Dev smoke: `GET /`, `GET /?mvp_qa=1`, `GET /?c=tester`, `GET /?mvp_survey_debug=1` all return 200.

## Lineage

**Closes:** the three Phase-1 measurement gaps documented above. Subsumes the rejected `signal_layer_open` design (expanded-by-default UI made it meaningless).

**Descends from (PRDs):**
- **PRD-17** — `prd-17-homepage-intelligence-surface.md`. Built the homepage where `signal_read` and the survey mount.
- **PRD-18** — `prd-18-briefing-history.md`. Built the briefing detail surface; the same dwell + survey mount lives there.
- **PRD-21** — `prd-21-reading-window-anchor.md`. Established the per-session reading-time framing that `signal_read` operationalizes.
- **PRD-23** — `prd-23-release-governance-gate.md`. The governance surface that requires this PRD exist.
- **PRD-66** — `prd-66-three-layer-publish-pipeline.md`. Established the three-layer card render that determines what "dwell on a card" means in practice.

**Descends from (PRs):**
- **#283** "fix(editorial): re-publish promotes typed depth content + hide Approve on live cards" — last commit on `main` before this PRD branched.

## Operational History

- 2026-05-25: Initial implementation. `signal_layer_open` was scoped, then rejected once the expanded-by-default render path was confirmed. Replaced with `signal_read`. Comprehension survey rewired around `signal_read`. Tester-id allowlist replaced with deterministic URL cohort.
