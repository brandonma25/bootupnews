import { NextResponse } from "next/server";

import { runDailyNewsCron, type DailyNewsCronRunResult } from "@/lib/cron/fetch-news";
import { runNewsletterIngestion, type NewsletterIngestionRunResult } from "@/lib/newsletter-ingestion/runner";
import { errorContext, logServerEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EditorialInputTaskName = "rss" | "newsletter";

type EditorialInputTaskResult = {
  success: boolean;
  timestamp: string | null;
  summary: DailyNewsCronRunResult["summary"] | NewsletterIngestionRunResult["summary"] | null;
};

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim() ?? "";

  return Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
}

async function runTask<T extends DailyNewsCronRunResult | NewsletterIngestionRunResult>(
  name: EditorialInputTaskName,
  task: () => Promise<T>,
): Promise<EditorialInputTaskResult> {
  try {
    const result = await task();

    return {
      success: result.success,
      timestamp: result.timestamp,
      summary: result.summary,
    };
  } catch (error) {
    logServerEvent("error", "Combined editorial input cron task failed before completion", {
      route: "/api/cron/fetch-editorial-inputs",
      task: name,
      ...errorContext(error),
    });

    return {
      success: false,
      timestamp: new Date().toISOString(),
      summary: {
        message: `${name} task failed before completion.`,
      } as EditorialInputTaskResult["summary"],
    };
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    logServerEvent("warn", "Unauthorized combined editorial input cron request rejected", {
      route: "/api/cron/fetch-editorial-inputs",
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

  logServerEvent("info", "Combined editorial input cron started", {
    route: "/api/cron/fetch-editorial-inputs",
  });

  const rss = await runTask("rss", () => runDailyNewsCron());
  const newsletter = await runTask("newsletter", () =>
    runNewsletterIngestion({
      writeCandidates: true,
    }),
  );
  const success = rss.success && newsletter.success;
  const timestamp = new Date().toISOString();

  logServerEvent(success ? "info" : "error", "Combined editorial input cron completed", {
    route: "/api/cron/fetch-editorial-inputs",
    rssSuccess: rss.success,
    newsletterSuccess: newsletter.success,
  });

  return NextResponse.json(
    {
      success,
      timestamp,
      summary: {
        message: success
          ? "Combined editorial input cron completed."
          : "Combined editorial input cron completed with one or more failures.",
        rss,
        newsletter,
      },
    },
    { status: success ? 200 : 500 },
  );
}
