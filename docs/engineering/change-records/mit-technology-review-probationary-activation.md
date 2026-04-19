# MIT Technology Review Probationary Activation

Date: 2026-04-19

Governed feature: `PRD-42` (`docs/product/prd/prd-42-source-governance-and-defaults.md`)

## Purpose

Activate exactly one validated source, MIT Technology Review, in a controlled runtime ingestion path without expanding the MVP default public source set.

MIT Technology Review was chosen because the prior source-onboarding pass validated its RSS feed, it has strong technology and AI relevance, and it has lower duplicate pressure than broad world or broad economy feeds.

## Runtime Path Changed

No-argument ingestion now resolves:

1. explicit donor fallback defaults from `DEFAULT_DONOR_FEED_IDS`
2. explicit probationary runtime feeds from `PROBATIONARY_RUNTIME_FEED_IDS`

The probationary list currently contains only `mit-technology-review`.

## What Did Not Change

- `MVP_DEFAULT_PUBLIC_SOURCE_IDS` was not changed.
- `DEFAULT_DONOR_FEED_IDS` was not changed.
- Donor fallback defaults were not expanded.
- Source catalog importability still does not imply default activation.
- Source-policy tiers and editorial boosts were not changed.
- BBC and CNBC remain excluded.
- Foreign Affairs, Foreign Policy, The Diplomat, NPR World, Guardian World, Hacker News Best, and Financial Times Global Economy were not activated.

## Future Probationary Activations

Future probationary source trials should be handled one source at a time unless the product owner explicitly approves a broader experiment.

Required steps:

1. Validate the source endpoint.
2. Add or verify a donor-backed source definition with `availability: "probationary"`.
3. Add the exact source ID to `PROBATIONARY_RUNTIME_FEED_IDS`.
4. Keep MVP defaults, donor defaults, and source-policy boosts unchanged unless explicitly approved.
5. Add guardrail tests proving only the approved source is active in the probationary path.

This path is a reversible evaluation mechanism, not a default-source expansion.
