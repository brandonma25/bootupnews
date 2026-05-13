import Link from "next/link";

import {
  HOMEPAGE_CATEGORY_CONFIG,
  getHomepageCategoryPath,
  type HomepageCategoryKey,
} from "@/lib/homepage-taxonomy";
import { cn } from "@/lib/utils";
import { getCategoryNavigationLabel } from "./category-navigation-labels";

export function CategoryNavigation({
  activeCategory,
  route = "/",
  className,
}: {
  activeCategory?: HomepageCategoryKey;
  route?: string;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "border-t border-[var(--bu-border-subtle)] pt-[var(--bu-space-5)]",
        className,
      )}
      aria-label="Browse by category"
    >
      <div className="flex flex-wrap items-center gap-x-[var(--bu-space-5)] gap-y-[var(--bu-space-2)] max-[360px]:flex-col-reverse max-[360px]:items-start">
        <p className="font-sans text-[var(--bu-size-micro)] font-medium uppercase leading-5 tracking-[0.08em] text-[var(--bu-text-tertiary)]">
          BROWSE BY
        </p>
        <div className="flex flex-nowrap items-center gap-x-[var(--bu-space-5)]">
          {HOMEPAGE_CATEGORY_CONFIG.map((category) => {
            const active = category.key === activeCategory;

            return (
              <Link
                key={category.key}
                href={getHomepageCategoryPath(category.key)}
                prefetch={false}
                className={cn(
                  "border-b-2 pb-0.5 text-[var(--bu-size-ui)] leading-5 transition-colors",
                  active
                    ? "border-[var(--bu-accent)] font-medium text-[var(--bu-text-primary)]"
                    : "border-transparent font-normal text-[var(--bu-text-secondary)] hover:text-[var(--bu-accent)]",
                )}
                aria-current={active ? "page" : undefined}
                data-mvp-measurement-event="category_tab_open"
                data-mvp-route={route}
                data-mvp-surface="home_category_nav"
                data-mvp-category={category.key}
              >
                {getCategoryNavigationLabel(category.key)}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
