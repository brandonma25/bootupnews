# PRD-66 — Three-Layer Publish Pipeline: Before This and The Ripple

- PRD ID: `PRD-66`
- Canonical file: `docs/product/prd/prd-66-three-layer-publish-pipeline.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Bring the Before This (`what_led_to_it`) and The Ripple (`what_it_connects_to`) editorial layers to parity with The Signal (`why_it_matters`): give each layer the full `edited_* → published_*` review/publish pipeline, expose the new edit surface in the admin composer, and render the three layers in the public foldback in cause-then-trajectory order with v2 labels. After this PRD, an editor can review and publish all three layers as a single coherent slate, and the public reader sees Signal → Before This → Ripple instead of a single-layer card.

## User Problem

The first real end-to-end editorial cycle (2026-05-24) surfaced an architectural asymmetry:

1. **Only one layer can be published.** `why_it_matters` has the full pipeline — `ai_why_it_matters`, `edited_why_it_matters` + `edited_why_it_matters_payload`, `published_why_it_matters` + `published_why_it_matters_payload`, and validation columns. The other two layers — `what_led_to_it` and `what_it_connects_to` — only have `ai_*` and `human_*` raw inputs. There is no `edited_*` for the editor to review into and no `published_*` for the publish gate to write to.
2. **The public foldback's "What led to this" section shows the empty-state string even when content exists.** The v1-era render mined the WITM payload's `sections[]` array for titles matching `/led|caus|before|context/i`, found nothing on v2-drafted cards (whose sections don't follow that title pattern), and rendered "No structural context yet for this signal." Meanwhile `ai_what_led_to_it` and `ai_what_it_connects_to` were silently populated (657–767 chars and 468–672 chars respectively on the 4 cards staged 2026-05-24).
3. **Foldback order does not match the editorial framework.** §2 of the editorial framework calls for cause-then-trajectory ordering — Before This → The Signal → The Ripple — but the current render uses What Happened → Why This Matters → What Led To This → What It Connects To. The brief calls for Signal → Before This → Ripple in the editorial-layer sequence (with What Happened as factual reporting kept in place above).

The editor needs all three layers to flow through the same review + publish path; the reader needs the three layers to appear in the intended order with the v2 vocabulary; and no path can leak unreviewed `ai_*` content to the public surface.

## Scope

- Add 8 columns to `signal_posts`: `edited_what_led_to_it` + `_payload`, `published_what_led_to_it` + `_payload`, `edited_what_it_connects_to` + `_payload`, `published_what_it_connects_to` + `_payload`. Type/nullability/default match the existing `edited_why_it_matters` family (text NULL no default; jsonb NULL no default).
- Keep the existing `human_what_led_to_it` and `human_what_it_connects_to` columns. They are written by the Notion bridge (`push-approved/route.ts:416,418`); dropping them would break the bridge. The runtime flow becomes: bridge → `ai_*`/`human_*` → editor cockpit → `edited_*` → publish gate → `published_*`.
- Extend `publishApprovedSignals` (`src/lib/signals-editorial.ts`) so it promotes all three layers' `edited_*` → `published_*` (text + structured payload). When `edited_*` is null for a layer, the corresponding `published_*` stays null. Never fall back to `ai_*` at publish time.
- Extend `saveSignalDraft`, `approveSignalPost`, `approveSignalPosts`, and `approveSignalPostWithContext` so the editor can persist `edited_what_led_to_it` + `edited_what_it_connects_to` (text plus auto-derived legacy-text payload) from the composer form.
- Add two textareas — "Before This" and "The Ripple" — to `StructuredEditorialFields` in the admin composer. Pre-fill order: `edited_*` → `published_*` → `human_*` → `ai_*` → empty. Hidden form fields wire to the server actions; the bulk-approve form passes per-row hidden inputs.
- Rewire the public foldback (`src/components/signals/SignalCard.tsx`) so each editorial layer reads ONLY its `published_*` field. Render order: `WhatHappened` (factual, sans) → `The Signal` (serif) → `Before This` (serif, new helper) → `The Ripple` (serif, new helper). v2 labels in the foldback only. Null/empty `published_*` shows the layer's empty state in italic tertiary text.
- Remove the v1-era `getStructuredSection()` helper from `SignalCard.tsx` — it mined the WITM payload for layer content; that was the actual root cause of the empty-state bug on cards with real layer content.
- Thread `published_what_led_to_it` + `published_what_it_connects_to` (text + payload) through the public read chain: `BriefingItem` (`src/lib/types.ts`) → `HomepageEvent` (`src/lib/homepage-model.ts`) → `SignalCardSignal` (`src/components/signals/SignalCard.tsx`). Gate so only `published_live` / `recent_published` source data flows through; admin-staging values never reach the public surface.

## Non-Goals

- **No structured editor parity for the new layers in this PRD.** The composer exposes simple textareas only. The publish gate auto-derives a legacy-text payload server-side via `createEditorialContentFromLegacyText`. A future PRD can elevate Before This and The Ripple to full structured-editor parity (preview / thesis / sections / preview-mode toggle) if needed.
- **No drop of `human_*` columns.** They remain bridge-write targets. The umbrella's "consolidate human_* into edited_*" follow-up is parked under #271.
- **No codebase-wide v1→v2 identifier rename.** Validator, server-action, and type names like `editedWhyItMatters`, `whyItMattersValidationStatus`, `saveSignalDraftAction` are unchanged. The v2 labels appear only in the public foldback labels. The full rename is a separate parked #271 child task.
- **No automated backfill of pre-existing rows.** Cards landed before this PRD have `edited_what_led_to_it`/`_connects_to` null; the editor will populate them via the new textareas (content can be copy-pasted from the bridge-populated `ai_*` content as a starting point).
- **No WITM-style validation gate on the new layers.** The 4 `why_it_matters_validation_*` columns are WITM-specific and not replicated for Before This / The Ripple. Those two layers do not block publish on validator-rule failure; only the WITM gate does.
- **No homepage card-face changes.** Before This and The Ripple appear in the expanded foldback only — the collapsed card face continues to show "Why this matters" preview text from the WITM payload.

## Implementation Shape / System Impact

- **Schema layer (1 migration).** `20260524120000_three_layer_publish_pipeline.sql` adds 8 nullable columns via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Type-match the existing WITM family. Column comments document the role of each column.
- **Publish gate (1 function, `publishApprovedSignals`).** New `buildLayerPublishText(editedText, structuredContent)` helper mirrors WITM's promotion logic: payload-derived text wins, raw edited text fallback, null when both empty. The `.update()` payload gains 4 new columns per row.
- **Editor mutation paths (4 functions).** `saveSignalDraft`, `approveSignalPost`, `approveSignalPosts`, `approveSignalPostWithContext` accept optional `editedWhatLedToIt` + `editedWhatLedToItStructured` + `editedWhatItConnectsTo` + `editedWhatItConnectsToStructured` inputs. New `buildLayerEditorialWrite()` helper writes the partial payload only when at least one of the layer's inputs is defined; otherwise the columns are left untouched (preserves backward compatibility for callers that don't know about these layers).
- **Composer UI (1 component + 1 bulk form + 1 action file).** `StructuredEditorialFields` renders two new `FieldBlock` + `<textarea>` instances tied to local React state and to hidden form inputs named `editedWhatLedToIt` / `editedWhatItConnectsTo`. `BulkApproveForm` emits the per-row hidden inputs for the same names. `actions.ts` gets a `readLayerEditorialText(formData, fieldName)` helper that returns `undefined` when the field is absent — so the lib's "untouched unless provided" semantics hold.
- **Foldback render (1 component).** `SignalCard.tsx` gets 4 new optional props on `SignalCardSignal`, a new `LayerWithEmptyState` subcomponent, and a new `readLayerBody(text, structured)` helper. The expanded foldback's section list is reordered. v1 `getStructuredSection()` and `WhatLedToThisSection` are deleted.
- **Public read chain (3 files).** `types.ts` adds 4 fields to `BriefingItem`. `data.ts:mapHomepageSignalPostToBriefingItem` and `homepage-model.ts` mapper pass them through, gated on source/status so admin-stage values cannot leak.

The change is additive at the schema and writer layers, surgical at the editor and reader components, and never modifies the WITM-specific validation columns or the `ai_*`/`human_*` columns.

## Terminology Requirement

- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- Object level modified: Card (signal_posts row — the Card storage layer). Three editorial layers per Card now flow through identical `ai_* → human_* → edited_* → published_*` pipelines.
- The Notion Editorial Queue, Pipeline Log, and Source Health Log are not modified. The Notion bridge continues to write `ai_*` and `human_*` for all three layers; the new `edited_*` and `published_*` are owned by the prod admin cockpit and the publish gate respectively.
- "The Signal", "Before This", "The Ripple" are foldback-render labels only — the canonical column / function / type names keep the v1 vocabulary (`why_it_matters`, `what_led_to_it`, `what_it_connects_to`).

## Verification

- Migration applied to prod Supabase via `apply_migration`; `information_schema.columns` confirms all 8 columns present, nullable, correct types.
- Publish-gate test asserts: row with `edited_*` + payload promotes both text and payload; row with only `edited_*` text still promotes; row with neither edited keeps `published_*` null AND `ai_*` content stays unsurfaced.
- Foldback test asserts: when all three layers carry published content, label sequence is exactly `[The Signal, Before This, The Ripple]`; when `published_*` is null, italic tertiary empty-state strings render and no `ai_*` content leaks.
- Full vitest suite: 806/806 passed across 102 files. `npm run build` green. `tsc --noEmit` clean on production code.
- Post-deploy editor action: BM opens each card in `/dashboard/signals/editorial-review`, fills the Before This + The Ripple textareas (content drafted in `ai_*` can be copied or rewritten), saves + approves + publishes. Foldback then shows all three layers instead of empty state.

## Lineage

**Closes:** issue #274 — "Build publish pipeline for Before This + The Ripple; fix foldback layer order and v2 labels."

**Headline child of:** issue #271 — editorial review cockpit consolidation (Option B). #274 is explicitly enumerated as a child task in #271.

**Related blocker:** issue #270 / PR #273 — `fix(witm-validator): citation markers + decimals/abbreviations no longer false-fail`. The publish gate this PRD extends still routes through `validateWhyItMatters`; PR #273 unblocked the WITM rule so the slate can publish at all.

**Descends from (PRDs):**
- **PRD-53** — `prd-53-signals-admin-editorial-layer.md`. Built `src/lib/signals-editorial.ts` and `publishApprovedSignals`. This PRD adds the new-layer columns to the publish gate without rewriting it.
- **PRD-63** — `prd-63-bootup-news-visual-system-v1-and-editorial-composer-two-pane.md`. Built `EditorialComposerClient` and `StructuredEditorialFields`. This PRD extends the latter with two new textareas; no rebuild of the surrounding two-pane shell.
- **PRD-64** — `prd-64-editorial-automation-pipeline.md`. Built `push-approved/route.ts` (the Notion → Supabase bridge) and the `ai_*` / `human_*` raw-input columns. This PRD layers `edited_*` / `published_*` on top so the editor can review and the publish gate can promote.

**Descends from (PRs):**
- **#100** "[codex] Signals admin editorial layer" — born `signals-editorial.ts` + the editorial-review route.
- **#150** "PRD-53 minimal final-slate composer" — born the slate-composition + `publishApprovedSignals`.
- **#229** "feature: brand identity visual system v1 + editorial composer two-pane" — born the current `EditorialComposerClient` / `StructuredEditorialFields`.
- **#237** "feat: editorial automation pipeline" — born the bridge that writes `ai_*` / `human_*` for all three layers.
- **#263** "fix(editorial): v2 bridge writeback with select-then-decide upsert (Path A Task 4)" — most recent substantive change to the bridge.
- **#266** "fix(cron,editorial): run-lock hardening + bridge `final_slate_rank` pairing + CHECK tighten" — most recent hardening of the publish-adjacent surface.

**Surfaced by:** first real end-to-end editorial cycle, 2026-05-24.

## Operational History

- 2026-05-24: PR #275 — initial implementation. Schema migration applied; publish gate, composer UI, and foldback render landed. Did not backfill pre-existing rows; the editor populates layer content via the new textareas as part of normal review.
