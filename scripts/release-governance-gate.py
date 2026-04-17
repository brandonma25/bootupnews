#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


MONITORED_PREFIXES = (
    "src/app/",
    "src/components/",
    "src/lib/",
    "supabase/",
    "scripts/",
    ".github/workflows/",
)
RELEVANT_DOC_PREFIXES = (
    "docs/product/briefs/",
    "docs/product/prd/",
    "docs/engineering/bug-fixes/",
    "docs/engineering/incidents/",
    "docs/engineering/change-records/",
    "docs/engineering/testing/",
    "docs/engineering/protocols/",
)
CSV_PATH = "docs/product/feature-system.csv"
PRD_DIR = "docs/product/prd"
TRIVIAL_MAX_CHANGED_LINES = 15
PRD_ID_RE = re.compile(r"^PRD-(\d+)$")
PRD_FILE_RE = re.compile(r"^docs/product/prd/prd-(\d+)-[a-z0-9-]+\.md$")


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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Enforce release governance requirements for pull requests."
    )
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
    return parser.parse_args()


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
    return result.stdout


def get_diff_range(base_sha: str, head_sha: str) -> str:
    return f"{base_sha}...{head_sha}"


def load_changes(repo_root: Path, diff_range: str) -> dict[str, Change]:
    changes: dict[str, Change] = {}

    name_status_output = run_git(repo_root, "diff", "--name-status", diff_range)
    for raw_line in name_status_output.splitlines():
        if not raw_line.strip():
            continue
        parts = raw_line.split("\t")
        status = parts[0]
        path = parts[-1]
        changes[path] = Change(path=path, status=status)

    numstat_output = run_git(repo_root, "diff", "--numstat", diff_range)
    for raw_line in numstat_output.splitlines():
        if not raw_line.strip():
            continue
        parts = raw_line.split("\t")
        if len(parts) < 3:
            continue
        added_text, deleted_text, path = parts[0], parts[1], parts[-1]
        added = int(added_text) if added_text.isdigit() else 0
        deleted = int(deleted_text) if deleted_text.isdigit() else 0
        change = changes.get(path, Change(path=path, status="M"))
        change.added = added
        change.deleted = deleted
        changes[path] = change

    return changes


def is_docs_file(path: str) -> bool:
    return path.startswith("docs/")


def is_monitored_file(path: str) -> bool:
    return path.startswith(MONITORED_PREFIXES)


def is_relevant_doc_file(path: str) -> bool:
    return path.startswith(RELEVANT_DOC_PREFIXES)


def is_test_file(path: str) -> bool:
    return any(token in path for token in ("/__tests__/", ".test.", ".spec."))


def is_canonical_prd(path: str) -> bool:
    return path.startswith("docs/product/prd/prd-") and path.endswith(".md")


def classify_pr(changes: dict[str, Change]) -> tuple[str, list[Change], list[Change], list[str]]:
    changed_paths = list(changes)
    monitored_changes = [change for change in changes.values() if is_monitored_file(change.path)]
    non_test_monitored = [change for change in monitored_changes if not is_test_file(change.path)]
    added_non_test_monitored = [change for change in non_test_monitored if change.is_added]
    new_prd_files = [path for path, change in changes.items() if change.is_added and is_canonical_prd(path)]

    if changed_paths and all(is_docs_file(path) for path in changed_paths):
        return "docs-only", monitored_changes, non_test_monitored, new_prd_files

    if new_prd_files or added_non_test_monitored:
        return "new-feature-or-system", monitored_changes, non_test_monitored, new_prd_files

    if not monitored_changes:
        return "trivial-code-change", monitored_changes, non_test_monitored, new_prd_files

    only_tests = non_test_monitored == []
    single_small_modification = (
        len(non_test_monitored) == 1
        and not non_test_monitored[0].is_added
        and not non_test_monitored[0].path.startswith(("supabase/", ".github/workflows/"))
        and non_test_monitored[0].total_changed_lines <= TRIVIAL_MAX_CHANGED_LINES
    )

    if only_tests or single_small_modification:
        return "trivial-code-change", monitored_changes, non_test_monitored, new_prd_files

    return "material-feature-change", monitored_changes, non_test_monitored, new_prd_files


def run_csv_validator(repo_root: Path) -> tuple[bool, str]:
    result = subprocess.run(
        [sys.executable, "scripts/validate-feature-system-csv.py"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0, result.stdout + result.stderr


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

        if prd_id_match.group(1) != prd_file_match.group(1):
            errors.append(
                f"FAIL: New PRD mapping mismatch.\n"
                f"CSV prd_id: {prd_id}\n"
                f"PRD file: {prd_file}"
            )

    return errors


def fail(message: str, extra: str | None = None) -> int:
    print(f"FAIL: {message}")
    if extra:
        print("")
        print(extra.strip())
    return 1


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()
    diff_range = get_diff_range(args.base_sha, args.head_sha)

    csv_ok, csv_output = run_csv_validator(repo_root)
    if not csv_ok:
        return fail(
            "docs/product/feature-system.csv failed strict schema validation.",
            csv_output,
        )

    try:
        changes = load_changes(repo_root, diff_range)
    except RuntimeError as exc:
        return fail(f"Unable to inspect PR diff for range {diff_range}", str(exc))

    consistency_errors = validate_prd_csv_consistency(repo_root)
    if consistency_errors:
        return fail(
            "PRD and CSV consistency checks failed.",
            "\n".join(consistency_errors),
        )

    classification, monitored_changes, non_test_monitored, new_prd_files = classify_pr(changes)
    changed_paths = sorted(changes)
    relevant_doc_updates = [path for path in changed_paths if is_relevant_doc_file(path)]
    full_validation_triggered = CSV_PATH in changes or any(
        path.startswith("docs/product/prd/") for path in changed_paths
    )

    print(f"classification: {classification}")
    print(f"full validation: {'triggered' if full_validation_triggered else 'always-on baseline checks only'}")
    if changed_paths:
        print("changed files:")
        for path in changed_paths:
            print(f"- {path}")

    if classification == "docs-only":
        print("PASS: Docs-only change with valid CSV schema and PRD/CSV consistency.")
        return 0

    if classification == "trivial-code-change":
        print("PASS: Trivial code change with valid governance artifacts.")
        return 0

    if classification == "new-feature-or-system":
        if not new_prd_files:
            return fail(
                "New feature or system change detected, but no canonical PRD was added in docs/product/prd/.",
                "How to fix: add one canonical docs/product/prd/prd-XX-<slug>.md file and map it in docs/product/feature-system.csv.",
            )

        csv_mappings = load_csv_mappings(repo_root)
        for prd_file in new_prd_files:
            if prd_file not in csv_mappings:
                return fail(
                    f"New PRD file {prd_file} is missing from docs/product/feature-system.csv.",
                    "How to fix: add a CSV row with the matching prd_id and prd_file.",
                )

            if not (repo_root / prd_file).is_file():
                return fail(
                    f"New PRD file {prd_file} does not exist in the repository.",
                    "How to fix: create the canonical PRD file or fix the PRD path in the CSV.",
                )

        alignment_errors = validate_new_prd_alignment(new_prd_files, csv_mappings)
        if alignment_errors:
            return fail(
                "New PRD file and CSV entry do not refer to the same PRD ID.",
                "\n".join(alignment_errors),
            )

        if not relevant_doc_updates:
            return fail(
                "New feature or system change detected, but no supporting governance docs were updated.",
                "How to fix: add the canonical PRD and any supporting docs required for the change scope.",
            )

        print("PASS: New feature/system change includes canonical PRD mapping and supporting docs.")
        return 0

    if monitored_changes and not relevant_doc_updates:
        return fail(
            "Material feature change detected, but no supporting docs were updated.",
            "How to fix: update docs/product/prd, docs/product/briefs, or the relevant docs/engineering bucket to reflect the change.",
        )

    print("PASS: Material feature change includes required supporting docs and strict governance checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
