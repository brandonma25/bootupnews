#!/usr/bin/env python3

from __future__ import annotations

import sys

from governance_common import (
    classify_changes,
    describe_required_doc_groups,
    find_missing_doc_groups,
    load_changes,
    parse_common_args,
    resolve_branch_name,
)


def parse_args():
    parser = parse_common_args(
        "Validate that changed work is covered by the appropriate documentation lanes."
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()

    try:
        branch = resolve_branch_name(repo_root, args.branch_name)
        changes = load_changes(repo_root, f"{args.base_sha}...{args.head_sha}")
    except RuntimeError as exc:
        print(f"FAIL: Unable to inspect documentation coverage.\n{exc}")
        return 1

    context = classify_changes(changes, branch, args.pr_title)
    missing_groups = find_missing_doc_groups(context)

    print(f"branch: {context.branch}")
    print(f"classification: {context.classification}")
    print(f"governance tier: {context.gate_tier}")
    print(
        "doc lanes updated: "
        + (", ".join(context.doc_lanes_updated) if context.doc_lanes_updated else "none")
    )

    if context.fix_signal_reasons:
        print("fix signal:")
        for reason in context.fix_signal_reasons:
            print(f"- {reason}")

    if not missing_groups:
        print("PASS: Documentation coverage is satisfied for this diff.")
        return 0

    print("FAIL: Documentation coverage is missing.")
    print("Required coverage:")
    for description in describe_required_doc_groups(missing_groups):
        print(f"- {description}")
    print("Observed documentation files:")
    if context.relevant_doc_updates:
        for path in context.relevant_doc_updates:
            print(f"- {path}")
    else:
        print("- none")
    return 1


if __name__ == "__main__":
    sys.exit(main())
