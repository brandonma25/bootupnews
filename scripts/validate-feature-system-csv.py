#!/usr/bin/env python3

from __future__ import annotations

import csv
import re
import sys
from datetime import datetime
from pathlib import Path


EXPECTED_HEADER = [
    "Layer",
    "Feature Name",
    "Priority",
    "Status",
    "Description",
    "Owner",
    "Dependency",
    "Build Order",
    "Decision",
    "Last Updated",
    "prd_id",
    "prd_file",
]
EXPECTED_COLUMN_COUNT = len(EXPECTED_HEADER)
PRD_ID_RE = re.compile(r"^PRD-(\d+)$")
PRD_FILE_RE = re.compile(r"^docs/product/prd/prd-(\d+)-[a-z0-9-]+\.md$")
PRD_FILE_CASE_INSENSITIVE_RE = re.compile(r"^prd-(\d+)-.+\.md$", re.IGNORECASE)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def is_valid_date(value: str) -> bool:
    if value == "":
        return True
    if not DATE_RE.fullmatch(value):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return False
    return True


def fail(errors: list[str], message: str) -> None:
    errors.append(f"FAIL: {message}")


def warn(warnings: list[str], message: str) -> None:
    warnings.append(f"WARN: {message}")


def normalize_slug(value: str) -> str:
    return re.sub(r"-{2,}", "-", re.sub(r"[^a-z0-9]+", "-", value.lower())).strip("-")


def load_rows(csv_path: Path, errors: list[str]) -> list[list[str]]:
    try:
        with csv_path.open("r", encoding="utf-8", newline="") as handle:
            reader = csv.reader(handle, strict=True)
            return list(reader)
    except (csv.Error, OSError) as exc:
        fail(
            errors,
            f"Unable to parse docs/product/feature-system.csv because the CSV is malformed. "
            f"Fix malformed quoting or row structure. Parser error: {exc}",
        )
        return []


def validate_header(rows: list[list[str]], errors: list[str]) -> bool:
    if not rows:
        fail(
            errors,
            "docs/product/feature-system.csv is empty. Add the exact 12-column header row and at least one data row.",
        )
        return False

    header = rows[0]
    if header != EXPECTED_HEADER:
        fail(
            errors,
            "CSV header mismatch.\n"
            f"Expected: {', '.join(EXPECTED_HEADER)}\n"
            f"Actual: {', '.join(header)}",
        )
        return False

    return True


def validate_rows(
    repo_root: Path,
    rows: list[list[str]],
    errors: list[str],
    warnings: list[str],
) -> dict[str, tuple[str, str]]:
    seen_prd_ids: dict[str, int] = {}
    seen_prd_files: dict[str, int] = {}
    seen_feature_names: dict[str, int] = {}
    csv_prd_mappings: dict[str, tuple[str, str]] = {}

    for row_number, row in enumerate(rows[1:], start=2):
        if row == EXPECTED_HEADER:
            fail(
                errors,
                f"Duplicate header row found at line {row_number}. Remove repeated header rows so only the first line is the header.",
            )
            continue

        if len(row) != EXPECTED_COLUMN_COUNT:
            fail(
                errors,
                f"Row {row_number} has {len(row)} columns instead of {EXPECTED_COLUMN_COUNT}. "
                "Fix quoting or delimiters so every row has exactly 12 columns.",
            )
            continue

        feature_name = row[1].strip()
        last_updated = row[9].strip()
        prd_id = row[10].strip()
        prd_file = row[11].strip()

        if feature_name in seen_feature_names:
            fail(
                errors,
                f"Feature Name '{feature_name}' is duplicated on lines {seen_feature_names[feature_name]} and {row_number}. "
                "Use one unique Feature Name per row.",
            )
        else:
            seen_feature_names[feature_name] = row_number

        prd_id_match = PRD_ID_RE.fullmatch(prd_id)
        if not prd_id_match:
            fail(
                errors,
                f"prd_id '{prd_id}' on line {row_number} is invalid. Use the format PRD-[number], for example PRD-14.",
            )
        elif prd_id in seen_prd_ids:
            fail(
                errors,
                f"prd_id '{prd_id}' is duplicated on lines {seen_prd_ids[prd_id]} and {row_number}. "
                "Each PRD ID must appear exactly once in the CSV.",
            )
        else:
            seen_prd_ids[prd_id] = row_number

        prd_file_match = PRD_FILE_RE.fullmatch(prd_file)
        if not prd_file_match:
            fail(
                errors,
                f"Invalid prd_file on line {row_number}.\n"
                "Expected format: docs/product/prd/prd-[number]-<slug>.md\n"
                f"Actual: {prd_file}",
            )
        else:
            if prd_file in seen_prd_files:
                fail(
                    errors,
                    f"prd_file '{prd_file}' is duplicated on lines {seen_prd_files[prd_file]} and {row_number}. "
                    "Each canonical PRD file must map to exactly one CSV row.",
                )
            else:
                seen_prd_files[prd_file] = row_number
                csv_prd_mappings[prd_file] = (prd_id, feature_name)

            prd_path = repo_root / prd_file
            if not prd_path.is_file():
                fail(
                    errors,
                    f"CSV row {row_number} references a missing PRD file.\n"
                    f"Expected existing file: {prd_file}\n"
                    f"Actual: file does not exist",
                )

        if prd_id_match and prd_file_match:
            prd_id_number = prd_id_match.group(1)
            prd_file_number = prd_file_match.group(1)
            if prd_id_number != prd_file_number:
                fail(
                    errors,
                    f"prd_id to prd_file mismatch on line {row_number}.\n"
                    f"Expected matching number for: {prd_id}\n"
                    f"Actual file: {prd_file}",
                )

            filename_slug = Path(prd_file).stem.split("-", 2)[2]
            expected_slug = normalize_slug(feature_name)
            if filename_slug != expected_slug:
                warn(
                    warnings,
                    f"PRD slug does not match feature name.\n"
                    f"Feature Name: {feature_name}\n"
                    f"File: {prd_file}",
                )

        if not is_valid_date(last_updated):
            fail(
                errors,
                f"Last Updated '{last_updated}' on line {row_number} is invalid. "
                "Use YYYY-MM-DD or leave the field empty.",
            )

    return csv_prd_mappings


def validate_prd_directory_parity(
    repo_root: Path,
    csv_prd_mappings: dict[str, tuple[str, str]],
    errors: list[str],
) -> None:
    prd_root = repo_root / "docs" / "product" / "prd"
    repo_prd_files = []
    prd_number_to_files: dict[str, list[str]] = {}

    for path in sorted(prd_root.iterdir()):
        if not path.is_file():
            continue

        relative_path = str(path.relative_to(repo_root)).replace("\\", "/")
        filename = path.name
        case_insensitive_match = PRD_FILE_CASE_INSENSITIVE_RE.fullmatch(filename)
        strict_match = PRD_FILE_RE.fullmatch(relative_path)

        if case_insensitive_match:
            if filename != filename.lower():
                fail(
                    errors,
                    "PRD file must be lowercase.\n"
                    f"Found: {relative_path}",
                )

            prd_number = case_insensitive_match.group(1)
            prd_number_to_files.setdefault(prd_number, []).append(relative_path)

        if strict_match:
            repo_prd_files.append(relative_path)

    for prd_number, files in sorted(prd_number_to_files.items()):
        if len(files) > 1:
            fail(
                errors,
                "Duplicate PRD number detected\n"
                f"PRD-{prd_number} appears in:\n- " + "\n- ".join(files),
            )

    for prd_file in repo_prd_files:
        if prd_file not in csv_prd_mappings:
            fail(
                errors,
                "PRD file not registered in CSV.\n"
                f"File: {prd_file}",
            )


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    csv_path = repo_root / "docs" / "product" / "feature-system.csv"
    errors: list[str] = []
    warnings: list[str] = []
    rows = load_rows(csv_path, errors)

    header_ok = validate_header(rows, errors) if rows else False
    csv_prd_mappings: dict[str, tuple[str, str]] = {}
    if rows and header_ok:
        csv_prd_mappings = validate_rows(repo_root, rows, errors, warnings)
        validate_prd_directory_parity(repo_root, csv_prd_mappings, errors)

    data_row_count = max(len(rows) - 1, 0)
    print(f"row count: {data_row_count}")
    print(f"header columns: {EXPECTED_COLUMN_COUNT}")
    print(f"schema enforced: {'PASS' if not errors else 'FAIL'}")

    if errors:
        print("")
        for error in errors:
            print(error)
        if warnings:
            print("")
            for warning in warnings:
                print(warning)
        return 1

    if warnings:
        print("")
        for warning in warnings:
            print(warning)
    print("PASS: docs/product/feature-system.csv matches the strict 12-column schema and semantic PRD mapping rules.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
