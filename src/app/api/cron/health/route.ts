import { NextResponse } from "next/server";

import { logServerEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NOTION_API_VERSION = "2022-06-28";
const EXPECTED_MIN_ROWS = 7;

// Hard ceiling on the Notion query so this endpoint never hangs. The endpoint
// must complete in well under 5s (used by cron-job.org's monitoring) — if
// Notion isn't responding, surface that as a fail rather than block.
const NOTION_QUERY_TIMEOUT_MS = 3000;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim() ?? "";
  return Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
}

/**
 * Compute today's date in Asia/Taipei (UTC+8). The editorial day boundary is
 * midnight Taipei: at 23:59 Taipei we return today's date; at 00:05 Taipei we
 * return the new date. We use a fixed UTC+8 offset rather than a timezone
 * library because Taipei has no DST.
 */
function taipeiToday(now: Date = new Date()): string {
  const taipeiMs = now.getTime() + 8 * 60 * 60 * 1000;
  return new Date(taipeiMs).toISOString().slice(0, 10);
}

/**
 * Format current time as "HH:MM UTC+8" using Taipei offset.
 */
function taipeiTimeLabel(now: Date = new Date()): string {
  const taipeiMs = now.getTime() + 8 * 60 * 60 * 1000;
  const hhmm = new Date(taipeiMs).toISOString().slice(11, 16);
  return `${hhmm} UTC+8`;
}

type PipelineLogPayload = {
  briefingDate: string;
  status: "ok" | "warn" | "fail";
  rowCount: number;
  message: string;
};

/**
 * Write a Pipeline Log row to Notion if NOTION_PIPELINE_LOG_DB_ID is set.
 * Graceful no-op when the env var is missing OR when the write fails — the
 * health endpoint must never let observability writes break the response.
 */
async function writePipelineLog(payload: PipelineLogPayload): Promise<void> {
  const dbId = process.env.NOTION_PIPELINE_LOG_DB_ID?.trim();
  const token = process.env.NOTION_TOKEN?.trim();
  if (!dbId || !token) return;

  try {
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          Name: {
            title: [{ text: { content: new Date().toISOString() } }],
          },
          "Run Type": { select: { name: "health_check" } },
          Status: { select: { name: payload.status } },
          "Row Count": { number: payload.rowCount },
          Message: {
            rich_text: [{ text: { content: payload.message.slice(0, 2000) } }],
          },
          "Briefing Date": { date: { start: payload.briefingDate } },
        },
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "(no body)");
      logServerEvent("warn", "Health: Pipeline Log write returned non-OK", {
        status: response.status,
        body: body.slice(0, 300),
      });
    }
  } catch (error) {
    logServerEvent("warn", "Health: Pipeline Log write failed; ignoring", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Query the Editorial Queue for the count of rows on a given Taipei date.
 * Hard timeout via AbortController so a slow Notion never hangs the endpoint.
 * Returns -1 to signal a query failure (distinguishable from 0).
 */
async function countEditorialQueueRows(briefingDate: string): Promise<{
  count: number;
  error: string | null;
}> {
  const dbId = process.env.NOTION_EDITORIAL_QUEUE_DB_ID?.trim();
  const token = process.env.NOTION_TOKEN?.trim();
  if (!dbId) return { count: -1, error: "NOTION_EDITORIAL_QUEUE_DB_ID not set" };
  if (!token) return { count: -1, error: "NOTION_TOKEN not set" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NOTION_QUERY_TIMEOUT_MS);

  try {
    let total = 0;
    let cursor: string | undefined;

    do {
      const body: Record<string, unknown> = {
        filter: { property: "Briefing Date", date: { equals: briefingDate } },
        page_size: 100,
      };
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_API_VERSION,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "(no body)");
        return { count: -1, error: `Notion ${response.status}: ${text.slice(0, 200)}` };
      }
      const json = (await response.json()) as {
        results?: unknown[];
        has_more?: boolean;
        next_cursor?: string | null;
      };
      total += (json.results ?? []).length;
      cursor = json.has_more && json.next_cursor ? json.next_cursor : undefined;
    } while (cursor);

    return { count: total, error: null };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { count: -1, error: `Notion query exceeded ${NOTION_QUERY_TIMEOUT_MS}ms timeout` };
    }
    return { count: -1, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    logServerEvent("warn", "Unauthorized health check request rejected", {
      route: "/api/cron/health",
      hasCronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    });
    return NextResponse.json({ status: "fail", reason: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const briefingDate = taipeiToday(now);
  const taipeiTime = taipeiTimeLabel(now);

  const { count, error } = await countEditorialQueueRows(briefingDate);

  // Query failure surfaces as fail. The caller (cron-job.org) needs to know
  // the health check itself couldn't get a number, separately from
  // "no rows were written today".
  if (count < 0) {
    const message = `Health check could not query Notion: ${error}`;
    logServerEvent("error", "Health: Notion query failed", {
      briefingDate,
      error,
    });
    await writePipelineLog({ briefingDate, status: "fail", rowCount: 0, message });
    return NextResponse.json(
      {
        status: "fail",
        row_count: 0,
        expected_min: EXPECTED_MIN_ROWS,
        briefing_date: briefingDate,
        taipei_time: taipeiTime,
        error,
      },
      { status: 500 },
    );
  }

  // Status logic:
  //   row_count == 0  -> fail  -> HTTP 500 (cron-job.org alerts)
  //   1 <= count < 7  -> warn  -> HTTP 200 (partial run; editorial can proceed)
  //   count >= 7      -> ok    -> HTTP 200
  // The warn vs fail split is intentional: a partial run still lets BM draft
  // the rows that arrived. Only true zero means nothing happened.
  let status: "ok" | "warn" | "fail";
  let httpStatus: number;
  if (count === 0) {
    status = "fail";
    httpStatus = 500;
  } else if (count < EXPECTED_MIN_ROWS) {
    status = "warn";
    httpStatus = 200;
  } else {
    status = "ok";
    httpStatus = 200;
  }

  const message =
    status === "ok"
      ? `Editorial Queue has ${count} rows for ${briefingDate}.`
      : status === "warn"
        ? `Editorial Queue has ${count}/${EXPECTED_MIN_ROWS} rows for ${briefingDate} (partial).`
        : `Editorial Queue has zero rows for ${briefingDate}.`;

  logServerEvent("info", "Health check completed", {
    briefingDate,
    status,
    rowCount: count,
  });

  // Pipeline Log write is graceful; failure does not affect the response.
  await writePipelineLog({ briefingDate, status, rowCount: count, message });

  return NextResponse.json(
    {
      status,
      row_count: count,
      expected_min: EXPECTED_MIN_ROWS,
      briefing_date: briefingDate,
      taipei_time: taipeiTime,
    },
    { status: httpStatus },
  );
}
