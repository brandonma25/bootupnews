#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


HOTSPOT_FILES = [
    "docs/product/feature-system.csv",
    "AGENTS.md",
    "docs/engineering/protocols/engineering-protocol.md",
    "docs/engineering/protocols/prd-template.md",
    "docs/product/documentation-rules.md",
]


def run_git(repo_root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git command failed")
    return result.stdout.strip()


def parse_status_paths(status_output: str) -> list[str]:
    paths: list[str] = []
    for line in status_output.splitlines():
        if not line.strip():
            continue
        entry = line[3:]
        if " -> " in entry:
            entry = entry.split(" -> ", 1)[1]
        paths.append(entry)
    return paths


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent

    try:
        branch = run_git(repo_root, "branch", "--show-current")
        changed_output = run_git(repo_root, "diff", "--name-only", "origin/main...HEAD")
        status_output = run_git(repo_root, "status", "--porcelain")
        merge_base = run_git(repo_root, "merge-base", "HEAD", "origin/main")
        origin_main_sha = run_git(repo_root, "rev-parse", "origin/main")
    except RuntimeError as exc:
        print(f"FAIL: Unable to inspect governance hotspot state.\n{exc}")
        return 1

    changed_files = sorted(
        {
            *[line for line in changed_output.splitlines() if line.strip()],
            *parse_status_paths(status_output),
        }
    )
    touched_hotspots = [path for path in HOTSPOT_FILES if path in changed_files]
    hotspot_branch = bool(touched_hotspots) or any(
        token in branch for token in ("governance", "hotspot")
    )

    print(f"branch: {branch}")
    print("diff base: origin/main...HEAD")
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

    if merge_base != origin_main_sha:
        print("")
        print("WARNING: HEAD does not currently contain the latest origin/main commit.")
        print("Sync with origin/main before opening or merging a PR that touches hotspot files.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
