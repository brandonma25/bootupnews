import Link from "next/link";

import {
  HOMEPAGE_CATEGORY_CONFIG,
  getHomepageCategoryPath,
  type HomepageCategoryKey,
} from "@/lib/homepage-taxonomy";
import { cn } from "@/lib/utils";

export function CategoryNavigation({
  activeCategory,
  route = "/",
}: {
  activeCategory?: HomepageCategoryKey;
  route?: string;
}) {
  return (
    <nav
      className="flex flex-wrap items-center gap-x-[var(--bu-space-5)] gap-y-[var(--bu-space-2)]"
      aria-label="Categories"
    >
      {HOMEPAGE_CATEGORY_CONFIG.map((category) => {
        const active = category.key === activeCategory;

        return (
          <Link
            key={category.key}
            href={getHomepageCategoryPath(category.key)}
            prefetch={false}
            className={cn(
              "text-[var(--bu-size-ui)] leading-5 transition-colors",
              active
                ? "font-medium text-[var(--bu-text-primary)] underline decoration-[var(--bu-accent)] decoration-2 underline-offset-[6px]"
                : "font-normal text-[var(--bu-text-secondary)] hover:text-[var(--bu-accent)]",
            )}
            aria-current={active ? "page" : undefined}
            data-mvp-measurement-event="category_tab_open"
            data-mvp-route={route}
            data-mvp-surface="home_category_nav"
            data-mvp-category={category.key}
          >
            {category.label}
          </Link>
        );
      })}
    </nav>
  );
}
