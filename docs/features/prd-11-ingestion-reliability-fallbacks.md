# PRD 11 - Ingestion reliability + fallbacks

## Objective
- Keep Finance, Politics, and Tech sections from rendering blank
- Supplement thin primary-source coverage with safe fallback feeds
- Make fallback behavior visible in logs and explicit in the UI

## Problem
Some categories could end up empty when RSS feeds timed out, returned too few articles, or clustered into no usable event cards. That created blank-feeling sections instead of a resilient briefing experience.

## Scope
- In scope
- Multi-source ingestion resilience, retry/timeout handling, minimum-category supplementation, dedupe preservation, fallback logging, and intentional empty/loading states
- Out of scope
- Auth, Supabase schema changes, environment variable changes, and unrelated dashboard behavior

## Implementation Summary
- multi-source ingestion
- retry + timeout
- minimum content guarantee
- fallback logging
- intentional UI states

## Risks
- RSS inconsistency
- dupes
- latency

## Acceptance Criteria
- Finance / Politics / Tech populated or intentional state
- no blank category sections
- fallback usage logged

## Files Changed
- `src/lib/data.ts`
- `src/lib/data.test.ts`
- `src/lib/rss.ts`
- `src/lib/homepage-model.ts`
- `src/components/landing/homepage.tsx`
- `src/components/landing/homepage.test.tsx`
- `src/components/dashboard/personalized-dashboard.tsx`
- `src/app/loading.tsx`

## Testing
- normal case: primary feeds return enough articles without fallback
- partial failure: thin category coverage triggers supplemental fallback fetches
- primary source failure: fallback feeds recover category coverage where possible
- total failure: UI shows intentional empty state and never blank whitespace
