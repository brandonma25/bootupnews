import { NextResponse } from "next/server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logServerEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NOTION_API_VERSION = "2022-06-28";

type NotionPage = {
  id: string;
  properties: Record<string, NotionProperty>;
};

type NotionProperty =
  | { type: "title"; title: Array<{ plain_text: string }> }
  | { type: "rich_text"; rich_text: Array<{ plain_text: string }> }
  | { type: "select"; select: { name: string } | null }
  | { type: "url"; url: string | null }
  | { type: "number"; number: number | null }
  | { type: "date"; date: { start: string } | null }
  | { type: "checkbox"; checkbox: boolean };

function getRichText(prop: NotionProperty | undefined): string {
  if (!prop) return "";
  if (prop.type === "title") return prop.title.map((t) => t.plain_text).join("") || "";
  if (prop.type === "rich_text") return prop.rich_text.map((t) => t.plain_text).join("") || "";
  return "";
}

function getSelect(prop: NotionProperty | undefined): string | null {
  if (!prop || prop.type !== "select") return null;
  return prop.select?.name ?? null;
}

function getUrl(prop: NotionProperty | undefined): string | null {
  if (!prop || prop.type !== "url") return null;
  return prop.url ?? null;
}

function getNumber(prop: NotionProperty | undefined): number | null {
  if (!prop || prop.type !== "number") return null;
  return prop.number ?? null;
}

function todayTaipei(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

async function notionRequest(
  path: string,
  method: string,
  body?: unknown,
): Promise<unknown> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) throw new Error("NOTION_TOKEN is not configured.");

  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "(no body)");
    throw new Error(`Notion API ${method} ${path} failed (${response.status}): ${text.slice(0, 500)}`);
  }

  return response.json();
}

async function queryNotionForApprovedRows(
  dbId: string,
  briefingDate: string,
): Promise<NotionPage[]> {
  const result = (await notionRequest(`/databases/${dbId}/query`, "POST", {
    filter: {
      and: [
        { property: "Status", select: { equals: "approved" } },
        { property: "Briefing Date", date: { equals: briefingDate } },
        { property: "Pushed to Supabase", checkbox: { equals: false } },
      ],
    },
  })) as { results: NotionPage[] };

  return result.results ?? [];
}

async function markNotionRowPushed(
  pageId: string,
  supabaseRowId: string,
): Promise<void> {
  await notionRequest(`/pages/${pageId}`, "PATCH", {
    properties: {
      "Pushed to Supabase": { checkbox: true },
      "Supabase Row ID": {
        rich_text: [{ text: { content: supabaseRowId } }],
      },
    },
  });
}

async function getNextAvailableRank(
  db: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
  briefingDate: string,
): Promise<number | null> {
  const result = await db
    .from("signal_posts")
    .select("rank")
    .eq("briefing_date", briefingDate);

  if (result.error) return null;

  const usedRanks = new Set(
    ((result.data ?? []) as Array<{ rank: number | null }>)
      .map((r) => r.rank)
      .filter((r): r is number => typeof r === "number"),
  );

  for (let rank = 20; rank >= 1; rank -= 1) {
    if (!usedRanks.has(rank)) return rank;
  }

  return null;
}

type PushRowResult = {
  headline: string;
  notionPageId: string;
  supabaseId: string | null;
  status: "inserted" | "failed";
  error?: string;
};

async function pushApprovedRow(
  db: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
  page: NotionPage,
  briefingDate: string,
): Promise<PushRowResult> {
  const props = page.properties;
  const headline = getRichText(props["Headline"]);

  try {
    const rank = await getNextAvailableRank(db, briefingDate);

    if (!rank) {
      return {
        headline,
        notionPageId: page.id,
        supabaseId: null,
        status: "failed",
        error: "No available rank slots for briefing date.",
      };
    }

    const slotValue = getSelect(props["Slot"]);
    const finalSlateTier = slotValue === "Core" ? "core" : "context";
    const category = getSelect(props["Category"]);
    // WITM: prefer human-edited; fall back to AI draft
    const witmHuman = getRichText(props["WITM (Human)"]);
    const witmAi    = getRichText(props["WITM (AI Draft)"]);
    const witm      = witmHuman || witmAi;
    // WITC + WLTI: separate AI draft and human columns → signal_posts
    const witcAi    = getRichText(props["WITC (AI Draft)"]);
    const witcHuman = getRichText(props["WITC (Human)"]);
    const wltiAi    = getRichText(props["WLTI (AI Draft)"]);
    const wltiHuman = getRichText(props["WLTI (Human)"]);
    const editorialSource = getSelect(props["Editorial Source"]);
    const sourceUrl = getUrl(props["Source URL"]);
    const source = getRichText(props["Source"]);
    const articleBody = getRichText(props["Article Body"]);
    const newsletterCoOccurrence = getNumber(props["Newsletter Co-occurrence"]) ?? 0;

    const now = new Date().toISOString();

    // Core insert — columns verified against signal_posts schema
    const insertPayload: Record<string, unknown> = {
      briefing_date: briefingDate,
      rank,
      title: headline,
      source_name: source || "",
      source_url: sourceUrl || "",
      summary: articleBody || "",
      tags: category ? [category] : [],
      signal_score: null,
      selection_reason: "Editorial queue push — approved via Notion workflow.",
      // WITM — write AI draft to ai_why_it_matters; human override to edited_why_it_matters
      ai_why_it_matters: witmAi || witm || "",
      edited_why_it_matters: witmHuman || null,
      published_why_it_matters: null,
      why_it_matters_validation_status: witm
        ? "passed"
        : "requires_human_rewrite",
      why_it_matters_validation_failures: witm ? [] : ["incomplete_sentence"],
      why_it_matters_validation_details: witm
        ? []
        : ["BM must complete why-it-matters before publication."],
      why_it_matters_validated_at: null,
      editorial_status: "needs_review",
      final_slate_tier: finalSlateTier,
      editorial_decision: "pending_review",
      decision_note: null,
      rejected_reason: null,
      held_reason: null,
      replacement_of_row_id: null,
      reviewed_by: null,
      reviewed_at: null,
      edited_by: null,
      edited_at: null,
      approved_by: null,
      approved_at: null,
      published_at: null,
      is_live: false,
      context_material: articleBody || null,
      source_cluster_id: null,
      witm_draft_generated_by: null,
      witm_draft_generated_at: null,
      witm_draft_model: null,
      // WITC + WLTI provenance columns (new)
      ai_what_it_connects_to: witcAi || null,
      human_what_it_connects_to: witcHuman || null,
      ai_what_led_to_it: wltiAi || null,
      human_what_led_to_it: wltiHuman || null,
      editorial_content_source: editorialSource?.toLowerCase() || null,
      created_at: now,
      updated_at: now,
    };

    if (newsletterCoOccurrence > 0) {
      logServerEvent("info", "Editorial push: newsletter co-occurrence present (no signal_posts column)", {
        headline: headline.slice(0, 60),
        newsletterCoOccurrence,
      });
    }

    const insertResult = await db
      .from("signal_posts")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertResult.error) {
      throw new Error(`signal_posts insert failed: ${insertResult.error.message}`);
    }

    const supabaseId = (insertResult.data as { id: string }).id;

    await markNotionRowPushed(page.id, supabaseId);

    return {
      headline,
      notionPageId: page.id,
      supabaseId,
      status: "inserted",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logServerEvent("error", "Editorial push: row insert failed", {
      headline: headline.slice(0, 60),
      notionPageId: page.id,
      error: message,
    });

    return {
      headline,
      notionPageId: page.id,
      supabaseId: null,
      status: "failed",
      error: message,
    };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provided = url.searchParams.get("token")?.trim();
  const expected = process.env.EDITORIAL_PUSH_SECRET?.trim();

  if (!expected || provided !== expected) {
    logServerEvent("warn", "Editorial push: unauthorized request rejected", {
      route: "/api/editorial/push-approved",
      hasSecret: Boolean(expected),
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notionDbId = process.env.NOTION_EDITORIAL_QUEUE_DB_ID?.trim();
  if (!notionDbId) {
    return NextResponse.json({ error: "NOTION_EDITORIAL_QUEUE_DB_ID is not configured." }, { status: 500 });
  }

  const db = createSupabaseServiceRoleClient();
  if (!db) {
    return NextResponse.json({ error: "Supabase service role client is not configured." }, { status: 500 });
  }

  const briefingDate = todayTaipei(new Date());

  logServerEvent("info", "Editorial push: started", {
    route: "/api/editorial/push-approved",
    briefingDate,
  });

  let approvedPages: NotionPage[];
  try {
    approvedPages = await queryNotionForApprovedRows(notionDbId, briefingDate);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logServerEvent("error", "Editorial push: Notion query failed", {
      route: "/api/editorial/push-approved",
      error: message,
    });
    return NextResponse.json({ error: `Notion query failed: ${message}` }, { status: 500 });
  }

  const rows: PushRowResult[] = [];

  for (const page of approvedPages) {
    const result = await pushApprovedRow(db, page, briefingDate);
    rows.push(result);
  }

  const pushed = rows.filter((r) => r.status === "inserted").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  logServerEvent("info", "Editorial push: completed", {
    route: "/api/editorial/push-approved",
    briefingDate,
    pushed,
    failed,
  });

  return NextResponse.json({
    success: true,
    briefing_date: briefingDate,
    pushed,
    failed,
    rows: rows.map((r) => ({
      headline: r.headline,
      supabase_id: r.supabaseId,
      status: r.status,
      error: r.error,
    })),
  });
}
