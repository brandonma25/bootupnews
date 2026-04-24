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

vi.mock("@/lib/supabase/server", () => ({
  safeGetUser,
  createSupabaseServiceRoleClient,
  createSupabaseServerClient,
}));

vi.mock("@/lib/data", () => ({
  generateDailyBriefing,
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

function createSupabaseMock(rows: SignalPostRow[]) {
  return {
    rows,
    from(tableName: string) {
      expect(tableName).toBe("signal_posts");

      let operation: "select" | "update" | null = null;
      let updateValues: Partial<SignalPostRow> = {};
      const filters: Array<{ column: keyof SignalPostRow; value: unknown }> = [];
      const inclusionFilters: Array<{ column: keyof SignalPostRow; values: unknown[] }> = [];
      const lessThanFilters: Array<{ column: keyof SignalPostRow; value: unknown }> = [];
      let orSearch = "";
      let sortColumn: keyof SignalPostRow | null = null;
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
        let data = applyFilters();

        if (sortColumn) {
          data = data.slice().sort((left, right) => {
            const leftValue = left[sortColumn!];
            const rightValue = right[sortColumn!];
            if (typeof leftValue === "number" && typeof rightValue === "number") {
              return leftValue - rightValue;
            }
            return String(leftValue).localeCompare(String(rightValue));
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
        select() {
          operation = "select";
          return builder;
        },
        order(column: keyof SignalPostRow) {
          sortColumn = column;
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

  it("publishes approved edits when the rest of the Top 5 is already published", async () => {
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
    expect(rows.every((row) => row.editorial_status === "published")).toBe(true);
    expect(rows[0].published_why_it_matters).toBe("Newly approved editorial update.");
    expect(rows[1].published_why_it_matters).toBe("Existing edited 2");
  });

  it("persists a new daily Top 5 snapshot and archives the previous live set", async () => {
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
      items: Array.from({ length: 5 }, (_, index) => createBriefingItem(index + 1)),
    });

    expect(result.ok).toBe(true);
    expect(result.insertedCount).toBe(5);
    expect(rows.filter((row) => row.briefing_date === "2026-04-24").every((row) => row.is_live === false)).toBe(true);

    const insertedRows = rows.filter((row) => row.briefing_date === "2026-04-25");
    expect(insertedRows).toHaveLength(5);
    expect(insertedRows.every((row) => row.is_live === true)).toBe(true);
    expect(insertedRows.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5]);
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
      createRow({
        id: "live-1",
        rank: 1,
        briefing_date: "2026-04-24",
        editorial_status: "published",
        published_why_it_matters: "Live published 1",
        is_live: true,
      }),
      createRow({
        id: "live-2",
        rank: 2,
        briefing_date: "2026-04-24",
        editorial_status: "published",
        published_why_it_matters: "Live published 2",
        is_live: true,
      }),
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

    expect(posts).toHaveLength(2);
    expect(posts.map((post) => post.id)).toEqual(["live-1", "live-2"]);
  });
});
