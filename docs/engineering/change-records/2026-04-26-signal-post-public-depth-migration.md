# Change Record: Signal Post Public Depth Migration

- Date: `2026-04-26`
- Branch: `bugfix/homepage-tabs-signal-regression`
- Effective change type: `bug-fix`
- Canonical PRD required: `no`
- Source of truth: homepage tab regression remediation after politics/TLDR ingestion and PR #114 follow-up validation.

## Reason

Investigation showed the ingestion and ranking pipeline can retain more than five ranked clusters, but `public.signal_posts` could only store ranks `1..5`. That schema constraint made the homepage public read model equivalent to the Top 5 set, so category tabs had no real non-Top depth even after the UI model preferred `publicRankedItems`.

## Scope

- Widen `signal_posts.rank` from `1..5` to `1..20`.
- Replace the live rank uniqueness rule with a Top 5-only live rank uniqueness rule.
- Keep `/signals` capped to five published signals.
- Keep homepage Top Events capped to five.
- Allow homepage tabs to consume additional published live signal rows when real depth rows exist.

## Non-Goals

- No ingestion-source activation changes.
- No ranking rewrite.
- No fake fallback or seed content presented as live intelligence.
- No canonical PRD because this is regression repair, not a new product feature.
