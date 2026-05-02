import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/admin-auth";
import { logServerEvent } from "@/lib/observability";
import { readMvpMeasurementSummary } from "@/lib/mvp-measurement-summary";
import {
  createSupabaseServiceRoleClient,
  safeGetUser,
} from "@/lib/supabase/server";

const ROUTE = "/api/internal/mvp-measurement/summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const { user } = await safeGetUser(ROUTE);

  if (!user) {
    return json(
      {
        ok: false,
        error: "admin_auth_required",
      },
      401,
    );
  }

  if (!isAdminUser(user)) {
    return json(
      {
        ok: false,
        error: "admin_access_required",
      },
      403,
    );
  }

  const client = createSupabaseServiceRoleClient();
  if (!client) {
    return json(
      {
        ok: false,
        error: "measurement_summary_unavailable",
      },
      503,
    );
  }

  const days = new URL(request.url).searchParams.get("days");

  try {
    return json(await readMvpMeasurementSummary(client, days), 200);
  } catch (error) {
    logServerEvent("warn", "MVP measurement summary read failed", {
      route: ROUTE,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    return json(
      {
        ok: false,
        error: "measurement_summary_query_failed",
      },
      502,
    );
  }
}
