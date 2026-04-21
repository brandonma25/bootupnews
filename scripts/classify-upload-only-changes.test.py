#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
CLASSIFIER_SPEC = importlib.util.spec_from_file_location(
    "classify_upload_only_changes", SCRIPT_DIR / "classify-upload-only-changes.py"
)
if CLASSIFIER_SPEC is None or CLASSIFIER_SPEC.loader is None:
    raise RuntimeError("Unable to load classify-upload-only-changes.py")
classifier = importlib.util.module_from_spec(CLASSIFIER_SPEC)
sys.modules[CLASSIFIER_SPEC.name] = classifier
CLASSIFIER_SPEC.loader.exec_module(classifier)


ChangedFile = classifier.ChangedFile
classify_changed_files = classifier.classify_changed_files
validate_upload_files = classifier.validate_upload_files


class UploadOnlyChangeClassifierTests(unittest.TestCase):
    def test_upload_only_approved_change_uses_lightweight_path(self) -> None:
        result = classify_changed_files(
            [
                ChangedFile("A", "public/uploads/briefing-card.png"),
                ChangedFile("M", "public/uploads/source-logo.webp"),
            ]
        )

        self.assertTrue(result.upload_only)
        self.assertFalse(result.run_full_ci)
        self.assertEqual(result.result, "upload_only")
        self.assertEqual(
            result.message,
            "Upload-only change set detected; running lightweight validation path",
        )

    def test_mixed_upload_and_code_change_runs_full_ci(self) -> None:
        result = classify_changed_files(
            [
                ChangedFile("M", "public/uploads/briefing-card.png"),
                ChangedFile("M", "src/app/page.tsx"),
            ]
        )

        self.assertFalse(result.upload_only)
        self.assertTrue(result.run_full_ci)
        self.assertEqual(result.result, "non_upload")
        self.assertEqual(result.message, "Non-upload changes detected; running full CI")

    def test_non_upload_code_change_runs_full_ci(self) -> None:
        result = classify_changed_files([ChangedFile("M", "src/lib/data.ts")])

        self.assertFalse(result.upload_only)
        self.assertTrue(result.run_full_ci)
        self.assertEqual(result.result, "non_upload")

    def test_unapproved_upload_extension_fails_closed_to_full_ci(self) -> None:
        result = classify_changed_files([ChangedFile("A", "public/uploads/widget.js")])

        self.assertFalse(result.upload_only)
        self.assertTrue(result.run_full_ci)
        self.assertEqual(result.result, "ambiguous")
        self.assertEqual(
            result.message,
            "Ambiguous or unapproved changes detected; running full CI",
        )

    def test_upload_deletion_is_ambiguous_and_runs_full_ci(self) -> None:
        result = classify_changed_files([ChangedFile("D", "public/uploads/old-card.png")])

        self.assertFalse(result.upload_only)
        self.assertTrue(result.run_full_ci)
        self.assertEqual(result.result, "ambiguous")

    def test_lightweight_validation_accepts_existing_small_upload_file(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            target = repo_root / "public/uploads/briefing-card.png"
            target.parent.mkdir(parents=True)
            target.write_bytes(b"png")
            result = classify_changed_files([ChangedFile("A", "public/uploads/briefing-card.png")])

            self.assertEqual(validate_upload_files(repo_root, result), [])

    def test_lightweight_validation_rejects_missing_upload_file(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            result = classify_changed_files([ChangedFile("A", "public/uploads/missing.png")])

            self.assertEqual(
                validate_upload_files(repo_root, result),
                [
                    "public/uploads/missing.png: expected an existing file for lightweight upload validation"
                ],
            )


if __name__ == "__main__":
    unittest.main()
