import { NextResponse } from "next/server";

import { runNewsletterIngestion } from "@/lib/newsletter-ingestion/runner";
import { logServerEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim() ?? "";

  return Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    logServerEvent("warn", "Unauthorized newsletter ingestion cron request rejected", {
      route: "/api/cron/newsletter-ingestion",
      hasCronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    });

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        summary: {
          message: "Unauthorized",
        },
      },
      { status: 401 },
    );
  }

  const result = await runNewsletterIngestion({
    writeCandidates: true,
  });

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
