import type { ReadOnlyDb } from "./db";

/**
 * Editorial read tools. Built against the live schema (inspected 2026-09-21):
 *
 *  signal_posts — one row per candidate per briefing_date.
 *    editorial_decision: pending_review | approved | draft_edited | held |
 *                        removed_from_slate | rejected
 *      "Folded" is NOT a decision value: a fold is stored as
 *      removed_from_slate with a decision_note starting "Folded …".
 *    why_it_matters_validation_status: passed | requires_human_rewrite
 *      (the gate only validates why_it_matters — the Signal field)
 *    final_slate_tier: core | context; final_slate_rank 1-5 core, 6-7 context
 *    published_why_it_matters / published_what_led_to_it /
 *      published_what_it_connects_to = Signal / Before This / Ripple
 *  pipeline_article_candidates — RSS ingestion + scoring features, joined by
 *    canonical_url = signal_posts.source_url (no FK).
 *  newsletter_story_extractions (+ newsletter_emails) — newsletter ingestion,
 *    joined by signal_post_id.
 */

type Row = Record<string, unknown>;

const PUBLIC_DECISIONS = new Set([null, "approved", "draft_edited"]);
const FOLD_NOTE = /^\s*folded?\b/i;
const SIGNAL_FIELD = "why_it_matters (Signal)";

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Briefing dates are Asia/Taipei calendar days (see src/lib/cron).
export function taipeiToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function rows(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  return (data ?? []) as Row[];
}

function publicRank(row: Row): number | null {
  for (const r of [row.final_slate_rank, row.rank]) {
    if (typeof r === "number" && r >= 1 && r <= 7) return r;
  }
  return null;
}

function cardType(row: Row, rank: number): "Core" | "Context" {
  if (row.final_slate_tier === "context") return "Context";
  if (row.final_slate_tier === "core") return "Core";
  return rank <= 5 ? "Core" : "Context";
}

// Mirrors the public homepage rule in src/lib/signals-editorial.ts
// (selectPublishedEditorialWhyItMatters + getPublicSlateRank).
function isPublicCard(row: Row): boolean {
  return (
    row.editorial_status === "published" &&
    PUBLIC_DECISIONS.has((row.editorial_decision as string | null) ?? null) &&
    row.why_it_matters_validation_status !== "requires_human_rewrite" &&
    Boolean(text(row.published_why_it_matters)) &&
    publicRank(row) !== null
  );
}

function tally(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

// ---------------------------------------------------------------- held_stories

export async function heldStories(
  db: ReadOnlyDb,
  input: { days?: number; end_date?: string },
) {
  const days = input.days ?? 7;
  const end = input.end_date ?? taipeiToday();
  const start = shiftDate(end, -(days - 1));

  const data = await rows(
    db
      .select(
        "signal_posts",
        "id, briefing_date, rank, title, source_name, signal_score, why_it_matters_validation_status, editorial_decision, decision_note, held_reason",
      )
      .gte("briefing_date", start)
      .lte("briefing_date", end)
      .in("editorial_decision", ["held", "removed_from_slate"])
      .order("briefing_date", { ascending: false })
      .order("rank", { ascending: true }),
  );

  const stories = data
    .map((r) => {
      const note = text(r.decision_note) ?? text(r.held_reason);
      const decision =
        r.editorial_decision === "held"
          ? "held"
          : note && FOLD_NOTE.test(note)
            ? "folded"
            : null;
      return decision
        ? {
            id: r.id as string,
            date: r.briefing_date as string,
            title: r.title as string,
            source: r.source_name as string,
            score: num(r.signal_score),
            gate_status: r.why_it_matters_validation_status as string,
            decision,
            decision_note: note,
          }
        : null;
    })
    .filter((s) => s !== null);

  const held = stories.filter((s) => s.decision === "held").length;
  const conflicts = stories.filter((s) => s.decision_note?.startsWith("CONFLICT NOTE")).length;

  return {
    summary:
      `${stories.length} held/folded candidates ${start}→${end}: ${held} held, ${stories.length - held} folded` +
      (conflicts ? `; ${conflicts} carry a CONFLICT NOTE.` : "."),
    window: { start, end, days },
    stories,
  };
}

// ----------------------------------------------------------------------- brief

export async function brief(db: ReadOnlyDb, input: { date: string }) {
  const data = await rows(
    db
      .select(
        "signal_posts",
        "id, rank, final_slate_rank, final_slate_tier, title, source_name, source_url, editorial_status, editorial_decision, why_it_matters_validation_status, published_why_it_matters, published_what_led_to_it, published_what_it_connects_to, published_at",
      )
      .eq("briefing_date", input.date)
      .eq("editorial_status", "published"),
  );

  const cards = data
    .filter(isPublicCard)
    .map((r) => ({ r, rank: publicRank(r) as number }))
    .sort((a, b) => a.rank - b.rank || (a.r.rank as number) - (b.r.rank as number))
    .slice(0, 7)
    .map(({ r, rank }) => ({
      rank,
      card_type: cardType(r, rank),
      title: r.title as string,
      signal: text(r.published_why_it_matters),
      before_this: text(r.published_what_led_to_it),
      ripple: text(r.published_what_it_connects_to),
      source: r.source_name as string,
      source_url: text(r.source_url),
      id: r.id as string,
    }));

  const core = cards.filter((c) => c.card_type === "Core").length;
  return {
    summary: cards.length
      ? `Brief for ${input.date}: ${cards.length} published cards (${core} Core, ${cards.length - core} Context).`
      : `No published brief for ${input.date} (${data.length} rows marked published, none pass the public-card rule).`,
    date: input.date,
    cards,
  };
}

// --------------------------------------------------------------- gate_failures

export async function gateFailures(db: ReadOnlyDb, input: { date: string }) {
  const data = await rows(
    db
      .select(
        "signal_posts",
        "id, rank, title, source_name, editorial_decision, why_it_matters_validation_failures, why_it_matters_validation_details, why_it_matters_validated_at",
      )
      .eq("briefing_date", input.date)
      .eq("why_it_matters_validation_status", "requires_human_rewrite")
      .order("rank", { ascending: true }),
  );

  const failures = data.map((r) => ({
    id: r.id as string,
    rank: r.rank as number,
    title: r.title as string,
    source: r.source_name as string,
    decision: r.editorial_decision as string | null,
    failure_codes: (r.why_it_matters_validation_failures as string[] | null) ?? [],
    field: SIGNAL_FIELD,
    details: (r.why_it_matters_validation_details as string[] | null) ?? [],
  }));

  const codes = tally(failures.flatMap((f) => f.failure_codes));
  const top = Object.entries(codes)[0];
  return {
    summary: failures.length
      ? `${failures.length} rows on ${input.date} require human rewrite; top failure code: ${top[0]} (${top[1]}). The gate validates only the Signal field.`
      : `No rows on ${input.date} require human rewrite.`,
    date: input.date,
    failure_code_counts: codes,
    failures,
  };
}

// ----------------------------------------------------------------- story_trace

export async function storyTrace(db: ReadOnlyDb, input: { id: string }) {
  const [post] = await rows(
    db
      .select(
        "signal_posts",
        "id, briefing_date, rank, title, source_name, source_url, tags, signal_score, selection_reason, editorial_content_source, witm_draft_generated_by, why_it_matters_validation_status, why_it_matters_validation_failures, why_it_matters_validation_details, why_it_matters_validated_at, editorial_decision, decision_note, held_reason, rejected_reason, replacement_of_row_id, reviewed_by, reviewed_at, editorial_status, approved_at, published_at, is_live, final_slate_rank, final_slate_tier, published_why_it_matters, published_what_led_to_it, published_what_it_connects_to",
      )
      .eq("id", input.id)
      .limit(1),
  );

  if (!post) {
    return { summary: `No signal_posts row with id ${input.id}.`, id: input.id, found: false };
  }

  const newsletter = await rows(
    db
      .select(
        "newsletter_story_extractions",
        "headline, source_domain, category, extraction_confidence, extracted_at, pipeline_candidate_id, newsletter_email_id",
      )
      .eq("signal_post_id", input.id)
      .limit(1),
  );

  let ingestion: Row;
  let features: Row | null = null;

  if (newsletter[0]) {
    const ex = newsletter[0];
    const [email] = await rows(
      db
        .select("newsletter_emails", "sender, subject, received_at")
        .eq("id", ex.newsletter_email_id as string)
        .limit(1),
    );
    ingestion = {
      path: "newsletter",
      sender: email?.sender ?? null,
      subject: email?.subject ?? null,
      received_at: email?.received_at ?? null,
      extracted_headline: ex.headline,
      source_domain: ex.source_domain,
      category: ex.category,
      extraction_confidence: num(ex.extraction_confidence),
    };
  } else if (text(post.source_url)) {
    const candidates = await rows(
      db
        .select(
          "pipeline_article_candidates",
          "run_id, ingested_at, source_name, source_tier, source_class, category, published_at, ranking_score, event_importance, event_type, eligibility_tier, surfaced, pipeline_stage_reached, drop_reason, extraction_status, extracted_text_length",
        )
        .eq("canonical_url", post.source_url as string)
        .order("ingested_at", { ascending: false })
        .limit(20),
    );
    // Prefer the latest ingestion on or before the briefing day (Taipei).
    const cutoff = `${shiftDate(post.briefing_date as string, 1)}T00:00:00+08:00`;
    const match =
      candidates.find((c) => new Date(c.ingested_at as string) < new Date(cutoff)) ??
      candidates[0];
    ingestion = match
      ? {
          path: "rss",
          source_name: match.source_name,
          source_tier: match.source_tier,
          source_class: match.source_class,
          category: match.category,
          run_id: match.run_id,
          ingested_at: match.ingested_at,
          article_published_at: match.published_at,
          candidate_runs_matched: candidates.length,
        }
      : { path: "unknown", note: "source_url has no pipeline_article_candidates match" };
    if (match) {
      features = {
        ranking_score: num(match.ranking_score),
        event_importance: num(match.event_importance),
        event_type: match.event_type,
        eligibility_tier: match.eligibility_tier,
        surfaced: match.surfaced,
        pipeline_stage_reached: match.pipeline_stage_reached,
        drop_reason: match.drop_reason,
        extraction_status: match.extraction_status,
        extracted_text_length: match.extracted_text_length,
      };
    }
  } else {
    ingestion = { path: "manual", note: "no source_url and no newsletter extraction (editorial queue push)" };
  }

  const isPublic = isPublicCard(post);
  const rank = publicRank(post);
  const decision = post.editorial_decision as string | null;
  const note = text(post.decision_note) ?? text(post.held_reason) ?? text(post.rejected_reason);

  return {
    summary:
      `"${post.title}" (${post.source_name}, ${post.briefing_date}): ingested via ${ingestion.path}, ` +
      `score ${num(post.signal_score) ?? "n/a"}, gate ${post.why_it_matters_validation_status}, ` +
      `decision ${decision ?? "none"}${note ? ` — "${note.slice(0, 120)}"` : ""}; ` +
      (isPublic ? `published as ${cardType(post, rank as number)} #${rank}.` : `not published (status ${post.editorial_status}).`),
    id: post.id,
    briefing_date: post.briefing_date,
    title: post.title,
    source: post.source_name,
    source_url: post.source_url,
    ingestion,
    score: {
      signal_score: num(post.signal_score),
      candidate_rank: post.rank,
      selection_reason: post.selection_reason,
      tags: post.tags,
      features,
    },
    gate: {
      status: post.why_it_matters_validation_status,
      field: SIGNAL_FIELD,
      failure_codes: post.why_it_matters_validation_failures ?? [],
      details: post.why_it_matters_validation_details ?? [],
      validated_at: post.why_it_matters_validated_at,
    },
    decision: {
      decision,
      note,
      reviewed_by: post.reviewed_by,
      reviewed_at: post.reviewed_at,
      replacement_of_row_id: post.replacement_of_row_id,
    },
    publish: {
      editorial_status: post.editorial_status,
      publicly_rendered: isPublic,
      final_slate_rank: post.final_slate_rank,
      card_type: rank ? cardType(post, rank) : null,
      is_live: post.is_live,
      approved_at: post.approved_at,
      published_at: post.published_at,
      content_source: post.editorial_content_source,
      drafted_by: post.witm_draft_generated_by,
      fields_present: {
        signal: Boolean(text(post.published_why_it_matters)),
        before_this: Boolean(text(post.published_what_led_to_it)),
        ripple: Boolean(text(post.published_what_it_connects_to)),
      },
    },
  };
}
