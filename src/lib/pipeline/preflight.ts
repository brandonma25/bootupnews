/**
 * Pre-flight capability check (Track 2 — full-pipeline dry-run harness PART 0).
 *
 * THE ANTI-FALSE-SUCCESS FLOOR. Before any stage runs, probe each stage's real
 * dependency and emit a capability matrix. The report must distinguish THREE
 * states per stage and never collapse them:
 *
 *   ran      — executed against a real, reachable dependency
 *   skipped  — creds/dependency absent; the missing var or "no egress" is named
 *   degraded — ran, but the dependency returned nothing (handled by the harness)
 *
 * The specific trap this closes: newsletter with a missing Gmail credential must
 * report skipped(missing GMAIL_REFRESH_TOKEN) with ms = N/A — NEVER ms ≈ 0 +
 * items = 0, which reads as "fast and fixed" and reincarnates the
 * cron-green-while-newsletter-was-dead failure.
 *
 * All probes are cheap, read-only, and never throw — a probe failure yields
 * `unreachable`, not an exception.
 */

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type CredState = "present" | "missing";
export type DependencyState = "reachable" | "unreachable" | "not_applicable";
export type StageRunPlan = "ready" | "skipped";

export type StageName = "sweep" | "newsletter" | "rss" | "staging";

export type StageCapability = {
  stage: StageName;
  creds: CredState;
  missingVars: string[];
  dependency: DependencyState;
  /** Human-readable dependency label, e.g. "Supabase", "Gmail + network", "Notion (P4 dedup)". */
  dependencyLabel: string;
  willRun: StageRunPlan;
  /** Set when willRun === "skipped": exact reason (named var / "no egress"). */
  skipReason?: string;
};

export type CapabilityMatrix = {
  networkEgress: DependencyState;
  stages: StageCapability[];
  /** True when every stage is `ready` — a fully-exercising local run. */
  allReady: boolean;
};

type SupabaseClient = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

export type PreflightDeps = {
  env?: NodeJS.ProcessEnv;
  /** Injectable for tests. Default: createSupabaseServiceRoleClient(). */
  supabaseClient?: SupabaseClient | null;
  /** Injectable for tests. Default: global fetch. */
  fetchImpl?: typeof fetch;
  /** Override the egress probe URLs (tests). */
  egressProbeUrls?: string[];
  /** Per-probe timeout. */
  timeoutMs?: number;
};

const DEFAULT_EGRESS_URLS = ["https://www.google.com/generate_204", "https://example.com"];
const GMAIL_REQUIRED_VARS = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"] as const;
const NOTION_REQUIRED_VARS = ["NOTION_TOKEN", "NOTION_EDITORIAL_QUEUE_DB_ID"] as const;

function missing(env: NodeJS.ProcessEnv, vars: readonly string[]): string[] {
  return vars.filter((v) => !env[v]?.trim());
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

async function probeNetworkEgress(
  fetchImpl: typeof fetch,
  urls: string[],
  timeoutMs: number,
): Promise<DependencyState> {
  for (const url of urls) {
    const ok = await withTimeout(
      async (signal) => {
        const res = await fetchImpl(url, { method: "HEAD", signal });
        return res.ok || res.status === 204 || res.status === 405; // 405 = HEAD not allowed but host reachable
      },
      timeoutMs,
      false,
    );
    if (ok) return "reachable";
  }
  return "unreachable";
}

async function probeSupabase(client: SupabaseClient | null, timeoutMs: number): Promise<DependencyState> {
  if (!client) return "unreachable";
  return withTimeout(
    async () => {
      const result = await client.from("cron_runs").select("briefing_date").limit(1);
      return result.error ? "unreachable" : "reachable";
    },
    timeoutMs,
    "unreachable",
  );
}

async function probeNotion(
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<DependencyState> {
  const token = env.NOTION_TOKEN?.trim();
  if (!token) return "unreachable";
  return withTimeout(
    async (signal) => {
      const res = await fetchImpl("https://api.notion.com/v1/users/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
        signal,
      });
      return res.ok ? "reachable" : "unreachable";
    },
    timeoutMs,
    "unreachable",
  );
}

export async function runPreflight(deps: PreflightDeps = {}): Promise<CapabilityMatrix> {
  const env = deps.env ?? process.env;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 5000;
  const supabaseClient = deps.supabaseClient !== undefined ? deps.supabaseClient : createSupabaseServiceRoleClient();

  const [networkEgress, supabase, notion] = await Promise.all([
    probeNetworkEgress(fetchImpl, deps.egressProbeUrls ?? DEFAULT_EGRESS_URLS, timeoutMs),
    probeSupabase(supabaseClient, timeoutMs),
    probeNotion(env, fetchImpl, timeoutMs),
  ]);

  const gmailMissing = missing(env, GMAIL_REQUIRED_VARS);
  const supabaseMissing = supabaseClient ? [] : ["SUPABASE_URL/SERVICE_ROLE_KEY"];
  const notionMissing = missing(env, NOTION_REQUIRED_VARS);

  const stages: StageCapability[] = [];

  // sweep → reads signal_posts (Supabase). Always dry; never mutates.
  stages.push({
    stage: "sweep",
    creds: supabaseClient ? "present" : "missing",
    missingVars: supabaseMissing,
    dependency: supabase,
    dependencyLabel: "Supabase (read)",
    willRun: supabaseClient && supabase === "reachable" ? "ready" : "skipped",
    skipReason: !supabaseClient
      ? "missing SUPABASE_URL/SERVICE_ROLE_KEY"
      : supabase !== "reachable"
        ? "Supabase unreachable"
        : undefined,
  });

  // newsletter → Gmail creds + network egress.
  const newsletterCredsOk = gmailMissing.length === 0;
  stages.push({
    stage: "newsletter",
    creds: newsletterCredsOk ? "present" : "missing",
    missingVars: gmailMissing,
    dependency: networkEgress,
    dependencyLabel: "Gmail + network",
    willRun: newsletterCredsOk && networkEgress === "reachable" ? "ready" : "skipped",
    skipReason: !newsletterCredsOk
      ? `missing ${gmailMissing.join(", ")}`
      : networkEgress !== "reachable"
        ? "no egress"
        : undefined,
  });

  // rss → network egress only.
  stages.push({
    stage: "rss",
    creds: "present",
    missingVars: [],
    dependency: networkEgress,
    dependencyLabel: "network egress",
    willRun: networkEgress === "reachable" ? "ready" : "skipped",
    skipReason: networkEgress !== "reachable" ? "no egress" : undefined,
  });

  // staging → Supabase (candidate read) is required to run; Notion (P4 cross-date
  // dedup) is required for the would-skip REPORT. Supabase missing → skipped.
  // Notion missing → staging runs selection but the P4 dedup leg is degraded; we
  // surface that via skipReason while still marking willRun ready (P7 + selection
  // still execute against real Supabase candidates).
  // runEditorialStaging hard-requires NOTION_EDITORIAL_QUEUE_DB_ID + NOTION_TOKEN
  // to start AT ALL (it bails otherwise), and the P4 cross-date dedup reads the
  // Notion editorial queue. So Notion is a HARD staging dependency, not just a
  // soft P4-reporting one — without it, staging is SKIPPED, never run.
  const stagingSupabaseOk = Boolean(supabaseClient) && supabase === "reachable";
  const stagingNotionOk = notionMissing.length === 0 && notion === "reachable";
  const stagingReady = stagingSupabaseOk && stagingNotionOk;
  stages.push({
    stage: "staging",
    creds: supabaseClient && notionMissing.length === 0 ? "present" : "missing",
    missingVars: [...supabaseMissing, ...notionMissing],
    dependency: stagingReady ? "reachable" : "unreachable",
    dependencyLabel: "Supabase (candidates) + Notion (queue + P4 dedup)",
    willRun: stagingReady ? "ready" : "skipped",
    skipReason: stagingReady
      ? undefined
      : !stagingSupabaseOk
        ? !supabaseClient
          ? "missing SUPABASE_URL/SERVICE_ROLE_KEY"
          : "Supabase unreachable"
        : notionMissing.length
          ? `missing ${notionMissing.join(", ")}`
          : "Notion unreachable",
  });

  return {
    networkEgress,
    stages,
    allReady: stages.every((s) => s.willRun === "ready"),
  };
}

/** Render the capability matrix as a compact table for the console + report top. */
export function formatCapabilityMatrix(matrix: CapabilityMatrix): string {
  const lines = [
    `network_egress: ${matrix.networkEgress}`,
    "stage         | creds   | dependency  | will_run | note",
    "--------------|---------|-------------|----------|-----",
  ];
  for (const s of matrix.stages) {
    lines.push(
      `${s.stage.padEnd(13)} | ${s.creds.padEnd(7)} | ${s.dependency.padEnd(11)} | ${s.willRun.padEnd(8)} | ${s.skipReason ?? ""}`,
    );
  }
  return lines.join("\n");
}
