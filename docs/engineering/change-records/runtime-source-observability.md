# Runtime Source Observability

Date: 2026-04-19

Governed feature: `PRD-42` (`docs/product/prd/prd-42-source-governance-and-defaults.md`)

## Purpose

Post-merge source audits needed a clean way to verify which source IDs were resolved by runtime ingestion, especially the no-argument ingestion path. Before this change, audits relied too heavily on code reading and broad pipeline logs.

## What Was Added

- A safe runtime source-resolution snapshot in the existing `src/lib/observability/pipeline-run.ts` module.
- A structured server log event named `Runtime source resolution snapshot`.
- Pipeline-run metadata carrying the same source-resolution snapshot for local and test verification.

The snapshot separates:

- MVP default public source IDs
- donor fallback default IDs
- probationary runtime source IDs
- resolved runtime source IDs
- resolved donor-default, probationary, and other source ID subsets

## Safety Boundary

The snapshot is ID-only. It does not expose feed URLs, registry dumps, request headers, cookies, user identity, tokens, secrets, or provider credentials. No public route or unauthenticated debug endpoint was added.

## How To Use In Future Audits

Run a local, preview, or production ingestion path and inspect server logs for `Runtime source resolution snapshot`. For a no-argument runtime path, confirm:

- `resolution_mode` is `no_argument_runtime`
- `donor_fallback_default_ids` matches `DEFAULT_DONOR_FEED_IDS`
- `probationary_runtime_source_ids` contains only `mit-technology-review`
- `resolved_runtime_source_ids` contains only the governed donor defaults plus the approved probationary runtime source
- `resolved_other_source_ids` is empty

For supplied public MVP sources, use the pipeline metadata or focused tests to confirm `resolution_mode` is `supplied_sources` and the resolved IDs are the `custom-*` versions of the explicit MVP public defaults.

## What This Proves

- Which governed source ID sets the runtime knew about at resolution time.
- Which source IDs were resolved for the current ingestion path.
- Whether MIT Technology Review remains the only probationary runtime source.

## What This Does Not Prove

- It does not prove each feed fetched successfully.
- It does not prove preview or production network health by itself.
- It does not promote or activate any source.
- It does not replace release preview validation or human review for source-policy changes.

## Why This Comes Before More Source Activation

Runtime source activation should not move faster than the ability to audit it. This observability makes future activation work safer by giving reviewers a narrow, repeatable way to verify resolved source IDs before considering additional source trials.
