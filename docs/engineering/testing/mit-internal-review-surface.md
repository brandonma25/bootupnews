# MIT Internal Review Surface Testing

Date: 2026-04-21

Branch: `feature/prd-50-mit-internal-review`

## Scope

Added an authenticated internal route at `/internal/mit-review` for MIT Technology Review probationary review evidence.

## Commands Run

Commands:

```bash
npm run test -- src/lib/internal/mit-review.test.ts src/app/internal/mit-review/page.test.tsx
npm install
python3 scripts/validate-feature-system-csv.py
npm run lint || true
npm run test || true
npm run build
lsof -ti tcp:3000 -sTCP:LISTEN || true
ps -axo pid,command | rg 'next dev|next-server|node .*next|npm run dev' || true
npm run dev
curl -i http://localhost:3000/internal/mit-review
./scripts/release-check.sh --install never
git diff --check
git fetch origin main
python3 scripts/release-governance-gate.py --base-sha origin/main --head-sha HEAD --branch-name feature/prd-50-mit-internal-review --pr-title "Add internal MIT probationary review surface" --diff-mode local
python3 scripts/check-governance-hotspots.py --base-sha origin/main --head-sha HEAD --branch-name feature/prd-50-mit-internal-review --pr-title "Add internal MIT probationary review surface" --diff-mode local --require-fresh
```

## Results

- Focused MIT review tests passed: 2 files, 4 tests.
- `npm install` completed. NPM reported one high-severity audit finding that was not introduced or addressed by this branch.
- Feature-system CSV validation passed. Existing warnings remain for unrelated historical PRD slug mismatches.
- `npm run lint || true` passed.
- `npm run test || true` passed: 47 files, 249 tests.
- `npm run build` passed and listed `/internal/mit-review` as a dynamic route.
- Local unauthenticated route response returned `HTTP 200`, title `MIT Review - Internal`, and `noindex, nofollow` robots metadata.
- Standard local release gate was run as part of local validation; PRD-50 delivery evidence is limited to the non-visual checks listed here and authenticated preview remains required.
- `git diff --check` passed.
- `git fetch origin main` confirmed `origin/main` still matched the branch base before PR closeout.
- Release governance gate passed for the local diff.
- Governance hotspot check passed with the expected warning that `docs/product/feature-system.csv` is a serialized hotspot and must be re-synced before PR/merge.

## Local Route Checks

The Dev Server Rule was followed before the manual route run:

- checked for an existing listener on port `3000`
- checked for existing `next dev`, `next-server`, and relevant node processes
- found no stale listener before the manual run
- started `npm run dev`

Manual local URL:

- `http://localhost:3000/internal/mit-review`

The standard release gate later started its own dev server at:

- `http://127.0.0.1:3000`

## Safety Checks

Validation confirmed:

- unauthenticated route response withholds MIT evidence
- authenticated rendering is covered by unit tests
- no `feedUrl` field or MIT feed URL appears in serialized review evidence
- no article URLs appear in serialized review evidence
- the unauthenticated local route response exposes no MIT source ID
- no cookies, headers, tokens, emails, user IDs, credentials, or registry dumps are intentionally rendered by the route
- route metadata is `noindex, nofollow`

## Preview and Human Checks

Preview validation remains required for deployed authenticated-route truth. Human validation should confirm the internal reviewer can access `/internal/mit-review` in preview and that Issue #70 links to the correct path.

This branch does not claim preview or production validation from local checks.
