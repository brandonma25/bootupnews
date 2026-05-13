import { CategoryPage } from "@/components/landing/category-page";
import { isAdminUser } from "@/lib/admin-auth";
import {
  getViewerAccount,
  loadHomepageSignalItemsForArticleExclusions,
} from "@/lib/data";
import { loadHomepageCategoryArticles } from "@/lib/homepage-category-articles";
import type { HomepageCategoryKey } from "@/lib/homepage-taxonomy";

export async function renderHomepageCategoryPage({
  category,
  path,
}: {
  category: HomepageCategoryKey;
  path: string;
}) {
  const [viewer, signalItems] = await Promise.all([
    getViewerAccount(path),
    loadHomepageSignalItemsForArticleExclusions(),
  ]);
  const articleMap = await loadHomepageCategoryArticles({
    excludedSignalItems: signalItems,
    route: path,
  });

  return (
    <CategoryPage
      category={category}
      articles={articleMap[category] ?? []}
      viewer={viewer}
      isAdmin={isAdminUser({ email: viewer?.email ?? undefined })}
      currentPath={path}
    />
  );
}
