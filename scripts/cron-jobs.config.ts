// scripts/cron-jobs.config.ts
//
// Source of truth for cron-job.org configuration of Boot Up's ingestion crons.
// Edit this file, then run `npm run cron:sync` to apply changes idempotently.
//
// Governance: schedule changes go through git review, not a forgotten browser
// tab. The sync script (`scripts/sync-cron-jobs.ts`) reconciles cron-job.org
// against this file by matching jobs on `title`, so titles must be stable.
// Use the `bootup-` prefix so the sync script can scope to our own jobs.

export interface CronJobConfig {
  /** Stable identifier. Sync script matches existing jobs by this title. */
  title: string;
  /** Full target URL. */
  url: string;
  /**
   * HTTP method cron-job.org should use when hitting `url`.
   * The Boot Up ingestion endpoint exports only GET — POST would 405.
   */
  method: "GET" | "POST";
  /** Schedule shape. UTC strongly preferred for clarity in audit. */
  schedule: {
    /** IANA timezone, e.g. "Etc/UTC". */
    timezone: string;
    /** Hours to fire (0-23). */
    hours: number[];
    /** Minutes to fire within each scheduled hour (0-59). */
    minutes: number[];
  };
  /** Custom HTTP headers sent on every invocation. */
  headers: Record<string, string>;
  /** Whether the job is enabled on cron-job.org. */
  enabled: boolean;
  /** When true, cron-job.org emails the account holder on non-2xx response. */
  notifyOnFailure: boolean;
}

const SECRET = process.env.CRON_SECRET;
const BASE = process.env.BOOTUP_PRODUCTION_URL;

// Intentionally do not throw at import time — tests / dry-runs may import
// without a fully-configured shell. The sync script enforces env presence at
// run time and prints a clear error listing every missing variable.

export const cronJobs: CronJobConfig[] = [
  // Sole authoritative ingestion trigger at 20:00 Asia/Taipei (= 12:00 UTC).
  // Path-A Task 1 collapsed the previous 10:15 + 11:45 UTC dual-trigger into a
  // single run; cross-run idempotency lives in the cron_runs guard table (see
  // migration 20260521120000_cron_runs_and_source_url_idempotency.sql). Apply
  // this change to cron-job.org with `npm run cron:sync:prune` so the two
  // legacy ingestion jobs are removed alongside the create.
  {
    title: "bootup-ingestion-1200-utc",
    url: `${BASE ?? "<BOOTUP_PRODUCTION_URL>"}/api/cron/fetch-editorial-inputs`,
    method: "GET",
    schedule: { timezone: "Etc/UTC", hours: [12], minutes: [0] },
    headers: { "x-cron-secret": SECRET ?? "" },
    enabled: true,
    notifyOnFailure: true,
  },

  // Health-check job — PRD-65 Phase 4 shipped /api/cron/health (see CHANGELOG).
  // Fires 15 minutes after the single ingestion run; a non-2xx response
  // triggers an email alert via cron-job.org's notifyOnFailure.
  {
    title: "bootup-health-check-1215-utc",
    url: `${BASE ?? "<BOOTUP_PRODUCTION_URL>"}/api/cron/health`,
    method: "GET",
    schedule: { timezone: "Etc/UTC", hours: [12], minutes: [15] },
    headers: { "x-cron-secret": SECRET ?? "" },
    enabled: true,
    notifyOnFailure: true,
  },
];
