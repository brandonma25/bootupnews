# {{TITLE}} — Release Brief

## Objective
- 

## Scope
- 

## Explicit Exclusions
- Real third-party OAuth automation with personal accounts
- Subjective UX judgment
- Bypassing protected branch rules

## Acceptance Criteria
- Local, PR, preview, and production release gates are defined and reusable.
- Human auth/session truth remains explicit and required.
- Release documentation can be scaffolded quickly for future releases.

## Risks
- Auth or session risk:
- SSR versus client mismatch risk:
- Environment mismatch risk:
- Data edge case risk:
- Regression risk:

## Testing Requirements
- Local validation:
- Preview validation:
- Production sanity:

## Documentation Updates Required
- `docs/product/briefs/`
- `docs/product/prd/` when the release maps to numbered feature work
- `docs/engineering/testing/`
- `docs/engineering/bug-fixes/` when a real defect was fixed
