import { beforeEach, describe, expect, it, vi } from "vitest";

type SignalPostRow = {
  id: string;
  briefing_date: string;
  rank: number;
  title: string;
  source_name: string;
  source_url: string;
  summary: string;
  tags: string[];
  signal_score: number | null;
  selection_reason: string;
  ai_why_it_matters: string;
  edited_why_it_matters: string | null;
  published_why_it_matters: string | null;
  edited_why_it_matters_payload: unknown | null;
  published_why_it_matters_payload: unknown | null;
  why_it_matters_validation_status: "passed" | "requires_human_rewrite";
  why_it_matters_validation_failures: string[];
  why_it_matters_validation_details: string[];
  why_it_matters_validated_at: string | null;
  editorial_status: "draft" | "needs_review" | "approved" | "published";
  edited_by: string | null;
  edited_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  is_live: boolean;
  created_at: string | null;
  updated_at: string | null;
};

const safeGetUser = vi.fn();
const createSupabaseServiceRoleClient = vi.fn();
const createSupabaseServerClient = vi.fn();
const generateDailyBriefing = vi.fn();
const captureRssFailure = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  safeGetUser,
  createSupabaseServiceRoleClient,
  createSupabaseServerClient,
}));

vi.mock("@/lib/data", () => ({
  generateDailyBriefing,
}));

vi.mock("@/lib/observability/rss", () => ({
  captureRssFailure,
}));

function createRow(overrides: Partial<SignalPostRow> = {}): SignalPostRow {
  return {
    id: overrides.id ?? `signal-${overrides.rank ?? 1}`,
    briefing_date: overrides.briefing_date ?? "2026-04-24",
    rank: overrides.rank ?? 1,
    title: overrides.title ?? `Signal ${overrides.rank ?? 1}`,
    source_name: overrides.source_name ?? "Source",
    source_url: overrides.source_url ?? "https://example.com/source",
    summary: overrides.summary ?? "Signal summary",
    tags: overrides.tags ?? ["tech"],
    signal_score: overrides.signal_score ?? 88,
    selection_reason: overrides.selection_reason ?? "Strong ranking signal",
    ai_why_it_matters: overrides.ai_why_it_matters ?? "Raw AI draft",
    edited_why_it_matters: overrides.edited_why_it_matters ?? null,
    published_why_it_matters: overrides.published_why_it_matters ?? null,
    edited_why_it_matters_payload: overrides.edited_why_it_matters_payload ?? null,
    published_why_it_matters_payload: overrides.published_why_it_matters_payload ?? null,
    why_it_matters_validation_status: overrides.why_it_matters_validation_status ?? "passed",
    why_it_matters_validation_failures: overrides.why_it_matters_validation_failures ?? [],
    why_it_matters_validation_details: overrides.why_it_matters_validation_details ?? [],
    why_it_matters_validated_at: overrides.why_it_matters_validated_at ?? null,
    editorial_status: overrides.editorial_status ?? "needs_review",
    edited_by: overrides.edited_by ?? null,
    edited_at: overrides.edited_at ?? null,
    approved_by: overrides.approved_by ?? null,
    approved_at: overrides.approved_at ?? null,
    published_at: overrides.published_at ?? null,
    is_live: overrides.is_live ?? false,
    created_at: overrides.created_at ?? null,
    updated_at: overrides.updated_at ?? null,
  };
}

function createBriefingItem(rank: number) {
  return {
    id: `generated-${rank}`,
    topicId: "topic-1",
    topicName: "Tech",
    title: `Generated Signal ${rank}`,
    whatHappened: `Generated summary ${rank}`,
    keyPoints: [`Point ${rank}`],
    whyItMatters: `Generated Why it matters ${rank}`,
    sources: [{ title: "Source", url: `https://example.com/source-${rank}` }],
    relatedArticles: [{ title: "Source", url: `https://example.com/source-${rank}`, sourceName: "Source", note: "Lead coverage" }],
    sourceCount: 1,
    estimatedMinutes: 4,
    read: false,
    priority: "top" as const,
    matchedKeywords: ["tech"],
    matchScore: 90 - rank,
    publishedAt: "2026-04-25T08:00:00.000Z",
    importanceScore: 90 - rank,
    importanceLabel: "Critical",
    rankingSignals: [`Ranking signal ${rank}`],
    signalRole: "Core signal",
  };
}

function createSupabaseMock(
  rows: SignalPostRow[],
  options: { missingColumns?: string[] } = {},
) {
  const missingColumns = new Set(options.missingColumns ?? []);

  return {
    rows,
    from(tableName: string) {
      expect(tableName).toBe("signal_posts");

      let operation: "select" | "update" | null = null;
      let updateValues: Partial<SignalPostRow> = {};
      let selectError: { message: string } | null = null;
      const filters: Array<{ column: keyof SignalPostRow; value: unknown }> = [];
      const inclusionFilters: Array<{ column: keyof SignalPostRow; values: unknown[] }> = [];
      const lessThanFilters: Array<{ column: keyof SignalPostRow; value: unknown }> = [];
      let orSearch = "";
      const orderRules: Array<{ column: keyof SignalPostRow; ascending: boolean }> = [];
      let rangeStart: number | null = null;
      let rangeEnd: number | null = null;

      function applyFilters() {
        return rows.filter((row) =>
          filters.every((filter) => row[filter.column] === filter.value) &&
          inclusionFilters.every((filter) => filter.values.includes(row[filter.column])) &&
          lessThanFilters.every((filter) => String(row[filter.column]) < String(filter.value)) &&
          (orSearch
            ? row.title.toLowerCase().includes(orSearch) || row.source_name.toLowerCase().includes(orSearch)
            : true),
        );
      }

      function selectResult(limit?: number) {
        if (selectError) {
          return Promise.resolve({
            data: null,
            error: selectError,
            count: 0,
          });
        }

        let data = applyFilters();

        if (orderRules.length > 0) {
          data = data.slice().sort((left, right) => {
            for (const rule of orderRules) {
              const leftValue = left[rule.column];
              const rightValue = right[rule.column];
              const comparison =
                typeof leftValue === "number" && typeof rightValue === "number"
                  ? leftValue - rightValue
                  : String(leftValue).localeCompare(String(rightValue));

              if (comparison !== 0) {
                return rule.ascending ? comparison : -comparison;
              }
            }

            return 0;
          });
        }

        if (rangeStart !== null && rangeEnd !== null) {
          data = data.slice(rangeStart, rangeEnd + 1);
        }

        return Promise.resolve({
          data: typeof limit === "number" ? data.slice(0, limit) : data,
          error: null,
          count: applyFilters().length,
        });
      }

      const builder = {
        select(columns?: string) {
          operation = "select";
          const selectedColumns = String(columns ?? "")
            .split(",")
            .map((column) => column.trim().split(/\s+/)[0])
            .filter(Boolean);
          const missingSelectedColumns = selectedColumns.filter((column) => missingColumns.has(column));

          if (missingSelectedColumns.length > 0) {
            selectError = {
              message: `column signal_posts.${missingSelectedColumns[0]} does not exist`,
            };
          }

          return builder;
        },
        order(column: keyof SignalPostRow, options?: { ascending?: boolean }) {
          orderRules.push({ column, ascending: options?.ascending ?? true });
          return builder;
        },
        limit(count: number) {
          return selectResult(count);
        },
        range(from: number, to: number) {
          rangeStart = from;
          rangeEnd = to;
          return selectResult();
        },
        maybeSingle() {
          return Promise.resolve({
            data: applyFilters()[0] ?? null,
            error: null,
          });
        },
        insert(values: Partial<SignalPostRow>[]) {
          values.forEach((value, index) => {
            rows.push(createRow({ id: `inserted-${index + 1}`, ...value }));
          });

          return Promise.resolve({ error: null });
        },
        update(values: Partial<SignalPostRow>) {
          operation = "update";
          updateValues = values;
          return builder;
        },
        eq(column: keyof SignalPostRow, value: unknown) {
          filters.push({ column, value });

          if (operation === "update") {
            applyFilters().forEach((row) => {
              Object.assign(row, updateValues);
            });

            return Promise.resolve({ error: null });
          }

          return builder;
        },
        in(column: keyof SignalPostRow, values: unknown[]) {
          inclusionFilters.push({ column, values });
          return builder;
        },
        lt(column: keyof SignalPostRow, value: unknown) {
          lessThanFilters.push({ column, value });
          return builder;
        },
        or(value: string) {
          const match = value.match(/%(.+)%/);
          orSearch = (match?.[1] ?? "").toLowerCase();
          return builder;
        },
        then<TResult1 = unknown, TResult2 = never>(
          onfulfilled?: ((value: { data: SignalPostRow[]; error: null; count: number }) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          if (operation === "select" || operation === null) {
            return selectResult().then(onfulfilled, onrejected);
          }

          return Promise.resolve({ data: [], error: null, count: 0 }).then(onfulfilled, onrejected);
        },
      };

      return builder;
    },
  };
}

async function loadEditorialModule() {
  vi.resetModules();
  vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
  return import("@/lib/signals-editorial");
}

describe("signals editorial workflow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    safeGetUser.mockReset();
    createSupabaseServiceRoleClient.mockReset();
    createSupabaseServerClient.mockReset();
    generateDailyBriefing.mockReset();
    captureRssFailure.mockReset();
  });

  it("withholds editorial review state from non-admin users", async () => {
    safeGetUser.mockResolvedValue({
      user: { id: "user-1", email: "reader@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { getEditorialReviewState } = await loadEditorialModule();
    const state = await getEditorialReviewState();

    expect(state).toEqual({
      kind: "unauthorized",
      userEmail: "reader@example.com",
    });
    expect(createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("keeps editorial review render-safe when no stored signal snapshot exists", async () => {
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock([]));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { getEditorialReviewState } = await loadEditorialModule();
    const state = await getEditorialReviewState();

    expect(state).toMatchObject({
      kind: "authorized",
      posts: [],
      currentTopFive: [],
      latestBriefingDate: null,
      storageReady: true,
      warning:
        "No stored Top 5 signal snapshot exists yet. This page stays read-only until signal posts have been persisted.",
    });
    expect(generateDailyBriefing).not.toHaveBeenCalled();
  });

  it("fails editorial review visibly when the signal_posts schema preflight is missing columns", async () => {
    createSupabaseServiceRoleClient.mockReturnValue(
      createSupabaseMock([], {
        missingColumns: ["why_it_matters_validation_status"],
      }),
    );
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { getEditorialReviewState } = await loadEditorialModule();
    const state = await getEditorialReviewState();

    expect(state.kind).toBe("authorized");
    if (state.kind !== "authorized") return;
    expect(state.posts).toEqual([]);
    expect(state.storageReady).toBe(false);
    expect(state.warning).toBe(
      "signal_posts schema preflight failed. Missing expected columns: why_it_matters_validation_status.",
    );
  });

  it("loads editorial history in stable reverse briefing-date order", async () => {
    const rows = [
      createRow({
        id: "signal-apr23",
        briefing_date: "2026-04-23",
        rank: 1,
        signal_score: 99,
        created_at: "2026-04-23T08:00:00.000Z",
        updated_at: "2026-04-26T12:00:00.000Z",
      }),
      createRow({
        id: "signal-apr26-b",
        briefing_date: "2026-04-26",
        rank: 2,
        signal_score: 75,
        created_at: "2026-04-26T08:00:00.000Z",
        updated_at: "2026-04-24T12:00:00.000Z",
      }),
      createRow({
        id: "signal-apr25",
        briefing_date: "2026-04-25",
        rank: 1,
        signal_score: 88,
        created_at: "2026-04-25T08:00:00.000Z",
        updated_at: "2026-04-25T12:00:00.000Z",
      }),
      createRow({
        id: "signal-apr26-a",
        briefing_date: "2026-04-26",
        rank: 1,
        signal_score: 95,
        created_at: "2026-04-26T08:00:00.000Z",
        updated_at: "2026-04-23T12:00:00.000Z",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { getEditorialReviewState } = await loadEditorialModule();
    const state = await getEditorialReviewState(undefined, { scope: "all" });

    expect(state.kind).toBe("authorized");
    if (state.kind !== "authorized") return;
    expect(state.posts.map((post) => post.id)).toEqual([
      "signal-apr26-a",
      "signal-apr26-b",
      "signal-apr25",
      "signal-apr23",
    ]);
  });

  it("lets an admin save a draft", async () => {
    const rows = [createRow({ id: "signal-1" })];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { saveSignalDraft } = await loadEditorialModule();
    const result = await saveSignalDraft({
      postId: "signal-1",
      editedWhyItMatters: " Human edited draft ",
    });

    expect(result.ok).toBe(true);
    expect(rows[0].edited_why_it_matters).toBe("Human edited draft");
    expect(rows[0].editorial_status).toBe("draft");
    expect(rows[0].edited_by).toBe("admin@example.com");
  });

  it("stores structured editorial draft content while preserving legacy text output", async () => {
    const rows = [createRow({ id: "signal-1" })];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const structured = {
      preview: "Short homepage teaser.",
      thesis: "Core editorial thesis.",
      sections: [
        { title: "Demand signal", body: "The update changes what buyers are likely to do next." },
      ],
    };
    const { saveSignalDraft } = await loadEditorialModule();
    const result = await saveSignalDraft({
      postId: "signal-1",
      editedWhyItMatters: "Fallback copy",
      editedWhyItMattersStructured: structured,
    });

    expect(result.ok).toBe(true);
    expect(rows[0].edited_why_it_matters).toBe(
      "Core editorial thesis.\n\nDemand signal: The update changes what buyers are likely to do next.",
    );
    expect(rows[0].edited_why_it_matters_payload).toEqual(structured);
  });

  it("lets an admin edit approved posts without moving them back to draft", async () => {
    const rows = [createRow({ id: "signal-1", editorial_status: "approved" })];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { saveSignalDraft } = await loadEditorialModule();
    const result = await saveSignalDraft({
      postId: "signal-1",
      editedWhyItMatters: "Updated historical editorial text.",
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe("Editorial changes saved.");
    expect(rows[0].edited_why_it_matters).toBe("Updated historical editorial text.");
    expect(rows[0].editorial_status).toBe("approved");
  });

  it("lets an admin edit published posts without unpublishing them", async () => {
    const rows = [createRow({ id: "signal-1", editorial_status: "published" })];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { saveSignalDraft } = await loadEditorialModule();
    const result = await saveSignalDraft({
      postId: "signal-1",
      editedWhyItMatters: "Updated published editorial text.",
    });

    expect(result.ok).toBe(true);
    expect(rows[0].edited_why_it_matters).toBe("Updated published editorial text.");
    expect(rows[0].published_why_it_matters).toBe("Updated published editorial text.");
    expect(rows[0].editorial_status).toBe("published");
  });

  it("lets an admin approve a signal post with editorial text", async () => {
    const rows = [createRow({ id: "signal-1" })];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { approveSignalPost } = await loadEditorialModule();
    const result = await approveSignalPost({
      postId: "signal-1",
      editedWhyItMatters: "Human approved why it matters.",
    });

    expect(result.ok).toBe(true);
    expect(rows[0].edited_why_it_matters).toBe("Human approved why it matters.");
    expect(rows[0].editorial_status).toBe("approved");
    expect(rows[0].approved_by).toBe("admin@example.com");
  });

  it("lets an admin approve multiple loaded signal posts", async () => {
    const rows = Array.from({ length: 3 }, (_, index) =>
      createRow({
        id: `signal-${index + 1}`,
        rank: index + 1,
      }),
    );
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { approveSignalPosts } = await loadEditorialModule();
    const result = await approveSignalPosts({
      posts: rows.map((row) => ({
        postId: row.id,
        editedWhyItMatters: `Bulk approved ${row.rank}`,
      })),
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe("Approved 3 signal posts.");
    expect(rows.every((row) => row.editorial_status === "approved")).toBe(true);
    expect(rows.every((row) => row.approved_by === "admin@example.com")).toBe(true);
  });

  it("reports partial bulk approval failures without hiding successful approvals", async () => {
    const rows = [
      createRow({ id: "signal-1", rank: 1 }),
      createRow({ id: "signal-2", rank: 2 }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { approveSignalPosts } = await loadEditorialModule();
    const result = await approveSignalPosts({
      posts: [
        { postId: "signal-1", editedWhyItMatters: "Ready for approval." },
        { postId: "signal-2", editedWhyItMatters: " " },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Approved 1 signal posts. 1 could not be approved.");
    expect(rows[0].editorial_status).toBe("approved");
    expect(rows[1].editorial_status).toBe("needs_review");
  });

  it("does not bulk approve already approved or published posts", async () => {
    const rows = [
      createRow({ id: "signal-1", rank: 1, editorial_status: "approved" }),
      createRow({ id: "signal-2", rank: 2, editorial_status: "published" }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { approveSignalPosts } = await loadEditorialModule();
    const result = await approveSignalPosts({
      posts: rows.map((row) => ({
        postId: row.id,
        editedWhyItMatters: "Should not be bulk approved.",
      })),
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("There are no Draft or Needs Review signal posts to approve.");
    expect(rows[0].editorial_status).toBe("approved");
    expect(rows[1].editorial_status).toBe("published");
  });

  it("blocks publishing unless all five signal posts are approved", async () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      createRow({
        id: `signal-${index + 1}`,
        rank: index + 1,
        edited_why_it_matters: `Human final ${index + 1}`,
        editorial_status: index === 4 ? "draft" : "approved",
      }),
    );
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { publishApprovedSignals } = await loadEditorialModule();
    const result = await publishApprovedSignals();

    expect(result.ok).toBe(false);
    expect(result.code).toBe("publish_blocked");
    expect(rows.some((row) => row.editorial_status === "published")).toBe(false);
  });

  it("publishes approved edits without promoting unapproved depth fallback text", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        rank: 1,
        edited_why_it_matters: "Newly approved editorial update.",
        editorial_status: "approved",
      }),
      ...Array.from({ length: 4 }, (_, index) =>
        createRow({
          id: `signal-${index + 2}`,
          rank: index + 2,
          edited_why_it_matters: `Existing edited ${index + 2}`,
          published_why_it_matters: `Existing published ${index + 2}`,
          editorial_status: "published",
        }),
      ),
      createRow({
        id: "signal-6",
        rank: 6,
        ai_why_it_matters: "Generated category-depth context.",
        editorial_status: "needs_review",
      }),
      createRow({
        id: "signal-7",
        rank: 7,
        edited_why_it_matters: "Edited category-depth context.",
        editorial_status: "draft",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { publishApprovedSignals } = await loadEditorialModule();
    const result = await publishApprovedSignals();

    expect(result.ok).toBe(true);
    expect(rows.slice(0, 5).every((row) => row.editorial_status === "published")).toBe(true);
    expect(rows[0].published_why_it_matters).toBe("Newly approved editorial update.");
    expect(rows[1].published_why_it_matters).toBe("Existing edited 2");
    expect(rows[5].editorial_status).toBe("needs_review");
    expect(rows[5].published_why_it_matters).toBeNull();
    expect(rows[5].is_live).toBe(false);
    expect(rows[6].editorial_status).toBe("draft");
    expect(rows[6].published_why_it_matters).toBeNull();
    expect(rows[6].is_live).toBe(false);
  });

  it("persists a new daily Top 5 snapshot with bounded public depth and archives the previous live set", async () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      createRow({
        id: `live-${index + 1}`,
        briefing_date: "2026-04-24",
        rank: index + 1,
        editorial_status: "published",
        published_why_it_matters: `Published ${index + 1}`,
        is_live: true,
      }),
    );
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { persistSignalPostsForBriefing } = await loadEditorialModule();
    const result = await persistSignalPostsForBriefing({
      briefingDate: "2026-04-25",
      items: Array.from({ length: 8 }, (_, index) => createBriefingItem(index + 1)),
    });

    expect(result.ok).toBe(true);
    expect(result.insertedCount).toBe(8);
    expect(rows.filter((row) => row.briefing_date === "2026-04-24").every((row) => row.is_live === false)).toBe(true);

    const insertedRows = rows.filter((row) => row.briefing_date === "2026-04-25");
    expect(insertedRows).toHaveLength(8);
    expect(insertedRows.every((row) => row.is_live === true)).toBe(true);
    expect(insertedRows.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("flags malformed why-it-matters drafts without blocking signal snapshot persistence", async () => {
    const rows: SignalPostRow[] = [];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { persistSignalPostsForBriefing } = await loadEditorialModule();
    const result = await persistSignalPostsForBriefing({
      briefingDate: "2026-04-25",
      items: Array.from({ length: 5 }, (_, index) => ({
        ...createBriefingItem(index + 1),
        aiWhyItMatters:
          index === 0
            ? "This changes how investors price rates, demand, or risk in rates and equities over"
            : "Anthropic's growth is now structurally tied to Google and Amazon's infrastructure — not independent of it. At scale, that's a dependency, not just a partnership.",
      })),
    });

    expect(result.ok).toBe(true);
    expect(result.insertedCount).toBe(5);
    expect(rows[0].editorial_status).toBe("needs_review");
    expect(rows[0].why_it_matters_validation_status).toBe("requires_human_rewrite");
    expect(rows[0].why_it_matters_validation_failures).toContain("template_placeholder_language");
    expect(rows[0].why_it_matters_validation_details.length).toBeGreaterThan(1);
    expect(rows[1].why_it_matters_validation_status).toBe("passed");
  });

  it("does not overwrite an existing daily snapshot for the same briefing date", async () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      createRow({
        id: `existing-${index + 1}`,
        briefing_date: "2026-04-25",
        rank: index + 1,
        title: `Existing Signal ${index + 1}`,
        edited_why_it_matters: `Existing editorial ${index + 1}`,
        editorial_status: "approved",
        is_live: true,
      }),
    );
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { persistSignalPostsForBriefing } = await loadEditorialModule();
    const result = await persistSignalPostsForBriefing({
      briefingDate: "2026-04-25",
      items: Array.from({ length: 5 }, (_, index) => ({
        ...createBriefingItem(index + 1),
        title: `Replacement Signal ${index + 1}`,
      })),
    });

    expect(result.ok).toBe(true);
    expect(result.insertedCount).toBe(0);
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.title)).toEqual([
      "Existing Signal 1",
      "Existing Signal 2",
      "Existing Signal 3",
      "Existing Signal 4",
      "Existing Signal 5",
    ]);
    expect(rows.every((row) => row.is_live === true)).toBe(true);
  });

  it("publishes an individual approved signal post for homepage visibility", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        rank: 1,
        briefing_date: "2026-04-20",
        edited_why_it_matters: "Approved historical editorial update.",
        editorial_status: "approved",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { publishSignalPost } = await loadEditorialModule();
    const result = await publishSignalPost({ postId: "signal-1" });

    expect(result.ok).toBe(true);
    expect(result.message).toBe("Signal post published.");
    expect(rows[0].editorial_status).toBe("published");
    expect(rows[0].published_why_it_matters).toBe("Approved historical editorial update.");
  });

  it("captures individual publish storage failures as RSS publish failures", async () => {
    const row = createRow({
      id: "signal-1",
      rank: 1,
      briefing_date: "2026-04-20",
      edited_why_it_matters: "Approved historical editorial update.",
      editorial_status: "approved",
    });
    createSupabaseServiceRoleClient.mockReturnValue({
      from() {
        let operation: "select" | "update" | null = null;
        const builder = {
          select() {
            operation = "select";
            return builder;
          },
          update() {
            operation = "update";
            return builder;
          },
          eq() {
            if (operation === "update") {
              return Promise.resolve({ error: { message: "write failed" } });
            }

            return builder;
          },
          maybeSingle() {
            return Promise.resolve({ data: row, error: null });
          },
        };

        return builder;
      },
    });
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { publishSignalPost } = await loadEditorialModule();
    const result = await publishSignalPost({ postId: "signal-1" });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("storage_error");
    expect(captureRssFailure).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        failureType: "rss_cache_write_failed",
        phase: "publish",
        extra: expect.objectContaining({
          operation: "publish_signal_post",
          postId: "signal-1",
        }),
      }),
    );
  });

  it("publishes structured approved signal post payloads for homepage rendering", async () => {
    const structured = {
      preview: "Structured teaser.",
      thesis: "Structured thesis.",
      sections: [{ title: "Why now", body: "The signal changes near-term planning." }],
    };
    const rows = [
      createRow({
        id: "signal-1",
        rank: 1,
        briefing_date: "2026-04-20",
        edited_why_it_matters: "Structured thesis.\n\nWhy now: The signal changes near-term planning.",
        edited_why_it_matters_payload: structured,
        editorial_status: "approved",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { publishSignalPost } = await loadEditorialModule();
    const result = await publishSignalPost({ postId: "signal-1" });

    expect(result.ok).toBe(true);
    expect(rows[0].published_why_it_matters_payload).toEqual(structured);
  });

  it("blocks individual publishing until the signal post is approved", async () => {
    const rows = [createRow({ id: "signal-1", editorial_status: "draft" })];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { publishSignalPost } = await loadEditorialModule();
    const result = await publishSignalPost({ postId: "signal-1" });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Approve this signal post before publishing it.");
    expect(rows[0].editorial_status).toBe("draft");
    expect(rows[0].published_why_it_matters).toBeNull();
  });

  it("loads only the live published Top 5 for the public signals surface", async () => {
    const rows = [
      ...Array.from({ length: 7 }, (_, index) =>
        createRow({
          id: `live-${index + 1}`,
          rank: index + 1,
          briefing_date: "2026-04-24",
          editorial_status: "published",
          published_why_it_matters: `Live published ${index + 1}`,
          is_live: true,
        }),
      ),
      createRow({
        id: "archived-1",
        rank: 1,
        briefing_date: "2026-04-23",
        editorial_status: "published",
        published_why_it_matters: "Archived published 1",
        is_live: false,
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { getPublishedSignalPosts } = await loadEditorialModule();
    const posts = await getPublishedSignalPosts();

    expect(posts).toHaveLength(5);
    expect(posts.map((post) => post.id)).toEqual(["live-1", "live-2", "live-3", "live-4", "live-5"]);
  });

  it("uses today's published rows as the homepage Tier 1 signal set", async () => {
    const rows = Array.from({ length: 7 }, (_, index) =>
      createRow({
        id: `live-${index + 1}`,
        rank: index + 1,
        briefing_date: "2026-04-26",
        editorial_status: "published",
        published_why_it_matters: `Live published ${index + 1}`,
        is_live: true,
      }),
    );
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { getHomepageSignalSnapshot } = await loadEditorialModule();
    const snapshot = await getHomepageSignalSnapshot({ today: new Date("2026-04-26T12:00:00.000Z") });

    expect(snapshot.source).toBe("published_live");
    expect(snapshot.briefingDate).toBe("2026-04-26");
    expect(snapshot.posts.map((post) => post.id)).toEqual(["live-1", "live-2", "live-3", "live-4", "live-5"]);
    expect(snapshot.depthPosts.map((post) => post.id)).toEqual([
      "live-1",
      "live-2",
      "live-3",
      "live-4",
      "live-5",
      "live-6",
      "live-7",
    ]);
  });

  it("uses the most recent published rows as homepage Tier 2 when today's set is not published", async () => {
    const rows = [
      createRow({
        id: "today-review",
        briefing_date: "2026-04-26",
        rank: 1,
        editorial_status: "needs_review",
        ai_why_it_matters: "Today still needs editorial review.",
        why_it_matters_validation_status: "requires_human_rewrite",
        why_it_matters_validation_failures: ["minimum_specificity"],
        why_it_matters_validation_details: ["missing specificity"],
        is_live: true,
      }),
      createRow({
        id: "recent-1",
        briefing_date: "2026-04-25",
        rank: 1,
        editorial_status: "published",
        published_why_it_matters: "Most recent published editorial text",
        is_live: false,
      }),
      createRow({
        id: "recent-2",
        briefing_date: "2026-04-25",
        rank: 2,
        editorial_status: "published",
        published_why_it_matters: "Second recent published editorial text",
        is_live: false,
      }),
      createRow({
        id: "recent-empty-copy",
        briefing_date: "2026-04-25",
        rank: 3,
        editorial_status: "published",
        published_why_it_matters: null,
        is_live: false,
      }),
      createRow({
        id: "older-1",
        briefing_date: "2026-04-24",
        rank: 1,
        editorial_status: "published",
        published_why_it_matters: "Older published copy",
        is_live: false,
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { getHomepageSignalSnapshot } = await loadEditorialModule();
    const snapshot = await getHomepageSignalSnapshot({ today: new Date("2026-04-26T12:00:00.000Z") });

    expect(snapshot.source).toBe("recent_published");
    expect(snapshot.briefingDate).toBe("2026-04-25");
    expect(snapshot.posts.map((post) => post.id)).toEqual(["recent-1", "recent-2"]);
    expect(snapshot.depthPosts.map((post) => post.id)).toEqual(["recent-1", "recent-2"]);
    expect(snapshot.posts.some((post) => post.aiWhyItMatters === "Today still needs editorial review.")).toBe(false);
  });

  it("returns Tier 3 empty state data when no published signal set exists", async () => {
    const rows = [
      createRow({
        id: "rewrite-1",
        briefing_date: "2026-04-26",
        rank: 1,
        editorial_status: "needs_review",
        ai_why_it_matters: "It keeps the technology rail readable without pretending the app has current live coverage when stored data is unavailable.",
        why_it_matters_validation_status: "requires_human_rewrite",
        why_it_matters_validation_failures: ["minimum_specificity"],
        why_it_matters_validation_details: ["missing specificity"],
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { getHomepageSignalSnapshot } = await loadEditorialModule();
    const snapshot = await getHomepageSignalSnapshot({ today: new Date("2026-04-26T12:00:00.000Z") });

    expect(snapshot).toEqual({
      source: "none",
      posts: [],
      depthPosts: [],
      briefingDate: null,
    });
  });

  it("keeps quality-gate-rejected rows in the editorial queue with failure reasons", async () => {
    const rows = [
      createRow({
        id: "rewrite-1",
        briefing_date: "2026-04-25",
        rank: 1,
        editorial_status: "needs_review",
        ai_why_it_matters: "It keeps the technology rail readable without pretending the app has current live coverage when stored data is unavailable.",
        why_it_matters_validation_status: "requires_human_rewrite",
        why_it_matters_validation_failures: ["minimum_specificity"],
        why_it_matters_validation_details: ["missing specific noun: no named entity, number, country, organization, or person found"],
      }),
      createRow({
        id: "approved-1",
        briefing_date: "2026-04-25",
        rank: 2,
        editorial_status: "approved",
        edited_why_it_matters: "Human editor rewrote the card with Google-specific infrastructure context.",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { getEditorialReviewState } = await loadEditorialModule();
    const state = await getEditorialReviewState();

    expect(state.kind).toBe("authorized");
    if (state.kind !== "authorized") {
      return;
    }

    const rejected = state.posts.find((post) => post.id === "rewrite-1");
    expect(rejected?.editorialStatus).toBe("needs_review");
    expect(rejected?.whyItMattersValidationStatus).toBe("requires_human_rewrite");
    expect(rejected?.whyItMattersValidationFailures).toEqual(["minimum_specificity"]);
    expect(rejected?.whyItMattersValidationDetails).toContain(
      "missing specific noun: no named entity, number, country, organization, or person found",
    );
  });

  it("blocks signal_posts insertion visibly when the schema preflight is missing columns", async () => {
    createSupabaseServiceRoleClient.mockReturnValue(
      createSupabaseMock([], {
        missingColumns: ["why_it_matters_validation_details"],
      }),
    );

    const { persistSignalPostsForBriefing } = await loadEditorialModule();
    const result = await persistSignalPostsForBriefing({
      briefingDate: "2026-04-25",
      items: [1, 2, 3, 4, 5].map(createBriefingItem),
    });

    expect(result).toEqual({
      ok: false,
      briefingDate: "2026-04-25",
      insertedCount: 0,
      message: "signal_posts schema preflight failed. Missing expected columns: why_it_matters_validation_details.",
    });
  });

  it("returns a homepage snapshot schema error instead of silently emptying public results", async () => {
    createSupabaseServiceRoleClient.mockReturnValue(
      createSupabaseMock([], {
        missingColumns: ["why_it_matters_validation_failures"],
      }),
    );

    const { getHomepageSignalSnapshot } = await loadEditorialModule();
    const snapshot = await getHomepageSignalSnapshot({
      today: new Date("2026-04-26T12:00:00.000Z"),
    });

    expect(snapshot).toEqual({
      source: "none",
      posts: [],
      depthPosts: [],
      briefingDate: null,
      errorMessage: "signal_posts schema preflight failed. Missing expected columns: why_it_matters_validation_failures.",
    });
  });
});
