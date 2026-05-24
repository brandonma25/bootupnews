/**
 * signal_posts writers guard — regression guard for issue #268.
 *
 * Background:
 *   PR #260 introduced `signal_posts_briefing_date_source_url_key`, a PARTIAL
 *   unique index (`WHERE source_url IS NOT NULL`). It also switched
 *   `persistSignalPostCandidates` to call
 *     `.upsert(rows, { onConflict: "briefing_date,source_url", ignoreDuplicates: true })`.
 *   supabase-js translates that to a bare
 *     `ON CONFLICT (briefing_date, source_url) DO NOTHING`
 *   with NO `WHERE` predicate. Postgres requires the partial-index predicate
 *   to be repeated in the conflict-inference clause, so it returned SQLSTATE
 *   42P10 ("there is no unique or exclusion constraint matching the ON
 *   CONFLICT specification") — aborting the entire INSERT batch. Production
 *   ingestion was silently down for 3 days; cron_runs.status='fail' fired
 *   every day, signal_posts received zero new rows.
 *
 *   The vitest supabase mock at signals-editorial.test.ts:~478 implements
 *   `.upsert(...)` as a JS stand-in that does NOT enforce Postgres's ON
 *   CONFLICT inference rules against partial indexes. 795 unit tests went
 *   green; the bug only surfaced in production.
 *
 * Rule enforced here:
 *   Production code MUST NOT call `.upsert(...)` against `signal_posts`. Use
 *   the select-then-decide pattern instead — see:
 *     - src/lib/signals-editorial.ts → persistSignalPostCandidates
 *     - src/app/api/editorial/push-approved/route.ts → pushApprovedRow
 *
 *   This rule can be relaxed ONLY when:
 *     (a) every unique index on signal_posts referenced by the upsert is
 *         NON-partial (no `WHERE` clause), so supabase-js's bare
 *         `ON CONFLICT (cols)` can match it, AND
 *     (b) the change is accompanied by an integration test against a real
 *         Postgres (Supabase test branch / ephemeral DB) that exercises the
 *         upsert against the actual deployed index schema.
 *
 *   If you need to relax it, edit this file + delete the rule + replace it
 *   with the integration test. The deletion is the gate that forces the
 *   review conversation about (a) and (b).
 */

import { readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = resolve(__dirname, "..", "..");
const SRC_ROOT = resolve(__dirname, "..");

async function listProductionTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip the harness-managed worktree caches; some hold stale code.
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...(await listProductionTsFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Find every `.upsert(` token that appears within `windowChars` characters
 * AFTER a `.from("signal_posts")` call in the same source string. Returns
 * `file:line` strings for each offender so the test failure points at the
 * exact location to fix.
 */
function findUpsertsTargetingSignalPosts(file: string, src: string, windowChars = 800): string[] {
  const fromPattern = /\.from\(\s*["'`]signal_posts["'`]\s*\)/g;
  const offenders: string[] = [];
  for (const m of src.matchAll(fromPattern)) {
    if (m.index === undefined) continue;
    const window = src.slice(m.index, m.index + windowChars);
    // Match `.upsert(` but not `.upsertOptions` or method names that begin
    // with the same chars. A `(` follows when it's a real call.
    if (/\.upsert\s*\(/.test(window)) {
      const lineNumber = src.slice(0, m.index).split("\n").length;
      offenders.push(`${file.replace(PROJECT_ROOT + "/", "")}:${lineNumber}`);
    }
  }
  return offenders;
}

describe("signal_posts writers guard (issue #268)", () => {
  it("no production code calls .upsert() against signal_posts", async () => {
    const files = await listProductionTsFiles(SRC_ROOT);
    const offenders: string[] = [];
    for (const file of files) {
      const src = await readFile(file, "utf8");
      offenders.push(...findUpsertsTargetingSignalPosts(file, src));
    }
    expect(
      offenders,
      [
        "Found production code calling .upsert() against signal_posts.",
        "",
        "This pattern silently failed in production for 3 days (issue #268)",
        "because supabase-js emits a bare ON CONFLICT clause that cannot",
        "match the PARTIAL unique index signal_posts_briefing_date_source_url_key.",
        "",
        "Use select-then-decide instead:",
        "  - src/lib/signals-editorial.ts → persistSignalPostCandidates",
        "  - src/app/api/editorial/push-approved/route.ts → pushApprovedRow",
        "",
        "If you really need .upsert() here, see the comment at the top of",
        "src/lib/signal-posts-writers.guard.test.ts for the relax-the-rule",
        "conditions (both (a) and (b) required).",
        "",
        "Offenders:",
        ...offenders.map((o) => `  - ${o}`),
      ].join("\n"),
    ).toEqual([]);
  });

  it("vitest scanning is wired up correctly (sanity: at least one signal_posts .from() exists)", async () => {
    // If the scanner regresses to find zero .from('signal_posts') sites, the
    // .upsert() check would also become a no-op. This sanity test asserts the
    // scanner actually finds the signal_posts touchpoints we expect.
    const files = await listProductionTsFiles(SRC_ROOT);
    let totalFromCalls = 0;
    for (const file of files) {
      const src = await readFile(file, "utf8");
      const matches = src.match(/\.from\(\s*["'`]signal_posts["'`]\s*\)/g);
      if (matches) totalFromCalls += matches.length;
    }
    expect(totalFromCalls).toBeGreaterThan(5);
  });
});
