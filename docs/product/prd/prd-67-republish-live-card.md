# PRD-67 — Re-Publish Live Card: Update-In-Place with Prior-Version Snapshot

- PRD ID: `PRD-67`
- Canonical file: `docs/product/prd/prd-67-republish-live-card.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Restore the cockpit's ability to push corrections / enrichments to an already-live signal card. Re-publishing a published+live card overwrites its `published_*` fields in place (same row, same id, stays live) but first snapshots the prior published version into a new column so corrections don't destroy history. This is the smallest possible win: not full versioning, not a slate-reorder rebuild — just the single missing edit-correct-republish path.

## User Problem

Confirmed in prod 2026-05-24: once a `signal_post` is `editorial_status='published'` / `is_live=true`, the cockpit cannot re-publish it. Four overlapping guards in `validateFinalSlateReadiness` (`final-slate-readiness.ts:209-236`) reject every already-live row from the slate publish gate: `editorial_status === "published"`, `editorial_status !== "approved"`, `row.isLive`, and `row.publishedAt`. The reorder/remove/replace backend actions (`removeFromFinalSlateAction`, `replaceFinalSlateSlotAction`) exist with no client caller — they were stripped from the frontend in PR #229. Result: a published card cannot be edited / enriched / corrected through the UI at all. Last night this forced a manual SQL promotion to fix a typo on a live card.

The editor needs a single supported path to push `edited_*` updates to a live card without unpublishing-and-re-publishing the whole slate. That path must not destroy the prior published version, so a future corrections-log feature has the data to render diffs / rollback.

## Scope

- Add ONE column to `signal_posts`: `previous_published_snapshot jsonb NULL`. Shape: `{ why_it_matters, what_led_to_it, what_it_connects_to, why_it_matters_payload, what_led_to_it_payload, what_it_connects_to_payload, snapshotted_at }`. Single prior version (overwritten on each re-publish).
- New server function `republishLiveSignalPost({ postId })` in `src/lib/signals-editorial.ts`. Pre-conditions: row exists, `is_live=true` AND `editorial_status='published'` AND `published_at IS NOT NULL`, `source_url` is a valid public URL, WITM text built from `edited_*` passes `validateWhyItMatters`. Write path: snapshot current `published_*` + WITM payload into `previous_published_snapshot`, overwrite all three `published_*` text + payload from `edited_*` (Before This / The Ripple fall back to existing `published_*` so a re-publish that only edits The Signal doesn't null the other layers), bump `published_at=now`. Keep `is_live=true`, `editorial_status='published'`.
- New server action `republishLiveSignalPostAction` in `actions.ts` (POST form action submitting `postId`).
- Minimal UI: a "Re-publish live card" button in `SignalPostEditor` (`StructuredEditorialFields.tsx`), shown ONLY for cards that are currently `published + live + publishedAt`, disabled when `whyItMattersValidationStatus === "requires_human_rewrite"`. Submits to `republishLiveSignalPostAction`.

## Non-Goals

- **No full versioning.** Single prior version only — each re-publish overwrites the snapshot. A future corrections-log feature can migrate `previous_published_snapshot jsonb` to an array or break it out into a dedicated `signal_post_publish_history` table without losing data.
- **No diff/rollback UI.** The snapshot is the data foundation; surfaces (diff viewer, restore button) are a separate post-MVP feature.
- **No relaxation of the slate publish gate for never-published cards.** Those still go through `publishApprovedSignals` and its four already-live guards. The new function refuses on never-published rows.
- **No relaxation of any other guard.** WITM validation, source-URL guard, schema preflight all still apply.
- **No rebuild of the reorder/remove/replace controls** stripped from the frontend in PR #229. Those orphan backend actions (`removeFromFinalSlateAction`, `replaceFinalSlateSlotAction`) remain unwired — separate #271 children.
- **No `published_slates` audit row** for re-publish. That table audits SLATE publishes (a new row of slate is going live); re-publish-in-place is a single-row correction. The snapshot column is its audit surface.

## Implementation Shape / System Impact

- **Schema (1 migration).** `20260524150000_signal_posts_previous_published_snapshot.sql` adds one nullable jsonb column via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Column comment documents the role.
- **Library (1 new exported function, 1 type-union addition).** `republishLiveSignalPost` mirrors `publishApprovedSignals`'s validation + write shape but scoped to a single row, with two crucial differences: (a) precondition is "must already be published+live" rather than "must be approved+not-published"; (b) write payload includes `previous_published_snapshot` populated from the row's current `published_*` values BEFORE the overwrite. `StoredSignalPost` type gains the column; `EditorialMutationResult.code` union gains `"republished"`.
- **Server action (1 export).** `republishLiveSignalPostAction(formData)` in `actions.ts` — same shape as the other one-row mutation actions.
- **UI (1 conditionally-rendered button).** `<SignalPostEditor>` already renders the per-card decision controls; the new button slots into the same `<div>` row as Save / Approve / Reset, gated on `post.isLive && post.editorialStatus === "published" && post.publishedAt`, disabled when WITM needs human rewrite. No new layout, no panel rebuild.
- **No changes** to the slate gate, the published_slates audit, the bridge, the cron, the validator, or the reader-facing render path.

## Terminology Requirement

- Before implementation, read `docs/engineering/BOOTUPNEWS_CANONICAL_TERMINOLOGY.md`.
- Object level modified: Card (single-row `signal_posts` mutation). The Card storage layer (PRD-53) and the three-layer publish pipeline (PRD-66) are the active substrate; this PRD extends them with an in-place re-publish path and a single-prior-version snapshot column.
- "Re-publish" in this PRD always means "overwrite the same row's `published_*` fields in place, keeping the row live and same id". It does NOT mean "re-run the slate publish gate" or "promote a new row to live".

## Verification

- Migration applied to prod Supabase via `apply_migration`; `information_schema.columns` confirms `previous_published_snapshot jsonb NULL` is present.
- Lib tests (`signals-editorial.test.ts`): 4 new tests pin the contract — (a) snapshot + overwrite happens on a live+published card, (b) WITM validation failure blocks re-publish without writing snapshot or overwriting, (c) never-published cards are refused, (d) missing `postId` returns `not_found`. Plus a sanity test that the slate publish path still leaves `previous_published_snapshot` null on first-time publishes.
- UI tests (`editorial-composer-components.test.tsx`): 4 new tests — button shows only on published+live+publishedAt cards, hidden on never-published / draft, disabled when WITM requires human rewrite.
- Full vitest suite: 821/821 passed across 102 files. `npm run build` green.
- Post-deploy editor action: BM opens the cockpit row for any published card, edits any of the three layers, clicks "Re-publish live card". The row's `published_*` updates in place; `previous_published_snapshot` carries the prior published copy. No SQL needed.

## Lineage

**Closes:** issue #280 — "Re-publish live card (update-in-place + prior-version snapshot)."

**Child of:** issue #271 — editorial review cockpit consolidation (Option B). Restores cockpit ownership of edit-correct-republish for live cards. Does NOT rebuild the full reorder/remove/replace UI (also a #271 child, deferred).

**Descends from (PRDs):**
- **PRD-53** — `prd-53-signals-admin-editorial-layer.md`. Built `signals-editorial.ts` and `publishApprovedSignals` (the slate publish gate that this PRD intentionally does NOT modify).
- **PRD-63** — `prd-63-bootup-news-visual-system-v1-and-editorial-composer-two-pane.md`. Built `EditorialComposerClient` / `StructuredEditorialFields` (where this PRD adds the single new button).
- **PRD-66** — `prd-66-three-layer-publish-pipeline.md`. Established the three-layer `edited_* → published_*` promotion shape this PRD reuses verbatim.

**Descends from (PRs):**
- **#100** "[codex] Signals admin editorial layer" — born `signals-editorial.ts` + the editorial-review route.
- **#150** "PRD-53 minimal final-slate composer" — born `publishApprovedSignals` whose write payload shape this PRD's `republishLiveSignalPost` mirrors.
- **#229** "feature: brand identity visual system v1 + editorial composer two-pane" — born `StructuredEditorialFields` where the new button lives.
- **#275** "feat(editorial): three-layer publish pipeline + v2 foldback render (#274)" — added the `edited_*` / `published_*` columns + `buildLayerPublishText` helper this PRD's re-publish path reuses.

**Surfaced by:** 2026-05-24 prod incident where a typo on a live card required a manual SQL promotion because the cockpit had no edit-correct-republish path.

## Operational History

- 2026-05-24: PR #281 — initial implementation. Migration applied; `republishLiveSignalPost` + action + button shipped. Did not re-publish any pre-existing live cards in the PR; that's a post-deploy editor action through the new button.
