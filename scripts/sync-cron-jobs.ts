#!/usr/bin/env tsx
// scripts/sync-cron-jobs.ts
//
// Sync cron-job.org against scripts/cron-jobs.config.ts.
//
// Spec deviations from the original task prompt, resolved against
// https://docs.cron-job.org/rest-api.html on 2026-05-17:
//   - Create method is `PUT /jobs` (not POST). Update is `PATCH /jobs/{id}`.
//   - requestMethod codes are 0=GET, 1=POST, 4=PUT, 5=DELETE, 8=PATCH
//     (not the 0..4 sequence the prompt template guessed).
//   - Request bodies for create/update wrap the job under a top-level "job"
//     key: { "job": { ... } }.
//   - GET /jobs returns summary objects ({ jobs: [...] }) without
//     extendedData / notification. To diff those we fetch each candidate via
//     GET /jobs/{id} which returns { jobDetails: {...} }.
//
// Idempotency: two consecutive runs with no config change must produce zero
// API writes on the second run.

import { cronJobs, type CronJobConfig } from "./cron-jobs.config";

const API_BASE = "https://api.cron-job.org";
const WRITE_THROTTLE_MS = 250;
const BOOTUP_PREFIX = "bootup-";

const REQUEST_METHOD_CODE: Record<CronJobConfig["method"], number> = {
  GET: 0,
  POST: 1,
};

interface CliOptions {
  dryRun: boolean;
  prune: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  return {
    dryRun: argv.includes("--dry-run"),
    prune: argv.includes("--prune"),
  };
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new MissingEnvError(name);
  return v;
}

class MissingEnvError extends Error {
  constructor(public readonly name: string) {
    super(`Missing required env var: ${name}`);
  }
}

function maskSecret(s: string | undefined): string {
  if (!s) return "<empty>";
  return `<len=${s.length}>`;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

type ScheduleApi = {
  timezone: string;
  expiresAt: number;
  hours: number[];
  minutes: number[];
  mdays: number[];
  months: number[];
  wdays: number[];
};

type ManagedFields = {
  url: string;
  title: string;
  enabled: boolean;
  requestMethod: number;
  schedule: ScheduleApi;
  extendedData: { headers: Record<string, string> };
  notification: { onFailure: boolean; onSuccess: boolean; onDisable: boolean };
};

function configToManaged(config: CronJobConfig): ManagedFields {
  return {
    url: config.url,
    title: config.title,
    enabled: config.enabled,
    requestMethod: REQUEST_METHOD_CODE[config.method],
    schedule: {
      timezone: config.schedule.timezone,
      expiresAt: 0,
      hours: [...config.schedule.hours],
      minutes: [...config.schedule.minutes],
      mdays: [-1],
      months: [-1],
      wdays: [-1],
    },
    extendedData: { headers: { ...config.headers } },
    notification: {
      onFailure: config.notifyOnFailure,
      onSuccess: false,
      onDisable: config.notifyOnFailure,
    },
  };
}

type JobSummary = {
  jobId: number;
  title: string;
};

type JobDetails = {
  jobId: number;
  title: string;
  url: string;
  enabled: boolean;
  requestMethod: number;
  schedule: ScheduleApi;
  extendedData?: { headers?: Record<string, string> };
  notification?: { onFailure?: boolean; onSuccess?: boolean; onDisable?: boolean };
};

async function apiCall(
  apiKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await resp.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!resp.ok) {
    throw new Error(
      `${method} ${path} -> HTTP ${resp.status}: ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`,
    );
  }
  return { status: resp.status, data };
}

async function listBootupJobs(apiKey: string): Promise<JobSummary[]> {
  const { data } = await apiCall(apiKey, "GET", "/jobs");
  const jobs = (data as { jobs?: unknown[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  return jobs
    .filter((j): j is { jobId: number; title: string } => {
      const o = j as { jobId?: unknown; title?: unknown };
      return typeof o.jobId === "number" && typeof o.title === "string";
    })
    .filter((j) => j.title.startsWith(BOOTUP_PREFIX));
}

async function getJobDetails(apiKey: string, jobId: number): Promise<JobDetails> {
  const { data } = await apiCall(apiKey, "GET", `/jobs/${jobId}`);
  const details = (data as { jobDetails?: JobDetails })?.jobDetails;
  if (!details) {
    throw new Error(`GET /jobs/${jobId}: response did not contain jobDetails`);
  }
  return details;
}

async function createJob(apiKey: string, managed: ManagedFields): Promise<number> {
  const { data } = await apiCall(apiKey, "PUT", "/jobs", { job: managed });
  const jobId = (data as { jobId?: number })?.jobId;
  if (typeof jobId !== "number") {
    throw new Error(`PUT /jobs: response did not contain jobId (got ${JSON.stringify(data)})`);
  }
  return jobId;
}

async function updateJob(
  apiKey: string,
  jobId: number,
  managed: ManagedFields,
): Promise<void> {
  await apiCall(apiKey, "PATCH", `/jobs/${jobId}`, { job: managed });
}

async function deleteJob(apiKey: string, jobId: number): Promise<void> {
  await apiCall(apiKey, "DELETE", `/jobs/${jobId}`);
}

function diffManaged(current: JobDetails, desired: ManagedFields): string[] {
  const diffs: string[] = [];
  if (current.url !== desired.url) diffs.push("url");
  if (current.title !== desired.title) diffs.push("title");
  if (current.enabled !== desired.enabled) diffs.push("enabled");
  if (current.requestMethod !== desired.requestMethod) diffs.push("requestMethod");

  const cs = current.schedule;
  const ds = desired.schedule;
  if (
    cs.timezone !== ds.timezone ||
    !arrayEqual(cs.hours, ds.hours) ||
    !arrayEqual(cs.minutes, ds.minutes) ||
    !arrayEqual(cs.mdays, ds.mdays) ||
    !arrayEqual(cs.months, ds.months) ||
    !arrayEqual(cs.wdays, ds.wdays)
  ) {
    diffs.push("schedule");
  }

  const currentHeaders = current.extendedData?.headers ?? {};
  const desiredHeaders = desired.extendedData.headers;
  if (!headersEqual(currentHeaders, desiredHeaders)) diffs.push("extendedData.headers");

  const cn = current.notification ?? {};
  const dn = desired.notification;
  if (
    (cn.onFailure ?? false) !== dn.onFailure ||
    (cn.onSuccess ?? false) !== dn.onSuccess ||
    (cn.onDisable ?? false) !== dn.onDisable
  ) {
    diffs.push("notification");
  }

  return diffs;
}

function arrayEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function headersEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (!arrayEqualStr(aKeys, bKeys)) return false;
  for (const k of aKeys) if (a[k] !== b[k]) return false;
  return true;
}

function arrayEqualStr(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

type ActionRow = {
  title: string;
  action: "create" | "update" | "skip" | "orphan" | "prune";
  detail: string;
  status?: number;
  ok: boolean;
};

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const missing: string[] = [];
  let apiKey = "";
  let cronSecret = "";
  let productionUrl = "";
  try {
    apiKey = requireEnv("CRONJOB_API_KEY");
  } catch (e) {
    if (e instanceof MissingEnvError) missing.push(e.name);
  }
  try {
    cronSecret = requireEnv("CRON_SECRET");
  } catch (e) {
    if (e instanceof MissingEnvError) missing.push(e.name);
  }
  try {
    productionUrl = requireEnv("BOOTUP_PRODUCTION_URL");
  } catch (e) {
    if (e instanceof MissingEnvError) missing.push(e.name);
  }
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    console.error("All of CRONJOB_API_KEY, CRON_SECRET, BOOTUP_PRODUCTION_URL must be set.");
    process.exit(2);
  }

  console.log(`mode:          ${opts.dryRun ? "DRY-RUN (no writes)" : "LIVE"}`);
  console.log(`prune orphans: ${opts.prune ? "yes" : "no"}`);
  console.log(`config jobs:   ${cronJobs.length}`);
  console.log(`production:    ${productionUrl}`);
  console.log(`api key:       ${maskSecret(apiKey)}`);
  console.log(`cron secret:   ${maskSecret(cronSecret)}`);
  console.log("");

  // Fetch existing bootup-* jobs.
  let summaries: JobSummary[];
  try {
    summaries = await listBootupJobs(apiKey);
  } catch (e) {
    console.error(`Failed to list jobs: ${(e as Error).message}`);
    process.exit(1);
  }

  // Index existing by title and fetch full details for the ones in scope.
  const desiredByTitle = new Map<string, CronJobConfig>(
    cronJobs.map((c) => [c.title, c]),
  );
  const existingByTitle = new Map<string, JobSummary>(
    summaries.map((s) => [s.title, s]),
  );

  // Only fetch full details for jobs we may need to diff or prune. The set is:
  //   - every bootup-* job summary (we will either update or orphan-prune)
  // Skips: titles that exist in config but not yet on cron-job.org (will create).
  const detailsByJobId = new Map<number, JobDetails>();
  for (const summary of summaries) {
    try {
      const details = await getJobDetails(apiKey, summary.jobId);
      detailsByJobId.set(summary.jobId, details);
    } catch (e) {
      console.error(`  Failed to read job ${summary.jobId} (${summary.title}): ${(e as Error).message}`);
    }
  }

  const rows: ActionRow[] = [];
  let writeFailures = 0;

  // Reconcile configured jobs.
  for (const config of cronJobs) {
    const desired = configToManaged(config);
    const existing = existingByTitle.get(config.title);

    if (!existing) {
      // CREATE
      if (opts.dryRun) {
        rows.push({
          title: config.title,
          action: "create",
          detail: `would create ${config.method} ${config.url} @ ${formatSchedule(config)}`,
          ok: true,
        });
        continue;
      }
      try {
        const jobId = await createJob(apiKey, desired);
        rows.push({
          title: config.title,
          action: "create",
          detail: `created jobId=${jobId}`,
          status: 200,
          ok: true,
        });
      } catch (e) {
        writeFailures++;
        rows.push({
          title: config.title,
          action: "create",
          detail: (e as Error).message,
          ok: false,
        });
      }
      await sleep(WRITE_THROTTLE_MS);
      continue;
    }

    // existing found — compare
    const details = detailsByJobId.get(existing.jobId);
    if (!details) {
      rows.push({
        title: config.title,
        action: "skip",
        detail: `existing job ${existing.jobId}: details could not be fetched; not modifying`,
        ok: false,
      });
      continue;
    }

    const diffs = diffManaged(details, desired);
    if (diffs.length === 0) {
      rows.push({
        title: config.title,
        action: "skip",
        detail: `no change (jobId=${existing.jobId})`,
        ok: true,
      });
      continue;
    }

    if (opts.dryRun) {
      rows.push({
        title: config.title,
        action: "update",
        detail: `would update jobId=${existing.jobId} (diff: ${diffs.join(", ")})`,
        ok: true,
      });
      continue;
    }
    try {
      await updateJob(apiKey, existing.jobId, desired);
      rows.push({
        title: config.title,
        action: "update",
        detail: `updated jobId=${existing.jobId} (diff: ${diffs.join(", ")})`,
        status: 200,
        ok: true,
      });
    } catch (e) {
      writeFailures++;
      rows.push({
        title: config.title,
        action: "update",
        detail: (e as Error).message,
        ok: false,
      });
    }
    await sleep(WRITE_THROTTLE_MS);
  }

  // Orphans: bootup-* jobs on cron-job.org not present in config.
  for (const summary of summaries) {
    if (desiredByTitle.has(summary.title)) continue;

    if (!opts.prune) {
      rows.push({
        title: summary.title,
        action: "orphan",
        detail: `jobId=${summary.jobId} (run with --prune to delete)`,
        ok: true,
      });
      continue;
    }

    if (opts.dryRun) {
      rows.push({
        title: summary.title,
        action: "prune",
        detail: `would delete jobId=${summary.jobId}`,
        ok: true,
      });
      continue;
    }
    try {
      await deleteJob(apiKey, summary.jobId);
      rows.push({
        title: summary.title,
        action: "prune",
        detail: `deleted jobId=${summary.jobId}`,
        status: 200,
        ok: true,
      });
    } catch (e) {
      writeFailures++;
      rows.push({
        title: summary.title,
        action: "prune",
        detail: (e as Error).message,
        ok: false,
      });
    }
    await sleep(WRITE_THROTTLE_MS);
  }

  printReport(rows);

  // Compact summary line for CI / grep.
  const creates = rows.filter((r) => r.action === "create" && r.ok).length;
  const updates = rows.filter((r) => r.action === "update" && r.ok).length;
  const skips = rows.filter((r) => r.action === "skip" && r.ok).length;
  const orphans = rows.filter((r) => r.action === "orphan").length;
  const prunes = rows.filter((r) => r.action === "prune" && r.ok).length;
  if (opts.dryRun) {
    const createTitles = rows
      .filter((r) => r.action === "create" && r.ok)
      .map((r) => r.title);
    if (createTitles.length > 0) {
      console.log(`Would create ${createTitles.length} jobs: ${createTitles.join(", ")}`);
    } else {
      console.log("Would create 0 jobs.");
    }
  }
  console.log(
    `\nsummary: created=${creates} updated=${updates} skipped=${skips} orphans=${orphans} pruned=${prunes} failed=${writeFailures}`,
  );

  process.exit(writeFailures > 0 ? 1 : 0);
}

function formatSchedule(c: CronJobConfig): string {
  return `${c.schedule.hours.join(",")}:${c.schedule.minutes.join(",")} ${c.schedule.timezone}`;
}

function printReport(rows: ActionRow[]): void {
  if (rows.length === 0) {
    console.log("(no jobs in scope)");
    return;
  }
  const titleW = Math.max(...rows.map((r) => r.title.length), "TITLE".length);
  const actionW = Math.max(...rows.map((r) => r.action.length), "ACTION".length);
  const header = `${"TITLE".padEnd(titleW)}  ${"ACTION".padEnd(actionW)}  DETAIL`;
  console.log(header);
  console.log("-".repeat(header.length));
  for (const r of rows) {
    const flag = r.ok ? "" : " [FAIL]";
    console.log(`${r.title.padEnd(titleW)}  ${r.action.padEnd(actionW)}  ${r.detail}${flag}`);
  }
}

main().catch((err) => {
  console.error((err as Error).stack ?? String(err));
  process.exit(1);
});
