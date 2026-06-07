/**
 * Shared cron-endpoint runtime (Track 2 — leg decoupling).
 *
 * The ingestion legs were split across three endpoints so each gets its OWN
 * Vercel 60s budget and neither starves the other (the structural timeout cure):
 *   - /api/cron/ingest-newsletters  → newsletter stage
 *   - /api/cron/fetch-editorial-inputs → RSS → staging (the briefing pipeline)
 *   - /api/cron/sweep → needs_review TTL sweep
 *
 * Every endpoint reuses the SAME auth, internal-timeout, and per-stage timing
 * wrapper from here instead of reinventing it. The run-lock (cron_runs, PK =
 * briefing_date) is retained only by the briefing endpoint — see route.ts.
 */

import { errorContext, logServerEvent } from "@/lib/observability";
import type {
  EditorialPipelineStageName,
  EditorialPipelineStageRunner,
} from "@/lib/pipeline/editorial-ingestion-pipeline";
import { StageTimer } from "@/lib/pipeline/stage-timing";

/**
 * Internal wall, ~5s below the 60s Vercel function ceiling, so a captured
 * timeout event can flush before the instance is frozen. Each endpoint now runs
 * a SUBSET of the legs, so this budget covers a single endpoint's stages — not
 * all three sharing one clock (that sharing was the starvation root cause).
 */
export const INTERNAL_STAGE_TIMEOUT_MS = 55_000;

/** Authn for every cron endpoint: x-cron-secret header (Bearer fallback behind a flag). */
export function isCronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";
  if (headerSecret === cronSecret) return true;

  // Rollback escape hatch: honor the legacy Vercel Cron `Authorization: Bearer`
  // header only when ALLOW_VERCEL_CRON_FALLBACK is explicitly enabled.
  if (process.env.ALLOW_VERCEL_CRON_FALLBACK === "true") {
    const authHeader = request.headers.get("authorization")?.trim() ?? "";
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }

  return false;
}

/** The Taipei calendar date the run-lock + briefing window key on. */
export function todayTaipei(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Thrown when an endpoint's stages exceed the internal budget; names the in-flight stage. */
export class StageTimeoutError extends Error {
  readonly stage: string;
  readonly timeoutMs: number;

  constructor(stage: string, timeoutMs: number) {
    super(`Cron endpoint exceeded internal ${timeoutMs}ms budget during stage "${stage}".`);
    this.name = "StageTimeoutError";
    this.stage = stage;
    this.timeoutMs = timeoutMs;
  }
}

/** Race `work` against the internal budget; on timeout, reject naming `stageRef.current`. */
export function runWithStageTimeout<T>(
  stageRef: { current: string },
  work: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new StageTimeoutError(stageRef.current, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([work, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Build a stage runner for runEditorialIngestionPipeline that (1) records the
 * in-flight stage for timeout attribution, (2) TIMES each stage via StageTimer
 * (the live-route stage_ms instrumentation), and (3) degrades-don't-throw so one
 * leg's failure never aborts the rest. Pass the same `timer` whose `.snapshot()`
 * the endpoint logs after the run.
 */
export function createTimedStageRunner(input: {
  stageRef: { current: EditorialPipelineStageName };
  timer: StageTimer;
  routeName: string;
}): EditorialPipelineStageRunner {
  return async <T>(name: EditorialPipelineStageName, run: () => Promise<T>): Promise<T> => {
    input.stageRef.current = name;
    try {
      return await input.timer.time(name, run);
    } catch (error) {
      logServerEvent("error", "Cron stage failed before completion", {
        route: input.routeName,
        task: name,
        ...errorContext(error),
      });
      return {
        success: false,
        timestamp: new Date().toISOString(),
        summary: { message: `${name} task failed before completion.` },
      } as unknown as T;
    }
  };
}
