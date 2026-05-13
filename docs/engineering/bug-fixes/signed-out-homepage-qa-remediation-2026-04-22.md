# Signed-Out Homepage QA Remediation - 2026-04-22

## Classification

- Change type: remediation / alignment.
- Canonical PRD required: no.
- Product source of truth: approved UX artifacts 0, 1, 2, 3, 4, 5, 7, and 10, plus the signed-out QA report.
- Scope: signed-out Home page failures only.

## GitHub Source-of-Truth Metadata

- Affected object level: Card and Surface Placement.
- PR: #96, `https://github.com/brandonma25/bootupnews/pull/96`.
- Branch: `fix/signed-out-homepage-qa-remediation`.
- Head SHA: `d55007acfd89531e0f4a2d5378c2207ea9231c4b`.
- Merge SHA: `482a6f9994b55f71d23271067f18c189362bdb22`.
- GitHub source-of-truth status: canonical pre-template bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #96 metadata and the existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Artifact Binding

| Fix area | Source used |
|---|---|
| Product naming | artifacts0 app name; Artifact 1 Page Header app identity |
| Home structure | Artifact 4 Home scope; Artifact 1 Home component structure; artifacts0 Home Page flow |
| Top Events count and source | Artifact 1/2 Briefing Card - Top Events; artifacts0 `homepage-model.ts` flow; artifacts5 real data schema; artifacts7 Flow 1 |
| Fallback date label | artifacts7 Flow 1 edge case; artifacts2 Date Label |
| Soft gate behavior and copy | artifacts7 Flow 1 and Flow 6 |
| Top Events key points | artifacts2 Top Events inventory; artifacts5 `BriefingItem.keyPoints` mapping |
| Hydration / console errors | functional QA no-critical-console requirement; QA report hydration mismatch evidence |
| Active tab style | artifacts10 active category tab underline |

## Root Causes

- The signed-out Home shell still used "Daily Intelligence Aggregator" in metadata and sidebar brand copy.
- The Home client included an unsupported summary/hero block above the approved date label, tabs, and cards hierarchy.
- The Home client rebuilt `homepage-model.ts` during hydration. That model derives recency labels through time-sensitive helpers, which could diverge between server HTML and client hydration.
- The date label was computed in the client and used "Today" even when the visible briefing date was not today's date.
- Top Events excluded lower-source `priority: "top"` items when the public pipeline selected five briefing items but only one met the confirmed-event threshold.
- The signed-out category gate hid Top Events, was not dismissible, and used non-approved generic copy.
- `BriefingItem.keyPoints` was not carried through `HomepageEvent` or rendered on signed-out Top Events cards.
- The active category tab underline used foreground text color instead of the artifact accent token.

## Fix Summary

- Updated signed-out Home-visible branding to "Daily Intelligence Briefing".
- Removed the unsupported Home hero/summary block and kept the normal Home flow centered on date label, tabs, and cards.
- Built the Home view model on the server route and passed it into the client component to avoid client-side time-derived hydration drift.
- Added a server-produced Home date label that shows "Today" only when the briefing date matches the server request date, otherwise it renders the actual briefing date.
- Adjusted `homepage-model.ts` so the public Top Events set can use the ranked `priority: "top"` pipeline-selected items when confirmed-event filtering would otherwise underfill the approved 3-5 card range.
- Kept signed-out category tabs available for the inline gate, kept Top Events visible while the gate is open, and added a dismiss control that returns to Top Events.
- Replaced gate copy with the Flow 6 approved copy: "Create a free account to read Tech News, Finance and Politics".
- Rendered `BriefingItem.keyPoints` as a safe bullet list on signed-out Top Events cards.
- Changed the active tab underline token to `var(--accent)`.

## Notes

- Artifact 7 has a copy conflict: Flow 1 says "Sign in to read Tech News, Finance and Politics"; Flow 6 defines the gate contents as "Create a free account to read Tech News, Finance and Politics". The implementation uses Flow 6 because it is the explicit gate-content definition and matches the QA expected result.
- The artifacts require a dismissible gate but do not specify visible dismiss-control copy. The implementation uses an icon button with the accessibility label "Dismiss category gate".

## QA Reconciliation Follow-up

Additional review against the signed-out QA report found two previously weak areas:

- Top Events count was only proven for five-item data. The model could still underfill when a briefing had three or four pipeline-selected `priority: "top"` items but confirmed-source filtering produced fewer than three visible cards.
- Empty `keyPoints` were safe at the card render layer, but missing `keyPoints` could still crash earlier during homepage timeline derivation.

Follow-up fixes:

- `homepage-model.ts` now falls back to pipeline-selected `priority: "top"` candidates whenever confirmed-event filtering would underfill the public 3-card target and the pipeline-selected pool is richer than the confirmed pool.
- `HomepageEvent.keyPoints` is normalized to a safe `string[]` display field, and timeline derivation handles missing/non-array values without crashing.
- Playwright route assertions were strengthened for the signed-out homepage gate and existing redirect/navigation flakes exposed by the full Chromium/WebKit runs.

Still not changed:

- No new canonical PRD was created; this remains remediation/alignment.
- No signed-in-only, History, Account, login, signup, forgot-password, newsletter, or briefing-detail product behavior was remediated as part of this follow-up.
