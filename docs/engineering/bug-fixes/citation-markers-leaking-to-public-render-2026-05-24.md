# Citation Markers Leaking to Public Foldback Render — Bug-Fix Record

## Summary
- **Problem addressed:** Editorial v2 drafts include inline citation markers — `[A]`, `[A1]`, `[A12]`, `[P1]`, `[F2]`, `[V3]`, etc. — required by the framework §5.2 citation discipline and correctly recognized by the WITM validator after PR #273. But the public foldback rendered them as literal inline text (e.g. "…services slipped [A]. Community members reported [A1] that housing…"), which is the right stored content but the wrong reader experience for the MVP. No footnote parser exists.
- **Decision (MVP):** Strip the markers at **render time only**. Stored `published_*` columns stay untouched. The full reader-verifiable-citations feature (footnotes, hover sources, source-link anchors) is deferred as a post-MVP follow-up tracked under #278.
- **Affected object level:** Card render — `src/components/signals/SignalCard.tsx` only. No schema, no publish gate, no validator, no stored-data path.
- **Related issue:** #278.

## Fix
Three surgical changes in `src/components/signals/SignalCard.tsx`.

**1. New `stripCitationMarkers(text)` helper.** Pure function, exported so the unit test can pin its contract without rendering the component:

```ts
export function stripCitationMarkers(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[[A-Z]\d*\]/g, "")
    .replace(/\s+([.,;:!?)])/g, "$1")  // " ." / " ," artifacts left by marker-before-punctuation
    .replace(/[ \t]{2,}/g, " ")        // collapse double-spaces left by mid-sentence markers
    .trim();
}
```

The regex `/\[[A-Z]\d*\]/g` matches exactly the editorial framework's marker shape: a bracketed single uppercase letter optionally followed by digits. It does NOT match lowercase tokens like `[topic]` (genuine unfilled placeholders the validator catches before publish) or numeric references like `[1]` (not the editorial shape).

**2. Apply the helper at three render sites** — the three editorial layer bodies. Stored `signal` props are NOT mutated; the helper wraps the value at the point it's bound to the local `whyItMatters` / `beforeThisBody` / `theRippleBody` variables that feed JSX:

```ts
const whyItMatters = stripCitationMarkers(getWhyItMattersText(signal));
const beforeThisBody = stripCitationMarkers(
  readLayerBody(signal.publishedWhatLedToIt, signal.publishedWhatLedToItStructured),
);
const theRippleBody = stripCitationMarkers(
  readLayerBody(signal.publishedWhatItConnectsTo, signal.publishedWhatItConnectsToStructured),
);
```

The collapsed-card teaser also reads from `whyItMatters`, so it inherits the strip automatically.

**3. Inline comment** documenting the contract: render-only transform, markers stay in stored data, reader-verifiable citations deferred.

## Tests
- **Unit (`stripCitationMarkers`)**: 5 tests pin the contract — the brief's example string, all marker shapes (`[A]`/`[A1]`/`[A12]`/`[P#]`/`[F#]`/`[V#]`), whitespace collapse, edge cases (`[topic]` lowercase untouched, `[1]` numeric untouched, empty/pure-marker input).
- **Component (`SignalCard` render)**: one new test renders a card with markers in all three layer bodies and asserts (a) `card.textContent` matches no `/\[[A-Z]\d*\]/`, (b) the clean prose between markers reads correctly for each layer.
- **Full suite:** 812/812 passed across 102 files. `npm run build` green.

## What is NOT in this fix
- No footnote/source-link rendering. That's the deferred reader-verifiable-citations feature; this PR references #278 as the MVP placeholder.
- No editor composer change. The editor continues to see markers in the textareas because they're load-bearing for the WITM validator and for the future footnote feature.
- No mutation of stored data anywhere. `published_*` columns retain the markers verbatim.
- No regex change in `why-it-matters-quality-gate.ts`. The validator's marker handling (PR #273) is unchanged.

## Relation
- Follows the #275 → #277 sequence that landed the three-layer foldback (`SignalCard.tsx`).
- The reader-verifiable-citations follow-up is tracked under #278.
