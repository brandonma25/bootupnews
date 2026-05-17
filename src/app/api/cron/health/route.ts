import { NextResponse } from "next/server";

import { errorContext, logServerEvent } from "@/lib/observability";
import { writePipelineLogEntry, type PipelineLogStatus } from "@/lib/observability/pipeline-log";
import { getRequiredSourcesForPublicSurface } from "@/lib/source-manifest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NOTION_API_VERSION = "2022-06-28";
const EXPECTED_MIN_ROW_COUNT = 7;
const BRIEFING_DAY_BOUNDARY_HOUR_TAIPEI = 6;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const headerSecret = request.headers.get("x-cron-secret")?.trim() ?? "";
  if (headerSecret === cronSecret) return true;

  // Rollback escape hatch — matches the ingestion endpoint's contract.
  if (process.env.ALLOW_VERCEL_CRON_FALLBACK === "true") {
    const authHeader = request.headers.get("authorization")?.trim() ?? "";
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }

  return false;
}

/**
 * Resolve the briefing date this health check should assert against.
 *
 * Day boundary is 06:00 Taipei (UTC+8): before that, the previous day's
 * briefing is still the "today" the editor is reviewing. Calibrated against
 * the 10:15 UTC and 11:45 UTC ingestion runs (= 18:15 and 19:45 Taipei) —
 * by the time anyone runs the health check post-ingestion, we always want
 * the date of the *current* editorial day, which only rolls over once the
 * editor has had a full night and isn't actively reviewing yesterday's queue.
 */
function resolveBriefingDate(now: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hourString = get("hour");
  const hour = Number(hourString);

  if (hour >= BRIEFING_DAY_BOUNDARY_HOUR_TAIPEI) {
    return `${year}-${month}-${day}`;
  }
  // Roll back one day.
  const todayAtUtc = new Date(`${year}-${month}-${day}T00:00:00Z`);
  const yesterday = new Date(todayAtUtc.getTime() - 24 * 60 * 60 * 1000);
  const yYear = yesterday.getUTCFullYear();
  const yMonth = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
  const yDay = String(yesterday.getUTCDate()).padStart(2, "0");
  return `${yYear}-${yMonth}-${yDay}`;
}

type QueueRowSnapshot = {
  source: string | null;
};

async function queryQueueRowsForBriefingDate(
  notionDbId: string,
  token: string,
  briefingDate: string,
): Promise<QueueRowSnapshot[]> {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${notionDbId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      body: JSON.stringify({
        filter: {
          property: "Briefing Date",
          date: { equals: briefingDate },
        },
        // The expected count is 7; 50 is generous headroom and stays under
        // Notion's 100 default page_size cap.
        page_size: 50,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`Editorial queue query failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    results?: Array<{
      properties?: {
        Source?: {
          rich_text?: Array<{ plain_text?: string }>;
        };
      };
    }>;
  };

  return (data.results ?? []).map((row) => {
    const segments = row.properties?.Source?.rich_text ?? [];
    const text = segments.map((s) => s.plain_text ?? "").join("").trim();
    return { source: text.length > 0 ? text : null };
  });
}

function computeSourceHealth(rows: QueueRowSnapshot[]): {
  contributed: string[];
  expected: string[];
  missing: string[];
  distinctSourceCount: number;
} {
  const contributedSet = new Set<string>();
  for (const row of rows) {
    if (row.source) contributedSet.add(row.source);
  }
  const contributed = [...contributedSet].sort();

  let expected: string[] = [];
  try {
    expected = getRequiredSourcesForPublicSurface("public.home")
      .map((s) => s.name)
      .filter((name): name is string => typeof name === "string" && name.length > 0);
  } catch {
    // If the manifest cannot resolve, treat expected as empty — health check
    // will not warn on missing sources but will still fail on row-count.
    expected = [];
  }

  const contributedLower = new Set(contributed.map((s) => s.toLowerCase()));
  const missing = expected.filter((name) => {
    const lower = name.toLowerCase();
    // A source counts as "contributed" if its lowercased manifest name appears
    // anywhere in any contributed source string, or vice versa. This is a
    // forgiving match because Notion `Source` rows hold either source_name or
    // source_domain — names like "Reuters" and domains like "reuters.com" must
    // both be treated as the same source.
    for (const c of contributedLower) {
      if (c.includes(lower) || lower.includes(c)) return false;
    }
    return true;
  });

  return {
    contributed,
    expected,
    missing,
    distinctSourceCount: contributed.length,
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    logServerEvent("warn", "Unauthorized health-check request rejected", {
      route: "/api/cron/health",
      hasCronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    });
    return NextResponse.json(
      { status: "fail", reason: "Unauthorized" },
      { status: 401 },
    );
  }

  const now = new Date();
  const briefingDate = resolveBriefingDate(now);
  const notionDbId = process.env.NOTION_EDITORIAL_QUEUE_DB_ID?.trim();
  const notionToken = process.env.NOTION_TOKEN?.trim();

  if (!notionDbId || !notionToken) {
    const reason = !notionDbId
      ? "NOTION_EDITORIAL_QUEUE_DB_ID not configured"
      : "NOTION_TOKEN not configured";
    logServerEvent("error", "Health check cannot run", {
      route: "/api/cron/health",
      briefingDate,
      reason,
    });
    return NextResponse.json(
      {
        status: "fail",
        row_count: 0,
        expected_min: EXPECTED_MIN_ROW_COUNT,
        briefing_date: briefingDate,
        message: reason,
      },
      { status: 500 },
    );
  }

  let rows: QueueRowSnapshot[] = [];
  let queryError: string | null = null;
  try {
    rows = await queryQueueRowsForBriefingDate(notionDbId, notionToken, briefingDate);
  } catch (error) {
    queryError = error instanceof Error ? error.message : String(error);
    logServerEvent("error", "Health check Notion query failed", {
      route: "/api/cron/health",
      briefingDate,
      ...errorContext(error),
    });
  }

  const rowCount = rows.length;
  const sourceHealth = computeSourceHealth(rows);

  let status: PipelineLogStatus;
  let message: string;

  if (queryError) {
    status = "fail";
    message = `Notion query failed: ${queryError}`;
  } else if (rowCount < EXPECTED_MIN_ROW_COUNT) {
    status = "fail";
    message = `Editorial queue has ${rowCount} rows for ${briefingDate}; expected at least ${EXPECTED_MIN_ROW_COUNT}.`;
  } else if (sourceHealth.missing.length > 0) {
    status = "warn";
    message = `${rowCount} rows for ${briefingDate}, but expected sources missing: ${sourceHealth.missing.join(", ")}.`;
  } else {
    status = "ok";
    message = `${rowCount} rows for ${briefingDate}; all expected sources contributed.`;
  }

  // Pipeline Log write is best-effort — never blocks the response.
  const pipelineLogResult = await writePipelineLogEntry({
    runType: "health_check",
    status,
    rowCount,
    message,
    briefingDate,
    sourceHealth,
  });

  logServerEvent(status === "fail" ? "error" : "info", "Health check completed", {
    route: "/api/cron/health",
    briefingDate,
    rowCount,
    status,
    distinctSourceCount: sourceHealth.distinctSourceCount,
    missingSources: sourceHealth.missing,
    pipelineLogWritten: pipelineLogResult.written,
  });

  return NextResponse.json(
    {
      status,
      row_count: rowCount,
      expected_min: EXPECTED_MIN_ROW_COUNT,
      briefing_date: briefingDate,
      message,
      source_health: sourceHealth,
      pipeline_log_written: pipelineLogResult.written,
    },
    { status: status === "fail" ? 500 : 200 },
  );
}
