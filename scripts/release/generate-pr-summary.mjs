import { execFileSync } from "node:child_process";
import process from "node:process";

import { parseArgs } from "./common.mjs";

function git(args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

function safeGit(args, fallback = "") {
  try {
    return git(args);
  } catch {
    return fallback;
  }
}

function groupFiles(files) {
  const groups = {
    app: [],
    tests: [],
    workflows: [],
    docs: [],
    other: [],
  };

  for (const file of files) {
    if (!file) {
      continue;
    }

    if (file.startsWith("src/")) {
      groups.app.push(file);
    } else if (file.startsWith("tests/") || file.includes(".test.") || file.includes(".spec.")) {
      groups.tests.push(file);
    } else if (file.startsWith(".github/workflows/")) {
      groups.workflows.push(file);
    } else if (file.startsWith("docs/") || file === "README.md" || file === "PROJECT.md") {
      groups.docs.push(file);
    } else {
      groups.other.push(file);
    }
  }

  return groups;
}

function renderGroup(name, files) {
  if (files.length === 0) {
    return `- ${name}: none`;
  }

  return `- ${name}: ${files.join(", ")}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseRef = args["base-ref"] || process.env.PR_BASE_REF || "main";
  const headRef = args["head-ref"] || process.env.PR_HEAD_REF || safeGit(["branch", "--show-current"], "HEAD");
  const diffBase = safeGit(["merge-base", baseRef, headRef], "");
  const changedFilesOutput = diffBase
    ? safeGit(["diff", "--name-only", `${diffBase}..${headRef}`], "")
    : safeGit(["diff", "--name-only", `${baseRef}...${headRef}`], "");
  const commitsOutput = diffBase
    ? safeGit(["log", "--oneline", "--no-merges", `${diffBase}..${headRef}`], "")
    : safeGit(["log", "--oneline", "--no-merges", `${baseRef}..${headRef}`], "");
  const workingTreeFiles = [
    ...safeGit(["diff", "--name-only", "HEAD"], "").split("\n").filter(Boolean),
    ...safeGit(["ls-files", "--others", "--exclude-standard"], "").split("\n").filter(Boolean),
  ];
  const files =
    changedFilesOutput.split("\n").filter(Boolean).length > 0
      ? changedFilesOutput.split("\n").filter(Boolean)
      : [...new Set(workingTreeFiles)];
  const commits = commitsOutput.split("\n").filter(Boolean);
  const groups = groupFiles(files);

  console.log("## PR Gate Summary");
  console.log("");
  console.log(`- Base ref: ${baseRef}`);
  console.log(`- Head ref: ${headRef}`);
  console.log(`- Changed files: ${files.length}`);
  console.log(`- Commits in scope: ${commits.length}`);
  console.log(`- Docs touched: ${groups.docs.length > 0 ? "yes" : "no"}`);
  console.log("");
  console.log("### File groups");
  console.log(renderGroup("app", groups.app));
  console.log(renderGroup("tests", groups.tests));
  console.log(renderGroup("workflows", groups.workflows));
  console.log(renderGroup("docs", groups.docs));
  console.log(renderGroup("other", groups.other));

  if (commits.length > 0) {
    console.log("");
    console.log("### Commits");
    for (const commit of commits) {
      console.log(`- ${commit}`);
    }
  }
}

main();
