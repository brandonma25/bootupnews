# PRD-52 — Source Taxonomy Expansion

- PRD ID: `PRD-52`
- Canonical file: `docs/product/prd/prd-52-source-taxonomy-expansion.md`
- Feature system row: `docs/product/feature-system.csv`

## Objective

Expand the Daily Intelligence Aggregator ingestion source set with the approved RSS sources while preserving correct homepage category routing for strict-category feeds and mixed-domain/O3 feeds.

## User Problem

Readers need broader, higher-quality coverage across technology, politics/geopolitics, and cross-domain analysis. If broad research or world feeds are flattened into a single category, category tabs become misleading and mixed-domain coverage can leak into politics or economics by source name alone.

## Scope

- Register the 11 requested source identities in a source taxonomy profile.
- Activate validated feeds through the current public source manifest and donor runtime metadata.
- Preserve The Verge and Ars Technica as existing active strict technology sources.
- Register Brookings Research and CSIS Analysis as mixed-domain/O3 but disabled because the supplied URLs failed live RSS validation.
- Route strict technology sources to `tech`.
- Route strict politics/geopolitics sources to `politics`.
- Route mixed-domain/O3 sources through item-level homepage classification instead of source-name flattening.
- Update donor registry metadata, public source manifest coverage, source taxonomy, homepage classification, and focused regression tests.

## Non-Goals

- No ranking, summarization, deduplication, or UI styling redesign.
- No schema migration.
- No new website category key beyond the existing repo keys `tech`, `finance`, and `politics`.
- No forced economics-only handling for Brookings Research.
- No active fetch attempts for RSS endpoints that fail validation.

## Implementation Shape / System Impact

- `src/lib/source-taxonomy.ts` defines source profiles with strict versus mixed-domain scope, default category where applicable, validation status, and runtime enablement.
- `src/lib/demo-data.ts` registers the validated source identities needed by the public source manifest while preserving the legacy MVP default helper as a compatibility fallback.
- `src/lib/source-manifest.ts` includes the validated PRD-52 public sources in the governed `public.home` manifest; Brookings Research and CSIS Analysis remain excluded because their supplied feeds failed validation.
- `src/adapters/donors/openclaw/index.ts` registers donor-backed source metadata for the requested sources; Brookings Research and CSIS Analysis are inactive.
- `src/lib/homepage-taxonomy.ts` uses strict source profiles as category signals and ignores mixed-domain source names as category signals.
- `src/lib/data.ts` carries pipeline homepage classification onto generated briefing items so mixed-domain items do not inherit category placement from fallback topic labels.

## Dependencies / Risks

- Depends on PRD-1 ingestion, PRD-37 pipeline, PRD-42 source governance, and PRD-17 homepage taxonomy contracts.
- Live RSS availability can change independently of code.
- The repo does not have first-class mixed-domain/O3 category keys; this PR preserves mixed-domain scope through source profiles and item-level routing instead.
- MIT Technology Review remains in the existing probationary donor runtime path for compatibility with the internal MIT review route, while public manifest-supplied ingestion includes it as a strict technology source.

## Acceptance Criteria

- All 11 requested source identities are represented in code-level source taxonomy.
- Validated strict tech feeds classify into `tech`.
- Validated strict politics/geopolitics feeds classify into `politics`.
- Brookings Research is not hardcoded into economics/finance and is not actively fetched while the supplied URL fails RSS parsing.
- Foreign Policy, The Guardian World, Brookings Research, and CSIS Analysis are marked mixed-domain/O3 and do not force category placement by source name alone.
- Failed Brookings and CSIS feed validation is documented.
- Existing sources remain compatible with the public manifest, donor defaults, legacy MVP fallback helper, and homepage rendering.
- Focused source catalog, source default, ingestion, and homepage taxonomy tests pass.

## Evidence and Confidence

- Repo evidence used:
  - `src/lib/source-catalog.ts`
  - `src/lib/demo-data.ts`
  - `src/adapters/donors/openclaw/index.ts`
  - `src/adapters/donors/registry.ts`
  - `src/lib/pipeline/ingestion/index.ts`
  - `src/lib/homepage-taxonomy.ts`
  - `docs/engineering/change-records/source-onboarding-batch-1.md`
- Confidence: Medium-high for local taxonomy and source-registration behavior; medium for live feed durability because external RSS endpoints can change.

## Closeout Checklist

- Scope completed: Yes
- Tests run: See `docs/engineering/change-records/source-taxonomy-expansion-2026-04-22.md`
- Local validation complete: Yes
- Preview validation complete, if applicable: Pending
- Production sanity check complete, only after preview is good: Pending
- PRD summary stored in repo: Yes
- Bug-fix report stored in repo, if applicable: Not applicable
- Google Sheets tracker updated and verified: Direct Sheets update unavailable in this session
- If direct Sheets update is unavailable, fallback tracker-sync file created in `docs/operations/tracker-sync/` with exact manual update payload: Yes, `docs/operations/tracker-sync/2026-04-22-source-taxonomy-expansion.md`
