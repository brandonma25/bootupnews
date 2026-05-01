import { NextResponse } from "next/server";

import { logServerEvent } from "@/lib/observability";
import { validateMvpMeasurementEvent } from "@/lib/mvp-measurement";
import {
  createSupabaseServiceRoleClient,
  safeGetUser,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const validation = validateMvpMeasurementEvent(body);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: validation.error,
      },
      { status: 400 },
    );
  }

  const client = createSupabaseServiceRoleClient();
  if (!client) {
    return NextResponse.json(
      {
        ok: true,
        stored: false,
        reason: "measurement_storage_unavailable",
      },
      { status: 202 },
    );
  }

  let userId: string | null = null;
  try {
    const authState = await safeGetUser("/api/mvp-measurement/events");
    userId = authState.user?.id ?? null;
  } catch {
    userId = null;
  }

  const event = validation.value;
  const insertResult = await client.from("mvp_measurement_events").insert({
    event_name: event.eventName,
    visitor_id: event.visitorId,
    session_id: event.sessionId,
    user_id: userId,
    route: event.route,
    surface: event.surface,
    signal_post_id: event.signalPostId,
    signal_slug: event.signalSlug,
    signal_rank: event.signalRank,
    briefing_date: event.briefingDate,
    published_slate_id: event.publishedSlateId,
    metadata: event.metadata ?? {},
  });

  if (insertResult.error) {
    logServerEvent("warn", "MVP measurement event storage failed", {
      route: "/api/mvp-measurement/events",
      eventName: event.eventName,
      errorMessage: insertResult.error.message,
    });

    return NextResponse.json(
      {
        ok: true,
        stored: false,
        reason: "measurement_insert_failed",
      },
      { status: 202 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      stored: true,
    },
    { status: 202 },
  );
}
