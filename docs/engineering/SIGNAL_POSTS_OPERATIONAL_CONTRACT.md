# signal_posts Operational Contract

Date: 2026-04-26
Object level: Surface Placement plus Card copy/public read model

## Purpose

This document defines the operational meaning of `public.signal_posts` until a canonical Signal identity layer exists.

## Contract

`signal_posts` is not canonical Signal identity.

`signal_posts` represents an editorial/published Surface Placement plus Card copy and public read model. Rows may describe the current live Top 5, historical daily placement snapshots, and public depth-pool card rows, but those rows are not durable event or Signal identities.

`published_slates` and `published_slate_items` are minimal audit/history companions for supported PRD-53 final-slate publishes. They snapshot the published Surface Placement and Card copy at publish time; they are not canonical Signal identity, a public archive surface, or the Phase 2 historical content model.

`signal_posts.id`, `signal_posts.rank`, and `(briefing_date, rank)` must not be treated as stable event identity, durable Signal identity, or canonical cross-day lineage.

`signal_posts` must not be used as the canonical foundation for Phase 2 progression, lineage, Signal history, event evolution, or duplicate suppression.

Future canonical Signal work should introduce or identify a separate `Signal` or `SignalCandidate` identity layer. That layer should own durable identity, source Story Cluster references, interpretation fields, progression state, and lineage. Future placement tables or read models may reference that canonical identity, but should not replace it.

## Current Operational Meaning

The current table is allowed to serve these purposes:

- Editorial review queue rows derived from briefing/card candidates.
- Published card copy for public surfaces.
- Live public Surface Placement state through `is_live`.
- Daily placement archive through `briefing_date` and `rank`.
- Public depth-pool rows for homepage/category rendering.
- Internal published-slate audit references through `published_slate_items.signal_post_id`.

The current table is not allowed to serve these purposes:

- Canonical Signal identity.
- Durable real-world event identity.
- Phase 2 progression source of truth.
- Cross-day Signal lineage source of truth.
- Signal-level history or memory source of truth.

## Key Runtime Paths

- `src/lib/signals-editorial.ts`
  - `persistSignalPostsForBriefing()` writes daily placement/card candidates.
  - `publishApprovedSignals()` publishes the validated `5 Core + 2 Context` final Surface Placement slate.
  - `getPublishedSignalPosts()` reads public `/signals` card rows.
  - `getHomepageSignalSnapshot()` reads homepage placement/card snapshots.
- `src/lib/data.ts`
  - maps homepage signal-post rows back into `BriefingItem` card objects.
- `src/lib/homepage-editorial-overrides.ts`
  - applies published `signal_posts` copy as homepage card-copy overrides.
- `public.published_slates` / `public.published_slate_items`
  - store internal publish audit rows for the most recent and prior supported final-slate publishes.

## Required Future Constraint

Any Phase 2 progression, lineage, Signal history, or event-evolution implementation must define the canonical Signal object boundary before reusing `signal_posts` data for identity-sensitive behavior.
