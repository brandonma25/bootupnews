# Editorial Review Card — Single-Layer Render — Bug-Fix Record

## Summary
- **Problem addressed:** The editorial-review cockpit (`/dashboard/signals/editorial-review`) showed **one** editorial block per candidate on the at-a-glance review card, even though each `signal_posts` row stores **three** distinct editorial layers: `edited_why_it_matters` → **The Signal**, `edited_what_led_to_it` → **Before This**, `edited_what_it_connects_to` → **The Ripple**. Reviewers could not see Before This / The Ripple without opening each card's editor, so the review surface did not match the Notion three-layer view. Confirmed on the live 2026-06-09 rows (all three columns populated and distinct).
- **Root cause:** A **card-level presentation gap, NOT a read/data bug.** The loader already SELECTs and maps all three text columns + payloads (`src/lib/signals-editorial.ts`), and the *expanded* editor already read all three from their text columns (a NULL `*_payload` correctly falls back to text). But `CandidateRow` rendered only the WITM body via `getCandidateWitmBody` (`edited_why_it_matters || published_* || ai_*`); the two depth layers were absent from the card.
- **Falsifier that resolved the diagnosis:** "Before This / The Ripple are missing or mirror The Signal in the *expanded editor*" — did **not** hold; the editor renders all three distinctly. That isolated the defect to the card, ruling out a NULL-`*_payload` read bug.
- **Affected object level:** Admin UI only (review card + editor labeling). No row mutation.
- **Related PR:** #321.

## Fix
- **(A) `src/components/admin/editorial-composer/CandidateRow.tsx`** — render three read-only **labeled** previews in fixed order **The Signal → Before This → The Ripple**. Each layer sources `edited_* → published_* → ai_*` (the card's existing WITM precedence; never `human_*`, never `*_payload`). 2-line clamp, labeled empty states, and the WITM rewrite-gate placeholder preserved on The Signal. `getCandidateWitmBody` was replaced by three layer getters + a `CardLayerPreview` component.
- **(B) `src/app/dashboard/signals/editorial-review/StructuredEditorialFields.tsx`** — add a visible **"The Signal"** label (`LayerHeading`) above the structured sub-editor and present the three layers as labeled peers in the same order. The Signal's structured authoring controls (teaser / thesis / sections) are unchanged.

## Tests
- **New regression tests** (`editorial-composer-components.test.tsx`, `#321`): assert the card renders all three labels in fixed order with each layer's own body, and that absent depth layers show labeled empty states without leaking the WITM body into the other two layers.
- Existing card/page/editor assertions (WITM body present, rewrite placeholder, `Homepage teaser` / `Thesis` editor labels) remain green.
- Full suite: **1062/1062 across 126 files** (was 1060; +2 new). eslint clean.
- **Visual confirmation:** live-rendered `CandidateRow` across three states (fully populated, rewrite-gated, partial-empty) and verified the three labeled layers, 2-line clamping, and labeled empty states.

## Not addressed by this fix
- The Signal's **structured authoring path** (`edited_why_it_matters_payload`, which the public homepage renders from via `SignalCard` / `readLayerBody`, structured-first with text fallback) — intentionally untouched; **not** collapsed to a plain textarea (that would be a public-homepage render change).
- No change to the loader, the publish gate, the `edited_* → published_*` promotion, or `is_live` gating (publish still keeps `is_live=false` until publish).
- No schema change. No row mutation. No change to the public homepage read path.
