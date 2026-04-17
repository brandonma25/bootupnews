import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { parseArgs } from "./common.mjs";

const TEMPLATE_MAP = [
  {
    type: "testing",
    templatePath: "docs/testing/templates/release-testing-report-template.md",
    targetDir: "docs/testing",
  },
  {
    type: "bug-fix",
    templatePath: "docs/bug-fixes/templates/release-bug-fix-template.md",
    targetDir: "docs/bug-fixes",
  },
  {
    type: "release-brief",
    templatePath: "docs/prd/templates/release-brief-template.md",
    targetDir: "docs/prd",
  },
];

function replaceTokens(template, values) {
  return template.replaceAll("{{TITLE}}", values.title).replaceAll("{{DATE}}", values.date);
}

function ensureFile(targetPath, content) {
  if (fs.existsSync(targetPath)) {
    return false;
  }

  fs.writeFileSync(targetPath, content);
  return true;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug;
  const title = args.title || slug;
  const date = args.date || new Date().toISOString().slice(0, 10);

  if (!slug) {
    console.error("Provide --slug for the release documentation set.");
    process.exit(1);
  }

  const created = [];

  for (const entry of TEMPLATE_MAP) {
    const template = fs.readFileSync(path.join(process.cwd(), entry.templatePath), "utf8");
    const targetPath = path.join(process.cwd(), entry.targetDir, `${slug}.md`);
    const didCreate = ensureFile(targetPath, replaceTokens(template, { title, date }));

    created.push({
      path: path.relative(process.cwd(), targetPath),
      status: didCreate ? "created" : "kept",
    });
  }

  for (const entry of created) {
    console.log(`${entry.status.toUpperCase()} ${entry.path}`);
  }
}

main();

