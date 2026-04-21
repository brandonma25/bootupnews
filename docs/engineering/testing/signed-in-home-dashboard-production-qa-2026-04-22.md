# Signed-In Home Dashboard Production QA - 2026-04-22

## Classification

- Change type: remediation QA follow-up / alignment evidence.
- Canonical PRD required: no.
- Branch: `fix/signed-out-homepage-qa-remediation`.
- Production target: `https://daily-intelligence-aggregator-ybs9.vercel.app/`.
- Account: dummy QA account provided by the PM; password and session details are intentionally omitted.

## Source Of Truth

- Artifact 0: Home page flow and `homepage-model.ts` as the source for `topRanked` and `categorySections`.
- Artifact 1: Home Category Tab Strip behavior.
- Artifact 2: Category Tab Strip state inventory.
- Artifact 7: authenticated users have full category access; signed-out users get the inline soft gate.
- PRD-46: Tech News, Finance, and Politics tabs render only when their model-derived section has at least one item.

## Production QA Result

Authenticated production Home rendered successfully with user identity, Top Events, key points, ranks, why-it-matters content, source pills, navigation links, collapse navigation, and no browser console or page errors.

One Table 1 item remained unresolved as a product-data/spec reconciliation issue:

| Area | Observation | Source-of-truth constraint | Result |
|---|---|---|---|
| Signed-in category tabs | Production signed-in Home exposed only the Top Events tab during the QA run. | Artifact 1 and PRD-46 say category tabs are hidden when `categorySections` has zero items for that category. | Not remediated by fabricating empty tabs. |

## Reconciliation Decision

No product behavior was changed to force empty signed-in category tabs. That would conflict with the approved hidden-empty-category rule and the PRD-46 acceptance criteria.

Instead, the follow-up strengthened test coverage for the behavior that is explicitly supported:

- Signed-in users can open populated category tabs without seeing the signed-out soft gate.
- Signed-in empty model-derived category sections remain hidden instead of rendering unsupported empty tabs.
- The Home shell passes a signed-in viewer through the same category tab component and renders category content when the supplied homepage model contains a populated category section.

## Evidence Added

- `src/components/home/home-category-components.test.tsx`
  - Proves signed-in populated category tabs render category cards without the soft gate.
  - Proves signed-in empty category sections remain hidden.
- `src/components/landing/homepage.test.tsx`
  - Proves signed-in Home can render and switch to a populated model-derived category tab without signed-out gate copy.

## Validation

- `npm run test -- src/components/home/home-category-components.test.tsx src/components/landing/homepage.test.tsx`
  - Passed: 2 files, 18 tests.

## Remaining Human / Preview Check

If the PM expects all three signed-in category labels to render even when the production homepage model has no category items outside Top Events, the source-of-truth artifacts need an explicit product decision that supersedes the current hidden-empty-category rule.
