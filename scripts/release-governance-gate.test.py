#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
import importlib.util
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from governance_common import Change, classify_changes, find_missing_doc_groups, load_changes
GATE_SPEC = importlib.util.spec_from_file_location(
    "release_governance_gate", SCRIPT_DIR / "release-governance-gate.py"
)
if GATE_SPEC is None or GATE_SPEC.loader is None:
    raise RuntimeError("Unable to load release-governance-gate.py")
release_governance_gate = importlib.util.module_from_spec(GATE_SPEC)
GATE_SPEC.loader.exec_module(release_governance_gate)

format_missing_doc_failure = release_governance_gate.format_missing_doc_failure
format_new_feature_without_prd_failure = release_governance_gate.format_new_feature_without_prd_failure
find_existing_mapped_prd_updates = release_governance_gate.find_existing_mapped_prd_updates


def run_git(repo_root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr.strip() or "git command failed")
    return result.stdout.strip()


def write_file(repo_root: Path, path: str, content: str) -> None:
    target = repo_root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


class GovernanceGateVelocityTests(unittest.TestCase):
    def test_ci_pr_diff_mode_ignores_dirty_worktree_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            run_git(repo_root, "init")
            run_git(repo_root, "config", "user.email", "test@example.com")
            run_git(repo_root, "config", "user.name", "Test User")

            write_file(repo_root, "README.md", "base\n")
            run_git(repo_root, "add", ".")
            run_git(repo_root, "commit", "-m", "base")
            base = run_git(repo_root, "rev-parse", "HEAD")

            write_file(repo_root, "src/lib/source-policy.ts", "export const policy = true;\n")
            run_git(repo_root, "add", ".")
            run_git(repo_root, "commit", "-m", "add source policy")
            head = run_git(repo_root, "rev-parse", "HEAD")

            write_file(repo_root, "docs/product/prd/prd-99-local-dirty.md", "# Dirty local PRD\n")
            write_file(repo_root, "scripts/__pycache__/governance_common.cpython-311.pyc", "cache")

            ci_changes = load_changes(repo_root, f"{base}...{head}", include_worktree=False)
            self.assertEqual(sorted(ci_changes), ["src/lib/source-policy.ts"])

            local_changes = load_changes(repo_root, f"{base}...{head}", include_worktree=True)
            self.assertIn("src/lib/source-policy.ts", local_changes)
            self.assertIn("docs/product/prd/prd-99-local-dirty.md", local_changes)
            self.assertNotIn("scripts/__pycache__/governance_common.cpython-311.pyc", local_changes)

    def test_hotspot_prd_csv_change_missing_governance_lane_has_actionable_message(self) -> None:
        changes = {
            "docs/product/feature-system.csv": Change("docs/product/feature-system.csv", "M", 1, 0),
            "docs/product/prd/prd-36-signal-display-cap.md": Change(
                "docs/product/prd/prd-36-signal-display-cap.md", "A", 20, 0
            ),
            "src/components/dashboard/personalized-dashboard.tsx": Change(
                "src/components/dashboard/personalized-dashboard.tsx", "M", 12, 2
            ),
        }
        context = classify_changes(
            changes,
            "feature/prd-36-signal-display-cap",
            "feat: enforce 5-signal display cap",
        )
        missing = find_missing_doc_groups(context)

        self.assertIn(("protocol", "template", "governance-root"), missing)
        message = format_missing_doc_failure(context, missing)
        self.assertIn("Hotspot file(s) touched", message)
        self.assertIn("docs/product/feature-system.csv", message)
        self.assertIn("Fastest valid fix", message)
        self.assertIn("docs/engineering/templates/llm-prompt-template-change-classification.md", message)

    def test_hotspot_prd_csv_change_with_governance_lane_passes_doc_coverage(self) -> None:
        changes = {
            "docs/product/feature-system.csv": Change("docs/product/feature-system.csv", "M", 1, 0),
            "docs/product/prd/prd-36-signal-display-cap.md": Change(
                "docs/product/prd/prd-36-signal-display-cap.md", "A", 20, 0
            ),
            "docs/engineering/templates/llm-prompt-template-change-classification.md": Change(
                "docs/engineering/templates/llm-prompt-template-change-classification.md", "A", 16, 0
            ),
            "src/components/dashboard/personalized-dashboard.tsx": Change(
                "src/components/dashboard/personalized-dashboard.tsx", "M", 12, 2
            ),
        }
        context = classify_changes(
            changes,
            "feature/prd-36-signal-display-cap",
            "feat: enforce 5-signal display cap",
        )

        self.assertEqual(find_missing_doc_groups(context), [])

    def test_legacy_change_record_does_not_satisfy_hotspot_governance_lane(self) -> None:
        changes = {
            "docs/product/feature-system.csv": Change("docs/product/feature-system.csv", "M", 1, 0),
            "docs/product/prd/prd-36-signal-display-cap.md": Change(
                "docs/product/prd/prd-36-signal-display-cap.md", "A", 20, 0
            ),
            "docs/engineering/change-records/signal-display-cap-governance-coverage.md": Change(
                "docs/engineering/change-records/signal-display-cap-governance-coverage.md", "A", 16, 0
            ),
            "src/components/dashboard/personalized-dashboard.tsx": Change(
                "src/components/dashboard/personalized-dashboard.tsx", "M", 12, 2
            ),
        }
        context = classify_changes(
            changes,
            "feature/prd-36-signal-display-cap",
            "feat: enforce 5-signal display cap",
        )

        self.assertIn("legacy-change-record", context.doc_lanes_updated)
        self.assertIn(("protocol", "template", "governance-root"), find_missing_doc_groups(context))

    def test_new_source_policy_file_without_prd_has_actionable_message(self) -> None:
        changes = {
            "docs/engineering/templates/source-onboarding-model.md": Change(
                "docs/engineering/templates/source-onboarding-model.md", "A", 18, 0
            ),
            "src/lib/source-policy.ts": Change("src/lib/source-policy.ts", "A", 40, 0),
        }
        context = classify_changes(
            changes,
            "chore/source-catalog-cleanup-bbc-cnbc",
            "Chore/source catalog cleanup bbc cnbc",
        )

        self.assertEqual(context.classification, "new-feature-or-system")
        self.assertEqual(context.new_prd_files, [])
        message = format_new_feature_without_prd_failure(context)
        self.assertIn("New system/feature file trigger(s)", message)
        self.assertIn("src/lib/source-policy.ts", message)
        self.assertIn("Fastest valid fix", message)
        self.assertIn("docs/product/prd/prd-XX-<slug>.md", message)

    def test_existing_mapped_prd_update_satisfies_feature_prd_coverage(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            prd_file = "docs/product/prd/prd-53-signals-admin-editorial-layer.md"
            write_file(repo_root, prd_file, "# PRD-53\n")
            changes = {
                prd_file: Change(prd_file, "M", 5, 0),
                "src/lib/final-slate-readiness.ts": Change(
                    "src/lib/final-slate-readiness.ts",
                    "A",
                    40,
                    0,
                ),
                "supabase/migrations/20260430100000_signal_posts_final_slate_composer.sql": Change(
                    "supabase/migrations/20260430100000_signal_posts_final_slate_composer.sql",
                    "A",
                    20,
                    0,
                ),
            }
            context = classify_changes(
                changes,
                "codex/prd-53-minimal-final-slate-composer",
                "PRD-53 minimal final-slate composer",
            )

            self.assertEqual(context.classification, "new-feature-or-system")
            self.assertEqual(context.new_prd_files, [])
            self.assertEqual(find_missing_doc_groups(context), [])
            self.assertEqual(
                find_existing_mapped_prd_updates(context, {prd_file: "PRD-53"}, repo_root),
                [prd_file],
            )

    def test_audit_remediation_feature_with_explicit_no_prd_governance_artifact_uses_documented_lane(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            governance_artifact_path = "docs/engineering/templates/pipeline-candidate-capture-governance.md"
            write_file(
                repo_root,
                governance_artifact_path,
                "\n".join(
                    [
                        "# Governance Artifact",
                        "- Canonical PRD required: `no`",
                        "- Source of truth: audit remediation gap.",
                    ]
                ),
            )
            changes = {
                governance_artifact_path: Change(governance_artifact_path, "A", 3, 0),
                "src/lib/pipeline/article-candidates.ts": Change(
                    "src/lib/pipeline/article-candidates.ts", "A", 40, 0
                ),
                "supabase/migrations/20260426090000_pipeline_article_candidates.sql": Change(
                    "supabase/migrations/20260426090000_pipeline_article_candidates.sql", "A", 40, 0
                ),
            }

            context = classify_changes(
                changes,
                "codex/pipeline-article-candidates",
                "Add pipeline candidate capture",
                repo_root,
            )

        self.assertEqual(context.classification, "material-feature-change")
        self.assertTrue(context.prd_exception)
        self.assertEqual(find_missing_doc_groups(context), [])

    def test_docs_only_process_change_remains_baseline(self) -> None:
        changes = {
            "docs/engineering/protocols/engineering-protocol.md": Change(
                "docs/engineering/protocols/engineering-protocol.md", "M", 10, 0
            )
        }
        context = classify_changes(
            changes,
            "docs/sequential-prompt-execution-protocol",
            "Document sequential prompt and local worktree discipline",
        )

        self.assertEqual(context.classification, "docs-only")
        self.assertEqual(context.gate_tier, "baseline")
        self.assertEqual(find_missing_doc_groups(context), [])


if __name__ == "__main__":
    unittest.main()
