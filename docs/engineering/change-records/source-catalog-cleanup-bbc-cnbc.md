# BBC and CNBC Source Catalog Cleanup

## Summary

BBC and CNBC are intentionally excluded from the current MVP source mix. The MVP source strategy is narrower than broad headline aggregation: sources should add high-signal editorial coverage without increasing duplicate pressure, clustering load, or downstream explanation noise.

## Product Rationale

- BBC is too broad for the current MVP positioning and was only present as a ready-to-import catalog recommendation.
- CNBC was not present as a source definition, but it was receiving preferred source-tier treatment in runtime heuristics.
- Both sources can be reconsidered later, but they should not be treated as backbone or preferred MVP sources now.

## Changes

- Removed BBC News from the recommended source catalog.
- Removed BBC and CNBC from source-tier heuristics so user-added versions do not receive MVP-preferred treatment by default.
- Removed BBC and CNBC from event-intelligence source-tier boost matching.

## Follow-Up Policy

Broad general-news and market-news feeds should stay out of the MVP backbone unless a later source review proves they add distinct, high-signal coverage that narrower sources do not already provide.
