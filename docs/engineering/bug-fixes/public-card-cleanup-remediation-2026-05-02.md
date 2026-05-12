# Public Card Cleanup Remediation — Bug-Fix Record

## Summary
- Problem addressed: public homepage, `/signals`, category-depth, and briefing-detail surfaces exposed duplicated card copy, stale freshness framing, empty section noise, and a broken signed-in briefing deep link during the controlled public-readiness pass.
- Root cause: public presentation reused internal diagnostic/card fields too directly, stale-snapshot copy implied fresh work that was not happening while cron was disabled, snapshot-only category depth rendered empty placeholder cards, and signed-in user-history lookup could overwrite access to a public briefing snapshot.
- Affected object level: Card and Surface Placement.

## Source Of Truth
- Live production audit of `bootupnews.vercel.app` on 2026-05-02.
- PR #180, #181, #187, and #189 metadata and PR bodies.
- Prior Phase 1 change-record evidence was preserved as operational evidence. The durable public interpretation is captured in the relevant PRs, product source-of-truth docs, and this consolidated remediation record.
- GitHub source-of-truth status: canonical consolidated remediation record created on 2026-05-04.
- External references reviewed, if any: GitHub PR #180, #181, #187, and #189 metadata and prior Phase 1 change record.
- Google Sheet / Work Log reference, if historically relevant: none used as canonical input.
- Branch cleanup status: PR metadata and this record preserve branch names, head SHAs, merge SHAs, and merge state for all four phases; no branch deletion was performed in this metadata enrichment branch.

## Phase 1 — PR #180 Public Card Cleanup
- PR: #180, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/180`
- Branch: `feature/public-card-cleanup-phase-1`
- Head SHA: `ea33c7529b228c15f093bdff4845e4e04a222c78`
- Merge SHA: `d2cd4140bb5f1f1b2a5fc5c4eff6921dff371475`
- Problem: Top Event cards duplicated headlines, supporting coverage could repeat `Source: Source`, internal versioning bullets leaked, diagnostic chips and raw score badges appeared on public surfaces, and By Category copy used internal phrasing.
- Root cause: homepage card mapping emitted deterministic key points and labels without filtering duplicates or user-meaningless diagnostics; `/signals` rendered raw score metadata.
- Fix: emit at most one non-duplicate key point, suppress duplicate summaries and source/title suffixes, remove low-signal chips/meta pills, remove `/signals` score badges, and rewrite the By Category subhead.
- Validation: `git diff --check`, `npm run lint`, `npm run test`, `npm run build`, `python3 scripts/validate-feature-system-csv.py`, `python3 scripts/validate-documentation-coverage.py --diff-mode local --branch-name feature/public-card-cleanup-phase-1 --pr-title "Public card cleanup phase 1"`, and `python3 scripts/release-governance-gate.py --diff-mode local --branch-name feature/public-card-cleanup-phase-1 --pr-title "Public card cleanup phase 1"` passed.
- Remaining risks: visual verification on Vercel preview remained the relevant deployment gate.

## Phase 2 — PR #181 Stale-State Copy
- PR: #181, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/181`
- Branch: `feature/public-card-cleanup-phase-2`
- Head SHA: `4800791f5a9bad84eee8a286ec74622e1240c51d`
- Merge SHA: `cc8e3140c8f511ea3acd591bf613e4d96e9a2c50`
- Problem: the homepage banner read as if today's briefing was being prepared while serving older published content.
- Root cause: stale-snapshot user-facing copy was written for an imminent-refresh model, but cron was disabled and the public surface could show day-old content.
- Fix: replace "Today's briefing is being prepared" framing with date-anchored "Showing the latest published briefing from [date]" copy and update empty fallback copy to avoid false freshness.
- Validation: `git diff --check`, `npm run lint`, `npm run test`, `npm run build`, and `python3 scripts/release-governance-gate.py --diff-mode local --branch-name feature/public-card-cleanup-phase-2 --pr-title "Public card cleanup phase 2"` passed.
- Remaining risks: Vercel preview visual verification remained the relevant gate.

## Phase 4 — PR #187 Empty By Category Grid
- PR: #187, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/187`
- Branch: `feature/public-card-cleanup-phase-4`
- Head SHA: `fc851ba33463ba108465e51cb71ef0141ea9c03c`
- Merge SHA: `ed6d751e9c5492664ee927db2d193825df1d64cd`
- Problem: snapshot-only public homepage state rendered three empty "No X stories" category cards under By Category.
- Root cause: when the category preview map had zero total events, the grid still rendered each category's empty state instead of suppressing the whole secondary module.
- Fix: hide the entire By Category grid when `totalEvents === 0`, while preserving per-category empty states when at least one category has eligible events.
- Validation: `git diff --check`, `npm run lint`, `npm run test`, `npm run build`, and `python3 scripts/release-governance-gate.py --diff-mode local --branch-name feature/public-card-cleanup-phase-4 --pr-title "Public card cleanup phase 4"` passed.
- Remaining risks: no ranking, classification, source manifest, auth, or pipeline changes were made; preview visual check remained the deployment gate.

## Phase 3 — PR #189 Briefing Detail Public Access
- PR: #189, `https://github.com/brandonma25/daily-intelligence-aggregator/pull/189`
- Branch: `feature/public-card-cleanup-phase-3`
- Head SHA: `0a07de381598ec19123356b99c98d771ad3a4588`
- Merge SHA: `f2694a81ca66b02d4f4faff671798ba1c3117ba2`
- Problem: `/briefing/[date]` could render "This briefing is not available" for signed-in users when the requested date matched the public homepage briefing.
- Root cause: `getBriefingDetailPageState` let the user-history lookup unconditionally overwrite the public briefing match; a signed-in user with no matching private history lost access to the public snapshot.
- Fix: only overwrite the briefing match when user history has the requested date, then fall back to the public homepage snapshot when the requested date matches public content.
- Validation: `git diff --check`, `npm run lint`, `npm run test`, `npm run build`, and `python3 scripts/release-governance-gate.py --diff-mode local --branch-name feature/public-card-cleanup-phase-3 --pr-title "Public card cleanup phase 3"` passed.
- Remaining risks: auth/session behavior required Vercel preview validation because the fix expands access for signed-in users only when they already have public briefing entitlement.

## Branch Cleanup Status
- Branch deletion state was not fully recoverable during this cleanup.
- PR metadata preserves branch names, head SHAs, merge SHAs, and merge state for all four phases.
- Future validation should be summarized in the PR body/checklist, with operational detail kept in private archive records when needed.

## Remaining Risks / Follow-up
- This consolidated record does not claim production validation or Google tracker updates.
- Active Google sync workflow decommissioning evidence was preserved as operational evidence. Operational closeout and tracker-sync evidence should live in PR metadata, GitHub history, or private archive records rather than public documentation links.
