#!/usr/bin/env python3

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath


APPROVED_UPLOAD_PATH_PREFIXES = ("public/uploads/",)
APPROVED_UPLOAD_EXTENSIONS = (
    ".avif",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".png",
    ".webp",
)
ALLOWED_UPLOAD_STATUSES = {"A", "M"}
MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024

UPLOAD_ONLY_MESSAGE = "Upload-only change set detected; running lightweight validation path"
NON_UPLOAD_MESSAGE = "Non-upload changes detected; running full CI"
AMBIGUOUS_MESSAGE = "Ambiguous or unapproved changes detected; running full CI"


@dataclass(frozen=True)
class ChangedFile:
    status: str
    path: str


@dataclass(frozen=True)
class Classification:
    upload_only: bool
    run_full_ci: bool
    result: str
    message: str
    changed_files: tuple[ChangedFile, ...]
    reasons: tuple[str, ...]


def load_changed_files(repo_root: Path, base_sha: str, head_sha: str) -> list[ChangedFile]:
    diff_range = f"{base_sha}...{head_sha}"
    result = subprocess.run(
        ["git", "diff", "--name-status", "-z", diff_range],
        cwd=repo_root,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace").strip() or "git diff failed")

    parts = [part.decode("utf-8", errors="replace") for part in result.stdout.split(b"\0") if part]
    changed_files: list[ChangedFile] = []
    index = 0
    while index < len(parts):
        status = parts[index]
        index += 1
        if status.startswith(("R", "C")):
            if index + 1 >= len(parts):
                raise RuntimeError("git diff rename/copy output was incomplete")
            old_path = parts[index]
            new_path = parts[index + 1]
            index += 2
            changed_files.append(ChangedFile(status=status, path=new_path))
            if old_path != new_path:
                continue
        else:
            if index >= len(parts):
                raise RuntimeError("git diff name-status output was incomplete")
            path = parts[index]
            index += 1
            changed_files.append(ChangedFile(status=status, path=path))

    return changed_files


def parse_changed_file(value: str) -> ChangedFile:
    if ":" not in value:
        raise argparse.ArgumentTypeError("changed file must use STATUS:path form")
    status, path = value.split(":", 1)
    if not status or not path:
        raise argparse.ArgumentTypeError("changed file must include both STATUS and path")
    return ChangedFile(status=status, path=path)


def normalize_path(path: str) -> str:
    normalized = path.replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def path_is_safe(path: str) -> bool:
    if not path:
        return False
    normalized = normalize_path(path)
    pure_path = PurePosixPath(normalized)
    if pure_path.is_absolute():
        return False
    return ".." not in pure_path.parts


def normalized_status(status: str) -> str:
    return status[:1].upper()


def is_approved_upload_path(path: str) -> bool:
    normalized = normalize_path(path)
    return normalized.startswith(APPROVED_UPLOAD_PATH_PREFIXES)


def is_approved_upload_extension(path: str) -> bool:
    suffix = PurePosixPath(normalize_path(path)).suffix.lower()
    return suffix in APPROVED_UPLOAD_EXTENSIONS


def classify_changed_files(changed_files: list[ChangedFile]) -> Classification:
    normalized_changes = tuple(
        ChangedFile(status=change.status, path=normalize_path(change.path))
        for change in changed_files
    )
    if not normalized_changes:
        return Classification(
            upload_only=False,
            run_full_ci=True,
            result="ambiguous",
            message=AMBIGUOUS_MESSAGE,
            changed_files=normalized_changes,
            reasons=("No changed files were detected.",),
        )

    ambiguous_reasons: list[str] = []
    non_upload_paths: list[str] = []

    for change in normalized_changes:
        path = change.path
        status = normalized_status(change.status)

        if not path_is_safe(path):
            ambiguous_reasons.append(f"{path}: unsafe or ambiguous path")
            continue

        if is_approved_upload_path(path):
            if status not in ALLOWED_UPLOAD_STATUSES:
                ambiguous_reasons.append(f"{path}: unsupported upload file status {change.status}")
            elif not is_approved_upload_extension(path):
                ambiguous_reasons.append(f"{path}: unapproved upload file extension")
            continue

        non_upload_paths.append(path)

    if ambiguous_reasons:
        return Classification(
            upload_only=False,
            run_full_ci=True,
            result="ambiguous",
            message=AMBIGUOUS_MESSAGE,
            changed_files=normalized_changes,
            reasons=tuple(ambiguous_reasons),
        )

    if non_upload_paths:
        return Classification(
            upload_only=False,
            run_full_ci=True,
            result="non_upload",
            message=NON_UPLOAD_MESSAGE,
            changed_files=normalized_changes,
            reasons=tuple(non_upload_paths),
        )

    return Classification(
        upload_only=True,
        run_full_ci=False,
        result="upload_only",
        message=UPLOAD_ONLY_MESSAGE,
        changed_files=normalized_changes,
        reasons=("All changed files are approved upload assets.",),
    )


def validate_upload_files(repo_root: Path, classification: Classification) -> list[str]:
    errors: list[str] = []

    for change in classification.changed_files:
        path = normalize_path(change.path)
        full_path = repo_root / path

        if not full_path.is_file():
            errors.append(f"{path}: expected an existing file for lightweight upload validation")
            continue

        size = full_path.stat().st_size
        if size > MAX_UPLOAD_FILE_BYTES:
            errors.append(
                f"{path}: file size {size} bytes exceeds {MAX_UPLOAD_FILE_BYTES} byte limit"
            )

    return errors


def write_github_output(path: str, classification: Classification) -> None:
    outputs = {
        "upload_only": "true" if classification.upload_only else "false",
        "run_full_ci": "true" if classification.run_full_ci else "false",
        "classification": classification.result,
        "changed_file_count": str(len(classification.changed_files)),
    }

    with open(path, "a", encoding="utf-8") as handle:
        for key, value in outputs.items():
            handle.write(f"{key}={value}\n")


def write_summary(path: str, classification: Classification) -> None:
    with open(path, "a", encoding="utf-8") as handle:
        handle.write("## Upload-aware CI classification\n\n")
        handle.write(f"- Decision: {classification.message}\n")
        handle.write(f"- Upload only: `{str(classification.upload_only).lower()}`\n")
        handle.write(f"- Run full CI: `{str(classification.run_full_ci).lower()}`\n")
        handle.write("- Approved upload path prefixes:\n")
        for prefix in APPROVED_UPLOAD_PATH_PREFIXES:
            handle.write(f"  - `{prefix}`\n")
        handle.write("- Approved upload extensions:\n")
        for extension in APPROVED_UPLOAD_EXTENSIONS:
            handle.write(f"  - `{extension}`\n")
        handle.write("\n### Changed files\n\n")
        if classification.changed_files:
            for change in classification.changed_files:
                handle.write(f"- `{change.status}` `{change.path}`\n")
        else:
            handle.write("- none\n")
        if classification.reasons:
            handle.write("\n### Classification notes\n\n")
            for reason in classification.reasons:
                handle.write(f"- {reason}\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Classify whether a PR contains only approved upload asset changes."
    )
    parser.add_argument(
        "--repo-root",
        default=Path(__file__).resolve().parent.parent,
        type=Path,
        help="Repository root.",
    )
    parser.add_argument("--base-sha", default="origin/main", help="Base commit or ref.")
    parser.add_argument("--head-sha", default="HEAD", help="Head commit or ref.")
    parser.add_argument(
        "--changed-file",
        action="append",
        default=[],
        type=parse_changed_file,
        help="Test helper in STATUS:path form. May be repeated.",
    )
    parser.add_argument(
        "--validate-upload-files",
        action="store_true",
        help="When upload-only, validate file existence and maximum file size.",
    )
    parser.add_argument(
        "--require-upload-only",
        action="store_true",
        help="Fail if the change set is not upload-only.",
    )
    parser.add_argument(
        "--github-output",
        default=os.environ.get("GITHUB_OUTPUT", ""),
        help="Optional GitHub Actions output file path.",
    )
    parser.add_argument(
        "--github-step-summary",
        default=os.environ.get("GITHUB_STEP_SUMMARY", ""),
        help="Optional GitHub Actions step summary path.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()

    try:
        changed_files = (
            list(args.changed_file)
            if args.changed_file
            else load_changed_files(repo_root, args.base_sha, args.head_sha)
        )
        classification = classify_changed_files(changed_files)
    except Exception as exc:
        classification = Classification(
            upload_only=False,
            run_full_ci=True,
            result="classifier_error",
            message=AMBIGUOUS_MESSAGE,
            changed_files=tuple(),
            reasons=(f"Classifier failed closed: {exc}",),
        )

    print(classification.message)
    for reason in classification.reasons:
        print(f"- {reason}")

    if args.github_output:
        write_github_output(args.github_output, classification)
    if args.github_step_summary:
        write_summary(args.github_step_summary, classification)

    if args.require_upload_only and not classification.upload_only:
        return 1

    if args.validate_upload_files and classification.upload_only:
        errors = validate_upload_files(repo_root, classification)
        if errors:
            print("Upload lightweight validation failed:", file=sys.stderr)
            for error in errors:
                print(f"- {error}", file=sys.stderr)
            return 1
        print("Upload lightweight validation passed.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
