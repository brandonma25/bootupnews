import type { NormalizedArticle } from "@/lib/models/normalized-article";
import { jaccardSimilarity, normalizeUrl, tokenize } from "@/lib/pipeline/shared/text";

export function deduplicateArticles(articles: NormalizedArticle[]) {
  const deduped: NormalizedArticle[] = [];
  const seenUrls = new Set<string>();

  articles
    .slice()
    .sort(
      (left, right) =>
        new Date(right.published_at).getTime() - new Date(left.published_at).getTime(),
    )
    .forEach((article) => {
      const normalizedUrl = normalizeUrl(article.url).toLowerCase();
      if (seenUrls.has(normalizedUrl)) {
        return;
      }

      const titleTokens = tokenize(article.title);
      const nearDuplicate = deduped.some((existing) => {
        const similarity = jaccardSimilarity(titleTokens, tokenize(existing.title));
        return similarity >= 0.82;
      });

      if (nearDuplicate) {
        return;
      }

      seenUrls.add(normalizedUrl);
      deduped.push(article);
    });

  return deduped;
}
