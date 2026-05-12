#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path


MONITORED_PREFIXES = (
    "src/",
    "supabase/",
    "scripts/",
    ".github/workflows/",
)
MONITORED_EXACT_PATHS = (
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "playwright.config.ts",
    "vitest.config.ts",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "src/proxy.ts",
)
NEW_FEATURE_PREFIXES = (
    "src/",
    "supabase/",
)
DOC_LANE_PREFIXES = {
    "docs/product/briefs/": "product-brief",
    "docs/product/prd/": "prd",
    "docs/engineering/bug-fixes/": "bug-fix",
    "docs/engineering/incidents/": "incident",
    "docs/engineering/protocols/": "protocol",
    "docs/engineering/templates/": "template",
    "docs/engineering/change-records/": "legacy-change-record",
    "docs/engineering/testing/": "legacy-testing",
}
RELEVANT_DOC_PREFIXES = tuple(DOC_LANE_PREFIXES)
RELEVANT_DOC_FILES = (
    "AGENTS.md",
    "docs/product/documentation-rules.md",
)
HOTSPOT_FILES = [
    "docs/product/feature-system.csv",
    "AGENTS.md",
    "docs/engineering/protocols/engineering-protocol.md",
    "docs/engineering/protocols/prd-template.md",
    "docs/product/documentation-rules.md",
]
CSV_PATH = "docs/product/feature-system.csv"
PRD_DIR = "docs/product/prd"
TRIVIAL_MAX_CHANGED_LINES = 15
PRD_ID_RE = re.compile(r"^PRD-(\d+)$")
PRD_FILE_RE = re.compile(r"^docs/product/prd/prd-(0[1-9]|[1-9]\d+)-[a-z0-9-]+\.md$")


@dataclass
class Change:
    path: str
    status: str
    added: int = 0
    deleted: int = 0

    @property
    def total_changed_lines(self) -> int:
        return self.added + self.deleted

    @property
    def is_added(self) -> bool:
        return self.status.startswith("A")


@dataclass
class GovernanceContext:
    branch: str
    pr_title: str
    changes: dict[str, Change]
    changed_paths: list[str]
    monitored_changes: list[Change]
    non_test_monitored: list[Change]
    added_new_feature_files: list[str]
    new_prd_files: list[str]
    classification: str
    gate_tier: str
    relevant_doc_updates: list[str]
    doc_lanes_updated: list[str]
    hotspot_files_touched: list[str]
    prd_exception: bool
    prd_exception_reasons: list[str]
    fix_signal: bool
    fix_signal_reasons: list[str]


def parse_common_args(description: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument(
        "--repo-root",
        default=Path(__file__).resolve().parent.parent,
        type=Path,
        help="Repository root.",
    )
    parser.add_argument(
        "--base-sha",
        default="origin/main",
        help="Base commit or ref for diff comparison.",
    )
    parser.add_argument(
        "--head-sha",
        default="HEAD",
        help="Head commit or ref for diff comparison.",
    )
    parser.add_argument(
        "--branch-name",
        default="",
        help="Optional branch name override. Defaults to the current git branch.",
    )
    parser.add_argument(
        "--pr-title",
        default="",
        help="Optional PR title or change title to improve fix classification.",
    )
    parser.add_argument(
        "--diff-mode",
        choices=("local", "ci-pr"),
        default="local",
        help=(
            "Change loading mode. 'ci-pr' inspects only the supplied base...head diff; "
            "'local' also includes staged, unstaged, and untracked working-tree changes."
        ),
    )
    return parser


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
    return result.stdout.rstrip("\n")


def get_diff_range(base_sha: str, head_sha: str) -> str:
    return f"{base_sha}...{head_sha}"


def is_generated_python_artifact(path: str) -> bool:
    normalized = path.replace("\\", "/")
    if "/__pycache__/" in f"/{normalized}/":
        return True
    return normalized.endswith((".pyc", ".pyo"))


def merge_diff_output(repo_root: Path, changes: dict[str, Change], *diff_args: str) -> None:
    name_status_output = run_git(repo_root, "diff", "--name-status", *diff_args)
    for raw_line in name_status_output.splitlines():
        if not raw_line.strip():
            continue
        parts = raw_line.split("\t")
        status = parts[0]
        path = parts[-1]
        if is_generated_python_artifact(path):
            continue
        existing = changes.get(path)
        if existing is None or existing.status == "M":
            changes[path] = Change(path=path, status=status, added=existing.added if existing else 0, deleted=existing.deleted if existing else 0)

    numstat_output = run_git(repo_root, "diff", "--numstat", *diff_args)
    for raw_line in numstat_output.splitlines():
        if not raw_line.strip():
            continue
        parts = raw_line.split("\t")
        if len(parts) < 3:
            continue
        added_text, deleted_text, path = parts[0], parts[1], parts[-1]
        if is_generated_python_artifact(path):
            continue
        added = int(added_text) if added_text.isdigit() else 0
        deleted = int(deleted_text) if deleted_text.isdigit() else 0
        change = changes.get(path, Change(path=path, status="M"))
        change.added = max(change.added, added)
        change.deleted = max(change.deleted, deleted)
        changes[path] = change


def load_changes(repo_root: Path, diff_range: str, include_worktree: bool = True) -> dict[str, Change]:
    changes: dict[str, Change] = {}
    merge_diff_output(repo_root, changes, diff_range)

    if not include_worktree:
        return changes

    # Local validation should see staged and unstaged edits in addition to the branch diff.
    merge_diff_output(repo_root, changes, "HEAD")

    status_output = run_git(repo_root, "status", "--porcelain", "--untracked-files=all")
    for raw_line in status_output.splitlines():
        if not raw_line.strip():
            continue
        status = raw_line[:2].strip()
        path = raw_line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        if is_generated_python_artifact(path):
            continue
        normalized_status = "A" if status == "??" else (status[:1] or "M")
        changes.setdefault(path, Change(path=path, status=normalized_status))

    return changes


def load_changes_for_args(repo_root: Path, args: argparse.Namespace) -> dict[str, Change]:
    return load_changes(
        repo_root,
        f"{args.base_sha}...{args.head_sha}",
        include_worktree=args.diff_mode == "local",
    )


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


def is_docs_file(path: str) -> bool:
    return path.startswith("docs/") or path == "AGENTS.md"


def is_monitored_file(path: str) -> bool:
    return path.startswith(MONITORED_PREFIXES) or path in MONITORED_EXACT_PATHS


def is_relevant_doc_file(path: str) -> bool:
    return path.startswith(RELEVANT_DOC_PREFIXES) or path in RELEVANT_DOC_FILES


def is_test_file(path: str) -> bool:
    return any(token in path for token in ("/__tests__/", ".test.", ".spec."))


def is_canonical_prd(path: str) -> bool:
    return path.startswith("docs/product/prd/prd-") and path.endswith(".md")


def is_new_feature_path(path: str) -> bool:
    return path.startswith(NEW_FEATURE_PREFIXES)


def is_high_risk_trivial_path(path: str) -> bool:
    return (
        path.startswith(("src/app/", "supabase/", ".github/workflows/"))
        or path in MONITORED_EXACT_PATHS
        or path == "src/lib/auth.ts"
    )


def resolve_branch_name(repo_root: Path, branch_name: str) -> str:
    if branch_name:
        return branch_name
    return run_git(repo_root, "branch", "--show-current")


def label_doc_lane(path: str) -> str | None:
    for prefix, lane in DOC_LANE_PREFIXES.items():
        if path.startswith(prefix):
            return lane
    if path in RELEVANT_DOC_FILES:
        return "governance-root"
    return None


def detect_fix_signal(branch: str, pr_title: str, changed_paths: list[str]) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    branch_lower = branch.lower()
    title_lower = pr_title.lower()

    if branch_lower.startswith("fix/"):
        reasons.append("branch name starts with fix/")
    if any(token in branch_lower for token in ("bug", "hotfix", "regression")):
        reasons.append("branch name includes a bug-fix keyword")
    if title_lower and any(
        token in title_lower for token in ("fix", "bug", "regression", "hotfix")
    ):
        reasons.append("PR title includes a bug-fix keyword")
    if any(path.startswith("docs/engineering/bug-fixes/") for path in changed_paths):
        reasons.append("bug-fix documentation lane is touched")

    deduped_reasons: list[str] = []
    for reason in reasons:
        if reason not in deduped_reasons:
            deduped_reasons.append(reason)

    return bool(deduped_reasons), deduped_reasons


def detect_prd_exception(repo_root: Path | None, changed_paths: list[str]) -> tuple[bool, list[str]]:
    if repo_root is None:
        return False, []

    reasons: list[str] = []
    for path in changed_paths:
        lane = label_doc_lane(path)
        is_stable_governance_doc = lane in {
            "product-brief",
            "bug-fix",
            "incident",
            "protocol",
            "template",
            "governance-root",
        }
        if not is_stable_governance_doc:
            continue

        target = repo_root / path
        if not target.is_file():
            continue

        text = target.read_text(encoding="utf-8").lower()
        has_no_prd_marker = re.search(r"canonical prd required:\s*`?no`?", text) is not None
        has_remediation_marker = "remediation" in text or "audit" in text

        if has_no_prd_marker and has_remediation_marker:
            reasons.append(f"{path} declares an audit/remediation-backed no-PRD exception")

    return bool(reasons), reasons


def classify_changes(
    changes: dict[str, Change],
    branch: str,
    pr_title: str,
    repo_root: Path | None = None,
) -> GovernanceContext:
    changed_paths = sorted(changes)
    monitored_changes = [change for change in changes.values() if is_monitored_file(change.path)]
    non_test_monitored = [change for change in monitored_changes if not is_test_file(change.path)]
    added_new_feature_files = [
        change for change in non_test_monitored if change.is_added and is_new_feature_path(change.path)
    ]
    new_prd_files = [path for path, change in changes.items() if change.is_added and is_canonical_prd(path)]
    relevant_doc_updates = [path for path in changed_paths if is_relevant_doc_file(path)]
    doc_lanes_updated = sorted(
        {
            lane
            for path in changed_paths
            for lane in [label_doc_lane(path)]
            if lane is not None
        }
    )
    hotspot_files_touched = [path for path in HOTSPOT_FILES if path in changed_paths]
    prd_exception, prd_exception_reasons = detect_prd_exception(repo_root, changed_paths)
    fix_signal, fix_signal_reasons = detect_fix_signal(branch, pr_title, changed_paths)

    if changed_paths and all(is_docs_file(path) for path in changed_paths):
        classification = "docs-only"
    elif new_prd_files or added_new_feature_files:
        classification = "material-feature-change" if prd_exception and not new_prd_files else "new-feature-or-system"
    elif not monitored_changes:
        classification = "trivial-code-change"
    else:
        only_tests = non_test_monitored == []
        single_small_modification = (
            len(non_test_monitored) == 1
            and not non_test_monitored[0].is_added
            and not is_high_risk_trivial_path(non_test_monitored[0].path)
            and not relevant_doc_updates
            and non_test_monitored[0].total_changed_lines <= TRIVIAL_MAX_CHANGED_LINES
        )

        if only_tests or single_small_modification:
            classification = "trivial-code-change"
        elif fix_signal and non_test_monitored:
            classification = "bug-fix"
        else:
            classification = "material-feature-change"

    if classification in {"docs-only", "trivial-code-change"}:
        gate_tier = "baseline"
    elif hotspot_files_touched:
        gate_tier = "hotspot"
    elif classification == "new-feature-or-system":
        gate_tier = "promoted"
    else:
        gate_tier = "documented"

    return GovernanceContext(
        branch=branch,
        pr_title=pr_title,
        changes=changes,
        changed_paths=changed_paths,
        monitored_changes=monitored_changes,
        non_test_monitored=non_test_monitored,
        added_new_feature_files=sorted(change.path for change in added_new_feature_files),
        new_prd_files=new_prd_files,
        classification=classification,
        gate_tier=gate_tier,
        relevant_doc_updates=relevant_doc_updates,
        doc_lanes_updated=doc_lanes_updated,
        hotspot_files_touched=hotspot_files_touched,
        prd_exception=prd_exception,
        prd_exception_reasons=prd_exception_reasons,
        fix_signal=fix_signal,
        fix_signal_reasons=fix_signal_reasons,
    )


def required_doc_groups(context: GovernanceContext) -> list[tuple[str, ...]]:
    if context.classification in {"docs-only", "trivial-code-change"}:
        return []

    groups: list[tuple[str, ...]] = []

    if context.classification == "new-feature-or-system":
        groups.append(("prd",))
    elif context.classification == "bug-fix":
        groups.append(("bug-fix",))
    else:
        groups.append(
            (
                "product-brief",
                "prd",
                "bug-fix",
                "incident",
                "protocol",
                "template",
                "governance-root",
            )
        )

    if context.gate_tier == "hotspot" and context.non_test_monitored:
        groups.append(("protocol", "template", "governance-root"))

    return groups


def describe_required_doc_groups(groups: list[tuple[str, ...]]) -> list[str]:
    descriptions: list[str] = []
    for group in groups:
        descriptions.append(" OR ".join(group))
    return descriptions


def find_missing_doc_groups(context: GovernanceContext) -> list[tuple[str, ...]]:
    updated = set(context.doc_lanes_updated)
    missing: list[tuple[str, ...]] = []
    for group in required_doc_groups(context):
        if not any(lane in updated for lane in group):
            missing.append(group)
    return missing


def has_documentation_coverage(context: GovernanceContext) -> bool:
    return find_missing_doc_groups(context) == []


def load_csv_mappings(repo_root: Path) -> dict[str, str]:
    mappings: dict[str, str] = {}
    csv_path = repo_root / CSV_PATH
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            mappings[row["prd_file"]] = row["prd_id"]
    return mappings


def load_repo_prd_files(repo_root: Path) -> list[str]:
    prd_root = repo_root / PRD_DIR
    return sorted(
        str(path.relative_to(repo_root)).replace("\\", "/")
        for path in prd_root.glob("prd-*.md")
        if path.is_file()
    )


def validate_prd_csv_consistency(repo_root: Path) -> list[str]:
    errors: list[str] = []
    csv_mappings = load_csv_mappings(repo_root)
    repo_prd_files = load_repo_prd_files(repo_root)

    for prd_file, prd_id in sorted(csv_mappings.items()):
        prd_path = repo_root / prd_file
        if not prd_path.is_file():
            errors.append(
                f"FAIL: CSV entry {prd_id} references missing prd_file {prd_file}. "
                "Create the canonical PRD file or fix the CSV path."
            )

    for prd_file in repo_prd_files:
        if prd_file not in csv_mappings:
            errors.append(
                f"FAIL: Orphan PRD {prd_file} is not mapped in docs/product/feature-system.csv. "
                "Add a matching CSV row with prd_id and prd_file."
            )

    for prd_file in csv_mappings:
        if prd_file not in repo_prd_files:
            errors.append(
                f"FAIL: Orphan CSV entry references {prd_file}, but that canonical PRD file does not exist. "
                "Create the file or remove/fix the CSV row."
            )

    return errors


def validate_new_prd_alignment(new_prd_files: list[str], csv_mappings: dict[str, str]) -> list[str]:
    errors: list[str] = []
    for prd_file in new_prd_files:
        prd_id = csv_mappings.get(prd_file)
        if not prd_id:
            continue

        prd_id_match = PRD_ID_RE.fullmatch(prd_id)
        prd_file_match = PRD_FILE_RE.fullmatch(prd_file)
        if not prd_id_match or not prd_file_match:
            continue

        if int(prd_id_match.group(1)) != int(prd_file_match.group(1)):
            errors.append(
                f"FAIL: New PRD mapping mismatch.\n"
                f"CSV prd_id: {prd_id}\n"
                f"PRD file: {prd_file}"
            )

    return errors


def inspect_branch_freshness(
    repo_root: Path,
    base_ref: str = "origin/main",
    head_ref: str = "HEAD",
) -> tuple[bool, str, str]:
    merge_base = run_git(repo_root, "merge-base", head_ref, base_ref)
    base_sha = run_git(repo_root, "rev-parse", base_ref)
    return merge_base == base_sha, merge_base, base_sha
