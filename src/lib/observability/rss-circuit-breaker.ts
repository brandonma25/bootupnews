import { errorContext, logServerEvent } from "@/lib/observability";
import { writeSourceHealthEntry } from "@/lib/observability/source-health-log";

/**
 * RSS source circuit breaker (PRD-65 Phase 4.5).
 *
 * Reads today's `Fail Count` from the Notion Source Health Log database. If
 * the count is at or above CIRCUIT_BREAKER_THRESHOLD, the next fetch attempt
 * for that source is skipped, the skip is recorded in the Source Health Log
 * as `skipped_circuit_breaker`, and no Sentry event is emitted (the
 * separate `beforeSend` filter takes care of any retry-exhausted events that
 * leak through other paths).
 *
 * Reset condition: day rollover. The Source Health Log is keyed on
 * `(Source, Date)` with Date being the Taipei briefing day. Each new day
 * starts at Fail Count 0, so a skipped source is automatically re-attempted
 * on the first fetch of the next day. This satisfies the "auto-reset after
 * 24 hours" requirement modulo midnight-boundary timing — the scheduled
 * ingestion runs at 18:15 and 19:45 Taipei, so the worst-case skip window
 * is ~22 hours (close enough to the spec's 24h).
 *
 * Failure contract: this module never throws on observability failures. A
 * missing `NOTION_SOURCE_HEALTH_LOG_DB_ID`, a Notion API outage, or any
 * query/write error produces a warn-level log and a permissive result
 * (`skip: false`). The fetch path always falls through to the real fetch
 * when the circuit-breaker data layer is degraded — degradation must never
 * silently disable ingestion.
 */

const NOTION_API_VERSION = "2022-06-28";
export const CIRCUIT_BREAKER_THRESHOLD = 5;

export type CircuitBreakerOutcome = "success" | "fail" | "skipped_circuit_breaker";

export class RssCircuitBreakerSkipError extends Error {
  readonly sourceName: string;
  readonly briefingDate: string;
  readonly failCount: number;

  constructor(sourceName: string, briefingDate: string, failCount: number) {
    super(
      `Source skipped by circuit breaker: ${sourceName} has ${failCount} failures today (${briefingDate}); threshold=${CIRCUIT_BREAKER_THRESHOLD}.`,
    );
    this.name = "RssCircuitBreakerSkipError";
    this.sourceName = sourceName;
    this.briefingDate = briefingDate;
    this.failCount = failCount;
  }
}

export function todayInTaipei(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Read today's Source Health Log row for the source, return the Fail Count.
 * Returns 0 when the env is unset, when no row exists yet for today, or when
 * any Notion request fails (the permissive default — don't disable ingestion
 * because observability is degraded).
 */
async function getTodayFailCount(source: string, date: string): Promise<number> {
  const dbId = process.env.NOTION_SOURCE_HEALTH_LOG_DB_ID?.trim();
  const token = process.env.NOTION_TOKEN?.trim();
  if (!dbId || !token) return 0;

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      body: JSON.stringify({
        filter: {
          and: [
            { property: "Source", title: { equals: source } },
            { property: "Date", date: { equals: date } },
          ],
        },
        page_size: 1,
      }),
    });
    if (!response.ok) {
      logServerEvent("warn", "Circuit breaker query failed (permissive default applied)", {
        source,
        date,
        httpStatus: response.status,
      });
      return 0;
    }
    const data = (await response.json()) as {
      results?: Array<{
        properties?: Record<string, { number?: number } | undefined>;
      }>;
    };
    const first = data.results?.[0];
    const failCount = first?.properties?.["Fail Count"]?.number ?? 0;
    return typeof failCount === "number" ? failCount : 0;
  } catch (error) {
    logServerEvent("warn", "Circuit breaker query threw (permissive default applied)", {
      source,
      date,
      ...errorContext(error),
    });
    return 0;
  }
}

export type CircuitBreakerDecision =
  | { skip: false; failCount: number; briefingDate: string }
  | { skip: true; failCount: number; briefingDate: string };

/**
 * Pre-fetch gate. The fetch path must call this with the source's display
 * name before issuing the network request. When `skip: true`, the caller
 * should throw `RssCircuitBreakerSkipError` (after recording the skip — see
 * `recordFetchOutcome`) and short-circuit out of the fetch path.
 */
export async function checkCircuitBreaker(
  sourceName: string,
  now: Date = new Date(),
): Promise<CircuitBreakerDecision> {
  const briefingDate = todayInTaipei(now);
  const failCount = await getTodayFailCount(sourceName, briefingDate);
  return {
    skip: failCount >= CIRCUIT_BREAKER_THRESHOLD,
    failCount,
    briefingDate,
  };
}

/**
 * Record the outcome of a single fetch attempt for a source. Wraps the
 * Source Health Log writer with the briefing-date resolution and the
 * permissive failure contract — observability writes never break the
 * ingestion run.
 */
export async function recordFetchOutcome(input: {
  sourceName: string;
  outcome: CircuitBreakerOutcome;
  now?: Date;
  notes?: string;
}): Promise<void> {
  const briefingDate = todayInTaipei(input.now ?? new Date());
  const result = await writeSourceHealthEntry({
    source: input.sourceName,
    date: briefingDate,
    outcome: input.outcome,
    lastSuccessfulFetchAt: input.outcome === "success" ? new Date().toISOString() : undefined,
    notes: input.notes,
  });
  if (!result.written) {
    logServerEvent("warn", "Source health log write skipped or failed (non-blocking)", {
      source: input.sourceName,
      date: briefingDate,
      outcome: input.outcome,
      reason: result.reason,
    });
  }
}
