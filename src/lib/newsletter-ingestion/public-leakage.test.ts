import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("newsletter public leakage protections", () => {
  it("keeps internal newsletter fields out of public signal select lists", () => {
    const signalsEditorial = readRepoFile("src/lib/signals-editorial.ts");
    const homepageOverrides = readRepoFile("src/lib/homepage-editorial-overrides.ts");
    const publicSignalsSelectBlock = signalsEditorial.match(
      /const PUBLIC_SIGNAL_POST_REQUIRED_COLUMNS = \[([\s\S]*?)\];/u,
    )?.[1] ?? "";

    expect(publicSignalsSelectBlock).not.toContain("context_material");
    expect(publicSignalsSelectBlock).not.toContain("raw_content");
    expect(homepageOverrides).not.toContain("context_material");
    expect(homepageOverrides).not.toContain("raw_content");
  });

  it("keeps public signal queries constrained to live published rows", () => {
    const signalsEditorial = readRepoFile("src/lib/signals-editorial.ts");

    expect(signalsEditorial).toContain(".eq(\"is_live\", true)");
    expect(signalsEditorial).toContain(".eq(\"editorial_status\", \"published\")");
    expect(signalsEditorial).toContain(".not(\"published_at\", \"is\", null)");
  });

  it("does not add public newsletter table reads", () => {
    const publicFiles = [
      "src/app/page.tsx",
      "src/app/signals/page.tsx",
      "src/app/briefing/[date]/page.tsx",
      "src/lib/homepage-editorial-overrides.ts",
      "src/lib/signals-editorial.ts",
    ].map(readRepoFile).join("\n");

    expect(publicFiles).not.toContain("newsletter_emails");
    expect(publicFiles).not.toContain("newsletter_story_extractions");
  });
});
