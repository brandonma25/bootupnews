# Newsletter Extraction Quality (PR-B / Task 3) — 2026-06-21

Canonical PRD required: `No` — newsletter ingestion quality bug fix, not a product feature.

## Problem
The newsletter extractor produced junk candidate rows (verified 06-16..19): mojibake
(`Semaforâ€™s`), real headlines buried behind enumerator noise (`â â 2 2 Fed holds rates…`),
and chrome stored as headlines (subscribe CTAs, photo credits, mastheads, section labels).
#327 protects the public *slate* (rank-band), but these still pollute the review pool.

## Fixes (ingestion/staging only — no publish/cockpit/render/final_slate_rank/validation changes)

**B1 — charset-aware MIME decode** (`email-content.ts`). `decodeQuotedPrintable` decoded each
`=XX` byte with `String.fromCharCode`, mangling multi-byte UTF-8. Replaced with
`decodeQuotedPrintableToBytes` (buffers raw bytes) + `decodeBytesWithCharset`, decoded by the
part's declared charset. **ICU-independent** (CI/serverless Node may be small-ICU, where
`new TextDecoder("windows-1252")` throws and a utf-8 fallback re-mangles smart quotes): utf-8
uses `Buffer.toString("utf8")`; iso-8859-1/latin1/windows-1252 use a built-in
`decodeWindows1252` (latin-1 + a static `0x80–0x9F` table); only exotic charsets try
`TextDecoder` (utf-8 fallback). The part `Content-Type` charset is threaded
`collectTextParts → decodePartBody`. base64 + the MIME encoded-word (`=?charset?Q?…?=`)
decoders fixed the same way.

**B2 — segmentation** (`parser.ts`). `stripLeadingEnumeratorNoise` (run in `cleanHeadline`)
strips leading symbol/badge RUNS followed by whitespace and Semafor's DOUBLED item number
(`2 2 `). Conservative: the `\s+` requirement leaves a leading smart quote (`‘We Proved…’`) or
accented first letter untouched, and only a *doubled* number is stripped (never a lone
`5 things to know`).

**B3 — chrome filter extension** (`chrome-filter.ts`). New reject reasons: `subscribe_cta`
(phrases, not bare "subscribe" → "subscribers" is safe), `masthead` (` // ` banner delimiter),
`photo_credit` (`First Last/Agency` at end, known wires), `section_header` (exact match to a
curated label list — precision over a risky generic heuristic). **Precision guard:** all
MUST_KEEP fixtures (smart-quote / colon / Title-Case real headlines) are asserted NOT rejected.

**B4 — tracking deny-list + PII strip** (`parser.ts`, `url-filtering.ts`). `normalizeUrl`
strips `?email=<subscriber>` + `utm_*`/ESP click params (removes PII from `source_url`, fixes
cross-recipient dedupe). TLDR tracker hosts added to the URL deny-list. **Scoped down (flagged):**
full redirect-resolution of an opaque `semafor.com/s/<id>` to a different publisher needs a
live HEAD-follow (SSRF surface + 55s budget) — out of scope; the chrome filter drops the chrome
rows that carried these and the deny-list rejects the pure trackers.

**B5 — signal_score inversion (INVESTIGATION — reported, not fixed; see below).**

## B5 finding (the offending path)
Newsletter `signal_score = extraction_confidence * 100` (`promotion.ts:221`) — a *parse*
confidence (format base 0.74–0.94), not importance — so junk scores **86–94** vs real RSS
**58–72**. The ONLY path that orders by `signal_score` is the editorial review/history list:
`loadStoredSignalPosts` (`signals-editorial.ts:1305`, DB `.order("signal_score", desc)`) AND
its in-memory re-sort `compareEditorialHistoryPosts` — both rank `signal_score` DESC (tertiary,
after briefing_date + published_at). **Impact:** newsletter junk displays ABOVE real RSS within
a day in the cockpit review list. Every OTHER ordering uses `rank` / `final_slate_rank` /
`event_importance` — RSS-safe (#327 protects rank).

**Not fixed in PR-B** (touches the cockpit/render boundary; PR-B already stops new junk at the
source, and existing junk is PR-D's cleanup). **Recommended follow-up (contained, one-line):**
order the review list by `rank` ASC instead of `signal_score` DESC — #327 made `rank` meaningful
(RSS 1–7, newsletter 8–20), so it surfaces RSS first; OR stop deriving newsletter `signal_score`
from `extraction_confidence`.

## Result
- New `extraction-quality.test.ts`: **30 tests** (B1 per-charset decode ×5, B2 segmentation +
  5 MUST_NOT_STRIP, B3 9 MUST_REJECT + 7 MUST_KEEP, B4 deny-list + PII strip). All green.
- Full suite **1142 → 1172** (+30). Typecheck 0. Lint clean. No migration.

**Did NOT touch:** publish path, cockpit, render, `published_*`/`edited_*` columns,
`final_slate_rank` assignment, validation logic. Atomic newsletter insert (#324) untouched.
