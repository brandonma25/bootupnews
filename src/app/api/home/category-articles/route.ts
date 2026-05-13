import { NextResponse } from "next/server";

import { loadHomepageSignalItemsForArticleExclusions } from "@/lib/data";
import { loadHomepageCategoryArticles } from "@/lib/homepage-category-articles";
import { HOMEPAGE_CATEGORY_CONFIG, type HomepageCategoryKey } from "@/lib/homepage-taxonomy";
import { logServerEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_CATEGORY_KEYS = new Set<HomepageCategoryKey>(
  HOMEPAGE_CATEGORY_CONFIG.map((category) => category.key),
);

function parseCategory(value: string | null): HomepageCategoryKey | null {
  if (!value || !VALID_CATEGORY_KEYS.has(value as HomepageCategoryKey)) {
    return null;
  }

  return value as HomepageCategoryKey;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = parseCategory(url.searchParams.get("category"));

  if (!category) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid category.",
      },
      { status: 400 },
    );
  }

  try {
    const excludedSignalItems = await loadHomepageSignalItemsForArticleExclusions();
    const articleMap = await loadHomepageCategoryArticles({
      excludedSignalItems,
      route: "/api/home/category-articles",
    });

    return NextResponse.json({
      ok: true,
      category,
      articles: articleMap[category] ?? [],
    });
  } catch (error) {
    logServerEvent("warn", "Homepage category articles API failed", {
      route: "/api/home/category-articles",
      category,
      errorMessage: getErrorMessage(error),
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Category articles could not be loaded.",
      },
      { status: 500 },
    );
  }
}
