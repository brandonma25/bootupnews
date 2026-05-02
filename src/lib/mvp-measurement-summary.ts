import type { MvpMeasurementEventName } from "@/lib/mvp-measurement";

export type MvpMeasurementSummaryRow = {
  event_name: MvpMeasurementEventName;
  visitor_id: string;
  session_id: string;
  occurred_at: string;
  route: string | null;
  metadata?: unknown;
};

export type MvpMeasurementSummary = {
  eventCount: number;
  uniqueVisitorCount: number;
  uniqueSessionCount: number;
  eventCountByDate: Record<string, number>;
  eventCountByEventName: Partial<Record<MvpMeasurementEventName, number>>;
  eventCountByRoute: Record<string, number>;
  day7Return: {
    denominator: number;
    numerator: number;
    rate: number | null;
  };
  depthEngagement: {
    strictFullExpansionSessions: number;
    proxyExpansionSessions: number;
    denominator: number;
    strictRate: number | null;
    proxyRate: number | null;
  };
  comprehension: {
    promptShownCount: number;
    answeredCount: number;
    agreeCount: number;
    agreementRate: number | null;
  };
  firstThreeSessionsExpansion: {
    denominator: number;
    numerator: number;
    rate: number | null;
  };
};

export type MvpMeasurementSummaryResult = {
  ok: true;
  windowDays: number;
  since: string;
  summary: MvpMeasurementSummary;
  limitations: {
    day7Retention: string;
    comprehensionPrompt: string;
    strictFullExpansion: string;
  };
};

type MvpMeasurementSummaryQueryResult = {
  data?: unknown[] | null;
  error?: {
    message: string;
  } | null;
};

type MvpMeasurementSummaryQueryClient = {
  from(table: "mvp_measurement_events"): {
    select(columns: string): {
      gte(column: "occurred_at", value: string): {
        order(
          column: "occurred_at",
          options: { ascending: boolean },
        ): {
          limit(count: number): PromiseLike<MvpMeasurementSummaryQueryResult>;
        };
      };
    };
  };
};

const DEPTH_PROXY_EVENTS = new Set<MvpMeasurementEventName>([
  "signal_full_expansion",
  "signal_full_expansion_proxy",
  "signal_details_click",
]);

const DEFAULT_SUMMARY_WINDOW_DAYS = 30;
const MAX_SUMMARY_WINDOW_DAYS = 90;
const SUMMARY_ROW_LIMIT = 10000;

export function normalizeMvpMeasurementSummaryWindowDays(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : DEFAULT_SUMMARY_WINDOW_DAYS;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SUMMARY_WINDOW_DAYS;
  }

  return Math.min(Math.floor(parsed), MAX_SUMMARY_WINDOW_DAYS);
}

function dateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function metadataResponse(row: MvpMeasurementSummaryRow) {
  if (!row.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) {
    return null;
  }

  const response = (row.metadata as Record<string, unknown>).response;
  return typeof response === "string" ? response.trim().toLowerCase() : null;
}

export function summarizeMvpMeasurementEvents(rows: MvpMeasurementSummaryRow[]): MvpMeasurementSummary {
  const eventCountByDate: Record<string, number> = {};
  const eventCountByEventName: Partial<Record<MvpMeasurementEventName, number>> = {};
  const eventCountByRoute: Record<string, number> = {};
  const visitorDates = new Map<string, Set<string>>();
  const sessionEvents = new Map<string, Set<MvpMeasurementEventName>>();
  const visitorSessions = new Map<string, Map<string, string>>();
  const visitors = new Set<string>();

  let promptShownCount = 0;
  let answeredCount = 0;
  let agreeCount = 0;

  rows.forEach((row) => {
    visitors.add(row.visitor_id);
    eventCountByEventName[row.event_name] = (eventCountByEventName[row.event_name] ?? 0) + 1;

    const rowDate = dateKey(row.occurred_at);
    if (rowDate) {
      eventCountByDate[rowDate] = (eventCountByDate[rowDate] ?? 0) + 1;
      if (!visitorDates.has(row.visitor_id)) {
        visitorDates.set(row.visitor_id, new Set());
      }
      visitorDates.get(row.visitor_id)?.add(rowDate);

      if (!visitorSessions.has(row.visitor_id)) {
        visitorSessions.set(row.visitor_id, new Map());
      }
      const sessionMap = visitorSessions.get(row.visitor_id);
      const existingSessionDate = sessionMap?.get(row.session_id);
      if (!existingSessionDate || rowDate < existingSessionDate) {
        sessionMap?.set(row.session_id, rowDate);
      }
    }

    const route = row.route ?? "unknown";
    eventCountByRoute[route] = (eventCountByRoute[route] ?? 0) + 1;

    if (!sessionEvents.has(row.session_id)) {
      sessionEvents.set(row.session_id, new Set());
    }
    sessionEvents.get(row.session_id)?.add(row.event_name);

    if (row.event_name === "comprehension_prompt_shown") {
      promptShownCount += 1;
    }

    if (row.event_name === "comprehension_prompt_answered") {
      answeredCount += 1;
      if (metadataResponse(row) === "agree") {
        agreeCount += 1;
      }
    }
  });

  let day7Denominator = 0;
  let day7Numerator = 0;
  visitorDates.forEach((dates) => {
    const orderedDates = [...dates].sort();
    const firstDate = orderedDates[0];
    if (!firstDate) {
      return;
    }

    day7Denominator += 1;
    if (dates.has(addDays(firstDate, 7))) {
      day7Numerator += 1;
    }
  });

  let strictFullExpansionSessions = 0;
  let proxyExpansionSessions = 0;
  sessionEvents.forEach((events) => {
    if (events.has("signal_full_expansion")) {
      strictFullExpansionSessions += 1;
    }

    if ([...events].some((eventName) => DEPTH_PROXY_EVENTS.has(eventName))) {
      proxyExpansionSessions += 1;
    }
  });

  let firstThreeDenominator = 0;
  let firstThreeNumerator = 0;
  visitorSessions.forEach((sessionMap) => {
    const firstThreeSessionIds = [...sessionMap.entries()]
      .sort((left, right) => left[1].localeCompare(right[1]))
      .slice(0, 3)
      .map(([sessionId]) => sessionId);

    if (firstThreeSessionIds.length === 0) {
      return;
    }

    firstThreeDenominator += 1;
    if (
      firstThreeSessionIds.some((sessionId) =>
        [...(sessionEvents.get(sessionId) ?? [])].some((eventName) => DEPTH_PROXY_EVENTS.has(eventName)),
      )
    ) {
      firstThreeNumerator += 1;
    }
  });

  return {
    eventCount: rows.length,
    uniqueVisitorCount: visitors.size,
    uniqueSessionCount: sessionEvents.size,
    eventCountByDate,
    eventCountByEventName,
    eventCountByRoute,
    day7Return: {
      denominator: day7Denominator,
      numerator: day7Numerator,
      rate: rate(day7Numerator, day7Denominator),
    },
    depthEngagement: {
      strictFullExpansionSessions,
      proxyExpansionSessions,
      denominator: sessionEvents.size,
      strictRate: rate(strictFullExpansionSessions, sessionEvents.size),
      proxyRate: rate(proxyExpansionSessions, sessionEvents.size),
    },
    comprehension: {
      promptShownCount,
      answeredCount,
      agreeCount,
      agreementRate: rate(agreeCount, answeredCount),
    },
    firstThreeSessionsExpansion: {
      denominator: firstThreeDenominator,
      numerator: firstThreeNumerator,
      rate: rate(firstThreeNumerator, firstThreeDenominator),
    },
  };
}

export async function readMvpMeasurementSummary(
  client: MvpMeasurementSummaryQueryClient,
  inputDays?: unknown,
): Promise<MvpMeasurementSummaryResult> {
  const windowDays = normalizeMvpMeasurementSummaryWindowDays(inputDays);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const result = await client
    .from("mvp_measurement_events")
    .select("event_name, visitor_id, session_id, occurred_at, route, metadata")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: true })
    .limit(SUMMARY_ROW_LIMIT);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    ok: true,
    windowDays,
    since,
    summary: summarizeMvpMeasurementEvents(
      (result.data ?? []) as unknown as MvpMeasurementSummaryRow[],
    ),
    limitations: {
      day7Retention: "Requires seven elapsed calendar days and returning visitor events; absence of data is not a failure.",
      comprehensionPrompt: "Visible comprehension prompt UI remains deferred; prompt events summarize when explicitly captured.",
      strictFullExpansion: "Current UI can report strict full-expansion events when present and depth proxies separately.",
    },
  };
}
