# WITM Validator False-Positives on v2 Content — Bug-Fix Record

## Summary
- **Problem addressed:** Every v2 LLM-drafted card landed in the prod editorial cockpit (`/dashboard/signals/editorial-review`) with `why_it_matters_validation_status='requires_human_rewrite'` + `editorial_decision='rewrite_requested'`. That dual state hard-locked the assign-to-slot dropdown ("Blocked · rewrite first") and disabled "Publish slate". The first real end-to-end editorial cycle (`briefing_date='2026-05-24'`) staged 4 LLM rows; all 4 false-failed within ~80 minutes of the bridge fire, blocking the entire slate from publishing.
- **Root cause:** Two rules in `src/lib/why-it-matters-quality-gate.ts` were scoped to v1 deterministic-template output and false-positive on v2 framework content:
  1. `UNRESOLVED_VARIABLE_PATTERN`'s third alternation branch `\[[a-z][a-z0-9_\s-]*\]` plus the `/gi` flag matches v2 framework §5.2 citation markers `[A]`, `[A1]`, `[P#]`, `[F#]`, `[V#]`. `detectTemplatePlaceholderLanguage` then added a `template_placeholder_language` failure per marker. These markers are REQUIRED content per the editorial framework, not unfilled template tokens.
  2. `getSentences` split on every `.` with zero guards: `value.match(/[^.!?]+[.!?]+|[^.!?]+$/g)`. Decimals like `1.8` produced fragments `"...to 1."` + `"8 standard deviations above its average [A]."`; abbreviations like `U.S.` produced fragments `"U."` + `"S."`. `detectIncompleteSentence`'s 8-word floor then flagged the short fragments.
- The bridge (`src/app/api/editorial/push-approved/route.ts:422`) hardcodes `validation_status='passed'` and does NOT call `validateWhyItMatters`, so the row state is correct immediately after the bridge fires. The false-positive only fires LATER, on the first interactive action that re-validates (`resetSignalPostToAiDraft` `signals-editorial.ts:2466`, or approve/save-draft). DB confirms: today's 4 LLM rows flipped at ~08:40 UTC, ~80 min after the ~07:20 bridge fire — every `validated_at` matches `updated_at` to the second, consistent with an interactive UI mutation.
- **Affected object level:** Card (WITM is per-`signal_posts` row).
- **Related issue:** #270 (blocker).

## Fix
Two surgical changes in `src/lib/why-it-matters-quality-gate.ts`.

**Part 1 — Citation-marker exclusion (rule 1).** Added a constant and a one-line post-filter inside `detectTemplatePlaceholderLanguage`:

```ts
const CITATION_MARKER_PATTERN = /^\[[A-Z]\d*\]$/;

const unresolvedVariables = (value.match(UNRESOLVED_VARIABLE_PATTERN) ?? []).filter(
  (variable) => !CITATION_MARKER_PATTERN.test(variable),
);
```

The regex itself is untouched; the filter drops citation-marker shapes (single uppercase letter optionally followed by digits, bracketed) AFTER matching. Real lowercase placeholders like `[topic]` and `[category]` still match `[A-Z]` test = false → still flagged.

**`TEMPLATE_PLACEHOLDER_PHRASES` is NOT touched.** That string-include path (line ~88) catches forbidden vocab like `"individual decision-making"` and `"could move expectations"` and remains the load-bearing detector for editorial framework §1 violations.

**Part 2 — Sentence-splitter guards (rule 2).** Added a sentinel-based protect/restore wrapper around `getSentences`:

```ts
const SENTENCE_GUARD_SENTINEL = "";
const SENTENCE_SPLITTER_ABBREVIATIONS = [
  "U.S.A.", "Ph.D.", "U.S.", "U.K.", "E.U.",
  "e.g.", "i.e.", "etc.", "vs.", "No.",
  "Inc.", "Ltd.", "Corp.",
  "Mrs.", "Mr.", "Ms.", "Dr.", "Jr.", "Sr.",
  "Mt.", "St.",
];

function protectSentenceSplitterEdgeCases(value) {
  let protectedValue = value.replace(/(\d)\.(\d)/g, `$1${SENTENCE_GUARD_SENTINEL}$2`);
  for (const abbreviation of SENTENCE_SPLITTER_ABBREVIATIONS) {
    const pattern = new RegExp(escapeRegExp(abbreviation), "gi");
    protectedValue = protectedValue.replace(pattern, (match) =>
      match.replace(/\./g, SENTENCE_GUARD_SENTINEL),
    );
  }
  return protectedValue;
}

function getSentences(value) {
  const protectedValue = protectSentenceSplitterEdgeCases(value);
  const matches = protectedValue.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return matches
    .map((sentence) => restoreSentenceSplitterEdgeCases(sentence).trim())
    .filter(Boolean);
}
```

The abbreviation list is sorted longest-first so multi-period entries match before their prefixes (`U.S.A.` before `U.S.`, `Ph.D.` before `Dr.`). `U+0001` is a control char that does not appear in editorial text. The 8-word `incomplete_sentence` floor is unchanged — genuine sub-8-word sentences with no decimals/abbreviations still fail.

## Tests
Six new characterization tests in `src/lib/why-it-matters-quality-gate.test.ts` under `describe("v2 content (issue #270)")`:
- **A** (fix): a Signal with `U.S.`, `1.8`, and `[A]` returns `passed=true`.
- **B** (fix): real 2026-05-24 supply-chain card text triggers neither `incomplete_sentence` nor `template_placeholder_language`.
- **C** (fix): `[A]`, `[A1]`, `[P2]`, `[F1]`, `[V1]` all bypass `template_placeholder_language`.
- **D** (guardrail): `{company}` and `[topic]` still flagged.
- **E** (guardrail): `"could move expectations"` and `"individual decision-making"` still flagged.
- **F** (guardrail): genuine sub-8-word sentence still flagged.

**Test-first sequencing**: ran the suite BEFORE the fix and confirmed A/B/C failed exactly as predicted (3 failed, 24 passed). After the fix: 27/27 passed. Full repo suite: **803/803 across 102 files**, no regressions.

**Logical pre-deploy acceptance** against the actual `ai_why_it_matters` text for `briefing_date='2026-05-24'`:

| rank | drafter | passed | failures |
|---|---|---|---|
| 1 | llm | ✅ true | `[]` |
| 2 | llm | ✅ true | `[]` |
| 3 | deterministic_template | ❌ false | `["unsupported_structural_claim"]` |
| 4 | llm | ✅ true | `[]` |
| 5 | llm | ✅ true | `[]` |

Card 3 (the listicle "Economic Letter Countdown") correctly STILL fails on `unsupported_structural_claim` only — that one is a legitimate retrospective/meta-story failure, not the bug we're fixing.

## Operator follow-up (post-deploy)
Validation columns and `editorial_decision` are not auto-updated by deploying the fix. The path that re-runs `validateWhyItMatters` AND resets `editorial_decision` off `rewrite_requested` is `resetSignalPostToAiDraft` (`src/lib/signals-editorial.ts:2434`), exposed in the prod admin UI as **"Reset to AI draft"** on each `CandidateRow`.

After this PR ships, BM should:
1. Open `/dashboard/signals/editorial-review` for `briefing_date='2026-05-24'`.
2. For each of the **4 LLM rows** (NOT Card 3), expand the rewrite panel and click **Reset to AI draft**.
3. Verify each row flips to `validation_status='passed'`, `editorial_decision='pending_review'`, and the assign-to-slot dropdown unlocks.

Brief explicitly forbade bypassing the app's transition logic with a direct DB write.

## Why production didn't catch this earlier
The full v2 pipeline (Notion drafting → bridge → admin cockpit → publish) ran end-to-end for the first time on 2026-05-24. Prior v2 bridge fires (e.g. 2026-05-21) wrote 1 LLM row that was not interactively re-validated before BM left it. The combination "bridge wrote needs_review with `validation_status='passed'`" + "first interactive action re-validates and writes `requires_human_rewrite`" only surfaces when the editor actually opens the cockpit and acts on the row — which today was the first time at slate scale.

## Not addressed by this fix (filed separately)
- **#271 (umbrella):** consolidate editorial review into one cockpit; remove duplicate approval gate between Notion and prod admin UI.
- **#272:** cron false-fail when Gmail newsletter leg returns 0 emails.
- **#269:** ranking-within-tier is processing-order, not editor intent.
