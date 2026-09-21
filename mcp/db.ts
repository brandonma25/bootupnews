import { createClient } from "@supabase/supabase-js";

/**
 * Read-only Supabase access for the editorial MCP server.
 *
 * Read-only is enforced three ways:
 *  1. Only `select` is exposed — no insert/update/upsert/delete/rpc handle.
 *  2. Only allowlisted tables can be named.
 *  3. The HTTP layer refuses every non-GET/HEAD request, so even a stray
 *     mutation (or a POST-based RPC) fails before it leaves the process.
 */

export const READABLE_TABLES = [
  "signal_posts",
  "pipeline_article_candidates",
  "newsletter_story_extractions",
  "newsletter_emails",
] as const;

export type ReadableTable = (typeof READABLE_TABLES)[number];

const READ_METHODS = new Set(["GET", "HEAD"]);

export function readOnlyFetch(baseFetch: typeof fetch = fetch): typeof fetch {
  return (input, init) => {
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    if (!READ_METHODS.has(method)) {
      return Promise.reject(
        new Error(`editorial MCP is read-only: blocked ${method} request`),
      );
    }
    return baseFetch(input, init);
  };
}

function makeReader(url: string, serviceRoleKey: string) {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: readOnlyFetch() },
  });

  return {
    select(table: ReadableTable, columns: string) {
      if (!READABLE_TABLES.includes(table)) {
        throw new Error(`editorial MCP: table "${table}" is not readable`);
      }
      return client.from(table).select(columns);
    },
  };
}

export type ReadOnlyDb = ReturnType<typeof makeReader>;

export function createReadOnlyDb(env: NodeJS.ProcessEnv = process.env): ReadOnlyDb {
  // The app stores the URL as NEXT_PUBLIC_SUPABASE_URL; accept either name.
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "editorial MCP: set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return makeReader(url, key);
}
