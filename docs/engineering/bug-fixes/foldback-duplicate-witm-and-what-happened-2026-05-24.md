# Foldback Duplicate WITM + Leftover "What happened" Layer — Bug-Fix Record

## Summary
- **Problem addressed:** PR #275 (three-layer publish pipeline, closes #274) added the v2-labeled `The Signal` / `Before This` / `The Ripple` rendering to the expanded `SignalCard` foldback but did not remove two v1 leftovers in the same component: (a) a standalone top "Why this matters"-labeled WITM preview block that rendered the full WITM text outside the foldback (visually clamped but in DOM), and (b) a `WhatHappenedSection` that still rendered the source-headline body inside the foldback. The combination produced: WITM body in DOM twice when expanded; the foldback containing four sections instead of three; a v1 "Why this matters" label still surfaced; and a "What happened" label that the brief's editorial framework §2 cause-then-trajectory model said should not be there.
- **Root cause:** Incomplete cleanup during PR #275. The new helpers (`LayerWithEmptyState`, `readLayerBody`) were added correctly but the v1 markup they were intended to replace was left in place.
- **Affected object level:** Card (`src/components/signals/SignalCard.tsx` render only — no schema, no publish gate, no other data flow).
- **Related issue:** #276. Direct follow-up to #274 / PR #275.

## Fix
Three surgical edits in `src/components/signals/SignalCard.tsx`.

**1. Wrap the top WITM block in `!isExpanded`; drop the v1 label.** The collapsed/compact card-face teaser stays (so the card isn't blank), but it's now an unlabeled clamped preview and is removed from DOM entirely when the card is expanded. `data-testid` renamed `signal-why-this-matters` → `signal-card-teaser` to match its narrower role.

**2. Delete the `WhatHappenedSection` invocation from the foldback** and delete the now-unused `WhatHappenedSection` helper + `whatHappenedBody` variable.

**3. Update the foldback comment** to document the new contract: foldback renders exactly the three editorial layers; `WhatHappened` was deliberately removed because the source-headline material is already implied by the title + footer attribution.

The three-layer rendering itself (the `LayerWithEmptyState` + `readLayerBody` helpers, `published_*`-only reads, no `ai_*` fallback) is unchanged from PR #275.

## Tests
Strict assertions added/updated across 4 test files:

- `src/components/signals/visual-system-components.test.tsx`:
  - Three-layer test now asserts each layer body appears **exactly once** (`toHaveLength(1)`), not just "at least once".
  - Added explicit `queryByText("What happened" / "Why this matters" / "What led to this" / "What it connects to")` assertions to lock the v1 labels out.
  - Replaced the prior "What happened in sans" typography test with "all three foldback layers in serif" — sans-vs-serif differentiation is moot now that no factual layer renders in the foldback.
  - Collapsed-vs-expanded test now asserts teaser visibility flips correctly (`signal-card-teaser` visible when collapsed, absent when expanded).
- `src/components/landing/homepage.test.tsx`: assertions now check for v2 labels (`The Signal` / `Before This` / `The Ripple`), assert `Why this matters` and `What happened` are NOT in DOM.
- `src/app/signals/page.test.tsx`: test renamed and rewired to assert `signal-card-teaser` is line-clamped and no `Why this matters` label exists.
- `src/components/briefing/BriefingDetailView.test.tsx`: "does not duplicate the lead paragraph" test repurposed to assert the `What happened` label is no longer rendered at all and the lead paragraph appears at most once.

**Test results:** full suite **806/806** across 102 files. `npm run build` green.

## Why production didn't catch this earlier
PR #275 was merged with a test that used a tolerant `getAllByText(...).length).toBeGreaterThan(0)` assertion for the WITM body — it would pass whether the body appeared once or twice. The stricter `toHaveLength(1)` introduced in this PR would have caught the duplication before merge.

## Not addressed by this fix
- No changes to schema, publish gate, editor composer, or any data-flow file. Scope is `SignalCard.tsx` foldback render + test fixtures only.
- No changes to the `editorialWhyItMatters` payload schema or to the citation-marker render path.
- Codebase-wide v1→v2 identifier rename remains parked under #271.
