#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys

from governance_common import (
    CSV_PATH,
    GovernanceContext,
    describe_required_doc_groups,
    find_missing_doc_groups,
    has_documentation_coverage,
    inspect_branch_freshness,
    load_changes_for_args,
    load_csv_mappings,
    parse_common_args,
    resolve_branch_name,
    run_git,
    validate_new_prd_alignment,
    validate_prd_csv_consistency,
    classify_changes,
    is_canonical_prd,
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


def bullet_list(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def explain_classification(context: GovernanceContext) -> str:
    details = [
        f"Classification: {context.classification}",
        f"Governance tier: {context.gate_tier}",
    ]
    if context.added_new_feature_files:
        details.append("New system/feature file trigger(s):\n" + bullet_list(context.added_new_feature_files))
    if context.new_prd_files:
        details.append("New PRD file(s):\n" + bullet_list(context.new_prd_files))
    if context.hotspot_files_touched:
        details.append("Hotspot file(s) touched:\n" + bullet_list(context.hotspot_files_touched))
    if context.fix_signal_reasons:
        details.append("Fix signal(s):\n" + bullet_list(context.fix_signal_reasons))
    return "\n\n".join(details)


def format_missing_doc_failure(context: GovernanceContext, missing_doc_groups: list[tuple[str, ...]]) -> str:
    base = [
        explain_classification(context),
        "Required documentation lane(s):\n"
        + bullet_list(describe_required_doc_groups(missing_doc_groups)),
        "Observed documentation lane(s):\n"
        + (bullet_list(context.doc_lanes_updated) if context.doc_lanes_updated else "- none"),
    ]

    if any(set(group) == {"protocol", "change-record", "governance-root"} for group in missing_doc_groups):
        base.append(
            "Fastest valid fix: this PR changes a governance hotspot. Add or update one governance-facing "
            "document, usually a concise `docs/engineering/change-records/...` note, a relevant protocol update, "
            "or another approved governance-root document when the operating rule itself changed."
        )
    elif context.classification == "bug-fix":
        base.append(
            "Fastest valid fix: add a concise bug-fix record under `docs/engineering/bug-fixes/` "
            "or explain why the change should be reclassified."
        )
    else:
        base.append(
            "Fastest valid fix: add the smallest truthful supporting document in one of the required lanes."
        )

    return "\n\n".join(base)


def format_new_feature_without_prd_failure(context: GovernanceContext) -> str:
    return (
        explain_classification(context)
        + "\n\nWhy this failed: the PR adds non-test `src/` or `supabase/` files, which the gate treats as "
        "new system/feature surface unless it is mapped to a canonical PRD."
        + "\n\nFastest valid fix: add or update the mapped canonical `docs/product/prd/prd-XX-<slug>.md` "
        "file, zero-pad 1-9 as `prd-01` through `prd-09`, and ensure the same `prd_id` and `prd_file` "
        "exist in `docs/product/feature-system.csv`. If this is not actually feature/system work, split "
        "or rename the change so the diff reflects the narrower scope."
    )


def format_prd_csv_missing_failure(context: GovernanceContext, prd_file: str) -> str:
    return (
        explain_classification(context)
        + f"\n\nWhy this failed: `{prd_file}` is a new canonical PRD file, but "
        "`docs/product/feature-system.csv` does not contain a matching `prd_file` row."
        + "\n\nFastest valid fix: add exactly one CSV row with the matching `prd_id` and `prd_file`, "
        "or remove the PRD file if it was created accidentally."
    )


def find_existing_mapped_prd_updates(
    context: GovernanceContext,
    csv_mappings: dict[str, str],
    repo_root,
) -> list[str]:
    return sorted(
        path
        for path in context.changed_paths
        if is_canonical_prd(path)
        and path not in context.new_prd_files
        and path in csv_mappings
        and (repo_root / path).is_file()
    )


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
        changes = load_changes_for_args(repo_root, args)
        branch = resolve_branch_name(repo_root, args.branch_name)
    except RuntimeError as exc:
        return fail(f"Unable to inspect PR diff for range {diff_range}", str(exc))

    consistency_errors = validate_prd_csv_consistency(repo_root)
    if consistency_errors:
        return fail(
            "PRD and CSV consistency checks failed.",
            "\n".join(consistency_errors),
        )

    context = classify_changes(changes, branch, args.pr_title, repo_root)
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
    if context.prd_exception_reasons:
        print("prd exception:")
        for reason in context.prd_exception_reasons:
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
        csv_mappings = load_csv_mappings(repo_root)
        existing_mapped_prd_updates = find_existing_mapped_prd_updates(
            context,
            csv_mappings,
            repo_root,
        )

        if not context.new_prd_files and not existing_mapped_prd_updates:
            return fail(
                "New feature or system change detected, but no mapped canonical PRD was added or updated in docs/product/prd/.",
                format_new_feature_without_prd_failure(context),
            )

        for prd_file in context.new_prd_files:
            if prd_file not in csv_mappings:
                return fail(
                    f"New PRD file {prd_file} is missing from docs/product/feature-system.csv.",
                    format_prd_csv_missing_failure(context, prd_file),
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
                explain_classification(context)
                + "\n\nWhy this failed: a new canonical PRD and its feature-system row must refer to "
                "the same numeric `PRD-XX` identity.\n\n"
                + "\n".join(alignment_errors)
                + "\n\nFastest valid fix: make the PRD filename number and CSV `prd_id` match.",
            )

    missing_doc_groups = find_missing_doc_groups(context)
    if missing_doc_groups:
        return fail(
            "Documentation coverage requirements are not satisfied for this change.",
            format_missing_doc_failure(context, missing_doc_groups),
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
