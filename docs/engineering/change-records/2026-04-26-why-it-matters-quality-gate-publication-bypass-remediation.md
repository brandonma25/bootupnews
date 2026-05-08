# Why It Matters Quality Gate Publication Bypass Remediation

- Date: 2026-04-26
- Change type: remediation
- Source of truth: Boot Up Product Position empty state specification, PR #115 quality-gate publication bypass remediation, Signal Formation Engine Audit, PRD-35, and PRD-53
- Canonical PRD required: no
- Object level: Surface Placement plus Card copy/public read model metadata

## Intent

Close the downstream bypass that allowed quality-gate-rejected or otherwise unapproved `whyItMatters` copy to reach public homepage surfaces through stored snapshot and fallback paths, then align the homepage fallback hierarchy to the approved empty state specification: no false freshness, no fake placeholder cards, and visible dating when the homepage uses a prior published signal set.

This is remediation for the existing PRD-35 and PRD-53 editorial pipeline. It does not create a new feature or canonical PRD.

## Required Reading

Completed before code changes:

- `docs/engineering/TERMINOLOGY_RUNTIME_SEMANTIC_AUDIT.md`
- `docs/engineering/SIGNAL_POSTS_OPERATIONAL_CONTRACT.md`
- `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`

The implementation treats `signal_posts` as Surface Placement plus Card copy/public read model storage, not canonical Signal identity.

## Trace

Quality gate status is set in `src/lib/signals-editorial.ts`:

1. `mapBriefingItemToSignalPost()` validates generated `aiWhyItMatters` and stores validation metadata on the placement candidate.
2. `persistSignalPostCandidates()` calls `flagCardForRewrite()` before insertion and writes `why_it_matters_validation_status`, failures, details, and `editorial_status = "needs_review"`.
3. Rejected rows remain non-blocking for the pipeline run and enter the editorial review queue with failure reasons.

The bypass was downstream:

1. `getHomepageSignalSnapshot()` first tried `published_live` rows.
2. When no published live set existed, it loaded the latest stored snapshot through `loadCurrentTopFive()`.
3. `loadCurrentTopFive()` selected rows by `briefing_date` and `rank` only, without checking approval state or quality-gate status.
4. `src/lib/data.ts` mapped those rows into `BriefingItem` card data.
5. `selectHomepageSignalWhyItMatters()` fell back from missing published or edited copy to `aiWhyItMatters`, then selection reason, summary, or static placeholder copy.
6. `src/components/landing/homepage.tsx` rendered the Why it matters section whenever the card reached the homepage model.

## Fix

- Public homepage snapshot reads now use only rows with `editorial_status = "published"` and non-empty published human editorial copy.
- Public latest-snapshot mapping no longer falls back to AI draft text, selection reasons, summaries, or placeholder text for `whyItMatters`.
- Top 5/depth publishing no longer promotes unapproved depth rows from AI draft text.
- Static public homepage placeholders no longer inject a generic why-it-matters fallback string.
- Homepage cards omit the Why it matters section when no approved copy is available.

## Empty State Fallback Remediation

Additional homepage fallback tracing confirmed that the public SSR path still treated "no current published set" as permission to build static public homepage placeholder cards:

1. `src/app/page.tsx` calls `getHomepagePageState("/")`.
2. `src/lib/data.ts` calls `buildPublicHomepageData()`.
3. `buildPublicHomepageData()` calls `loadHomepageSignalSnapshotSafely()`, which delegates to `getHomepageSignalSnapshot()` in `src/lib/signals-editorial.ts`.
4. Before this remediation, no returned posts caused `buildStaticPublicHomepageFallbackData()` to inject static category placeholders.
5. The placeholder condition was any homepage snapshot with zero posts, including cases where no approved published cards existed for today but older published cards did exist.

The corrected fallback hierarchy is:

1. Tier 1: load today's `signal_posts` rows where `editorial_status = "published"` and published Why it matters copy exists.
2. Tier 2: if today has no published set, load the most recent published `signal_posts` set regardless of date and surface `Last updated [day, date] - Today's briefing is being prepared.` as a distinct freshness notice.
3. Tier 3: if no published set exists at all, render the honest empty state `Today's briefing is being prepared.` with no cards and no placeholder copy.

The removed placeholder strings included the static "stored public signal snapshot unavailable" card titles and the explanatory "homepage is showing a [category] placeholder" why-it-matters fallback. The homepage read path remains stored-read-model only; it does not fetch feeds or generate new signal copy during SSR.

## generateBriefingAction Confirmation

`generateBriefingAction()` still calls `persistSignalPostsForBriefing()`, so it can write global `signal_posts` review rows. The semantic audit confirms there is no currently routed non-editorial UI caller: the only static caller is `ManualRefreshTrigger` inside dormant `PersonalizedDashboard`, while `/dashboard` redirects to `/`.

This remediation does not reactivate `PersonalizedDashboard`, `ManualRefreshTrigger`, or any legacy dashboard path.

## Non-Goals

- No changes to `validateWhyItMatters()` or the four quality-gate rules.
- No changes to the template generation layer.
- No ranking pipeline changes.
- No LLM or external API calls.
- No schema changes.
- No new canonical PRD.
