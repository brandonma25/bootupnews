import { AppShell } from "@/components/app-shell";
import { CategoryArticleRow } from "@/components/home/CategoryArticleRow";
import { CategoryNavigation } from "@/components/home/CategoryNavigation";
import { MvpMeasurementTracker } from "@/components/mvp-measurement/MvpMeasurementTracker";
import { Panel } from "@/components/ui/panel";
import {
  getHomepageCategoryDescription,
  getHomepageCategoryLabel,
  type HomepageCategoryKey,
} from "@/lib/homepage-taxonomy";
import type { HomepageCategoryArticle, ViewerAccount } from "@/lib/types";

export function CategoryPage({
  category,
  articles,
  viewer,
  isAdmin = false,
  currentPath,
}: {
  category: HomepageCategoryKey;
  articles: HomepageCategoryArticle[];
  viewer: ViewerAccount | null;
  isAdmin?: boolean;
  currentPath: string;
}) {
  const label = getHomepageCategoryLabel(category);
  const description = getHomepageCategoryDescription(category);

  return (
    <AppShell currentPath={currentPath} mode="public" account={viewer} isAdmin={isAdmin}>
      <MvpMeasurementTracker
        pageView={{
          eventName: "category_page_view",
          route: currentPath,
          surface: "category_page",
          metadata: {
            categoryKey: category,
            articleCount: articles.length,
          },
        }}
      />
      <div className="mx-auto w-full max-w-[var(--bu-container-narrow)] px-[var(--bu-space-2)] py-[var(--bu-space-7)] md:px-0">
        <div className="mb-[var(--bu-space-5)]">
          <CategoryNavigation activeCategory={category} route={currentPath} />
        </div>

        <header className="mb-[var(--bu-space-5)] space-y-2">
          <h1 className="text-[var(--bu-size-card-title-mobile)] font-medium leading-tight text-[var(--bu-text-primary)] md:text-[var(--bu-size-card-title)]">
            {label}
          </h1>
          <p className="max-w-2xl text-[var(--bu-size-ui)] leading-6 text-[var(--bu-text-secondary)]">
            {description}
          </p>
        </header>

        {articles.length ? (
          <div className="grid gap-[var(--bu-space-3)]">
            {articles.map((article) => (
              <CategoryArticleRow key={article.id} article={article} route={currentPath} />
            ))}
          </div>
        ) : (
          <Panel className="p-5 text-base text-[var(--text-secondary)]" role="status">
            No {label.toLowerCase()} stories available right now.
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
