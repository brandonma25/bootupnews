import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const logServerEvent = vi.fn();
const createSupabaseServiceRoleClient = vi.fn();

vi.mock("@/lib/observability", () => ({
  errorContext: (error: unknown) => ({
    errorMessage: error instanceof Error ? error.message : String(error),
  }),
  logServerEvent,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient,
}));

/**
 * Build a Notion page fixture in the shape returned by /databases/:id/query.
 * The only fields the bridge consumes appear here; everything else is
 * undefined and the helpers return the appropriate empty fallback.
 */
function buildNotionPage(props: {
  pageId?: string;
  headline?: string;
  sourceUrl?: string | null;
  sourceName?: string;
  slot?: "Core" | "Context" | null;
  signalAi?: string;
  signalHuman?: string;
  beforeAi?: string;
  beforeHuman?: string;
  rippleAi?: string;
  rippleHuman?: string;
  hookAi?: string;
  hookHuman?: string;
  editorialSource?: "AI" | "Human" | "AI+Human" | null;
  category?: string | null;
  articleBody?: string;
}): unknown {
  const richText = (s: string | undefined) =>
    s === undefined ? undefined : { type: "rich_text", rich_text: [{ plain_text: s }] };
  const title = (s: string | undefined) =>
    s === undefined ? undefined : { type: "title", title: [{ plain_text: s }] };
  const select = (s: string | null | undefined) =>
    s === undefined ? undefined : { type: "select", select: s === null ? null : { name: s } };
  const url = (s: string | null | undefined) =>
    s === undefined ? undefined : { type: "url", url: s ?? null };

  return {
    id: props.pageId ?? "page-1",
    properties: {
      Headline: title(props.headline),
      "The Signal (AI Draft)": richText(props.signalAi),
      "The Signal (Human)": richText(props.signalHuman),
      "Before This (AI Draft)": richText(props.beforeAi),
      "Before This (Human)": richText(props.beforeHuman),
      "The Ripple (AI Draft)": richText(props.rippleAi),
      "The Ripple (Human)": richText(props.rippleHuman),
      "Hook (AI Draft)": richText(props.hookAi),
      "Hook (Human)": richText(props.hookHuman),
      Source: richText(props.sourceName),
      "Source URL": url(props.sourceUrl),
      Slot: select(props.slot),
      "Editorial Source": select(props.editorialSource),
      Category: select(props.category),
      "Article Body": richText(props.articleBody),
    },
  };
}

/**
 * Stub a chainable Supabase query for one table. Each `from()` call returns a
 * fresh chain so multiple awaits inside a single test see independent state.
 *
 * `state` is a mutable per-test row store keyed by source_url. Mutating it
 * across test cases is the test's responsibility.
 */
type FakeSignalRow = {
  id: string;
  briefing_date: string;
  rank: number | null;
  final_slate_rank: number | null;
  final_slate_tier: "core" | "context" | null;
  witm_draft_generated_by: string | null;
  is_live: boolean | null;
  source_url: string;
  [key: string]: unknown;
};

function buildSupabaseStub(state: { rows: FakeSignalRow[]; nextId: number }) {
  const findRow = (briefingDate: string, sourceUrl: string) =>
    state.rows.find(
      (r) => r.briefing_date === briefingDate && r.source_url === sourceUrl,
    );

  return {
    from: vi.fn((table: string) => {
      expect(table).toBe("signal_posts");

      const filters: Array<{ column: string; value: unknown }> = [];
      let pendingOp: "select" | "insert" | "update" | null = null;
      let updatePayload: Record<string, unknown> | null = null;
      let insertPayload: Record<string, unknown> | null = null;
      let notNullColumn: string | null = null;

      const applyFilters = (rows: FakeSignalRow[]) =>
        rows.filter((row) =>
          filters.every((f) => (row as Record<string, unknown>)[f.column] === f.value) &&
          (notNullColumn === null ||
            (row as Record<string, unknown>)[notNullColumn] !== null),
        );

      const chain = {
        select() {
          if (pendingOp === null) pendingOp = "select";
          return chain;
        },
        eq(column: string, value: unknown) {
          filters.push({ column, value });
          return chain;
        },
        not(column: string, op: string, value: unknown) {
          if (op === "is" && value === null) notNullColumn = column;
          return chain;
        },
        insert(payload: Record<string, unknown>) {
          pendingOp = "insert";
          insertPayload = payload;
          return chain;
        },
        update(payload: Record<string, unknown>) {
          pendingOp = "update";
          updatePayload = payload;
          return chain;
        },
        single() {
          if (pendingOp === "insert" && insertPayload) {
            const id = `inserted-${state.nextId++}`;
            const row = {
              id,
              briefing_date: String(insertPayload.briefing_date),
              source_url: String(insertPayload.source_url),
              rank: typeof insertPayload.rank === "number" ? insertPayload.rank : null,
              final_slate_rank:
                typeof insertPayload.final_slate_rank === "number"
                  ? insertPayload.final_slate_rank
                  : null,
              final_slate_tier:
                (insertPayload.final_slate_tier as "core" | "context" | null) ?? null,
              witm_draft_generated_by:
                (insertPayload.witm_draft_generated_by as string | null) ?? null,
              is_live: Boolean(insertPayload.is_live ?? false),
              ...insertPayload,
            } as FakeSignalRow;
            state.rows.push(row);
            return Promise.resolve({ data: { id }, error: null });
          }
          if (pendingOp === "update" && updatePayload && filters.length > 0) {
            const target = state.rows.find((r) => r.id === filters[0].value);
            if (!target) return Promise.resolve({ data: null, error: null });
            Object.assign(target, updatePayload);
            return Promise.resolve({ data: { id: target.id }, error: null });
          }
          // Plain select.single()
          const matches = applyFilters(state.rows);
          return Promise.resolve({ data: matches[0] ?? null, error: null });
        },
        maybeSingle() {
          const matches = applyFilters(state.rows);
          return Promise.resolve({ data: matches[0] ?? null, error: null });
        },
        then<T>(onFulfilled: (value: { data: unknown; error: null }) => T) {
          // Used by the "rank scan" calls: .from().select().eq() awaited
          // directly without .single() / .maybeSingle().
          const matches = applyFilters(state.rows);
          return Promise.resolve({ data: matches, error: null }).then(onFulfilled);
        },
      };

      return chain;
    }),
    _state: state,
    _findRow: findRow,
  };
}

type FetchInit = { method?: string; body?: string };
type FetchCall = { url: string; init: FetchInit };
let fetchCalls: FetchCall[] = [];
let notionQueryResponse: unknown = { results: [] };

function installFetchMock() {
  fetchCalls = [];
  globalThis.fetch = vi.fn(async (input: unknown, init?: unknown) => {
    const url = String(input);
    const initObj = (init ?? {}) as FetchInit;
    fetchCalls.push({ url, init: initObj });

    // Notion query for approved rows.
    if (url.includes("/databases/") && url.endsWith("/query")) {
      return new Response(JSON.stringify(notionQueryResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Notion writeback PATCH.
    if (url.includes("/pages/") && initObj.method === "PATCH") {
      return new Response(JSON.stringify({ id: "page-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
}

function buildRequest(token = "test-secret") {
  return new Request(`http://localhost:3000/api/editorial/push-approved?token=${token}`);
}

describe("/api/editorial/push-approved", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    process.env.EDITORIAL_PUSH_SECRET = "test-secret";
    process.env.NOTION_EDITORIAL_QUEUE_DB_ID = "test-db";
    process.env.NOTION_TOKEN = "test-token";
    delete process.env.EDITORIAL_DRAFTER_MODEL_ID;
    installFetchMock();
    notionQueryResponse = { results: [] };
  });

  afterEach(() => {
    // Reset to avoid leakage between tests.
    delete (globalThis as { fetch?: unknown }).fetch;
  });

  it("returns 401 when the token is missing or wrong", async () => {
    const { GET } = await import("@/app/api/editorial/push-approved/route");
    const response = await GET(buildRequest("wrong"));
    expect(response.status).toBe(401);
  });

  it("inserts a new v2 row with all three layers + paired tier/rank + 'llm' provenance", async () => {
    const supabase = buildSupabaseStub({ rows: [], nextId: 1 });
    createSupabaseServiceRoleClient.mockReturnValue(supabase);

    notionQueryResponse = {
      results: [
        buildNotionPage({
          pageId: "notion-1",
          headline: "Fed cuts rates 25bps in surprise move",
          sourceUrl: "https://reuters.com/article-1",
          sourceName: "Reuters",
          slot: "Core",
          signalAi: "AI signal draft for fed cut.",
          beforeAi: "AI before-this for fed cut.",
          rippleAi: "AI ripple for fed cut.",
          hookAi: "Surprise rate cut reorders the curve.",
          editorialSource: "AI",
          category: "Finance",
          articleBody: "Article body about the rate cut.",
        }),
      ],
    };

    const { GET } = await import("@/app/api/editorial/push-approved/route");
    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.counts.inserted).toBe(1);
    expect(supabase._state.rows).toHaveLength(1);

    const row = supabase._state.rows[0];
    expect(row.witm_draft_generated_by).toBe("llm");
    expect(row.witm_draft_model).toBe("claude-opus-4-7");
    expect(row.ai_why_it_matters).toBe("AI signal draft for fed cut.");
    expect(row.ai_what_led_to_it).toBe("AI before-this for fed cut.");
    expect(row.ai_what_it_connects_to).toBe("AI ripple for fed cut.");
    expect(row.selection_reason).toBe("Surprise rate cut reorders the curve.");
    expect(row.final_slate_tier).toBe("core");
    expect(typeof row.final_slate_rank).toBe("number");
    expect(row.final_slate_rank).toBeGreaterThanOrEqual(1);
    expect(row.final_slate_rank).toBeLessThanOrEqual(5);
    expect(typeof row.rank).toBe("number");
    expect(row.editorial_content_source).toBe("ai");
    expect(row.is_live).toBe(false);
    expect(row.editorial_status).toBe("needs_review");

    // Notion writeback fired once with Pushed=true + Supabase Row ID.
    const writebacks = fetchCalls.filter((c) => c.init.method === "PATCH");
    expect(writebacks).toHaveLength(1);
    const writebackBody = JSON.parse(writebacks[0].init.body!);
    expect(writebackBody.properties["Pushed to Supabase"].checkbox).toBe(true);
    expect(writebackBody.properties["Supabase Row ID"].rich_text[0].text.content).toBe(row.id);
  });

  // THE OVERWRITE TEST (required by the brief — proves the silent-drop trap is closed)
  it("OVERWRITES an existing 'deterministic_template' row at the same (briefing_date, source_url)", async () => {
    const briefingDate = todayTaipei();
    const sourceUrl = "https://example.com/same-article";
    const templateRow: FakeSignalRow = {
      id: "legacy-1",
      briefing_date: briefingDate,
      rank: 4,
      final_slate_rank: 2,
      final_slate_tier: "core",
      witm_draft_generated_by: "deterministic_template",
      is_live: false,
      source_url: sourceUrl,
      title: "Templated headline placeholder",
      ai_why_it_matters: "(Signal: Weak) Templated boilerplate text.",
      ai_what_led_to_it: null,
      ai_what_it_connects_to: null,
      selection_reason: "Newsletter discovery candidate; BM review required.",
      witm_draft_model: "heuristic_template_v1",
      editorial_content_source: "ai",
      editorial_status: "needs_review",
    };
    const supabase = buildSupabaseStub({ rows: [templateRow], nextId: 100 });
    createSupabaseServiceRoleClient.mockReturnValue(supabase);

    notionQueryResponse = {
      results: [
        buildNotionPage({
          pageId: "notion-2",
          headline: "Real headline from the editor",
          sourceUrl,
          sourceName: "Reuters",
          slot: "Core",
          signalAi: "Real LLM-generated Signal.",
          beforeAi: "Real LLM-generated Before This.",
          rippleAi: "Real LLM-generated Ripple.",
          hookAi: "Real LLM-generated Hook.",
          editorialSource: "AI",
          category: "Finance",
          articleBody: "Real article body.",
        }),
      ],
    };

    const { GET } = await import("@/app/api/editorial/push-approved/route");
    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.counts.overwrote_template).toBe(1);
    expect(body.counts.inserted).toBe(0);

    // SAME row id was overwritten in place.
    expect(supabase._state.rows).toHaveLength(1);
    const row = supabase._state.rows[0];
    expect(row.id).toBe("legacy-1");

    // Display rank + final slate rank were preserved (legacy's slot wins).
    expect(row.rank).toBe(4);
    expect(row.final_slate_rank).toBe(2);
    expect(row.final_slate_tier).toBe("core");

    // Provenance flipped to v2 LLM.
    expect(row.witm_draft_generated_by).toBe("llm");
    expect(row.witm_draft_model).toBe("claude-opus-4-7");

    // All three layers carry the new LLM content, NOT the template text.
    expect(row.ai_why_it_matters).toBe("Real LLM-generated Signal.");
    expect(row.ai_why_it_matters).not.toContain("(Signal: Weak)");
    expect(row.ai_what_led_to_it).toBe("Real LLM-generated Before This.");
    expect(row.ai_what_it_connects_to).toBe("Real LLM-generated Ripple.");
    expect(row.selection_reason).toBe("Real LLM-generated Hook.");

    expect(row.title).toBe("Real headline from the editor");
    expect(row.is_live).toBe(false);

    // Notion writeback fired with the SAME existing supabase id.
    const writebacks = fetchCalls.filter((c) => c.init.method === "PATCH");
    expect(writebacks).toHaveLength(1);
    const writebackBody = JSON.parse(writebacks[0].init.body!);
    expect(writebackBody.properties["Supabase Row ID"].rich_text[0].text.content).toBe("legacy-1");
  });

  it("SKIPS overwrite when the existing row is is_live=true and does NOT writeback Notion", async () => {
    const briefingDate = todayTaipei();
    const sourceUrl = "https://example.com/live-article";
    const liveRow: FakeSignalRow = {
      id: "live-1",
      briefing_date: briefingDate,
      rank: 3,
      final_slate_rank: 1,
      final_slate_tier: "core",
      witm_draft_generated_by: "llm",
      is_live: true,
      source_url: sourceUrl,
      title: "Already live headline",
      ai_why_it_matters: "Live content; must not be overwritten.",
    };
    const supabase = buildSupabaseStub({ rows: [liveRow], nextId: 100 });
    createSupabaseServiceRoleClient.mockReturnValue(supabase);

    notionQueryResponse = {
      results: [
        buildNotionPage({
          pageId: "notion-3",
          headline: "Attempted re-push",
          sourceUrl,
          sourceName: "X",
          slot: "Core",
          signalAi: "Attempted overwrite content.",
          editorialSource: "AI",
        }),
      ],
    };

    const { GET } = await import("@/app/api/editorial/push-approved/route");
    const response = await GET(buildRequest());
    const body = await response.json();

    expect(body.counts.skipped_live).toBe(1);
    // Row unchanged.
    expect(supabase._state.rows[0].ai_why_it_matters).toBe("Live content; must not be overwritten.");
    // No Notion writeback for skipped_live — operator should notice.
    const writebacks = fetchCalls.filter((c) => c.init.method === "PATCH");
    expect(writebacks).toHaveLength(0);
  });

  it("SKIPS overwrite when the existing row is already provenance='llm' but DOES writeback Notion", async () => {
    const briefingDate = todayTaipei();
    const sourceUrl = "https://example.com/already-v2";
    const v2Row: FakeSignalRow = {
      id: "v2-1",
      briefing_date: briefingDate,
      rank: 7,
      final_slate_rank: 3,
      final_slate_tier: "core",
      witm_draft_generated_by: "llm",
      is_live: false,
      source_url: sourceUrl,
      ai_why_it_matters: "Existing v2 content; do not re-overwrite.",
    };
    const supabase = buildSupabaseStub({ rows: [v2Row], nextId: 100 });
    createSupabaseServiceRoleClient.mockReturnValue(supabase);

    notionQueryResponse = {
      results: [
        buildNotionPage({
          pageId: "notion-4",
          headline: "Re-push attempt",
          sourceUrl,
          sourceName: "X",
          slot: "Core",
          signalAi: "Different content the editor wants to push again.",
          editorialSource: "AI",
        }),
      ],
    };

    const { GET } = await import("@/app/api/editorial/push-approved/route");
    const response = await GET(buildRequest());
    const body = await response.json();

    expect(body.counts.skipped_existing_v2).toBe(1);
    // Row unchanged.
    expect(supabase._state.rows[0].ai_why_it_matters).toBe("Existing v2 content; do not re-overwrite.");
    // Writeback DOES fire so Notion's Pushed flag flips true.
    const writebacks = fetchCalls.filter((c) => c.init.method === "PATCH");
    expect(writebacks).toHaveLength(1);
  });

  it("normalizes Notion markdown escapes (`\\[ → [`, `\\$ → $`) on all editorial text fields", async () => {
    const supabase = buildSupabaseStub({ rows: [], nextId: 1 });
    createSupabaseServiceRoleClient.mockReturnValue(supabase);

    notionQueryResponse = {
      results: [
        buildNotionPage({
          pageId: "notion-md",
          headline: "Foo \\$NVDA earnings beat",
          sourceUrl: "https://example.com/nvda",
          sourceName: "Reuters",
          slot: "Context",
          signalAi: "Marker \\[A\\] cites the 10-Q.",
          beforeAi: "\\$NVDA fell 4% pre-market.",
          rippleAi: "Other AI suppliers tracked \\[R\\].",
          hookAi: "Earnings reframes \\$NVDA capex.",
          editorialSource: "Human",
        }),
      ],
    };

    const { GET } = await import("@/app/api/editorial/push-approved/route");
    await GET(buildRequest());

    const row = supabase._state.rows[0];
    expect(row.title).toBe("Foo $NVDA earnings beat");
    expect(row.ai_why_it_matters).toBe("Marker [A] cites the 10-Q.");
    expect(row.ai_what_led_to_it).toBe("$NVDA fell 4% pre-market.");
    expect(row.ai_what_it_connects_to).toBe("Other AI suppliers tracked [R].");
    expect(row.selection_reason).toBe("Earnings reframes $NVDA capex.");
  });

  it("falls back to a structured note when Hook is empty so selection_reason stays non-NULL", async () => {
    const supabase = buildSupabaseStub({ rows: [], nextId: 1 });
    createSupabaseServiceRoleClient.mockReturnValue(supabase);

    notionQueryResponse = {
      results: [
        buildNotionPage({
          pageId: "no-hook",
          headline: "No-hook story",
          sourceUrl: "https://example.com/no-hook",
          sourceName: "Reuters",
          slot: "Core",
          signalAi: "Signal only.",
          editorialSource: "AI",
          // hookAi and hookHuman intentionally absent.
        }),
      ],
    };

    const { GET } = await import("@/app/api/editorial/push-approved/route");
    await GET(buildRequest());

    const row = supabase._state.rows[0];
    expect(row.selection_reason).toContain("Hook empty");
  });

  it("returns 'no_rank_slot' when the requested tier is full", async () => {
    const briefingDate = todayTaipei();
    // Seed all 5 Core slots.
    const fullCore: FakeSignalRow[] = Array.from({ length: 5 }, (_, i) => ({
      id: `core-${i + 1}`,
      briefing_date: briefingDate,
      rank: i + 1,
      final_slate_rank: i + 1,
      final_slate_tier: "core",
      witm_draft_generated_by: "llm",
      is_live: false,
      source_url: `https://example.com/existing-core-${i + 1}`,
    }));
    const supabase = buildSupabaseStub({ rows: fullCore, nextId: 100 });
    createSupabaseServiceRoleClient.mockReturnValue(supabase);

    notionQueryResponse = {
      results: [
        buildNotionPage({
          pageId: "overflow",
          headline: "Sixth core push attempt",
          sourceUrl: "https://example.com/new-story",
          sourceName: "X",
          slot: "Core",
          signalAi: "Should fail — tier is full.",
          editorialSource: "AI",
        }),
      ],
    };

    const { GET } = await import("@/app/api/editorial/push-approved/route");
    const response = await GET(buildRequest());
    const body = await response.json();

    expect(body.counts.no_rank_slot).toBe(1);
    expect(body.rows[0].error).toContain("final_slate_rank");
  });

  it("skips a Notion row that has no Source URL", async () => {
    const supabase = buildSupabaseStub({ rows: [], nextId: 1 });
    createSupabaseServiceRoleClient.mockReturnValue(supabase);

    notionQueryResponse = {
      results: [
        buildNotionPage({
          pageId: "no-url",
          headline: "Story with no source URL",
          sourceUrl: null,
          slot: "Core",
          signalAi: "Signal.",
          editorialSource: "AI",
        }),
      ],
    };

    const { GET } = await import("@/app/api/editorial/push-approved/route");
    const response = await GET(buildRequest());
    const body = await response.json();
    expect(body.counts.skipped_missing_source_url).toBe(1);
    expect(supabase._state.rows).toHaveLength(0);
  });

  it("queries Notion with Status=approved + Pushed to Supabase=false (kill-flag enforcement)", async () => {
    const supabase = buildSupabaseStub({ rows: [], nextId: 1 });
    createSupabaseServiceRoleClient.mockReturnValue(supabase);

    const { GET } = await import("@/app/api/editorial/push-approved/route");
    await GET(buildRequest());

    const query = fetchCalls.find((c) => c.url.includes("/query"));
    expect(query).toBeTruthy();
    const queryBody = JSON.parse(query!.init.body!);
    const filters = queryBody.filter.and as Array<Record<string, unknown>>;
    expect(filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: "Status", select: { equals: "approved" } }),
        expect.objectContaining({ property: "Pushed to Supabase", checkbox: { equals: false } }),
      ]),
    );
  });

  it("uses EDITORIAL_DRAFTER_MODEL_ID env override when set", async () => {
    process.env.EDITORIAL_DRAFTER_MODEL_ID = "claude-opus-5-9-future";
    const supabase = buildSupabaseStub({ rows: [], nextId: 1 });
    createSupabaseServiceRoleClient.mockReturnValue(supabase);

    notionQueryResponse = {
      results: [
        buildNotionPage({
          pageId: "model-id",
          headline: "Model id test",
          sourceUrl: "https://example.com/model-id",
          sourceName: "Reuters",
          slot: "Core",
          signalAi: "Signal.",
          editorialSource: "AI",
        }),
      ],
    };

    const { GET } = await import("@/app/api/editorial/push-approved/route");
    await GET(buildRequest());

    expect(supabase._state.rows[0].witm_draft_model).toBe("claude-opus-5-9-future");
  });
});

/** Local mirror of the route's Taipei date helper, for fixtures that need today. */
function todayTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
