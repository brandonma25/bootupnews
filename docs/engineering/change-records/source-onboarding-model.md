# Source Onboarding Model

Governed feature: `PRD-42` (`docs/product/prd/prd-42-source-governance-and-defaults.md`).

## Current Architecture

The source system has separate layers:

- Public default ingestion is configured by explicit source IDs in `MVP_DEFAULT_PUBLIC_SOURCE_IDS`.
- Donor-backed source definitions live in the donor registry and are used when the pipeline is called without explicit sources.
- Donor fallback defaults are configured by explicit source IDs in `DEFAULT_DONOR_FEED_IDS`.
- Probationary runtime activations are configured separately by explicit source IDs in `PROBATIONARY_RUNTIME_FEED_IDS`.
- User-created sources live in Supabase `sources` rows and are treated as custom RSS inputs.
- The source catalog is an optional import surface. A catalog entry is not active ingestion.
- Source preference logic is centralized in `src/lib/source-policy.ts` and consumed by filtering and event-intelligence scoring.

## Explicit MVP Defaults

The current public MVP default ingestion set is:

- The Verge
- Ars Technica
- TLDR
- TechCrunch
- Financial Times

These are resolved from `src/lib/demo-data.ts` through `MVP_DEFAULT_PUBLIC_SOURCE_IDS` and `getMvpDefaultPublicSources()`. Adding another `demoSources` entry or adding a source catalog entry does not promote that source into public default ingestion.

The donor fallback path uses `DEFAULT_DONOR_FEED_IDS` in `src/adapters/donors/registry.ts`. This prevents registry ordering from silently changing the no-argument pipeline default.

## Probationary Runtime Activation

The controlled probationary path is separate from both public MVP defaults and donor fallback defaults.

Current probationary runtime activation:

- MIT Technology Review

This source participates in no-argument runtime ingestion through `PROBATIONARY_RUNTIME_FEED_IDS` in `src/adapters/donors/registry.ts` and the resolver in `src/lib/pipeline/ingestion/index.ts`.

This is not a default-source expansion:

- `MVP_DEFAULT_PUBLIC_SOURCE_IDS` remains unchanged.
- `DEFAULT_DONOR_FEED_IDS` remains unchanged.
- Source catalog metadata remains optional/importable metadata, not an activation switch.
- Source-policy tiers and boosts remain unchanged.

## Source States

- `active_default`: eligible for default runtime ingestion. This should be rare and intentionally approved.
- `active_optional`: supported and strategically useful, but not automatically active.
- `catalog_only`: visible as an optional candidate, not promoted to active use.
- `probationary`: technically possible or strategically interesting, but noisy, key-gated, rate-limited, or not yet proven.
- `disabled`: intentionally unavailable.
- `legacy`: preserved as historical context or a stale endpoint, not importable without revalidation.

## Validation States

- `validated`: feed or endpoint has a current parser/API check.
- `unverified`: endpoint is known but has no current validation record.
- `failed`: endpoint is known to fail or not parse.
- `requires_key`: endpoint needs credentials before validation.
- `manual_only`: no supported machine-ingestable endpoint is available.

## Onboarding Rules

- Supported is not default.
- Catalog entry is not active ingestion.
- A source must not receive tier or boost preference unless explicitly approved in `src/lib/source-policy.ts`.
- New catalog entries should start as `catalog_only` or `probationary` with `mvpDefaultAllowed: false`.
- `importStatus: "ready"` means importable by the current UI, not automatically default. It must not be used for failed, key-gated, or manual-only sources.
- Broad general-news or broad market-news sources should not be promoted into the MVP backbone without a product decision.
- BBC and CNBC remain intentionally excluded from catalog recommendations and source preference logic for the current MVP.

## Promotion Rules

To promote a source into public default ingestion:

1. Add or verify the source definition in `demoSources`.
2. Add the source ID to `MVP_DEFAULT_PUBLIC_SOURCE_IDS`.
3. Update catalog metadata only if the source should also appear in the optional source catalog.
4. Add source preference in `src/lib/source-policy.ts` only if the source is intentionally approved for tier treatment.
5. Update tests that assert the exact MVP default set.

Do not use catalog presence, `importStatus: "ready"`, or source-policy preference as a proxy for default runtime activation.

To add a future probationary runtime activation:

1. Choose exactly one evaluated source unless the product owner explicitly approves a broader experiment.
2. Add a donor-backed source definition with `availability: "probationary"`.
3. Add only that source ID to `PROBATIONARY_RUNTIME_FEED_IDS`.
4. Keep `MVP_DEFAULT_PUBLIC_SOURCE_IDS`, `DEFAULT_DONOR_FEED_IDS`, and source-policy rules unchanged unless the task explicitly asks for those changes.
5. Add tests proving only the approved source enters the probationary path.

## Adding New Candidate Sources

Add user-provided candidates in `src/lib/source-catalog.ts` with:

- source format
- lifecycle status
- validation status
- default eligibility
- editorial preference
- concise note when the source is unverified, failed, key-gated, or probationary

After adding candidates, run the catalog/source-policy tests and verify that default ingestion has not changed.
