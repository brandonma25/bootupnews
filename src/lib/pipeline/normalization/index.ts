import type { NormalizedArticle } from "@/lib/models/normalized-article";
import type { RawItem } from "@/lib/models/raw-item";
import {
  cleanText,
  extractEntities,
  extractKeywords,
  normalizeEntity,
  tokenize,
} from "@/lib/pipeline/shared/text";

export function normalizeRawItems(items: RawItem[]): NormalizedArticle[] {
  return items.map((item) => {
    const title = cleanText(item.title);
    const content = cleanText(item.raw_content || item.title);
    const entities = extractEntities(`${item.title} ${item.raw_content}`);

    return {
      id: item.id,
      title,
      source: cleanText(item.source),
      url: item.url.trim(),
      published_at: item.published_at,
      content,
      entities,
      normalized_entities: entities.map(normalizeEntity).filter(Boolean),
      keywords: extractKeywords(`${title} ${content}`, 10),
      title_tokens: tokenize(title),
      content_tokens: tokenize(content),
      source_metadata: item.source_metadata,
      source_accessibility: item.source_accessibility,
      discovery_metadata: item.discovery_metadata,
    };
  });
}
