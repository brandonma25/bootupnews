# Tracker Sync Fallback — Source Taxonomy Expansion

Direct Google Sheets verification was not available in this local Codex session. Apply this exact governed row update to workbook `Features Table`, `Sheet1`.

## Governed Row

- Record ID / PRD ID: `PRD-52`
- Layer: `Data`
- Feature Name: `Source taxonomy expansion`
- Priority: `High`
- Status: `In Review`
- Description: `Expand public ingestion sources with validated RSS feeds and explicit strict versus mixed-domain source taxonomy handling`
- Owner: `Codex`
- Dependency: `Daily news ingestion foundation, Source governance and defaults, Homepage intelligence surface`
- Build Order: `52`
- Decision: `build`
- Last Updated: `2026-05-08`
- PRD File: `docs/product/prd/prd-52-source-taxonomy-expansion.md`

## Notes

- This is feature work, not remediation.
- 2026-05-08 merge refresh: public activation now uses the governed `public.home` source manifest introduced after this PR was opened; the legacy MVP default helper remains a compatibility fallback.
- Brookings Research and CSIS Analysis are registered as mixed-domain/O3 but disabled because the supplied feed URLs failed live RSS validation.
- The repo uses `finance` as the existing economics category key; no schema or category-key migration was made.
