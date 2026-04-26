# Boot Up Canonical Terminology

## Purpose

Boot Up uses a staged intelligence object model. This document defines the canonical terms that future PRDs, implementation prompts, code reviews, and cleanup audits must use when discussing ingestion, grouping, ranking, rendering, and placement.

The goal is to prevent drift between "article," "story," "cluster," "signal," and "card" language. These terms describe different object levels and must not be used interchangeably.

## Canonical Object Flow

```text
Article -> Story Cluster -> Signal -> Card -> Surface Placement
```

Boot Up should conceptually rank Signals, not raw Articles or raw Story Clusters. Cards and surface placements are presentation decisions layered on top of Signal identity.

## Definitions

### Article

An Article is a single source item from RSS, API, TLDR-discovered URL, newsletter-derived source item, or another ingestion source.

It is raw input. It should not be treated as the final ranked product object.

### Story Cluster

A Story Cluster is a group of Articles about the same real-world event, topic, or development.

It is a structural grouping object. It deduplicates and organizes source evidence. It does not itself equal a Signal.

### Signal

A Signal is a ranked, interpreted unit of importance derived from one or more Story Clusters.

It answers:
- What happened?
- Why does it matter?
- What caused it?
- What does it connect to?
- Why should the user care today?

Signals are the conceptual product objects that Boot Up ranks for user attention.

### Card

A Card is a UI rendering of a Signal.

A Card is not the Signal itself. The same Signal may appear differently depending on surface, viewport, editorial state, or interaction state.

### Surface Placement

A Surface Placement is the contextual placement of a Signal or Card in the product.

Examples:
- homepage top 5
- politics tab
- technology tab
- editorial queue
- archive/history page

Surface Placement determines presentation and priority treatment. It does not define Signal identity.

## Do / Do Not Usage

| Term | Do | Do Not |
| --- | --- | --- |
| Article | Use for one source item from ingestion. | Do not call an Article a Signal just because it has a high score. |
| Story Cluster | Use for grouped source evidence about the same event, topic, or development. | Do not treat a Story Cluster as the interpreted ranked object. |
| Signal | Use for the ranked, interpreted unit derived from Story Cluster evidence. | Do not use Signal for a CSS card, source article, or raw cluster unless legacy naming forces it and the mismatch is documented. |
| Card | Use for the UI rendering of a Signal. | Do not describe a Card as the Signal identity. |
| Surface Placement | Use for where a Signal or Card appears in the product. | Do not use placement names like "Top 5" or "politics tab" as if they create separate Signal identities. |

## Correct And Incorrect Wording

Correct:
- "The ingestion layer created Articles from Reuters and TLDR-discovered URLs."
- "The clustering layer grouped five Articles into one Story Cluster."
- "The ranking layer promoted the interpreted Signal derived from that Story Cluster."
- "The homepage renders the Signal as a compact Card."
- "The politics tab is a Surface Placement for the same underlying Signal."

Incorrect:
- "This card is a signal."
- "Rank the raw articles as homepage signals."
- "The cluster is the final signal."
- "Create a separate signal for every homepage placement."
- "The story card and signal can be used interchangeably."

Preferred rewrite:
- Instead of "top 5 cards are the signals," say "the homepage top 5 Surface Placement renders five Signal Cards."
- Instead of "rank clusters for the homepage," say "derive Signals from Story Cluster evidence, then rank the Signals for homepage placement."
- Instead of "persist card identity," say "persist the Signal identity or the Surface Placement, depending on the actual object being changed."

## Enforcement Rule

Future PRDs and implementation prompts must use Article, Story Cluster, Signal, Card, and Surface Placement according to these definitions.

Before implementation, the author or agent must identify which object level the change modifies. If the existing code uses legacy names that blur the object level, document the mismatch in the PRD, implementation note, or audit instead of silently expanding the ambiguity.

Explicit warning: "cluster," "signal," "story," and "card" must not be used interchangeably. When a legacy symbol uses one of those words differently from this canonical terminology, treat that as technical debt and preserve behavior until a scoped cleanup is approved.
