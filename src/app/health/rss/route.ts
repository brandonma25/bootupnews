import { NextResponse } from "next/server";

import {
  captureRssFailure,
  captureRssHealthFailureIfNeeded,
  getRssHealthSnapshot,
} from "@/lib/observability/rss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SignalPostHealthRow = {
  created_at: string | null;
  published_at: string | null;
};

export async function GET() {
  const persisted = await loadPersistedRssFreshness();
  const snapshot = getRssHealthSnapshot({
    persistedLastSuccessfulFetchAt: persisted.lastSuccessfulFetchAt,
    persistedFailure: persisted.failed,
  });

  captureRssHealthFailureIfNeeded(snapshot);

  return NextResponse.json(
    {
      status: snapshot.status,
      rssBootOk: snapshot.rssBootOk,
      lastSuccessfulFetchAt: snapshot.lastSuccessfulFetchAt,
      staleFeedsCount: snapshot.staleFeedsCount,
      failedFeedsCount: snapshot.failedFeedsCount,
      criticalFailure: snapshot.criticalFailure,
      failures: snapshot.failures,
    },
    {
      status: snapshot.status === "failed" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function loadPersistedRssFreshness() {
  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return {
      lastSuccessfulFetchAt: null,
      failed: false,
    };
  }

  const result = await supabase
    .from("signal_posts")
    .select("created_at, published_at")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(20);

  if (result.error) {
    captureRssFailure(new Error(result.error.message), {
      failureType: "rss_cache_read_failed",
      phase: "healthcheck",
      level: "error",
      message: "RSS health endpoint could not read persisted signal post freshness.",
    });

    return {
      lastSuccessfulFetchAt: null,
      failed: true,
    };
  }

  const rows = ((result.data ?? []) as SignalPostHealthRow[]);
  const lastSuccessfulFetchAt = rows
    .flatMap((row) => [row.created_at, row.published_at])
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;

  return {
    lastSuccessfulFetchAt,
    failed: false,
  };
}
