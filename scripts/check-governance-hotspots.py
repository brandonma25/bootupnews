#!/usr/bin/env python3

from __future__ import annotations

import sys

from governance_common import (
    HOTSPOT_FILES,
    inspect_branch_freshness,
    load_changes_for_args,
    parse_common_args,
    resolve_branch_name,
)


def parse_args():
    parser = parse_common_args("Inspect serialized governance hotspot state.")
    parser.add_argument(
        "--require-fresh",
        action="store_true",
        help="Fail when hotspot work does not contain the latest origin/main commit.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()

    try:
        branch = resolve_branch_name(repo_root, args.branch_name)
        changes = load_changes_for_args(repo_root, args)
        is_fresh, merge_base, origin_main_sha = inspect_branch_freshness(repo_root)
    except RuntimeError as exc:
        print(f"FAIL: Unable to inspect governance hotspot state.\n{exc}")
        return 1

    changed_files = sorted(changes)
    touched_hotspots = [path for path in HOTSPOT_FILES if path in changed_files]
    hotspot_branch = bool(touched_hotspots) or any(
        token in branch for token in ("governance", "hotspot")
    )

    print(f"branch: {branch}")
    print(f"diff base: {args.base_sha}...{args.head_sha}")
    print(f"changed files: {len(changed_files)}")

    if touched_hotspots:
        print("hotspot files touched:")
        for path in touched_hotspots:
            print(f"- {path}")
    else:
        print("hotspot files touched: none")

    if hotspot_branch:
        print("")
        print("WARNING: This branch touches serialized governance hotspot files.")
        print("Before opening a PR, sync with origin/main.")
        print("Before merging, re-check whether main moved and sync again if needed.")
        print("If another open PR overlaps these files, prefer rebasing/stacking or superseding the stale branch.")
    else:
        print("")
        print("PASS: No serialized governance hotspot files are touched on this branch.")

    if not is_fresh:
        print("")
        print("WARNING: HEAD does not currently contain the latest origin/main commit.")
        print(f"merge-base: {merge_base}")
        print(f"origin/main: {origin_main_sha}")
        print("Sync with origin/main before opening or merging a PR that touches hotspot files.")
        if args.require_fresh and hotspot_branch:
            print("")
            print("FAIL: Hotspot branch freshness is required but HEAD is stale.")
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
