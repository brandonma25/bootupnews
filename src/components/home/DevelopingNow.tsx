"use client";

import { BriefingCardCategory } from "@/components/home/BriefingCardCategory";
import type { HomepageEvent } from "@/lib/homepage-model";

type DevelopingNowProps = {
  events: HomepageEvent[];
};

export function DevelopingNow({ events }: DevelopingNowProps) {
  if (!events.length) {
    return null;
  }

  return (
    <section aria-labelledby="developing-now-heading" className="space-y-4">
      <div className="space-y-2">
        <p className="section-label">Developing now</p>
        <div className="space-y-1">
          <h2 id="developing-now-heading" className="text-xl font-semibold text-[var(--text-primary)]">
            Developing Now
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            What&apos;s building from sources not already represented in today&apos;s signals.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </section>
  );
}
