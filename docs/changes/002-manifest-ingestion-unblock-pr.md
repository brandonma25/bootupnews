# Manifest Ingestion Unblock PR

This PR completes the public source manifest unblock by making the supplied-source ingestion cap aware of manifest provenance: public manifest source lists can resolve all governed manifest entries, while user-supplied source lists remain capped at five to bound fetch load. It also records the dev-server TypeError investigation and commits the source audits that support the manifest decision.

## Commit 1: Manifest-aware ingestion cap

Commit `58a17e0` updates [src/lib/pipeline/ingestion/index.ts](/Users/bm/Documents/daily-intelligence-aggregator-main/src/lib/pipeline/ingestion/index.ts), [src/lib/source-manifest.ts](/Users/bm/Documents/daily-intelligence-aggregator-main/src/lib/source-manifest.ts), [src/lib/data.ts](/Users/bm/Documents/daily-intelligence-aggregator-main/src/lib/data.ts), and [src/lib/pipeline/ingestion/index.test.ts](/Users/bm/Documents/daily-intelligence-aggregator-main/src/lib/pipeline/ingestion/index.test.ts) so manifest-supplied public sources bypass the five-source user cap, while ordinary supplied sources keep the cap.

## Commit 2: Dev-server TypeError investigation

This commit adds [docs/changes/002-manifest-ingestion-unblock-pr.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/changes/002-manifest-ingestion-unblock-pr.md), classifies the dev-server TypeError as pre-existing, and records the reproduction evidence.

## Commit 3: Audit documentation history

The final commit adds [docs/audits/source-activation-audit.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/audits/source-activation-audit.md) and [docs/audits/source-architecture-audit.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/audits/source-architecture-audit.md), and verifies [docs/adr/001-public-source-manifest.md](/Users/bm/Documents/daily-intelligence-aggregator-main/docs/adr/001-public-source-manifest.md) references those audits using resolvable relative paths.

## TypeError classification

Classification: `a) Pre-existing and unrelated to feature/public-source-manifest-v1`.

The original dev-server symptom observed during the prior implementation was:

```text
TypeError: Cannot read properties of undefined (reading 'call')
    at ignore-listed frames {
  digest: '2324590493'
}
```

A fuller stack trace with file paths and line numbers could not be captured because Next.js reported the error through ignore-listed frames. On the manifest branch after Commit 1, the `curl -I /` and `curl -I /dashboard` sequence returned `200`, then reproduced the same TypeError:

```text
HEAD /dashboard 200 in 477ms (next.js: 372ms, proxy.ts: 45ms, application-code: 60ms)
TypeError: Cannot read properties of undefined (reading 'call')
    at ignore-listed frames {
  digest: '2324590493'
}
```

The exact same `curl -I /` and `curl -I /dashboard` sequence was then run from the owning `main` worktree at `cacb075`. `/` and `/dashboard` both returned `200`, and `main` reproduced the same TypeError with a different digest:

```text
HEAD /dashboard 200 in 504ms (next.js: 395ms, proxy.ts: 45ms, application-code: 64ms)
TypeError: Cannot read properties of undefined (reading 'call')
    at ignore-listed frames {
  digest: '1181457213'
}
```

Because the symptom reproduces on `main`, it is classified as pre-existing and unrelated to this manifest PR. No code fix was made in this PR.

## Updated tests

- `src/lib/pipeline/ingestion/index.test.ts`: added four tests proving six manifest-flagged sources resolve to six runtime sources, six non-manifest supplied sources remain capped at five, three manifest-flagged sources resolve to three, and three non-manifest supplied sources resolve to three.
- Existing five-source MVP ingestion assertions were preserved to keep the legacy supplied-MVP behavior explicit.

## Verification checklist

- `npm run test`: passed after all three commits with 57 files and 315 tests.
- `npm run build`: passed after all three commits.
- `npm run dev`: passed after all three commits; `http://localhost:3000/` and `http://localhost:3000/dashboard` returned `200`.
- Dev-server TypeError investigation: classified as pre-existing because the exact `curl -I` sequence reproduced on `main`; no speculative fix applied.

## PR gate remediation

After the branch was pushed, `release-governance-gate` classified the new `src/lib/source-manifest.ts` module as a new feature/system surface and required canonical PRD mapping. The PR gate remediation commit adds `docs/product/prd/prd-54-public-source-manifest.md` and the matching `docs/product/feature-system.csv` row so the manifest is governed by PRD-54 instead of relying only on ADR/change-note documentation.
