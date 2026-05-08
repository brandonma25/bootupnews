"use client";

import { BriefingCardCategory } from "@/components/home/BriefingCardCategory";
import { Card } from "@/components/ui/card";
import type { HomepageCategoryPreviewMap } from "@/lib/homepage-model";
import { HOMEPAGE_CATEGORY_CONFIG } from "@/lib/homepage-taxonomy";

type CategoryPreviewGridProps = {
  categoryPreviews: HomepageCategoryPreviewMap;
};

export function CategoryPreviewGrid({ categoryPreviews }: CategoryPreviewGridProps) {
  const totalEvents = HOMEPAGE_CATEGORY_CONFIG.reduce(
    (sum, category) => sum + (categoryPreviews[category.key]?.length ?? 0),
    0,
  );

  if (totalEvents === 0) {
    return null;
  }

  return (
    <section aria-labelledby="by-category-heading" className="space-y-4">
      <div className="space-y-2">
        <p className="section-label">By category</p>
        <div className="space-y-1">
          <h2 id="by-category-heading" className="text-xl font-semibold text-[var(--text-primary)]">
            By Category
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            More from today&apos;s briefing, by category.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {HOMEPAGE_CATEGORY_CONFIG.map((category) => {
          const events = categoryPreviews[category.key];

          return (
            <section key={category.key} aria-labelledby={`category-preview-${category.key}`} className="space-y-3">
              <div className="space-y-1">
                <h3
                  id={`category-preview-${category.key}`}
                  className="text-base font-semibold text-[var(--text-primary)]"
                >
                  {category.label}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">{category.description}</p>
              </div>

              {events.length ? (
                <div className="grid gap-3">
                  {events.map((event) => (
                    <BriefingCardCategory
                      key={event.id}
                      item={{
                        title: event.title,
                        whatHappened: event.whatHappened,
                        sources: event.relatedArticles.map((article) => ({
                          title: article.sourceName,
                          url: article.url,
                        })),
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Card className="w-full p-5">
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    No {category.label.toLowerCase()} stories in today&apos;s briefing.
                  </p>
                </Card>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
