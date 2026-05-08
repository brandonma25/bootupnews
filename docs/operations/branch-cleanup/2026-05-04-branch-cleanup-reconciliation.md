# Branch Cleanup Reconciliation — 2026-05-04

## Summary

Approximately 30 branches were reportedly deleted before this cleanup branch. The exact deletion list was not available from local refs or GitHub as a single authoritative event log during this reconstruction.

This record establishes GitHub repo documentation and PR metadata as the recovery ledger for deleted or suspected-deleted remediation, bug-fix, hotfix, Codex, feature, and docs branches.

## Date

2026-05-04

## Reason For Cleanup

Branch cleanup reduces stale branch clutter after merged remediation, validation, controlled-cycle, public-card, and PRD-53 work. Future cleanup must remain reversible from GitHub documentation and PR metadata.

## Source-Of-Truth Decision

- GitHub repo documentation is canonical.
- PR metadata is the branch/SHA recovery ledger when branch refs are deleted.
- Google Sheet / Google Work Log records are historical reference only.
- `docs/operations/branch-cleanup/` is the canonical lane for bulk branch deletion reconciliation.

## Method Used For Reconciliation

- Queried recent PRs #141 through #190 with `gh pr list`.
- Checked each PR head branch against current remote refs with `git ls-remote --heads origin <branch>`.
- Treated merged PRs with `remote-missing` head refs as suspected deleted branches.
- Did not invent branch names.
- Did not delete any branch during this cleanup.

## Reconstructed Branch Table

| PR | PR state | Remote ref | Branch | Head SHA | Merge SHA | Canonical doc path | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #190 | merged | remote-present | `bugfix/final-slate-composer-buttons` | `b97a9e7112e695202edaa014a272e1a0ef4224a4` | `9c94a8585a7d2a35a7cf8d3d0f0fde7424ad351a` | `docs/engineering/bug-fixes/final-slate-composer-live-row-actions.md` | reconciled | Delete only after recording cleanup if requested. |
| #189 | merged | remote-missing | `feature/public-card-cleanup-phase-3` | `0a07de381598ec19123356b99c98d771ad3a4588` | `f2694a81ca66b02d4f4faff671798ba1c3117ba2` | `docs/engineering/bug-fixes/public-card-cleanup-remediation-2026-05-02.md` | reconciled | None. |
| #188 | open | remote-present | `codex/controlled-user-exposure-day-3-qualitative-check` | `85b880ede35990c902fef841a749fc7bc9457a9d` | n/a | PR metadata | unresolved | Do not delete while PR is open. |
| #187 | merged | remote-missing | `feature/public-card-cleanup-phase-4` | `fc851ba33463ba108465e51cb71ef0141ea9c03c` | `ed6d751e9c5492664ee927db2d193825df1d64cd` | `docs/engineering/bug-fixes/public-card-cleanup-remediation-2026-05-02.md` | reconciled | None. |
| #186 | merged | remote-missing | `codex/controlled-user-exposure-day-1-monitoring` | `3e86c4440928d64c76de6764227e003343856e7d` | `0a13d83add876d09e727967ebd174e73a8e188c5` | `docs/operations/launch-readiness/2026-05-03-controlled-user-exposure-day-1-monitoring.md` | reconciled | None. |
| #185 | merged | remote-missing | `codex/controlled-user-exposure-active-day-0-readback` | `c0d80242728600368ff77528d3ff3815e352a606` | `0fb0b727bbf72453e13a2afac343f19fe4897483` | `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-active-day-0-readback.md` | reconciled | None. |
| #184 | merged | remote-missing | `codex/controlled-user-exposure-active-day-0` | `c55f4cf193914267d38c33921a19d1566c305cd6` | `9fec0c7a6889b8a419a34ce2252c856acf954263` | `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-active-day-0.md` | reconciled | None. |
| #183 | merged | remote-missing | `codex/controlled-user-exposure-execution-day-0` | `70821688a42e00d6acee00542e4ee737403b3cda` | `c3fab6fc3d0e1a0c0e9ba8d9d0ac5896f2ce6322` | `docs/operations/launch-readiness/2026-05-02-controlled-user-exposure-day-0.md` | reconciled | None. |
| #182 | merged | remote-missing | `codex/controlled-user-exposure-plan` | `c315dd6fc0513a388c5a6f685be3c163e51c38f0` | `bf42e88c6dfd7743688540ebedf9bac6bb535bac` | `docs/operations/launch-readiness/2026-05-01-controlled-user-exposure-plan.md` | reconciled | None. |
| #181 | merged | remote-missing | `feature/public-card-cleanup-phase-2` | `4800791f5a9bad84eee8a286ec74622e1240c51d` | `cc8e3140c8f511ea3acd591bf613e4d96e9a2c50` | `docs/engineering/bug-fixes/public-card-cleanup-remediation-2026-05-02.md` | reconciled | None. |
| #180 | merged | remote-missing | `feature/public-card-cleanup-phase-1` | `ea33c7529b228c15f093bdff4845e4e04a222c78` | `d2cd4140bb5f1f1b2a5fc5c4eff6921dff371475` | `docs/engineering/bug-fixes/public-card-cleanup-remediation-2026-05-02.md` | reconciled | None. |
| #179 | merged | remote-missing | `codex/mvp-measurement-summary-readiness` | `715ac90040a5cf93d3adb9333ca9ef5875a01afd` | `fcf7286f1c569a22c9dd189f870f95527d2955db` | `docs/engineering/change-records/mvp-measurement-summary-readiness.md` | reconciled | None. |
| #178 | merged | remote-missing | `codex/final-launch-readiness-qa-rerun` | `8dac7a0c6ced229ec870ae1461ba6c72efcde4dc` | `b89322df1df448f05ed1a1988ec5abcd14bd9706` | `docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa-rerun.md` | reconciled | None. |
| #177 | merged | remote-missing | `codex/mvp-measurement-storage-alignment` | `36f5555fe42d14aaab40222981722153a0c13739` | `a212dd552daea72e2416bb64ce8b1b2e4b700880` | `docs/operations/controlled-cycles/2026-05-01-mvp-measurement-storage-alignment.md` | reconciled | None. |
| #176 | merged | remote-missing | `codex/final-launch-readiness-qa` | `c528e63beea5b28d9d51aca14bd555d0250c08a2` | `f00c0ddbd2ef7eb8e088ac4893563f9ed6a20162` | `docs/operations/controlled-cycles/2026-05-01-final-launch-readiness-qa.md` | reconciled | None. |
| #175 | merged | remote-missing | `codex/mvp-measurement-instrumentation` | `0adaa8c64cf0d8409aa34c8a2bb5016bfe8a3a3a` | `bde841ca941940665e62fe1a368d883e85e7f035` | `docs/engineering/change-records/mvp-measurement-instrumentation.md` | reconciled | None. |
| #174 | merged | remote-missing | `codex/prd-53-authorized-second-controlled-publish` | `1c4aa52b49e17a2488289a1563a24143c31ac179` | `c38a40b82d59742308ebe3034545074c5c92b9d8` | `docs/operations/controlled-cycles/2026-05-01-prd-53-authorized-second-controlled-publish.md` | reconciled | None. |
| #173 | merged | remote-missing | `codex/prd-53-admin-rewrite-replacement-pass` | `1c21ad41e206e8afef5a74de033ef2342f9c5f97` | `ae672255777b64c6c3087bb2b755b83f249b19f5` | `docs/operations/controlled-cycles/2026-05-01-prd-53-admin-rewrite-replacement-pass.md` | reconciled | None. |
| #172 | merged | remote-missing | `codex/prd-53-admin-review-final-slate-validation` | `612c77ca6acac594992ae20ef8abafdab73ddfc6` | `17be23b8cbe94f607818e3537498e475cae7ec99` | `docs/operations/controlled-cycles/2026-05-01-prd-53-admin-review-final-slate-validation.md` | reconciled | None. |
| #171 | merged | remote-missing | `codex/prd-53-authorized-controlled-draft-only-rerun` | `d64f6826a04f4d25da9b6201110768ea78d441da` | `e2db691664cfc3f83797335aa2cca4411941630d` | `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-controlled-draft-only-rerun.md` | reconciled | None. |
| #170 | merged | remote-missing | `codex/prd-53-authorized-controlled-draft-only` | `32d2b7852c7175d9dc4c0943edc5eac975a91b36` | `548ffdfb6e5845d0a0a2e3dccaa01d50ac0cba2c` | `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-controlled-draft-only.md` | reconciled | None. |
| #169 | merged | remote-missing | `codex/prd-53-second-controlled-cycle-rerun` | `80cb34f522a095f0bf4dbf6a5850f6891018047d` | `37a0d4cf8de98a5171e38a8486618a48e0ca7916` | `docs/operations/controlled-cycles/2026-04-30-prd-53-second-controlled-cycle-rerun.md` | reconciled | None. |
| #168 | merged | remote-missing | `codex/prd-53-authorized-schema-apply` | `f6d103ba27cf86a9cb1fba6e34a95df8c8786eab` | `b7c20594b0fea70870146e0c3d184ad9ed0df94c` | `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-schema-apply.md` | reconciled | None. |
| #167 | merged | remote-missing | `codex/prd-53-authorized-migration-history-repair` | `fc0585875a9b00b5b4ecc65ed6f179dc7cdcce59` | `3ccef8c9aefa676c66e3e81005850f4838806937` | `docs/operations/controlled-cycles/2026-04-30-prd-53-authorized-migration-history-repair.md` | reconciled | None. |
| #166-#149 | merged | remote-missing | PRD-53 controlled-cycle branches | see PR metadata | see PR metadata | `docs/operations/controlled-cycles/` and `docs/engineering/change-records/prd-53-*.md` | needs consolidation review | Keep PR metadata as recovery ledger; consolidate only if future audit finds missing canonical records. |
| #148 | merged | remote-missing | `codex/public-context-signals-visibility-remediation` | `1a89fd8252875845f561bfd578fb9e3e8c9a75a6` | `07dde932c142eb424d0893f63bd4485899b795d3` | `docs/engineering/bug-fixes/public-context-signals-visibility-remediation.md` | reconciled | None. |
| #147-#145 | merged | remote-missing | Core/Context editorial packet branches | see PR metadata | see PR metadata | `docs/engineering/testing/` | reconciled | None. |
| #144 | merged | remote-missing | `codex/witm-metadata-targeted-repair-validation-20260429` | `674252a8673723fce4774741c6c486e811e8acce` | `e648a1c5c65c6ec4b333d35a8e22014ea9613eb8` | `docs/engineering/testing/witm-metadata-targeted-repair-validation-20260429.md` | reconciled | None. |
| #143 | merged | remote-missing | `codex/preserve-witm-metadata-draft-persistence` | `f634ad1750117e84d43d2b81d9402387e7e9f70b` | `a25328a8378f73082e0e10cc35989c11c1c7c0c8` | `docs/engineering/bug-fixes/witm-metadata-draft-persistence-remediation.md` | reconciled | None. |
| #142 | merged | remote-missing | `codex/limited-core-context-draft-only-validation-20260429` | `a6b3802a0c3a2e01a0f29fa09f33e9f0967b1ae6` | `a17e2fffbdcfb0c1b078865b98475de3bbaf2b76` | `docs/engineering/testing/limited-core-context-draft-only-validation-20260429.md` | reconciled | None. |
| #141 | merged | remote-missing | `codex/controlled-draft-core-context-cap-7` | `390b7b0d0c7d82c63504f49b1fdbe2f81fbe8e66` | `efb1eea94d0452863b487c5e5b796635380597b8` | `docs/engineering/bug-fixes/controlled-core-context-draft-cap-7-remediation.md` | reconciled | None. |

## Remaining Risk

- The exact earlier branch deletion event list is not recoverable from a single source in this branch.
- Some PRD-53 controlled-cycle branches are grouped in this record because their canonical docs are split across operations controlled-cycle records and PRD-53 change records.
- Historical tracker-sync files may still duplicate context, but they are no longer canonical.

## Next Action

- For any future bulk deletion, create the branch cleanup record before deleting refs.
- For any future branch deletion, record branch name, PR number or `no PR found`, recoverable head SHA, merge state, canonical documentation path, cleanup date, and cleanup reason.
- Separately audit old Google Sheets sync scripts/workflows if the team wants to remove retired compatibility code.
