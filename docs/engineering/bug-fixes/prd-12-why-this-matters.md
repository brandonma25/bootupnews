# PRD 12 — Why This Matters Bug Notes

## GitHub Source-of-Truth Metadata
- Affected object level: Signal and Card.
- PR: #15, `https://github.com/brandonma25/bootupnews/pull/15`; #16, `https://github.com/brandonma25/bootupnews/pull/16`; canonical documentation backfill in #45, `https://github.com/brandonma25/bootupnews/pull/45`.
- Branch: `feature/why-this-matters-specificity-fix`; `feature/why-this-matters-precision-fix`; `docs/strict-truth-doc-taxonomy-and-prd-backfill`.
- Head SHA: #15 `6322135eb00d2a4cff1d0a8d8275f397d81230f9`; #16 `b16d09e89d2119007ddf796350d85f5489da852d`; #45 `96bdd47ab6db18002ec38035d890f69c41dedd64`.
- Merge SHA: #15 `640ac4b1ca5f3b52e88f6eb8d87b15d470757af5`; #16 `2385611c5cfc6c425cfa906013c221cca342479f`; #45 `c182403f25f98aa40d82073a3eedb24328ee926c`.
- GitHub source-of-truth status: canonical historical bug-fix record enriched with source-of-truth metadata on 2026-05-04.
- External references reviewed, if any: GitHub PR #15, #16, and #45 metadata; file history; existing canonical bug-fix record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve the branch recovery details; no branch deletion was performed in this metadata enrichment branch.

## Failures Addressed
- Weak anchors such as pronouns, role words, and malformed fragments appearing as subjects.
- Repetitive generic explanations across adjacent cards.
- Domain leakage between company, macro, governance, housing, and defense story types.
- Non-signal content receiving policy or market-style reasoning.
- Thin single-source stories receiving inflated signal labels.

## Fix Themes
- Stronger entity validation and subject ranking.
- Event-specific routing and subtype handling.
- Safer non-signal classification.
- Batch-level repetition control plus clause cleanup.
- Tighter signal calibration for sparse or low-quality evidence.
