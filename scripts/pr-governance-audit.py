#!/usr/bin/env python3

from __future__ import annotations

import sys

from governance_common import (
    classify_changes,
    describe_required_doc_groups,
    find_missing_doc_groups,
    inspect_branch_freshness,
    load_changes_for_args,
    parse_common_args,
    resolve_branch_name,
)


def parse_args():
    parser = parse_common_args(
        "Emit a structured PR governance audit summary without blocking by itself."
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()

    try:
        branch = resolve_branch_name(repo_root, args.branch_name)
        changes = load_changes_for_args(repo_root, args)
        fresh, _, _ = inspect_branch_freshness(repo_root)
    except RuntimeError as exc:
        print(f"PR governance audit failed to inspect repo state.\n{exc}")
        return 0

    context = classify_changes(changes, branch, args.pr_title, repo_root)
    missing_groups = find_missing_doc_groups(context)

    print("## PR Governance Audit")
    print(f"- Branch: `{context.branch}`")
    print(f"- Classification: `{context.classification}`")
    print(f"- Governance tier: `{context.gate_tier}`")
    print(f"- Branch fresh with `origin/main`: `{'yes' if fresh else 'no'}`")
    print(
        "- Documentation lanes updated: "
        + (", ".join(f"`{lane}`" for lane in context.doc_lanes_updated) if context.doc_lanes_updated else "`none`")
    )

    if context.hotspot_files_touched:
        print("- Hotspot files touched:")
        for path in context.hotspot_files_touched:
            print(f"  - `{path}`")

    if context.fix_signal_reasons:
        print("- Fix signal:")
        for reason in context.fix_signal_reasons:
            print(f"  - {reason}")

    if missing_groups:
        print("- Missing documentation coverage:")
        for description in describe_required_doc_groups(missing_groups):
            print(f"  - {description}")
    else:
        print("- Missing documentation coverage: none")

    return 0


if __name__ == "__main__":
    sys.exit(main())
