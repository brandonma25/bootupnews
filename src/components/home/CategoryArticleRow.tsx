import { ExternalLink } from "lucide-react";

import type { HomepageCategoryArticle } from "@/lib/types";

export function CategoryArticleRow({
  article,
  route,
}: {
  article: HomepageCategoryArticle;
  route: string;
}) {
  const summary = article.summary.trim();

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition-colors hover:border-[var(--text-secondary)]"
      data-mvp-measurement-event="source_click"
      data-mvp-route={route}
      data-mvp-surface={`category_${article.category}_article`}
      data-mvp-source-name={article.sourceName}
    >
      <article className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[var(--text-secondary)]">
          <span>{formatArticleDate(article.publishedAt)}</span>
          <span aria-hidden="true">/</span>
          <span>{article.sourceName}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-medium leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)]">
            {article.title}
          </h2>
          <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
        </div>
        {summary ? (
          <p className="line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{summary}</p>
        ) : null}
      </article>
    </a>
  );
}

function formatArticleDate(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Latest";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Taipei",
  }).format(new Date(timestamp));
}
