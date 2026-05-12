import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { parseArgs } from "./common.mjs";

function buildReleaseEvidence({ title, date, slug }) {
  return [
    `# ${title}`,
    "",
    `Date: ${date}`,
    slug ? `Slug: ${slug}` : null,
    "",
    "## Change Classification",
    "- Change type: ",
    "- Source of truth: ",
    "- User-facing behavior changed: ",
    "",
    "## Validation Evidence",
    "- Local checks: ",
    "- Preview or production checks, if applicable: ",
    "- Human-only checks, if applicable: ",
    "",
    "## Release Notes",
    "- Summary: ",
    "- Risk or rollback notes: ",
    "- Follow-up: ",
    "",
    "## Evidence Placement",
    "Use this output in the PR body, GitHub metadata, or an external/private archive unless a stable public artifact is explicitly required.",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function writeOutput(outputPath, content) {
  const targetPath = path.resolve(process.cwd(), outputPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
  return targetPath;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug;
  const title = args.title || (slug ? slug.replaceAll("-", " ") : "Release Evidence");
  const date = args.date || new Date().toISOString().slice(0, 10);
  const content = buildReleaseEvidence({ title, date, slug });

  if (args.output) {
    const targetPath = writeOutput(args.output, content);
    console.log(`WROTE ${path.relative(process.cwd(), targetPath)}`);
    return;
  }

  process.stdout.write(content);
}

main();
