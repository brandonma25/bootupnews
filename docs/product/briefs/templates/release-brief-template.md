# {{TITLE}} — Release Brief

## Objective
- 

## Scope
- 

## Terminology Requirement
- Before implementation, read `docs/engineering/BOOTUP_CANONICAL_TERMINOLOGY.md`.
- Use Article, Story Cluster, Signal, Card, and Surface Placement according to the canonical definitions.
- Do not use cluster, signal, story, or card interchangeably.
- [ ] Confirmed object level before coding: Article, Story Cluster, Signal, Card, or Surface Placement.
- [ ] No new variable, file, function, component, or database terminology blurs Cluster vs Signal vs Card.
- [ ] If legacy naming is inconsistent, document it instead of silently expanding it.

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
- `docs/operations/branch-cleanup/` when branch deletion or bulk branch cleanup occurred
- GitHub documentation closeout completed in the canonical lane
