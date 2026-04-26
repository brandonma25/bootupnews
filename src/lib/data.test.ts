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

  it("prefers the latest stored signal snapshot over demo briefing copy", async () => {
    getHomepageSignalSnapshot.mockResolvedValue({
      source: "latest_snapshot",
      briefingDate: "2026-04-25",
      posts: [
        createHomepageSignalPost({
          id: "finance-1",
          rank: 1,
          title: "Stored finance signal",
          tags: ["finance", "markets"],
          summary: "Stored finance summary",
          editedWhyItMatters: "Stored finance editorial note",
        }),
        createHomepageSignalPost({
          id: "tech-1",
          rank: 2,
          title: "Stored tech signal",
          tags: ["tech", "software"],
          summary: "Stored tech summary",
          editedWhyItMatters: "Stored tech editorial note",
        }),
      ],
      depthPosts: [
        createHomepageSignalPost({
          id: "finance-1",
          rank: 1,
          title: "Stored finance signal",
          tags: ["finance", "markets"],
          summary: "Stored finance summary",
          editedWhyItMatters: "Stored finance editorial note",
        }),
        createHomepageSignalPost({
          id: "tech-1",
          rank: 2,
          title: "Stored tech signal",
          tags: ["tech", "software"],
          summary: "Stored tech summary",
          editedWhyItMatters: "Stored tech editorial note",
        }),
        createHomepageSignalPost({
          id: "tech-depth-1",
          rank: 6,
          title: "Stored tech depth signal",
          tags: ["tech", "software"],
          summary: "Stored tech depth summary",
          editedWhyItMatters: "Stored tech depth editorial note",
        }),
      ],
    });

    const { getHomepagePageState } = await loadDataModule();
    const state = await getHomepagePageState("/");

    expect(state.data.briefing.intro).toMatch(/latest stored Top 5 snapshot/i);
    expect(state.data.briefing.items.map((item) => item.title)).toEqual([
      "Stored finance signal",
      "Stored tech signal",
    ]);
    expect(
      state.data.briefing.items.some((item) => /static sample copy|public finance briefing now surfaces/i.test(item.title)),
    ).toBe(false);
    expect(state.data.publicRankedItems?.map((item) => item.title)).toContain("Stored tech depth signal");
  }, 10_000);

  it("uses clearly labeled category-specific placeholders when no stored snapshot exists", async () => {
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

    expect(state.data.briefing.intro).toMatch(/clearly labeled category placeholders/i);
    expect(
      state.data.briefing.items.some((item) => /static sample copy|live business feeds|live headlines/i.test(item.title)),
    ).toBe(false);
    expect(viewModel.debug.categoryCounts.tech).toBeGreaterThan(0);
    expect(viewModel.debug.categoryCounts.finance).toBeGreaterThan(0);
    expect(viewModel.debug.categoryCounts.politics).toBeGreaterThan(0);
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
