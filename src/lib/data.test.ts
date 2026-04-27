import { beforeEach, describe, expect, it, vi } from "vitest";

const safeGetUser = vi.fn();
const createSupabaseServerClient = vi.fn();
const getHomepageSignalSnapshot = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  safeGetUser,
  createSupabaseServerClient,
}));

vi.mock("@/lib/signals-editorial", () => ({
  getHomepageSignalSnapshot,
}));

function createHomepageSignalPost(overrides: Partial<{
  id: string;
  briefingDate: string | null;
  rank: number;
  title: string;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  tags: string[];
  signalScore: number | null;
  selectionReason: string;
  aiWhyItMatters: string;
  editedWhyItMatters: string | null;
  publishedWhyItMatters: string | null;
  editedWhyItMattersStructured: unknown | null;
  publishedWhyItMattersStructured: unknown | null;
  editorialStatus: "draft" | "needs_review" | "approved" | "published";
  editedBy: string | null;
  editedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  isLive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  persisted: boolean;
}> = {}) {
  return {
    id: overrides.id ?? `signal-${overrides.rank ?? 1}`,
    briefingDate: overrides.briefingDate ?? "2026-04-25",
    rank: overrides.rank ?? 1,
    title: overrides.title ?? `Stored signal ${overrides.rank ?? 1}`,
    sourceName: overrides.sourceName ?? "Source",
    sourceUrl: overrides.sourceUrl ?? "https://example.com/source",
    summary: overrides.summary ?? "Stored summary",
    tags: overrides.tags ?? ["tech"],
    signalScore: overrides.signalScore ?? 84,
    selectionReason: overrides.selectionReason ?? "Stored ranking signal",
    aiWhyItMatters: overrides.aiWhyItMatters ?? "Stored AI why it matters",
    editedWhyItMatters: overrides.editedWhyItMatters ?? null,
    publishedWhyItMatters: overrides.publishedWhyItMatters ?? null,
    editedWhyItMattersStructured: overrides.editedWhyItMattersStructured ?? null,
    publishedWhyItMattersStructured: overrides.publishedWhyItMattersStructured ?? null,
    editorialStatus: overrides.editorialStatus ?? "approved",
    editedBy: overrides.editedBy ?? null,
    editedAt: overrides.editedAt ?? null,
    approvedBy: overrides.approvedBy ?? null,
    approvedAt: overrides.approvedAt ?? null,
    publishedAt: overrides.publishedAt ?? null,
    isLive: overrides.isLive ?? false,
    createdAt: overrides.createdAt ?? null,
    updatedAt: overrides.updatedAt ?? null,
    persisted: overrides.persisted ?? true,
  };
}

async function loadDataModule() {
  vi.resetModules();
  return import("@/lib/data");
}

function createAccountSupabase(options?: {
  profileResult?: {
    data: {
      category_preferences?: unknown;
      newsletter_enabled?: boolean | null;
    } | null;
    error: null;
  };
  profileError?: Error;
  sourcesResult?: {
    data: Array<{
      id: string;
      user_id: string;
      name: string;
      feed_url: string;
      homepage_url: string | null;
      topic_id: string | null;
      status: "active" | "paused";
      created_at: string;
      topics: Array<{ name: string | null }> | null;
    }>;
    error: null;
  };
}) {
  const from = vi.fn((table: string) => {
    if (table === "user_profiles") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (options?.profileError) {
                throw options.profileError;
              }

              return (
                options?.profileResult ?? {
                  data: {
                    category_preferences: ["tech", "politics"],
                    newsletter_enabled: true,
                  },
                  error: null,
                }
              );
            }),
          })),
        })),
      };
    }

    if (table === "sources") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () =>
              options?.sourcesResult ?? {
                data: [
                  {
                    id: "source-1",
                    user_id: "user-1",
                    name: "Technology Feed",
                    feed_url: "https://example.com/rss.xml",
                    homepage_url: "https://example.com",
                    topic_id: "topic-tech",
                    status: "active" as const,
                    created_at: "2026-04-26T00:00:00.000Z",
                    topics: [{ name: "Tech" }],
                  },
                ],
                error: null,
              },
            ),
          })),
        })),
      };
    }

    throw new Error(`Unexpected table lookup: ${table}`);
  });

  return { from };
}

describe("homepage read model", () => {
  beforeEach(() => {
    safeGetUser.mockReset();
    createSupabaseServerClient.mockReset();
    getHomepageSignalSnapshot.mockReset();
    createSupabaseServerClient.mockResolvedValue(null);
    safeGetUser.mockResolvedValue({
      supabase: null,
      user: null,
      sessionCookiePresent: false,
    });
  });

  it("uses the most recent published signal set as Tier 2 when today's set is unavailable", async () => {
    getHomepageSignalSnapshot.mockResolvedValue({
      source: "recent_published",
      briefingDate: "2026-04-25",
      posts: [
        createHomepageSignalPost({
          id: "finance-1",
          rank: 1,
          title: "Stored finance signal",
          tags: ["finance", "markets"],
          summary: "Stored finance summary",
          editorialStatus: "published",
          publishedWhyItMatters: "Stored finance editorial note",
        }),
        createHomepageSignalPost({
          id: "tech-1",
          rank: 2,
          title: "Stored tech signal",
          tags: ["tech", "software"],
          summary: "Stored tech summary",
          editorialStatus: "published",
          publishedWhyItMatters: "Stored tech editorial note",
        }),
      ],
      depthPosts: [
        createHomepageSignalPost({
          id: "finance-1",
          rank: 1,
          title: "Stored finance signal",
          tags: ["finance", "markets"],
          summary: "Stored finance summary",
          editorialStatus: "published",
          publishedWhyItMatters: "Stored finance editorial note",
        }),
        createHomepageSignalPost({
          id: "tech-1",
          rank: 2,
          title: "Stored tech signal",
          tags: ["tech", "software"],
          summary: "Stored tech summary",
          editorialStatus: "published",
          publishedWhyItMatters: "Stored tech editorial note",
        }),
        createHomepageSignalPost({
          id: "tech-depth-1",
          rank: 6,
          title: "Stored tech depth signal",
          tags: ["tech", "software"],
          summary: "Stored tech depth summary",
          editorialStatus: "published",
          publishedWhyItMatters: "Stored tech depth editorial note",
        }),
      ],
    });

    const { getHomepagePageState } = await loadDataModule();
    const state = await getHomepagePageState("/");

    expect(state.data.briefing.intro).toBe(
      "Today's briefing is being prepared. Showing the most recently published signal set with its original date.",
    );
    expect(state.data.homepageFreshnessNotice).toEqual({
      kind: "stale",
      text: "Last updated Saturday, April 25 — Today's briefing is being prepared.",
      briefingDate: "2026-04-25",
    });
    expect(state.data.briefing.items.map((item) => item.title)).toEqual([
      "Stored finance signal",
      "Stored tech signal",
    ]);
    expect(
      state.data.briefing.items.some((item) => /static sample copy|public finance briefing now surfaces/i.test(item.title)),
    ).toBe(false);
    expect(state.data.briefing.items.map((item) => item.whyItMatters)).toEqual([
      "Stored finance editorial note",
      "Stored tech editorial note",
    ]);
    expect(state.data.briefing.items.some((item) => item.whyItMatters === "Stored AI why it matters")).toBe(false);
    expect(state.data.publicRankedItems?.map((item) => item.title)).toContain("Stored tech depth signal");
  }, 10_000);

  it("uses the Tier 3 honest empty state when no published signal set exists", async () => {
    getHomepageSignalSnapshot.mockResolvedValue({
      source: "none",
      briefingDate: null,
      posts: [],
      depthPosts: [],
    });

    const { getHomepagePageState } = await loadDataModule();
    const { buildHomepageViewModel } = await import("@/lib/homepage-model");
    const state = await getHomepagePageState("/");
    const viewModel = buildHomepageViewModel(state.data);
    const serializedOutput = JSON.stringify(state.data);

    expect(state.data.briefing.intro).toBe("Today's briefing is being prepared.");
    expect(state.data.briefing.items).toEqual([]);
    expect(state.data.publicRankedItems).toEqual([]);
    expect(state.data.homepageFreshnessNotice).toEqual({
      kind: "empty",
      text: "Today's briefing is being prepared.",
      briefingDate: null,
    });
    expect(viewModel.featured).toBeNull();
    expect(viewModel.topRanked).toEqual([]);
    expect(viewModel.debug.categoryCounts).toEqual({ tech: 0, finance: 0, politics: 0 });
    expect(serializedOutput).not.toMatch(/placeholder|stored public signal snapshot|rail readable|sample slot/i);
  });

  it("surfaces signal_posts schema preflight failures instead of a generic empty state", async () => {
    getHomepageSignalSnapshot.mockResolvedValue({
      source: "none",
      briefingDate: null,
      posts: [],
      depthPosts: [],
      errorMessage:
        "signal_posts schema preflight failed. Missing expected columns: why_it_matters_validation_status.",
    });

    const { getHomepagePageState } = await loadDataModule();
    const state = await getHomepagePageState("/");

    expect(state.data.briefing.items).toEqual([]);
    expect(state.data.briefing.intro).toBe(
      "signal_posts schema preflight failed. Missing expected columns: why_it_matters_validation_status.",
    );
    expect(state.data.homepageFreshnessNotice).toEqual({
      kind: "empty",
      text: "signal_posts schema preflight failed. Missing expected columns: why_it_matters_validation_status.",
      briefingDate: null,
    });
  });
});

describe("account page read model", () => {
  beforeEach(() => {
    safeGetUser.mockReset();
    createSupabaseServerClient.mockReset();
    getHomepageSignalSnapshot.mockReset();
    createSupabaseServerClient.mockResolvedValue(null);
  });

  it("keeps account SSR on auth, profile, and source reads only", async () => {
    const supabase = createAccountSupabase();

    safeGetUser.mockResolvedValue({
      supabase,
      user: {
        id: "user-1",
        email: "reader@example.com",
        user_metadata: { full_name: "Reader Example" },
      },
      sessionCookiePresent: true,
    });

    const { getAccountPageState } = await loadDataModule();
    const state = await getAccountPageState("/account");

    expect(state.viewer?.email).toBe("reader@example.com");
    expect(state.preferences).toEqual({
      categories: ["tech", "politics"],
      newsletterEnabled: true,
      storageReady: true,
    });
    expect(state.sources).toEqual([
      {
        id: "source-1",
        userId: "user-1",
        name: "Technology Feed",
        feedUrl: "https://example.com/rss.xml",
        homepageUrl: "https://example.com",
        topicId: "topic-tech",
        topicName: "Tech",
        status: "active",
        createdAt: "2026-04-26T00:00:00.000Z",
      },
    ]);
    expect(supabase.from).toHaveBeenCalledTimes(2);
    expect(supabase.from).toHaveBeenNthCalledWith(1, "user_profiles");
    expect(supabase.from).toHaveBeenNthCalledWith(2, "sources");
  });

  it("keeps account rendering safe when profile storage is unavailable", async () => {
    const supabase = createAccountSupabase({
      profileError: new Error("relation \"user_profiles\" does not exist"),
    });

    safeGetUser.mockResolvedValue({
      supabase,
      user: {
        id: "user-1",
        email: "reader@example.com",
        user_metadata: {},
      },
      sessionCookiePresent: true,
    });

    const { getAccountPageState } = await loadDataModule();
    const state = await getAccountPageState("/account");

    expect(state.viewer?.email).toBe("reader@example.com");
    expect(state.sources).toHaveLength(1);
    expect(state.preferences).toEqual({
      categories: ["tech", "finance", "politics"],
      newsletterEnabled: false,
      storageReady: false,
      storageMessage: "Account preference storage is pending the Artifact 6 profile migration.",
    });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
});
