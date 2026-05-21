import { NextResponse } from "next/server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logServerEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NOTION_API_VERSION = "2022-06-28";

/**
 * The model id stamped onto v2 LLM bridge rows. Set per deploy when the
 * drafter model changes; defaults to the current Claude Opus generation so
 * a fresh environment still produces a useful provenance value.
 */
const DEFAULT_DRAFTER_MODEL_ID = "claude-opus-4-7";

type SupabaseClient = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

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

type FinalSlateTier = "core" | "context";

const CORE_RANK_MIN = 1;
const CORE_RANK_MAX = 5;
const CONTEXT_RANK_MIN = 6;
const CONTEXT_RANK_MAX = 7;
const DISPLAY_RANK_MIN = 1;
const DISPLAY_RANK_MAX = 20;

/**
 * Strip the Notion-side markdown escapes that leak through the rich_text
 * plain_text view ("\[" → "[", "\]" → "]", "\$" → "$"). The editor uses
 * these to render `[A]` / `[R]` markers and `$NVDA` mentions; without
 * normalization they survive into signal_posts and appear as visible
 * backslashes in the rendered Card. The brief names \[ and \$ explicitly;
 * \] is the symmetric companion to \[ and is normalized in the same pass
 * so marker pairs come through unbroken.
 */
function normalizeNotionMarkdown(text: string): string {
  return text
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\\$/g, "$");
}

function getRichText(prop: NotionProperty | undefined): string {
  if (!prop) return "";
  if (prop.type === "title") return prop.title.map((t) => t.plain_text).join("") || "";
  if (prop.type === "rich_text") return prop.rich_text.map((t) => t.plain_text).join("") || "";
  return "";
}

function getRichTextNormalized(prop: NotionProperty | undefined): string {
  return normalizeNotionMarkdown(getRichText(prop));
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
  // Kill-flag enforcement lives entirely in this filter: only Status=approved
  // rows whose Pushed flag is still false make it past the query, so
  // rejected / held / killed / draft / needs_review rows are never even
  // candidates for the bridge. Re-running the bridge after writeback flips
  // Pushed=true is therefore a no-op for the same row.
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

/**
 * Find an unused display rank (1-20) for this briefing_date. The display rank
 * is the broad ranking surface; final_slate_rank (1-7) is the editor-curated
 * slot — see `getNextAvailableFinalSlateRank`. Both must be set on insert.
 */
async function getNextAvailableDisplayRank(
  db: SupabaseClient,
  briefingDate: string,
): Promise<number | null> {
  const result = await db
    .from("signal_posts")
    .select("rank")
    .eq("briefing_date", briefingDate);

  if (result.error) return null;

  const used = new Set(
    ((result.data ?? []) as Array<{ rank: number | null }>)
      .map((r) => r.rank)
      .filter((r): r is number => typeof r === "number"),
  );

  for (let rank = DISPLAY_RANK_MAX; rank >= DISPLAY_RANK_MIN; rank -= 1) {
    if (!used.has(rank)) return rank;
  }
  return null;
}

/**
 * Find an unused final_slate_rank within the requested tier. Core occupies
 * 1-5, Context occupies 6-7 — paired with final_slate_tier and enforced by
 * the signal_posts_final_slate_placement_check CHECK constraint.
 *
 * Returns null when the tier is full; the caller should fail closed.
 */
async function getNextAvailableFinalSlateRank(
  db: SupabaseClient,
  briefingDate: string,
  tier: FinalSlateTier,
): Promise<number | null> {
  const result = await db
    .from("signal_posts")
    .select("final_slate_rank")
    .eq("briefing_date", briefingDate)
    .not("final_slate_rank", "is", null);

  if (result.error) return null;

  const used = new Set(
    ((result.data ?? []) as Array<{ final_slate_rank: number | null }>)
      .map((r) => r.final_slate_rank)
      .filter((r): r is number => typeof r === "number"),
  );

  const [min, max] = tier === "core"
    ? [CORE_RANK_MIN, CORE_RANK_MAX]
    : [CONTEXT_RANK_MIN, CONTEXT_RANK_MAX];

  for (let rank = min; rank <= max; rank += 1) {
    if (!used.has(rank)) return rank;
  }
  return null;
}

type ExistingSignalPostRow = {
  id: string;
  rank: number | null;
  final_slate_rank: number | null;
  final_slate_tier: FinalSlateTier | null;
  witm_draft_generated_by: string | null;
  is_live: boolean | null;
};

/**
 * Decide the final_slate_rank to use on the OVERWRITE path (issue #265). The
 * editor's chosen tier wins (final_slate_tier in v2Payload), so the rank must
 * fall in that tier's range. If the existing row already has a rank in the
 * tier's range, reuse it (idempotent re-push). Otherwise allocate fresh via
 * the same helper INSERT uses. Returns null when the tier is exhausted.
 */
async function resolveFinalSlateRankForOverwrite(
  db: SupabaseClient,
  briefingDate: string,
  tier: FinalSlateTier,
  existingRank: number | null,
): Promise<number | null> {
  const [min, max] = tier === "core"
    ? [CORE_RANK_MIN, CORE_RANK_MAX]
    : [CONTEXT_RANK_MIN, CONTEXT_RANK_MAX];

  if (typeof existingRank === "number" && existingRank >= min && existingRank <= max) {
    return existingRank;
  }
  return await getNextAvailableFinalSlateRank(db, briefingDate, tier);
}

/**
 * Read the (briefing_date, source_url) row if any — the load step of the
 * select-then-decide upsert pattern. We need provenance + is_live to decide
 * whether the bridge is allowed to overwrite this row.
 */
async function loadExistingSignalPostRow(
  db: SupabaseClient,
  briefingDate: string,
  sourceUrl: string,
): Promise<ExistingSignalPostRow | null> {
  const result = await db
    .from("signal_posts")
    .select("id, rank, final_slate_rank, final_slate_tier, witm_draft_generated_by, is_live")
    .eq("briefing_date", briefingDate)
    .eq("source_url", sourceUrl)
    .maybeSingle();

  if (result.error || !result.data) return null;
  return result.data as ExistingSignalPostRow;
}

type PushRowStatus =
  | "inserted"
  | "overwrote_template"
  | "skipped_existing_v2"
  | "skipped_live"
  | "skipped_missing_source_url"
  | "skipped_missing_slot"
  | "no_rank_slot"
  | "failed";

type PushRowResult = {
  headline: string;
  notionPageId: string;
  supabaseId: string | null;
  status: PushRowStatus;
  error?: string;
};

type EditorialContentSource = "ai" | "human" | "ai+human" | null;

/**
 * Normalize the Notion `Editorial Source` select into the
 * signal_posts.editorial_content_source CHECK enum. Returns null when the
 * select is empty so the column stays nullable rather than carrying junk.
 */
function normalizeEditorialContentSource(value: string | null): EditorialContentSource {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === "ai" || lower === "human" || lower === "ai+human") return lower;
  return null;
}

async function pushApprovedRow(
  db: SupabaseClient,
  page: NotionPage,
  briefingDate: string,
  drafterModelId: string,
): Promise<PushRowResult> {
  const props = page.properties;
  const headline = getRichTextNormalized(props["Headline"]);

  try {
    // ---------- Read Notion props (with markdown normalization) ----------
    // Three-layer editorial content. Human override wins over AI draft.
    const witmHuman = getRichTextNormalized(props["The Signal (Human)"]);
    const witmAi    = getRichTextNormalized(props["The Signal (AI Draft)"]);
    const witm      = witmHuman || witmAi;
    const wltiHuman = getRichTextNormalized(props["Before This (Human)"]);
    const wltiAi    = getRichTextNormalized(props["Before This (AI Draft)"]);
    const witcHuman = getRichTextNormalized(props["The Ripple (Human)"]);
    const witcAi    = getRichTextNormalized(props["The Ripple (AI Draft)"]);
    const hookHuman = getRichTextNormalized(props["Hook (Human)"]);
    const hookAi    = getRichTextNormalized(props["Hook (AI Draft)"]);
    const hook      = hookHuman || hookAi;

    const editorialSource = normalizeEditorialContentSource(getSelect(props["Editorial Source"]));
    const sourceUrl = getUrl(props["Source URL"]);
    const sourceName = getRichTextNormalized(props["Source"]);
    const articleBody = getRichTextNormalized(props["Article Body"]);
    const category = getSelect(props["Category"]);
    const slotValue = getSelect(props["Slot"]);
    const newsletterCoOccurrence = getNumber(props["Newsletter Co-occurrence"]) ?? 0;

    // ---------- Validate the minimum required shape ----------
    if (!sourceUrl) {
      return {
        headline,
        notionPageId: page.id,
        supabaseId: null,
        status: "skipped_missing_source_url",
        error: "Notion row has no Source URL; cannot key signal_posts upsert.",
      };
    }
    if (slotValue !== "Core" && slotValue !== "Context") {
      return {
        headline,
        notionPageId: page.id,
        supabaseId: null,
        status: "skipped_missing_slot",
        error: `Notion row has Slot=${JSON.stringify(slotValue)}; expected "Core" or "Context".`,
      };
    }
    const finalSlateTier: FinalSlateTier = slotValue === "Core" ? "core" : "context";

    // ---------- Load existing row to decide insert vs overwrite vs skip ----------
    const existing = await loadExistingSignalPostRow(db, briefingDate, sourceUrl);

    // SKIP-LIVE: never clobber a live row. This shouldn't happen under the
    // normal flow (publish gate runs AFTER editorial review which runs AFTER
    // the bridge) but a hand-edited live row must not be overwritten by an
    // approved Notion re-push. Notion writeback is intentionally NOT called
    // here so the operator notices the inconsistency.
    if (existing?.is_live === true) {
      logServerEvent("warn", "Editorial push: skipped — existing row is live", {
        headline: headline.slice(0, 60),
        notionPageId: page.id,
        existingId: existing.id,
      });
      return {
        headline,
        notionPageId: page.id,
        supabaseId: existing.id,
        status: "skipped_live",
        error: "Refusing to overwrite a row that is already live. Investigate manually.",
      };
    }

    // SKIP-V2: re-push of a row the bridge already wrote (provenance='llm').
    // Writeback IS called so the Notion row's Pushed flag flips true,
    // preventing future re-attempts. The Supabase content is left untouched.
    if (existing?.witm_draft_generated_by === "llm") {
      await markNotionRowPushed(page.id, existing.id);
      logServerEvent("info", "Editorial push: skipped — v2 row already exists; flipped Notion writeback", {
        headline: headline.slice(0, 60),
        notionPageId: page.id,
        existingId: existing.id,
      });
      return {
        headline,
        notionPageId: page.id,
        supabaseId: existing.id,
        status: "skipped_existing_v2",
      };
    }

    // ---------- Build the v2 payload (shared between INSERT and UPDATE) ----------
    const now = new Date().toISOString();
    const v2Payload: Record<string, unknown> = {
      title: headline,
      source_name: sourceName || "",
      summary: articleBody || "",
      tags: category ? [category] : [],
      signal_score: null,
      // Hook → selection_reason. Falls back to a structured note when Notion's
      // Hook field is empty so the column stays non-NULL (CHECK constraint).
      selection_reason: hook || "Editorial queue push — approved via Notion workflow (Hook empty).",
      // Three editorial layers — AI draft fields plus the Human override
      // mirror columns. Empty strings stay empty so the public surface can
      // tell "not drafted" from "drafted to empty".
      ai_why_it_matters: witmAi || witm || "",
      edited_why_it_matters: witmHuman || null,
      published_why_it_matters: null,
      ai_what_led_to_it: wltiAi || null,
      human_what_led_to_it: wltiHuman || null,
      ai_what_it_connects_to: witcAi || null,
      human_what_it_connects_to: witcHuman || null,
      // Validation status carries the legacy auto-default until Task 6 lands
      // the 'not_run' enum value. If WITM is blank we explicitly require
      // human rewrite so the publish gate refuses to promote it.
      why_it_matters_validation_status: witm ? "passed" : "requires_human_rewrite",
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
      // Provenance stamps that distinguish v2 LLM bridge rows from the legacy
      // deterministic_template rows written by the daily cron (Task 3). The
      // legacy writer stamps witm_draft_generated_by='deterministic_template';
      // we stamp 'llm' so any post-deploy query can tell the two paths apart.
      witm_draft_generated_by: "llm",
      witm_draft_generated_at: now,
      witm_draft_model: drafterModelId,
      editorial_content_source: editorialSource,
      updated_at: now,
    };

    if (newsletterCoOccurrence > 0) {
      logServerEvent("info", "Editorial push: newsletter co-occurrence present (no signal_posts column)", {
        headline: headline.slice(0, 60),
        newsletterCoOccurrence,
      });
    }

    // ---------- Branch: OVERWRITE existing template/null-provenance row, or INSERT new ----------
    if (existing) {
      // Overwrite path. existing.witm_draft_generated_by is 'deterministic_template'
      // (the legacy cron's stamp) or NULL (pre-Task-3 historic rows). We
      // preserve the existing display rank (legacy's slot wins for the broad
      // 1-20 surface), but final_slate_rank MUST be allocated to pair with
      // the editor's chosen tier — the legacy writer historically leaves
      // final_slate_rank NULL, and the schema CHECK previously passed
      // tier-set-rank-null due to Postgres NULL three-valued logic
      // (issue #265). Resolution:
      //   - If the existing final_slate_rank is non-null AND already lives in
      //     the editor's tier range, keep it (re-push idempotency).
      //   - Otherwise allocate a fresh slot via the same helper as INSERT.
      //   - If the tier is full, fail closed with no_rank_slot.
      const finalSlateRankForOverwrite = await resolveFinalSlateRankForOverwrite(
        db,
        briefingDate,
        finalSlateTier,
        existing.final_slate_rank,
      );
      if (finalSlateRankForOverwrite === null) {
        return {
          headline,
          notionPageId: page.id,
          supabaseId: existing.id,
          status: "no_rank_slot",
          error: `Overwrite blocked: no available final_slate_rank for tier=${finalSlateTier} on briefing_date ${briefingDate}.`,
        };
      }
      const overwritePayload = {
        ...v2Payload,
        final_slate_rank: finalSlateRankForOverwrite,
      };
      const updateResult = await db
        .from("signal_posts")
        .update(overwritePayload)
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateResult.error || !updateResult.data) {
        throw new Error(
          `signal_posts overwrite failed: ${updateResult.error?.message ?? "no row returned"}`,
        );
      }

      const supabaseId = (updateResult.data as { id: string }).id;
      await markNotionRowPushed(page.id, supabaseId);

      logServerEvent("info", "Editorial push: overwrote legacy template row", {
        headline: headline.slice(0, 60),
        notionPageId: page.id,
        supabaseId,
        previousProvenance: existing.witm_draft_generated_by,
      });

      return {
        headline,
        notionPageId: page.id,
        supabaseId,
        status: "overwrote_template",
      };
    }

    // INSERT path — no existing row. Allocate a fresh display rank AND a
    // fresh final_slate_rank within the tier. Both are required: rank is
    // NOT NULL; final_slate_rank pairs with final_slate_tier via CHECK
    // constraint and is the operator-visible slot.
    const displayRank = await getNextAvailableDisplayRank(db, briefingDate);
    if (!displayRank) {
      return {
        headline,
        notionPageId: page.id,
        supabaseId: null,
        status: "no_rank_slot",
        error: `No available display rank (1-${DISPLAY_RANK_MAX}) for briefing_date ${briefingDate}.`,
      };
    }
    const finalSlateRank = await getNextAvailableFinalSlateRank(db, briefingDate, finalSlateTier);
    if (!finalSlateRank) {
      return {
        headline,
        notionPageId: page.id,
        supabaseId: null,
        status: "no_rank_slot",
        error: `No available final_slate_rank for tier=${finalSlateTier} on briefing_date ${briefingDate}.`,
      };
    }

    const insertResult = await db
      .from("signal_posts")
      .insert({
        ...v2Payload,
        briefing_date: briefingDate,
        source_url: sourceUrl,
        rank: displayRank,
        final_slate_rank: finalSlateRank,
        created_at: now,
      })
      .select("id")
      .single();

    if (insertResult.error || !insertResult.data) {
      throw new Error(
        `signal_posts insert failed: ${insertResult.error?.message ?? "no row returned"}`,
      );
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
  const drafterModelId =
    process.env.EDITORIAL_DRAFTER_MODEL_ID?.trim() || DEFAULT_DRAFTER_MODEL_ID;

  logServerEvent("info", "Editorial push: started", {
    route: "/api/editorial/push-approved",
    briefingDate,
    drafterModelId,
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
    const result = await pushApprovedRow(db, page, briefingDate, drafterModelId);
    rows.push(result);
  }

  const counts = rows.reduce<Record<PushRowStatus, number>>(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {
      inserted: 0,
      overwrote_template: 0,
      skipped_existing_v2: 0,
      skipped_live: 0,
      skipped_missing_source_url: 0,
      skipped_missing_slot: 0,
      no_rank_slot: 0,
      failed: 0,
    },
  );

  logServerEvent("info", "Editorial push: completed", {
    route: "/api/editorial/push-approved",
    briefingDate,
    drafterModelId,
    ...counts,
  });

  return NextResponse.json({
    success: true,
    briefing_date: briefingDate,
    counts,
    rows: rows.map((r) => ({
      headline: r.headline,
      supabase_id: r.supabaseId,
      status: r.status,
      error: r.error,
    })),
  });
}
