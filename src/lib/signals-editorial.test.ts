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
  final_slate_rank: number | null;
  final_slate_tier: "core" | "context" | null;
  editorial_decision: "pending_review" | "draft_edited" | "approved" | "rewrite_requested" | "rejected" | "held" | "removed_from_slate" | null;
  decision_note: string | null;
  rejected_reason: string | null;
  held_reason: string | null;
  replacement_of_row_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
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

function createValidWhyItMatters(label = "Anthropic") {
  return `${label}'s growth is now structurally tied to Google and Amazon's infrastructure, not independent of it. At scale, that's a dependency, not just a partnership.`;
}

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
    final_slate_rank: overrides.final_slate_rank ?? null,
    final_slate_tier: overrides.final_slate_tier ?? null,
    editorial_decision: overrides.editorial_decision ?? null,
    decision_note: overrides.decision_note ?? null,
    rejected_reason: overrides.rejected_reason ?? null,
    held_reason: overrides.held_reason ?? null,
    replacement_of_row_id: overrides.replacement_of_row_id ?? null,
    reviewed_by: overrides.reviewed_by ?? null,
    reviewed_at: overrides.reviewed_at ?? null,
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

function createFinalSlateRow(slot: number, overrides: Partial<SignalPostRow> = {}) {
  return createRow({
    id: `slate-${slot}`,
    briefing_date: "2026-04-30",
    rank: slot,
    edited_why_it_matters: createValidWhyItMatters(`Slate ${slot}`),
    editorial_status: "approved",
    editorial_decision: "approved",
    final_slate_rank: slot,
    final_slate_tier: slot <= 5 ? "core" : "context",
    is_live: false,
    published_at: null,
    ...overrides,
  });
}

function createValidFinalSlate(overrides: Record<number, Partial<SignalPostRow>> = {}) {
  return Array.from({ length: 7 }, (_, index) => {
    const slot = index + 1;
    return createFinalSlateRow(slot, overrides[slot] ?? {});
  });
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
  options: { missingColumns?: string[]; preflightTransportErrorColumns?: string[] } = {},
) {
  const missingColumns = new Set(options.missingColumns ?? []);
  const preflightTransportErrorColumns = new Set(options.preflightTransportErrorColumns ?? []);

  return {
    rows,
    from(tableName: string) {
      expect(tableName).toBe("signal_posts");

      let operation: "select" | "update" | "insert" | null = null;
      let updateValues: Partial<SignalPostRow> = {};
      let insertedRows: SignalPostRow[] = [];
      let selectError: { message: string } | null = null;
      let selectedColumns: string[] = [];
      const filters: Array<{ column: keyof SignalPostRow; value: unknown }> = [];
      const inclusionFilters: Array<{ column: keyof SignalPostRow; values: unknown[] }> = [];
      const lessThanFilters: Array<{ column: keyof SignalPostRow; value: unknown }> = [];
      const notNullFilters: Array<{ column: keyof SignalPostRow }> = [];
      let orSearch = "";
      const orderRules: Array<{ column: keyof SignalPostRow; ascending: boolean }> = [];
      let rangeStart: number | null = null;
      let rangeEnd: number | null = null;

      function applyFilters() {
        return rows.filter((row) =>
          filters.every((filter) => row[filter.column] === filter.value) &&
          inclusionFilters.every((filter) => filter.values.includes(row[filter.column])) &&
          lessThanFilters.every((filter) => {
            const rowValue = row[filter.column];
            return typeof rowValue === "number" && typeof filter.value === "number"
              ? rowValue < filter.value
              : String(rowValue) < String(filter.value);
          }) &&
          notNullFilters.every((filter) => row[filter.column] !== null) &&
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
          if (operation !== "insert") {
            operation = "select";
          }
          selectedColumns = String(columns ?? "")
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
          const shouldReturnPreflightTransportError =
            count === 0 && selectedColumns.some((column) => preflightTransportErrorColumns.has(column));

          if (shouldReturnPreflightTransportError) {
            return Promise.resolve({
              data: null,
              error: { message: "TypeError: fetch failed" },
              count: 0,
            });
          }

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
          operation = "insert";
          insertedRows = [];
          values.forEach((value, index) => {
            const row = createRow({ id: `inserted-${index + 1}`, ...value });
            rows.push(row);
            insertedRows.push(row);
          });

          return builder;
        },
        update(values: Partial<SignalPostRow>) {
          operation = "update";
          updateValues = values;
          return builder;
        },
        eq(column: keyof SignalPostRow, value: unknown) {
          filters.push({ column, value });

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
        not(column: keyof SignalPostRow, operator: string, value: unknown) {
          if (operator === "is" && value === null) {
            notNullFilters.push({ column });
          }

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

          if (operation === "insert") {
            return Promise.resolve({
              data: insertedRows,
              error: null,
              count: insertedRows.length,
            }).then(onfulfilled, onrejected);
          }

          if (operation === "update") {
            applyFilters().forEach((row) => {
              Object.assign(row, updateValues);
            });

            return Promise.resolve({ data: [], error: null, count: 0 }).then(onfulfilled, onrejected);
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
      editedWhyItMatters: ` ${createValidWhyItMatters()} `,
    });

    expect(result.ok).toBe(true);
    expect(rows[0].edited_why_it_matters).toBe(createValidWhyItMatters());
    expect(rows[0].editorial_status).toBe("draft");
    expect(rows[0].edited_by).toBe("admin@example.com");
    expect(rows[0].is_live).toBe(false);
    expect(rows[0].published_at).toBeNull();
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
      editedWhyItMatters: createValidWhyItMatters("Google"),
    });

    expect(result.ok).toBe(true);
    expect(result.message).toBe("Editorial changes saved.");
    expect(rows[0].edited_why_it_matters).toBe(createValidWhyItMatters("Google"));
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
      editedWhyItMatters: createValidWhyItMatters("Google"),
    });

    expect(result.ok).toBe(true);
    expect(rows[0].edited_why_it_matters).toBe(createValidWhyItMatters("Google"));
    expect(rows[0].published_why_it_matters).toBe(createValidWhyItMatters("Google"));
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
      editedWhyItMatters: createValidWhyItMatters(),
    });

    expect(result.ok).toBe(true);
    expect(rows[0].edited_why_it_matters).toBe(createValidWhyItMatters());
    expect(rows[0].editorial_status).toBe("approved");
    expect(rows[0].approved_by).toBe("admin@example.com");
    expect(rows[0].is_live).toBe(false);
    expect(rows[0].published_at).toBeNull();
  });

  it("blocks approval when the human rewrite still fails validation", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        why_it_matters_validation_status: "requires_human_rewrite",
        why_it_matters_validation_failures: ["minimum_specificity"],
        why_it_matters_validation_details: ["missing specificity"],
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { approveSignalPost } = await loadEditorialModule();
    const result = await approveSignalPost({
      postId: "signal-1",
      editedWhyItMatters: "This changes capital availability, competitive positioning, or market structure.",
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("publish_blocked");
    expect(rows[0].editorial_status).toBe("needs_review");
    expect(rows[0].why_it_matters_validation_status).toBe("requires_human_rewrite");
    expect(rows[0].why_it_matters_validation_failures).toContain("template_placeholder_language");
    expect(rows[0].why_it_matters_validation_details.length).toBeGreaterThan(0);
  });

  it("lets a human-rewritten valid why-it-matters pass after a rejected draft", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        why_it_matters_validation_status: "requires_human_rewrite",
        why_it_matters_validation_failures: ["minimum_specificity"],
        why_it_matters_validation_details: ["missing specificity"],
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { approveSignalPost } = await loadEditorialModule();
    const result = await approveSignalPost({
      postId: "signal-1",
      editedWhyItMatters: createValidWhyItMatters(),
    });

    expect(result.ok).toBe(true);
    expect(rows[0].editorial_status).toBe("approved");
    expect(rows[0].why_it_matters_validation_status).toBe("passed");
    expect(rows[0].why_it_matters_validation_failures).toEqual([]);
    expect(rows[0].why_it_matters_validation_details).toEqual([]);
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
        editedWhyItMatters: createValidWhyItMatters(`Anthropic ${row.rank}`),
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
        { postId: "signal-1", editedWhyItMatters: createValidWhyItMatters() },
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
    expect(result.message).toBe(
      "There are no Draft or Needs Review signal posts without blocking editorial decisions to approve.",
    );
    expect(rows[0].editorial_status).toBe("approved");
    expect(rows[1].editorial_status).toBe("published");
  });

  it("blocks publishing unless all seven final-slate rows are approved", async () => {
    const rows = createValidFinalSlate({
      7: {
        editorial_status: "draft",
        editorial_decision: "draft_edited",
      },
    });
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

  it("blocks final-slate publishing when fewer than seven rows are selected", async () => {
    const rows = createValidFinalSlate().slice(0, 3);
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { publishApprovedSignals } = await loadEditorialModule();
    const result = await publishApprovedSignals();

    expect(result).toMatchObject({
      ok: false,
      code: "publish_blocked",
    });
    expect(result.message).toContain("Final slate requires exactly 7 selected rows. Current count: 3.");
    expect(rows.every((row) => row.editorial_status === "approved")).toBe(true);
    expect(rows.every((row) => row.is_live === false)).toBe(true);
    expect(rows.every((row) => row.published_at === null)).toBe(true);
  });

  it.each([
    {
      label: "held",
      overrides: { editorial_decision: "held" as const },
      expectedMessage: "Selected row is marked held.",
    },
    {
      label: "rejected",
      overrides: { editorial_decision: "rejected" as const },
      expectedMessage: "Selected row is marked rejected.",
    },
    {
      label: "rewrite-requested",
      overrides: { editorial_decision: "rewrite_requested" as const },
      expectedMessage: "Selected row has rewrite_requested editorial status.",
    },
    {
      label: "WITM-failed",
      overrides: {
        why_it_matters_validation_status: "requires_human_rewrite" as const,
        why_it_matters_validation_failures: ["minimum_specificity"],
        why_it_matters_validation_details: ["missing specificity"],
      },
      expectedMessage: "Row 3 has WITM status requires_human_rewrite.",
    },
  ])("blocks final-slate publish when a selected row is $label", async ({ overrides, expectedMessage }) => {
    const rows = createValidFinalSlate({
      3: overrides,
    });
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
    expect(result.message).toContain(expectedMessage);
    expect(rows.every((row) => row.editorial_status !== "published")).toBe(true);
    expect(rows.every((row) => row.is_live === false)).toBe(true);
    expect(rows.every((row) => row.published_at === null)).toBe(true);
  });

  it.each([
    {
      label: "duplicate rank",
      overrides: { 5: { final_slate_rank: 4, final_slate_tier: "core" as const } },
      expectedMessage: "Rank 4 is duplicated.",
    },
    {
      label: "rank gap",
      overrides: { 6: { final_slate_rank: null, final_slate_tier: null } },
      expectedMessage: "Context slot 6 is empty.",
    },
    {
      label: "6 Core + 1 Context",
      overrides: { 6: { final_slate_tier: "core" as const } },
      expectedMessage: "6 Core rows selected; 5 required.",
    },
  ])("blocks final-slate publish on $label without writes", async ({ overrides, expectedMessage }) => {
    const rows = createValidFinalSlate(overrides);
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
    expect(result.message).toContain(expectedMessage);
    expect(rows.every((row) => row.editorial_status !== "published")).toBe(true);
    expect(rows.every((row) => row.is_live === false)).toBe(true);
    expect(rows.every((row) => row.published_at === null)).toBe(true);
  });

  it("blocks publishing when approved why-it-matters copy fails the pre-publish gate without mutating rows", async () => {
    const rows = createValidFinalSlate({
      1: {
        edited_why_it_matters: "This changes how investors price rates, demand, or risk in rates and equities over.",
      },
    });
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
    expect(rows[0].editorial_status).toBe("approved");
    expect(rows[0].why_it_matters_validation_status).toBe("passed");
    expect(rows[0].published_why_it_matters).toBeNull();
    expect(rows.every((row) => row.editorial_status === "approved")).toBe(true);
    expect(rows.every((row) => row.is_live === false)).toBe(true);
  });

  it("publishes exactly the selected 5 Core + 2 Context slate without promoting non-selected candidates", async () => {
    const rows = [
      ...createValidFinalSlate({
        5: {
          id: "promoted-rank-8",
          rank: 8,
          final_slate_rank: 5,
          final_slate_tier: "core",
          edited_why_it_matters: createValidWhyItMatters("Promoted replacement"),
        },
      }),
      createRow({
        id: "rank-8-not-selected",
        briefing_date: "2026-04-30",
        rank: 8,
        ai_why_it_matters: "Generated category-depth context.",
        editorial_status: "needs_review",
      }),
      createRow({
        id: "approved-not-selected",
        briefing_date: "2026-04-30",
        rank: 9,
        edited_why_it_matters: createValidWhyItMatters("Non-selected"),
        editorial_status: "approved",
        editorial_decision: "approved",
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
    expect(rows.filter((row) => row.is_live)).toHaveLength(7);
    expect(rows.slice(0, 7).every((row) => row.editorial_status === "published")).toBe(true);
    expect(rows[4].id).toBe("promoted-rank-8");
    expect(rows[4].published_why_it_matters).toBe(createValidWhyItMatters("Promoted replacement"));
    expect(rows[7].editorial_status).toBe("needs_review");
    expect(rows[7].published_why_it_matters).toBeNull();
    expect(rows[7].is_live).toBe(false);
    expect(rows[8].editorial_status).toBe("approved");
    expect(rows[8].published_why_it_matters).toBeNull();
    expect(rows[8].is_live).toBe(false);
  });

  it("keeps live-set replacement inside the explicit publish workflow", async () => {
    const oldLiveRows = Array.from({ length: 7 }, (_, index) =>
      createRow({
        id: `old-live-${index + 1}`,
        briefing_date: "2026-04-26",
        rank: index + 1,
        editorial_status: "published",
        published_why_it_matters: createValidWhyItMatters(`Old Google ${index + 1}`),
        is_live: true,
        published_at: "2026-04-26T10:00:00.000Z",
      }),
    );
    const approvedRows = createValidFinalSlate(
      Object.fromEntries(
        Array.from({ length: 7 }, (_, index) => [
          index + 1,
          {
            id: `approved-${index + 1}`,
            briefing_date: "2026-04-30",
            edited_why_it_matters: createValidWhyItMatters(`New Google ${index + 1}`),
          },
        ]),
      ),
    );
    const rows = [...oldLiveRows, ...approvedRows];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { publishApprovedSignals, getPublishedSignalPosts } = await loadEditorialModule();
    const result = await publishApprovedSignals();

    expect(result.ok).toBe(true);
    expect(result.message).toBe("Published final slate: 5 Core + 2 Context rows are live. Archived 7 previous live rows.");
    expect(oldLiveRows.every((row) => row.is_live === false)).toBe(true);
    expect(approvedRows.every((row) => row.editorial_status === "published")).toBe(true);
    expect(approvedRows.every((row) => row.is_live === true)).toBe(true);
    expect(approvedRows.every((row) => row.published_at !== null)).toBe(true);
    expect(approvedRows[0].published_why_it_matters).toBe(createValidWhyItMatters("New Google 1"));
    await expect(getPublishedSignalPosts()).resolves.toHaveLength(7);
  });

  it("persists generated signal posts for editorial review without changing the live public set", async () => {
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
    expect(result.insertedPostIds).toEqual([
      "inserted-1",
      "inserted-2",
      "inserted-3",
      "inserted-4",
      "inserted-5",
      "inserted-6",
      "inserted-7",
      "inserted-8",
    ]);
    expect(rows.filter((row) => row.briefing_date === "2026-04-24").every((row) => row.is_live === true)).toBe(true);

    const insertedRows = rows.filter((row) => row.briefing_date === "2026-04-25");
    expect(insertedRows).toHaveLength(8);
    expect(insertedRows.every((row) => row.editorial_status === "needs_review")).toBe(true);
    expect(insertedRows.every((row) => row.is_live === false)).toBe(true);
    expect(insertedRows.every((row) => row.published_at === null)).toBe(true);
    expect(insertedRows.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("draft_only mode persists only review rows with validation details", async () => {
    const rows: SignalPostRow[] = [];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { persistSignalPostsForBriefing } = await loadEditorialModule();
    const result = await persistSignalPostsForBriefing({
      briefingDate: "2026-04-27",
      mode: "draft_only",
      items: Array.from({ length: 7 }, (_, index) => ({
        ...createBriefingItem(index + 1),
        aiWhyItMatters:
          index === 0
            ? "This changes how investors price rates, demand, or risk in rates and equities over"
            : createValidWhyItMatters(`Google ${index + 1}`),
      })),
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("draft_only");
    expect(result.insertedCount).toBe(7);
    expect(result.insertedPostIds).toEqual([
      "inserted-1",
      "inserted-2",
      "inserted-3",
      "inserted-4",
      "inserted-5",
      "inserted-6",
      "inserted-7",
    ]);
    expect(rows).toHaveLength(7);
    expect(rows.every((row) => row.editorial_status === "needs_review")).toBe(true);
    expect(rows.every((row) => row.is_live === false)).toBe(true);
    expect(rows.every((row) => row.published_at === null)).toBe(true);
    expect(rows[0].why_it_matters_validation_status).toBe("requires_human_rewrite");
    expect(rows[0].why_it_matters_validation_failures).toContain("template_placeholder_language");
    expect(rows[1].why_it_matters_validation_status).toBe("passed");
  });

  it("draft_only mode preserves supplied WITM validation metadata instead of recomputing it", async () => {
    const rows: SignalPostRow[] = [];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { persistSignalPostsForBriefing } = await loadEditorialModule();
    const result = await persistSignalPostsForBriefing({
      briefingDate: "2026-04-29",
      mode: "draft_only",
      items: [
        {
          ...createBriefingItem(1),
          title: "Economic Letter Countdown: Most Read Topics from 2025",
          aiWhyItMatters:
            "Economic Letter Countdown: Most Read Topics from 2025, which matters because it shows which inflation, labor, and growth questions dominated institutional attention.",
          whyItMattersValidation: {
            passed: false,
            failures: ["unsupported_structural_claim"],
            failureDetails: [
              "unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication.",
            ],
            recommendedAction: "requires_human_rewrite",
          },
        },
        {
          ...createBriefingItem(2),
          aiWhyItMatters: createValidWhyItMatters("Google"),
          whyItMattersValidation: {
            passed: true,
            failures: [],
            failureDetails: [],
            recommendedAction: "approve",
          },
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.insertedCount).toBe(2);
    expect(rows.every((row) => row.editorial_status === "needs_review")).toBe(true);
    expect(rows.every((row) => row.is_live === false)).toBe(true);
    expect(rows.every((row) => row.published_at === null)).toBe(true);
    expect(rows[0].why_it_matters_validation_status).toBe("requires_human_rewrite");
    expect(rows[0].why_it_matters_validation_failures).toEqual(["unsupported_structural_claim"]);
    expect(rows[0].why_it_matters_validation_details).toEqual([
      "unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication.",
    ]);
    expect(rows[1].why_it_matters_validation_status).toBe("passed");
    expect(rows[1].why_it_matters_validation_failures).toEqual([]);
    expect(rows[1].why_it_matters_validation_details).toEqual([]);
  });

  it("draft_only mode preserves rewrite status even when a supplied failure array is empty", async () => {
    const rows: SignalPostRow[] = [];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { persistSignalPostsForBriefing } = await loadEditorialModule();
    const result = await persistSignalPostsForBriefing({
      briefingDate: "2026-04-29",
      mode: "draft_only",
      items: [
        {
          ...createBriefingItem(1),
          aiWhyItMatters: createValidWhyItMatters("Google"),
          whyItMattersValidation: {
            passed: false,
            failures: [],
            failureDetails: [],
            recommendedAction: "requires_human_rewrite",
          },
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(rows[0].why_it_matters_validation_status).toBe("requires_human_rewrite");
    expect(rows[0].why_it_matters_validation_failures).toEqual([]);
    expect(rows[0].why_it_matters_validation_details).toEqual([]);
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

  it("blocks individual row publishing so the Top 5 gate cannot be bypassed", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        rank: 1,
        briefing_date: "2026-04-20",
        edited_why_it_matters: createValidWhyItMatters("Google"),
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

    expect(result.ok).toBe(false);
    expect(result.code).toBe("publish_blocked");
    expect(result.message).toBe(
      "Individual signal publishing is disabled. Use Publish Final Slate after the 5 Core + 2 Context slate passes validation.",
    );
    expect(rows[0].editorial_status).toBe("approved");
    expect(rows[0].is_live).toBe(false);
    expect(rows[0].published_at).toBeNull();
    expect(rows[0].published_why_it_matters).toBeNull();
  });

  it("reject action clears final-slate placement and records the rejection reason", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        editorial_status: "approved",
        editorial_decision: "approved",
        final_slate_rank: 1,
        final_slate_tier: "core",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { rejectSignalPost } = await loadEditorialModule();
    const result = await rejectSignalPost({
      postId: "signal-1",
      decisionNote: "Duplicate of a stronger candidate.",
    });

    expect(result.ok).toBe(true);
    expect(rows[0].editorial_decision).toBe("rejected");
    expect(rows[0].rejected_reason).toBe("Duplicate of a stronger candidate.");
    expect(rows[0].final_slate_rank).toBeNull();
    expect(rows[0].final_slate_tier).toBeNull();
    expect(rows[0].reviewed_by).toBe("admin@example.com");
  });

  it("hold action clears final-slate placement and stores training evidence reason", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        editorial_status: "needs_review",
        final_slate_rank: 2,
        final_slate_tier: "core",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { holdSignalPost } = await loadEditorialModule();
    const result = await holdSignalPost({
      postId: "signal-1",
      decisionNote: "Useful calibration case, but unsupported structural claim.",
    });

    expect(result.ok).toBe(true);
    expect(rows[0].editorial_decision).toBe("held");
    expect(rows[0].held_reason).toBe("Useful calibration case, but unsupported structural claim.");
    expect(rows[0].final_slate_rank).toBeNull();
    expect(rows[0].final_slate_tier).toBeNull();
  });

  it("request rewrite excludes the row from readiness without publishing it", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        editorial_status: "approved",
        editorial_decision: "approved",
        final_slate_rank: 3,
        final_slate_tier: "core",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { requestSignalPostRewrite } = await loadEditorialModule();
    const result = await requestSignalPostRewrite({
      postId: "signal-1",
      decisionNote: "Needs a stronger structural link.",
    });

    expect(result.ok).toBe(true);
    expect(rows[0].editorial_status).toBe("needs_review");
    expect(rows[0].editorial_decision).toBe("rewrite_requested");
    expect(rows[0].final_slate_rank).toBeNull();
    expect(rows[0].is_live).toBe(false);
    expect(rows[0].published_at).toBeNull();
  });

  it("remove-from-slate clears placement without rejecting the row", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        editorial_status: "approved",
        editorial_decision: "approved",
        final_slate_rank: 4,
        final_slate_tier: "core",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { removeSignalPostFromFinalSlate } = await loadEditorialModule();
    const result = await removeSignalPostFromFinalSlate({ postId: "signal-1" });

    expect(result.ok).toBe(true);
    expect(rows[0].editorial_decision).toBe("approved");
    expect(rows[0].final_slate_rank).toBeNull();
    expect(rows[0].final_slate_tier).toBeNull();
  });

  it("promote assigns final-slate tier and rank through the composer model", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        editorial_status: "approved",
        editorial_decision: "approved",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { assignSignalPostToFinalSlateSlot } = await loadEditorialModule();
    const result = await assignSignalPostToFinalSlateSlot({
      postId: "signal-1",
      finalSlateRank: 1,
    });

    expect(result.ok).toBe(true);
    expect(rows[0].final_slate_rank).toBe(1);
    expect(rows[0].final_slate_tier).toBe("core");
    expect(rows[0].is_live).toBe(false);
    expect(rows[0].published_at).toBeNull();
  });

  it("demote moves a Core row to Context placement without rejecting it", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        editorial_status: "approved",
        editorial_decision: "approved",
        final_slate_rank: 2,
        final_slate_tier: "core",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { assignSignalPostToFinalSlateSlot } = await loadEditorialModule();
    const result = await assignSignalPostToFinalSlateSlot({
      postId: "signal-1",
      finalSlateRank: 6,
    });

    expect(result.ok).toBe(true);
    expect(rows[0].editorial_decision).toBe("approved");
    expect(rows[0].final_slate_rank).toBe(6);
    expect(rows[0].final_slate_tier).toBe("context");
  });

  it("blocks rejected rows from final-slate assignment", async () => {
    const rows = [
      createRow({
        id: "signal-1",
        editorial_status: "approved",
        editorial_decision: "rejected",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { assignSignalPostToFinalSlateSlot } = await loadEditorialModule();
    const result = await assignSignalPostToFinalSlateSlot({
      postId: "signal-1",
      finalSlateRank: 1,
    });

    expect(result.ok).toBe(false);
    expect(rows[0].final_slate_rank).toBeNull();
    expect(rows[0].final_slate_tier).toBeNull();
  });

  it("replacement candidate occupies the original slot and stores replacement relationship when valid", async () => {
    const rows = [
      createRow({
        id: "original",
        rank: 1,
        editorial_status: "approved",
        editorial_decision: "approved",
        final_slate_rank: 1,
        final_slate_tier: "core",
      }),
      createRow({
        id: "replacement",
        rank: 8,
        editorial_status: "approved",
        editorial_decision: "approved",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { replaceSignalPostInFinalSlate } = await loadEditorialModule();
    const result = await replaceSignalPostInFinalSlate({
      originalPostId: "original",
      replacementPostId: "replacement",
      decisionNote: "Stronger source evidence.",
    });

    expect(result.ok).toBe(true);
    expect(rows[0].editorial_decision).toBe("held");
    expect(rows[0].final_slate_rank).toBeNull();
    expect(rows[1].replacement_of_row_id).toBe("original");
    expect(rows[1].final_slate_rank).toBe(1);
    expect(rows[1].final_slate_tier).toBe("core");
    expect(rows[1].is_live).toBe(false);
    expect(rows[1].published_at).toBeNull();
  });

  it("blocks invalid replacement candidates before moving the original slot", async () => {
    const rows = [
      createRow({
        id: "original",
        editorial_status: "approved",
        editorial_decision: "approved",
        final_slate_rank: 1,
        final_slate_tier: "core",
      }),
      createRow({
        id: "replacement",
        rank: 8,
        editorial_status: "approved",
        editorial_decision: "held",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));
    safeGetUser.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      supabase: {},
      sessionCookiePresent: true,
    });

    const { replaceSignalPostInFinalSlate } = await loadEditorialModule();
    const result = await replaceSignalPostInFinalSlate({
      originalPostId: "original",
      replacementPostId: "replacement",
      decisionNote: "Try invalid replacement.",
    });

    expect(result.ok).toBe(false);
    expect(rows[0].editorial_decision).toBe("approved");
    expect(rows[0].final_slate_rank).toBe(1);
    expect(rows[1].replacement_of_row_id).toBeNull();
  });

  it("loads published Core and Context rows while excluding parked and non-public rows", async () => {
    const rows = [
      ...Array.from({ length: 7 }, (_, index) =>
        createRow({
          id: `live-${index + 1}`,
          rank: index + 1,
          briefing_date: "2026-04-24",
          editorial_status: "published",
          published_why_it_matters: createValidWhyItMatters(`Google ${index + 1}`),
          why_it_matters_validation_status: "passed",
          why_it_matters_validation_failures: [],
          why_it_matters_validation_details: [],
          is_live: true,
          published_at: `2026-04-24T08:0${index}:00.000Z`,
        }),
      ),
      createRow({
        id: "parked-rank-8",
        rank: 8,
        briefing_date: "2026-04-24",
        editorial_status: "published",
        published_why_it_matters: createValidWhyItMatters("Depth"),
        is_live: true,
        published_at: "2026-04-24T08:08:00.000Z",
      }),
      createRow({
        id: "depth-rank-10",
        rank: 10,
        briefing_date: "2026-04-24",
        editorial_status: "published",
        published_why_it_matters: createValidWhyItMatters("Depth 10"),
        is_live: true,
        published_at: "2026-04-24T08:10:00.000Z",
      }),
      createRow({
        id: "unpublished-context",
        rank: 6,
        briefing_date: "2026-04-24",
        editorial_status: "published",
        published_why_it_matters: createValidWhyItMatters("Unpublished context"),
        is_live: true,
        published_at: null,
      }),
      createRow({
        id: "non-live-context",
        rank: 7,
        briefing_date: "2026-04-24",
        editorial_status: "published",
        published_why_it_matters: createValidWhyItMatters("Non-live context"),
        is_live: false,
        published_at: "2026-04-24T08:07:00.000Z",
      }),
      createRow({
        id: "archived-1",
        rank: 1,
        briefing_date: "2026-04-23",
        editorial_status: "published",
        published_why_it_matters: "Archived published 1",
        is_live: false,
        published_at: "2026-04-23T08:00:00.000Z",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { getPublishedSignalPosts } = await loadEditorialModule();
    const posts = await getPublishedSignalPosts();

    expect(posts).toHaveLength(7);
    expect(posts.map((post) => post.id)).toEqual([
      "live-1",
      "live-2",
      "live-3",
      "live-4",
      "live-5",
      "live-6",
      "live-7",
    ]);
    expect(posts.map((post) => post.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("uses final-slate placement for public order while keeping visibility gated by live published state", async () => {
    const rows = [
      createRow({
        id: "slot-1-promoted-rank-8",
        rank: 8,
        briefing_date: "2026-04-30",
        final_slate_rank: 1,
        final_slate_tier: "core",
        editorial_status: "published",
        editorial_decision: "approved",
        published_why_it_matters: createValidWhyItMatters("Promoted"),
        is_live: true,
        published_at: "2026-04-30T08:00:00.000Z",
      }),
      ...Array.from({ length: 6 }, (_, index) => {
        const slot = index + 2;

        return createRow({
          id: `slot-${slot}`,
          rank: slot,
          briefing_date: "2026-04-30",
          final_slate_rank: slot,
          final_slate_tier: slot <= 5 ? "core" : "context",
          editorial_status: "published",
          editorial_decision: "approved",
          published_why_it_matters: createValidWhyItMatters(`Slot ${slot}`),
          is_live: true,
          published_at: "2026-04-30T08:00:00.000Z",
        });
      }),
      createRow({
        id: "approved-selected-not-live",
        rank: 1,
        briefing_date: "2026-04-30",
        final_slate_rank: 1,
        final_slate_tier: "core",
        editorial_status: "approved",
        editorial_decision: "approved",
        edited_why_it_matters: createValidWhyItMatters("Approved only"),
        is_live: false,
        published_at: null,
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { getPublishedSignalPosts, getHomepageSignalSnapshot } = await loadEditorialModule();
    const publicSignals = await getPublishedSignalPosts();
    const homepageSnapshot = await getHomepageSignalSnapshot({
      today: new Date("2026-04-30T12:00:00.000Z"),
    });

    expect(publicSignals.map((post) => post.id)).toEqual([
      "slot-1-promoted-rank-8",
      "slot-2",
      "slot-3",
      "slot-4",
      "slot-5",
      "slot-6",
      "slot-7",
    ]);
    expect(homepageSnapshot.posts.map((post) => post.id)).toEqual([
      "slot-1-promoted-rank-8",
      "slot-2",
      "slot-3",
      "slot-4",
      "slot-5",
    ]);
    expect(homepageSnapshot.depthPosts.map((post) => post.id)).toEqual([
      "slot-1-promoted-rank-8",
      "slot-2",
      "slot-3",
      "slot-4",
      "slot-5",
      "slot-6",
      "slot-7",
    ]);
  });

  it("keeps approved but unpublished rows out of public signal and homepage reads", async () => {
    const rows = Array.from({ length: 3 }, (_, index) =>
      createRow({
        id: `approved-unpublished-${index + 1}`,
        briefing_date: "2026-04-28",
        rank: index + 1,
        edited_why_it_matters: createValidWhyItMatters(`Phase B ${index + 1}`),
        editorial_status: "approved",
        is_live: false,
        published_at: null,
      }),
    );
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { getPublishedSignalPosts, getHomepageSignalSnapshot } = await loadEditorialModule();
    const publicSignals = await getPublishedSignalPosts();
    const homepageSnapshot = await getHomepageSignalSnapshot({
      today: new Date("2026-04-28T12:00:00.000Z"),
    });

    expect(publicSignals).toEqual([]);
    expect(homepageSnapshot).toEqual({
      source: "none",
      posts: [],
      depthPosts: [],
      briefingDate: null,
    });
  });

  it("keeps rejected, held, and rewrite-requested rows out of public signal reads", async () => {
    const rows = [
      createRow({
        id: "live-approved",
        briefing_date: "2026-04-28",
        rank: 1,
        editorial_status: "published",
        editorial_decision: "approved",
        published_why_it_matters: createValidWhyItMatters("Google"),
        is_live: true,
        published_at: "2026-04-28T08:00:00.000Z",
      }),
      createRow({
        id: "live-rejected",
        briefing_date: "2026-04-28",
        rank: 2,
        editorial_status: "published",
        editorial_decision: "rejected",
        published_why_it_matters: createValidWhyItMatters("Amazon"),
        is_live: true,
        published_at: "2026-04-28T08:01:00.000Z",
      }),
      createRow({
        id: "live-held",
        briefing_date: "2026-04-28",
        rank: 3,
        editorial_status: "published",
        editorial_decision: "held",
        published_why_it_matters: createValidWhyItMatters("Microsoft"),
        is_live: true,
        published_at: "2026-04-28T08:02:00.000Z",
      }),
      createRow({
        id: "live-rewrite",
        briefing_date: "2026-04-28",
        rank: 4,
        editorial_status: "published",
        editorial_decision: "rewrite_requested",
        published_why_it_matters: createValidWhyItMatters("OpenAI"),
        is_live: true,
        published_at: "2026-04-28T08:03:00.000Z",
      }),
    ];
    createSupabaseServiceRoleClient.mockReturnValue(createSupabaseMock(rows));

    const { getPublishedSignalPosts, getHomepageSignalSnapshot } = await loadEditorialModule();
    const publicSignals = await getPublishedSignalPosts();
    const homepageSnapshot = await getHomepageSignalSnapshot({
      today: new Date("2026-04-28T12:00:00.000Z"),
    });

    expect(publicSignals.map((post) => post.id)).toEqual(["live-approved"]);
    expect(homepageSnapshot.posts.map((post) => post.id)).toEqual(["live-approved"]);
    expect(homepageSnapshot.depthPosts.map((post) => post.id)).toEqual(["live-approved"]);
  });

  it("uses today's published rows as the homepage Tier 1 signal set", async () => {
    const rows = [
      ...Array.from({ length: 7 }, (_, index) =>
        createRow({
          id: `live-${index + 1}`,
          rank: index + 1,
          briefing_date: "2026-04-26",
          editorial_status: "published",
          published_why_it_matters: createValidWhyItMatters(`Google ${index + 1}`),
          is_live: true,
          published_at: `2026-04-26T08:0${index}:00.000Z`,
        }),
      ),
      createRow({
        id: "parked-rank-8",
        rank: 8,
        briefing_date: "2026-04-26",
        editorial_status: "published",
        published_why_it_matters: createValidWhyItMatters("Parked"),
        is_live: true,
        published_at: "2026-04-26T08:08:00.000Z",
      }),
    ];
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
        published_why_it_matters: createValidWhyItMatters("Google"),
        is_live: true,
        published_at: "2026-04-25T08:00:00.000Z",
      }),
      createRow({
        id: "recent-2",
        briefing_date: "2026-04-25",
        rank: 2,
        editorial_status: "published",
        published_why_it_matters: createValidWhyItMatters("Amazon"),
        is_live: true,
        published_at: "2026-04-25T08:01:00.000Z",
      }),
      createRow({
        id: "recent-empty-copy",
        briefing_date: "2026-04-25",
        rank: 3,
        editorial_status: "published",
        published_why_it_matters: null,
        is_live: true,
        published_at: "2026-04-25T08:02:00.000Z",
      }),
      createRow({
        id: "older-1",
        briefing_date: "2026-04-24",
        rank: 1,
        editorial_status: "published",
        published_why_it_matters: createValidWhyItMatters("Microsoft"),
        is_live: true,
        published_at: "2026-04-24T08:00:00.000Z",
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

  it("does not convert non-schema preflight transport errors into a homepage schema failure", async () => {
    createSupabaseServiceRoleClient.mockReturnValue(
      createSupabaseMock([], {
        preflightTransportErrorColumns: ["id"],
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
        edited_why_it_matters: createValidWhyItMatters("Google"),
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
