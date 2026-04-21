# Worktree Ownership Hardening — 2026-04-22

## Scope
- Hardened branch and worktree ownership rules in `AGENTS.md` and `docs/engineering/protocols/engineering-protocol.md`.
- No product code, PRDs, feature tracking CSV rows, or release operating docs were changed.

## Change
- Defined the branch owner as the path shown by `git worktree list`.
- Standardized the required identity check on `pwd`, `git branch --show-current`, `git status --short --branch`, and `git worktree list`.
- Added hard stops for branch ownership mismatch and prohibited `--force` or `--ignore-other-worktrees` bypasses during ordinary repo work.
- Clarified that existing branch continuation must happen inside the owning worktree, while new scoped work starts from updated `main`.

## Validation
- Review the scoped docs diff before PR creation.
