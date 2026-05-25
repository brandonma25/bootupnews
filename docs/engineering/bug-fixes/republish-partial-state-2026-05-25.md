# Re-Publish Live Card Partial State — Bug-Fix Record

## Summary
- **Problem addressed:** After clicking **Re-publish live card** on a live card (PR #281 / issue #280), production showed `editorial_status='approved'` (not `'published'`), `published_what_led_to_it` / `published_what_it_connects_to` `NULL`, `previous_published_snapshot` populated, `is_live=true`. Net effect: the card fell out of the public homepage query (which requires `editorial_status='published'`) and DISAPPEARED from the live site. Reproduced on more than one card. PR #281's 821/821 tests passed because they asserted the function's return / the snapshot, not the full row state.
- **Root cause (two compounding bugs):**
  1. **Re-publish silently dropped the editor's typed depth content.** `republishLiveSignalPost`'s `.update({...})` IS a single atomic write that includes `editorial_status: "published"` and all three `published_*` columns. But the values for `published_what_led_to_it` / `published_what_it_connects_to` came from `buildLayerPublishText(post.editedWhatLedToIt ?? post.publishedWhatLedToIt, …)` — a fallback chain that read DB only. The editor's just-typed textarea content never reached the function, and for live cards whose depth-layer `edited_*` and `published_*` were both null (the common state for any card first-published before PRD-66 / depth layers ever edited), this wrote `null` into both depth `published_*` columns. The action layer (`republishLiveSignalPostAction`) only forwarded `postId` to the lib.
  2. **Approve button on a live card flips status `published`→`approved`.** `approveSignalPostWithContext` hardcodes `editorial_status: "approved"` + `editorial_decision: "approved"`, writes `edited_*` but never touches `published_*`. Its button was disabled only on `controlsDisabled` (storage/persisted), not on `isLive` / `editorialStatus === 'published'`. Likely prod sequence: editor re-publishes → doesn't see depth on public site → clicks Approve thinking that'll push them → status regresses, depth stays null, card vanishes.
- **Affected object level:** Card (single-row `signal_posts` mutation path).
- **Related issue:** #282. Direct regression on #280 / PR #281.

## Fix

**(A) `republishLiveSignalPost` accepts form-captured content** (`src/lib/signals-editorial.ts`). New optional inputs: `editedWhyItMatters`, `editedWhyItMattersStructured`, `editedWhatLedToIt`, `editedWhatLedToItStructured`, `editedWhatItConnectsTo`, `editedWhatItConnectsToStructured`. Resolution precedence per layer: **explicit input → DB `edited_*` → DB `published_*`**. The atomic single `.update({...})` is preserved — snapshot + all three `published_*` (text + payload) + `editorial_status='published'` + `is_live=true` + `published_at=now` all in one write. Form-captured content is ALSO persisted into `edited_*` in the same update so subsequent reads (Save Edits, refresh, future re-publish) see consistent state.

**(B) `republishLiveSignalPostAction` reads the form fields** (`actions.ts`). Forwards `editedWhyItMatters` / `editedWhyItMattersStructured` (via the existing `readStructuredEditorialInput` helper) and `editedWhatLedToIt` / `editedWhatItConnectsTo` (via the existing `readLayerEditorialText` helper) to the lib.

**(C) Hide the Approve button on currently-live-published cards** (`StructuredEditorialFields.tsx`). New `isCurrentlyLivePublished` flag gates the Approve button — Re-publish is the correct control for those rows. Save Edits and Reset to AI Draft remain (saveSignalDraft already preserves `editorial_status='published'`).

## Tests

**New characterization test** (`signals-editorial.test.ts`, in the `republishLiveSignalPost (#280)` describe block): a live+published card whose depth-layer `edited_*` AND `published_*` are BOTH null (the exact prod-bug precondition) gets re-published with form-supplied content. Asserts the COMPLETE row state:
- `editorial_status === 'published'` (NOT `'approved'`)
- `is_live === true`
- `published_why_it_matters` === typed Signal content
- `published_what_led_to_it` === typed Before This content
- `published_what_it_connects_to` === typed Ripple content
- `edited_*` also persisted from form
- `previous_published_snapshot` captures the prior null values

**Standing rule** added as an inline comment at the top of the `republishLiveSignalPost` describe block:

> State-transition tests must assert the COMPLETE resulting row state (all promoted columns + status + is_live + id), never just the function return — this bug (and the #275 duplicate-render bug) both shipped because tests asserted the happy-path output, not the end state.

Existing tests (validation refusal, never-published refusal, not_found, slate gate isolation) still pass. Full suite: **822/822 across 102 files** (was 821; +1 new). `npm run build` green.

## Test-first sequencing
Test was written + run against current code FIRST and FAILED at the first assertion (`published_why_it_matters` stayed at "Prior Signal" because the function read DB-`edited_*` instead of the typed input). After the fix: passes.

## Operator follow-up (post-deploy)
The 2026-05-24 live rows are already hand-stabilized; this PR does not touch them. After deploy, BM can use the corrected Re-publish flow on any card whose depth layers need an update — typing content into the textareas and clicking Re-publish will now write all three layers atomically and keep status=`published`.

## Not addressed by this fix
- No schema change.
- No change to `publishApprovedSignals` (the slate publish gate, used for first-publish).
- No change to `saveSignalDraft` — already preserves `editorial_status='published'` for live cards (verified). Bug 2 was specifically Approve, not Save.
- No code mutation of any live row. Operator action required for any stale row content.
