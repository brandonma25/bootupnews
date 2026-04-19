# PRD-42 — Source Governance and Defaults

- PRD ID: `PRD-42`
- Canonical file: `docs/product/prd/prd-42-source-governance-and-defaults.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Make the source system safe to evolve by separating catalog support, source preference, and runtime default ingestion.

## User Problem

The product needs a narrow high-signal source mix. If catalog additions, fallback source order, or implicit preference heuristics can silently alter default ingestion or ranking treatment, the briefing can drift toward broader, noisier aggregation without an explicit product decision.

## Scope

- Remove BBC and CNBC from MVP catalog recommendations and preferred source treatment.
- Add explicit source lifecycle and validation metadata for catalog entries.
- Centralize source preference and tier logic behind one policy module.
- Make public MVP default ingestion explicit by source ID instead of inferred from `demoSources` order.
- Make donor fallback defaults explicit by source ID instead of inferred from donor registry order.
- Add regression tests that preserve the current default source set and prevent catalog-only or probationary sources from leaking into defaults.

## Non-Goals

- No new runtime-default or promoted source additions without explicit governance; catalog-only validated onboarding is allowed only when it does not alter defaults, editorial preferences, or source-tier boosts.
- No broad ingestion pipeline redesign.
- No auth, session, or Supabase schema changes.
- No relaxation of source-governance or release-governance requirements.

## Implementation Shape / System Impact

- `src/lib/source-catalog.ts` classifies catalog entries by source format, lifecycle status, validation status, default eligibility, and editorial preference.
- `src/lib/source-policy.ts` owns explicit source preference rules consumed by filtering and event-intelligence scoring.
- `src/lib/demo-data.ts` owns `MVP_DEFAULT_PUBLIC_SOURCE_IDS` and resolves the public default source set intentionally.
- `src/adapters/donors/registry.ts` owns `DEFAULT_DONOR_FEED_IDS` and resolves no-argument donor fallback defaults intentionally.
- `src/app/sources/page.tsx` presents catalog state as optional/importable rather than default ingestion.

## Dependencies / Risks

- Depends on PRD-1, PRD-13, PRD-15, and PRD-37 source and ingestion contracts remaining stable.
- Source governance still depends on human product judgment when promoting a source from catalog or probationary status into default ingestion.
- Existing live RSS endpoints can fail independently of this governance model.

## Acceptance Criteria

- BBC and CNBC are absent from catalog recommendations and source preference rules.
- The current public MVP default sources remain The Verge, Ars Technica, TLDR, TechCrunch, and Financial Times.
- Catalog additions do not alter default ingestion unless their IDs are explicitly promoted.
- Source preference treatment is granted only through the shared source-policy module.
- Tests assert exact public defaults, donor defaults, and BBC/CNBC exclusion.
- Repo-safe documentation explains source onboarding, validation states, default promotion, and the difference between supported, importable, preferred, and active-default sources.

## Evidence and Confidence

- Repo evidence used:
  - `src/lib/source-catalog.ts`
  - `src/lib/source-policy.ts`
  - `src/lib/demo-data.ts`
  - `src/adapters/donors/registry.ts`
  - `src/lib/pipeline/ingestion/index.ts`
  - `docs/engineering/change-records/source-catalog-cleanup-bbc-cnbc.md`
  - `docs/engineering/change-records/source-onboarding-model.md`
- Confidence: High. The runtime default path, catalog metadata, and source preference policy are covered by focused regression tests and local release-governance validation.
