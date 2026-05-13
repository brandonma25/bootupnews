import { beforeEach, describe, expect, it, vi } from "vitest";

const loadHomepageSignalItemsForArticleExclusions = vi.fn();
const loadHomepageCategoryArticles = vi.fn();
const logServerEvent = vi.fn();

vi.mock("@/lib/data", () => ({
  loadHomepageSignalItemsForArticleExclusions,
}));

vi.mock("@/lib/homepage-category-articles", () => ({
  loadHomepageCategoryArticles,
}));

vi.mock("@/lib/observability", () => ({
  logServerEvent,
}));

function buildRequest(category: string) {
  return new Request(`http://localhost:3000/api/home/category-articles?category=${category}`);
}

describe("/api/home/category-articles", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    loadHomepageSignalItemsForArticleExclusions.mockResolvedValue([{ id: "signal-1" }]);
    loadHomepageCategoryArticles.mockResolvedValue({
      tech: [
        {
          id: "article-1",
          category: "tech",
          title: "AI chip story",
          sourceName: "The Verge",
          url: "https://www.theverge.com/ai-chip-story",
          summary: "A tech story.",
          publishedAt: "2026-05-12T10:00:00.000Z",
          ingestedAt: "2026-05-12T10:15:00.000Z",
          runId: "pipeline-2",
        },
      ],
      finance: [],
      politics: [],
    });
  });

  it("validates the category query param", async () => {
    const { GET } = await import("@/app/api/home/category-articles/route");
    const response = await GET(buildRequest("sports"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: "Invalid category.",
    });
    expect(loadHomepageCategoryArticles).not.toHaveBeenCalled();
  });

  it("returns only the requested category articles", async () => {
    const { GET } = await import("@/app/api/home/category-articles/route");
    const response = await GET(buildRequest("tech"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      category: "tech",
      articles: [
        expect.objectContaining({
          id: "article-1",
          category: "tech",
        }),
      ],
    });
    expect(loadHomepageSignalItemsForArticleExclusions).toHaveBeenCalledTimes(1);
    expect(loadHomepageCategoryArticles).toHaveBeenCalledWith({
      excludedSignalItems: [{ id: "signal-1" }],
      route: "/api/home/category-articles",
    });
  });

  it("returns a sanitized error response on load failure", async () => {
    loadHomepageCategoryArticles.mockRejectedValue(new Error("database token leaked"));

    const { GET } = await import("@/app/api/home/category-articles/route");
    const response = await GET(buildRequest("finance"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: "Category articles could not be loaded.",
    });
    expect(logServerEvent).toHaveBeenCalledWith(
      "warn",
      "Homepage category articles API failed",
      expect.objectContaining({
        category: "finance",
      }),
    );
  });
});
