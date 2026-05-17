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
  {
    title: "bootup-ingestion-1015-utc",
    url: `${BASE ?? "<BOOTUP_PRODUCTION_URL>"}/api/cron/fetch-editorial-inputs`,
    method: "GET",
    schedule: { timezone: "Etc/UTC", hours: [10], minutes: [15] },
    headers: { "x-cron-secret": SECRET ?? "" },
    enabled: true,
    notifyOnFailure: true,
  },
  {
    title: "bootup-ingestion-1145-utc",
    url: `${BASE ?? "<BOOTUP_PRODUCTION_URL>"}/api/cron/fetch-editorial-inputs`,
    method: "GET",
    schedule: { timezone: "Etc/UTC", hours: [11], minutes: [45] },
    headers: { "x-cron-secret": SECRET ?? "" },
    enabled: true,
    notifyOnFailure: true,
  },

  // Health-check job — uncomment after PRD-65 Phase 4 ships /api/cron/health.
  // Until then this endpoint does not exist and the job would 404.
  //
  // {
  //   title: "bootup-health-check-1215-utc",
  //   url: `${BASE ?? "<BOOTUP_PRODUCTION_URL>"}/api/cron/health`,
  //   method: "GET",
  //   schedule: { timezone: "Etc/UTC", hours: [12], minutes: [15] },
  //   headers: { "x-cron-secret": SECRET ?? "" },
  //   enabled: true,
  //   notifyOnFailure: true,
  // },
];
