/**
 * Timeout + bounded-retry wrapper for Notion API calls. Notion writers were bare
 * `fetch()` — no timeout (a hung socket blocked until the 55s stage wall) and no
 * retry (a transient 429/5xx dropped an editorial row).
 *
 * Retry safety is method/idempotency-aware to avoid double-writes:
 *  - 429 (rate-limited): always safe — the request was rejected before processing.
 *  - 5xx / network / timeout: AMBIGUOUS (may have been applied) — retried ONLY when
 *    the call is idempotent. Page CREATE (POST /pages) defaults non-idempotent so a
 *    possibly-delivered create is never retried. Notion's "query database" is a POST
 *    but read-only and IS safe to retry — its read-query call sites (notion-writer
 *    dedup lookups, source-health, health check, push-approved) pass
 *    { idempotent: true } to opt into 5xx-retry. PATCH/GET are idempotent by the
 *    method default, so writebacks retry too; only POST creates fail closed.
 *
 * Budget: keep timeoutMs * (maxRetries+1) well under the cron stage wall so a
 * Notion outage degrades the stage instead of re-triggering the timeout-poison.
 */

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_RETRIES = 2;
const MAX_BACKOFF_MS = 4_000;

export type NotionFetchOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  /** True = safe to retry on ambiguous (5xx/timeout) failures. Defaults to (method !== POST). */
  idempotent?: boolean;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const backoffMs = (attempt: number) => Math.min(MAX_BACKOFF_MS, 200 * 2 ** attempt);

export async function notionFetch(
  url: string,
  init: RequestInit = {},
  options: NotionFetchOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const method = (init.method ?? "GET").toUpperCase();
  const idempotent = options.idempotent ?? method !== "POST";

  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      clearTimeout(timer);
      // No response received (network error / timeout). Repeating is only safe
      // for idempotent calls — a POST create may already have been delivered.
      if (idempotent && attempt < maxRetries) {
        attempt += 1;
        await wait(backoffMs(attempt));
        continue;
      }
      throw error;
    }
    clearTimeout(timer);

    if (response.status === 429 && attempt < maxRetries) {
      const retryAfter = Number(response.headers.get("retry-after"));
      attempt += 1;
      // Drain the discarded body so the socket can be reused (matches safeFetch).
      await response.body?.cancel().catch(() => {});
      await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, MAX_BACKOFF_MS) : backoffMs(attempt));
      continue;
    }

    if (response.status >= 500 && idempotent && attempt < maxRetries) {
      attempt += 1;
      await response.body?.cancel().catch(() => {});
      await wait(backoffMs(attempt));
      continue;
    }

    return response;
  }
}
