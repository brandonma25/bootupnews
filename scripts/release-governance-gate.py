#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys

from governance_common import (
    CSV_PATH,
    describe_required_doc_groups,
    find_missing_doc_groups,
    has_documentation_coverage,
    inspect_branch_freshness,
    load_changes,
    load_csv_mappings,
    parse_common_args,
    resolve_branch_name,
    run_git,
    validate_new_prd_alignment,
    validate_prd_csv_consistency,
    classify_changes,
)


def parse_args():
    parser = parse_common_args("Enforce release governance requirements for pull requests.")
    return parser.parse_args()


def run_csv_validator(repo_root) -> tuple[bool, str]:
    result = subprocess.run(
        [sys.executable, "scripts/validate-feature-system-csv.py"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0, result.stdout + result.stderr


def fail(message: str, extra: str | None = None) -> int:
    print(f"FAIL: {message}")
    if extra:
        print("")
        print(extra.strip())
    return 1


def main() -> int:
    args = parse_args()
    repo_root = args.repo_root.resolve()
    diff_range = f"{args.base_sha}...{args.head_sha}"

    csv_ok, csv_output = run_csv_validator(repo_root)
    if not csv_ok:
        return fail(
            "docs/product/feature-system.csv failed strict schema validation.",
            csv_output,
        )

    try:
        changes = load_changes(repo_root, diff_range)
        branch = resolve_branch_name(repo_root, args.branch_name)
    except RuntimeError as exc:
        return fail(f"Unable to inspect PR diff for range {diff_range}", str(exc))

    consistency_errors = validate_prd_csv_consistency(repo_root)
    if consistency_errors:
        return fail(
            "PRD and CSV consistency checks failed.",
            "\n".join(consistency_errors),
        )

    context = classify_changes(changes, branch, args.pr_title)
    full_validation_triggered = CSV_PATH in changes or any(
        path.startswith("docs/product/prd/") for path in context.changed_paths
    )

    print(f"branch: {context.branch}")
    print(f"classification: {context.classification}")
    print(f"governance tier: {context.gate_tier}")
    print(
        f"full validation: {'triggered' if full_validation_triggered else 'always-on baseline checks only'}"
    )
    if context.fix_signal_reasons:
        print("fix signal:")
        for reason in context.fix_signal_reasons:
            print(f"- {reason}")
    if context.hotspot_files_touched:
        print("hotspot files touched:")
        for path in context.hotspot_files_touched:
            print(f"- {path}")
    if context.changed_paths:
        print("changed files:")
        for path in context.changed_paths:
            print(f"- {path}")

    if context.classification == "docs-only":
        print("PASS: Docs-only change with valid CSV schema and PRD/CSV consistency.")
        return 0

    if context.classification == "trivial-code-change":
        print("PASS: Trivial code change with valid governance artifacts.")
        return 0

    if context.classification == "new-feature-or-system":
        if not context.new_prd_files:
            return fail(
                "New feature or system change detected, but no canonical PRD was added in docs/product/prd/.",
                "How to fix: add one canonical docs/product/prd/prd-XX-<slug>.md file, zero-pad 1-9 as prd-01 through prd-09, and map it in docs/product/feature-system.csv.",
            )

        csv_mappings = load_csv_mappings(repo_root)
        for prd_file in context.new_prd_files:
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

        alignment_errors = validate_new_prd_alignment(context.new_prd_files, csv_mappings)
        if alignment_errors:
            return fail(
                "New PRD file and CSV entry do not refer to the same PRD ID.",
                "\n".join(alignment_errors),
            )

    missing_doc_groups = find_missing_doc_groups(context)
    if missing_doc_groups:
        return fail(
            "Documentation coverage requirements are not satisfied for this change.",
            "Required documentation lanes:\n"
            + "\n".join(f"- {description}" for description in describe_required_doc_groups(missing_doc_groups))
            + "\n\nObserved lanes:\n"
            + ("\n".join(f"- {lane}" for lane in context.doc_lanes_updated) if context.doc_lanes_updated else "- none"),
        )

    if context.gate_tier == "hotspot" and context.non_test_monitored:
        try:
            is_fresh, merge_base, origin_main_sha = inspect_branch_freshness(repo_root)
        except RuntimeError as exc:
            return fail("Unable to evaluate hotspot branch freshness.", str(exc))

        if not is_fresh:
            return fail(
                "Hotspot-governance changes must be rebased onto the latest origin/main before merge.",
                f"Current merge-base: {merge_base}\nLatest origin/main: {origin_main_sha}",
            )

    if not has_documentation_coverage(context):
        return fail(
            "Material feature change detected, but no supporting docs were updated.",
            "How to fix: update docs/product/prd, docs/product/briefs, or the relevant docs/engineering bucket to reflect the change.",
        )

    print("PASS: Governance promotion checks, documentation coverage, and hotspot rules are satisfied.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
