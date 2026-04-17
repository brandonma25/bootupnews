/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");

const url = process.argv[2];

if (!url) {
  console.error("Usage: node scripts/preview-check.js <preview-url>");
  process.exit(1);
}

const result = spawnSync(
  "node",
  ["scripts/release/verify-deployment.mjs", "--stage", "preview", "--base-url", url],
  {
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
